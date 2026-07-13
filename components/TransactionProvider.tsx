"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAccount } from "wagmi";
import { checkAvailability, getRecord, reverseResolve } from "@/lib/genlayer";
import { TX_POLL_INTERVAL_MS, TX_TIMEOUT_MS } from "@/lib/config";
import {
  ManagedTransaction,
  classifyReceipt,
  createTransaction,
  expectedStateMatches,
  isPendingState,
  isTerminalState,
  mergeTransactionCollections,
  parseTransactions,
  registrationDraftKey,
  serializeTransactions,
  shouldApplyTransactionCheck,
  shouldCleanupRegistrationDraft,
  txKey,
  withTransactionLock,
  TX_STORAGE_KEY,
} from "@/lib/transactions";
import { TransactionTray } from "./TransactionTray";

type AddInput = Parameters<typeof createTransaction>[0];
type ToastState = Extract<
  ManagedTransaction["state"],
  "confirmed" | "execution_failed" | "canceled" | "undetermined"
>;

interface Toast {
  id: string;
  state: ToastState;
  label: string;
}

interface TransactionContextValue {
  transactions: ManagedTransaction[];
  active: ManagedTransaction[];
  add: (input: AddInput) => void;
  retry: (key: string) => void;
  dismiss: (key: string) => void;
  open: boolean;
  setOpen: (value: boolean) => void;
}

const Context = createContext<TransactionContextValue | null>(null);
const toastMessages: Record<ToastState, string> = {
  confirmed: "Confirmed on-chain",
  execution_failed: "Execution failed",
  canceled: "Transaction canceled",
  undetermined: "NO_MAJORITY — unresolved consensus",
};

export function useTransactions() {
  const value = useContext(Context);
  if (!value) throw new Error("TransactionProvider missing");
  return value;
}

function initialTransactions() {
  if (typeof window === "undefined") return [];
  return parseTransactions(window.localStorage.getItem(TX_STORAGE_KEY));
}

export function TransactionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { address, chainId } = useAccount();
  const [transactions, setTransactions] =
    useState<ManagedTransaction[]>(initialTransactions);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const inFlight = useRef(new Set<string>());
  const transactionsRef = useRef(transactions);

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== TX_STORAGE_KEY) return;
      const incoming = parseTransactions(event.newValue);
      const next = mergeTransactionCollections(
        transactionsRef.current,
        incoming,
      );
      transactionsRef.current = next;
      setTransactions(next);
    };
    addEventListener("storage", sync);
    return () => removeEventListener("storage", sync);
  }, []);

  const persist = useCallback(
    (update: (items: ManagedTransaction[]) => ManagedTransaction[]) => {
      const next = update(transactionsRef.current);
      try {
        localStorage.setItem(TX_STORAGE_KEY, serializeTransactions(next));
      } catch {
        return false;
      }
      transactionsRef.current = next;
      setTransactions(next);
      return true;
    },
    [],
  );

  const showToast = useCallback((tx: ManagedTransaction, state: ToastState) => {
    const toast: Toast = {
      id: `${txKey(tx)}:${state}:${Date.now()}`,
      state,
      label: tx.label,
    };
    setToasts((current) => [...current, toast]);
  }, []);

  const patchTx = useCallback(
    (key: string, patch: Partial<ManagedTransaction>) => {
      let previous: ManagedTransaction | undefined;
      let nextTransaction: ManagedTransaction | undefined;
      const succeeded = persist((items) =>
        items.map((tx) => {
          if (txKey(tx) !== key) return tx;
          previous = tx;
          const next = { ...tx, ...patch, updatedAt: Date.now() };
          nextTransaction = next;
          return next;
        }),
      );
      if (
        previous &&
        nextTransaction &&
        shouldCleanupRegistrationDraft(previous, nextTransaction, succeeded)
      ) {
        sessionStorage.removeItem(registrationDraftKey(previous.expected.name));
      }
      return succeeded;
    },
    [persist],
  );

  const check = useCallback(
    async (tx: ManagedTransaction) => {
      const key = txKey(tx);
      await withTransactionLock(inFlight.current, key, async () => {
        let state: ManagedTransaction["state"];
        let detail = "";
        try {
          const [{ createClient }, { testnetBradbury }] = await Promise.all([
            import("genlayer-js"),
            import("genlayer-js/chains"),
          ]);
          const client = createClient({ chain: testnetBradbury });
          const receipt = await client.getTransaction({ hash: tx.hash });
          state = classifyReceipt(receipt);
          if (state === "confirmation") {
            const confirmed = await expectedStateMatches(tx, {
              getRecord,
              reverseResolve,
              checkAvailability,
            });
            state = confirmed
              ? "confirmed"
              : Date.now() - tx.submittedAt > TX_TIMEOUT_MS
                ? "confirmation_delayed"
                : "confirmation";
          }
          if (state === "confirmation_delayed") {
            detail =
              "Execution succeeded, but the expected contract read is not visible yet.";
          } else if (state === "undetermined") {
            detail =
              "NO_MAJORITY — validators did not reach consensus. This transaction will not be resubmitted.";
          } else if (state === "unknown_retryable") {
            detail =
              "The receipt is unresolved. A receipt recheck never resubmits the transaction.";
          }
        } catch {
          state = "unknown_retryable";
          detail =
            "Receipt check is temporarily unavailable. No transaction was resubmitted.";
        }

        const latest = transactionsRef.current.find(
          (item) => txKey(item) === key,
        );
        if (!shouldApplyTransactionCheck(tx, latest)) return;
        const persisted = patchTx(key, { state, detail });
        if (!persisted || !latest) return;
        if (state !== latest.state && isTerminalState(state)) {
          showToast(latest, state as ToastState);
        }
      });
    },
    [patchTx, showToast],
  );

  const add = useCallback(
    (input: AddInput) => {
      persist((items) => [...items, createTransaction(input)]);
      setOpen(true);
    },
    [persist],
  );

  const retry = useCallback(
    (key: string) => {
      const tx = transactionsRef.current.find((item) => txKey(item) === key);
      if (tx) void check(tx);
    },
    [check],
  );

  const dismiss = useCallback(
    (key: string) => {
      persist((items) => items.filter((tx) => txKey(tx) !== key));
    },
    [persist],
  );

  const pollable = useMemo(
    () =>
      transactions.filter(
        (tx) =>
          tx.chainId === chainId &&
          tx.wallet.toLowerCase() === address?.toLowerCase() &&
          isPendingState(tx.state),
      ),
    [transactions, address, chainId],
  );
  useEffect(() => {
    if (!pollable.length) return;
    let stopped = false;
    const run = () => {
      if (document.visibilityState === "hidden") return;
      for (const tx of pollable) {
        if (stopped) return;
        void check(tx);
      }
    };
    run();
    const timer = setInterval(run, TX_POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [pollable, check]);

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((toast) =>
      setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, 6000),
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  const active = useMemo(
    () =>
      transactions.filter(
        (tx) =>
          tx.chainId === chainId &&
          tx.wallet.toLowerCase() === address?.toLowerCase(),
      ),
    [transactions, address, chainId],
  );
  const value = useMemo(
    () => ({
      transactions,
      active,
      add,
      retry,
      dismiss,
      open,
      setOpen,
    }),
    [transactions, active, add, retry, dismiss, open],
  );

  return (
    <Context.Provider value={value}>
      {children}
      <TransactionTray />
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div className={`toast ${toast.state}`} key={toast.id} role="status">
            <strong>{toastMessages[toast.state]}</strong>
            <span>{toast.label}</span>
          </div>
        ))}
      </div>
    </Context.Provider>
  );
}
