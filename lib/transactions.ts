import {
  ExecutionResult,
  TransactionResult,
  TransactionStatus,
  transactionsStatusNumberToName,
} from "genlayer-js/types";
import type { TransactionHash } from "genlayer-js/types";
import { CONTRACT_ADDRESS } from "./config.ts";

export const TX_STORAGE_KEY = "gns:transactions:v1";
export const TX_SCHEMA_VERSION = 1;
export const CONFIRMED_RETENTION_MS = 24 * 60 * 60 * 1000;

export type TxState =
  | "submitted"
  | "processing"
  | "confirmation"
  | "confirmation_delayed"
  | "confirmed"
  | "execution_failed"
  | "canceled"
  | "undetermined"
  | "unknown_retryable";

export type TxAction =
  | "register"
  | "update_profile"
  | "set_address"
  | "set_primary"
  | "transfer";

export interface ExpectedState {
  action: TxAction;
  name: string;
  values: Record<string, string>;
}

export interface ManagedTransaction {
  version: 1;
  chainId: number;
  contractAddress: string;
  wallet: string;
  hash: TransactionHash;
  action: TxAction;
  label: string;
  state: TxState;
  submittedAt: number;
  updatedAt: number;
  expected: ExpectedState;
  optimisticData?: Record<string, string>;
  detail?: string;
}

export interface ReceiptLike {
  statusName?: TransactionStatus | string;
  status?: TransactionStatus | string | number;
  resultName?: TransactionResult | string;
  txExecutionResultName?: ExecutionResult | string;
}

const states = new Set<TxState>([
  "submitted",
  "processing",
  "confirmation",
  "confirmation_delayed",
  "confirmed",
  "execution_failed",
  "canceled",
  "undetermined",
  "unknown_retryable",
]);
const actions = new Set<TxAction>([
  "register",
  "update_profile",
  "set_address",
  "set_primary",
  "transfer",
]);
const terminalStates = new Set<TxState>([
  "confirmed",
  "execution_failed",
  "canceled",
  "undetermined",
]);
const retryableStates = new Set<TxState>([
  "submitted",
  "processing",
  "confirmation",
  "confirmation_delayed",
  "undetermined",
  "unknown_retryable",
]);
const profileFields = [
  "avatar",
  "bio",
  "twitter",
  "github",
  "website",
] as const;

export function isTerminalState(state: TxState) {
  return terminalStates.has(state);
}

export function isPendingState(state: TxState) {
  return !isTerminalState(state);
}

export function isRetryableState(state: TxState) {
  return retryableStates.has(state);
}

export function txKey(
  tx: Pick<
    ManagedTransaction,
    "chainId" | "contractAddress" | "wallet" | "hash"
  >,
) {
  return `${tx.chainId}:${tx.contractAddress.toLowerCase()}:${tx.wallet.toLowerCase()}:${tx.hash.toLowerCase()}`;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}

export function isManagedTransaction(
  value: unknown,
): value is ManagedTransaction {
  if (!value || typeof value !== "object") return false;
  const tx = value as Partial<ManagedTransaction>;
  const expected = tx.expected as Partial<ExpectedState> | undefined;
  return (
    tx.version === 1 &&
    Number.isInteger(tx.chainId) &&
    typeof tx.contractAddress === "string" &&
    /^0x[a-f\d]{40}$/i.test(tx.contractAddress) &&
    typeof tx.wallet === "string" &&
    /^0x[a-f\d]{40}$/i.test(tx.wallet) &&
    typeof tx.hash === "string" &&
    /^0x[a-f\d]{64}$/i.test(tx.hash) &&
    actions.has(tx.action as TxAction) &&
    states.has(tx.state as TxState) &&
    typeof tx.label === "string" &&
    Number.isFinite(tx.submittedAt) &&
    Number.isFinite(tx.updatedAt) &&
    !!expected &&
    actions.has(expected.action as TxAction) &&
    typeof expected.name === "string" &&
    isStringRecord(expected.values) &&
    (tx.optimisticData === undefined || isStringRecord(tx.optimisticData)) &&
    (tx.detail === undefined || typeof tx.detail === "string")
  );
}

export function pruneExpiredTransactions(
  items: ManagedTransaction[],
  now = Date.now(),
) {
  return items.filter(
    (tx) =>
      tx.state !== "confirmed" || now - tx.updatedAt < CONFIRMED_RETENTION_MS,
  );
}

export function mergeTransactionCollections(
  current: ManagedTransaction[],
  incoming: unknown[],
  now = Date.now(),
) {
  const validIncoming = incoming.filter(isManagedTransaction);
  const merged = new Map<string, ManagedTransaction>();
  for (const item of [
    ...current.filter(isManagedTransaction),
    ...validIncoming,
  ]) {
    const key = txKey(item);
    const existing = merged.get(key);
    if (!existing || item.updatedAt > existing.updatedAt) merged.set(key, item);
  }
  return pruneExpiredTransactions([...merged.values()], now);
}

export function parseTransactions(
  raw: string | null,
  now = Date.now(),
): ManagedTransaction[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return [];
    const persisted = value as { version?: unknown; items?: unknown };
    if (
      persisted.version !== TX_SCHEMA_VERSION ||
      !Array.isArray(persisted.items)
    )
      return [];
    return mergeTransactionCollections([], persisted.items, now);
  } catch {
    return [];
  }
}

export function serializeTransactions(
  items: ManagedTransaction[],
  now = Date.now(),
) {
  return JSON.stringify({
    version: TX_SCHEMA_VERSION,
    items: mergeTransactionCollections([], items, now),
  });
}

export function dedupeTransactions(items: ManagedTransaction[]) {
  return mergeTransactionCollections([], items);
}

export function createTransaction(
  input: Omit<
    ManagedTransaction,
    "version" | "contractAddress" | "state" | "submittedAt" | "updatedAt"
  >,
): ManagedTransaction {
  const now = Date.now();
  return {
    ...input,
    version: 1,
    contractAddress: CONTRACT_ADDRESS,
    state: "submitted",
    submittedAt: now,
    updatedAt: now,
  };
}

function receiptStatus(receipt: ReceiptLike) {
  if (receipt.statusName) return receipt.statusName;
  if (typeof receipt.status === "number") {
    return transactionsStatusNumberToName[
      String(receipt.status) as keyof typeof transactionsStatusNumberToName
    ];
  }
  return receipt.status;
}

export function classifyReceipt(receipt: ReceiptLike | null): TxState {
  if (!receipt) return "unknown_retryable";
  const status = receiptStatus(receipt);
  const execution = receipt.txExecutionResultName;
  const result = receipt.resultName;

  if (execution === ExecutionResult.FINISHED_WITH_ERROR)
    return "execution_failed";
  if (status === TransactionStatus.CANCELED) return "canceled";
  if (
    status === TransactionStatus.UNDETERMINED ||
    result === TransactionResult.NO_MAJORITY
  ) {
    return "undetermined";
  }
  if (
    status === TransactionStatus.ACCEPTED ||
    status === TransactionStatus.FINALIZED
  ) {
    if (
      execution === ExecutionResult.FINISHED_WITH_RETURN &&
      result === TransactionResult.AGREE
    ) {
      return "confirmation";
    }
    if (!execution || execution === ExecutionResult.NOT_VOTED)
      return "processing";
    return "unknown_retryable";
  }
  const processing = new Set<TransactionStatus>([
    TransactionStatus.UNINITIALIZED,
    TransactionStatus.PENDING,
    TransactionStatus.PROPOSING,
    TransactionStatus.COMMITTING,
    TransactionStatus.REVEALING,
    TransactionStatus.APPEAL_REVEALING,
    TransactionStatus.APPEAL_COMMITTING,
    TransactionStatus.READY_TO_FINALIZE,
  ]);
  if (processing.has(status as TransactionStatus)) return "processing";
  return "unknown_retryable";
}

export async function withTransactionLock<T>(
  inFlight: Set<string>,
  key: string,
  operation: () => Promise<T>,
): Promise<T | undefined> {
  if (inFlight.has(key)) return undefined;
  inFlight.add(key);
  try {
    return await operation();
  } finally {
    inFlight.delete(key);
  }
}

export function registrationDraftKey(name: string) {
  return `gns:draft:${name}`;
}

export function shouldRetainRegistrationDraft(state: TxState) {
  return state !== "confirmed";
}

export function shouldApplyTransactionCheck(
  snapshot: ManagedTransaction,
  latest: ManagedTransaction | undefined,
) {
  return (
    !!latest &&
    txKey(snapshot) === txKey(latest) &&
    latest.updatedAt === snapshot.updatedAt
  );
}

export function shouldCleanupRegistrationDraft(
  previous: ManagedTransaction,
  next: ManagedTransaction,
  persistenceSucceeded: boolean,
) {
  return (
    persistenceSucceeded &&
    previous.action === "register" &&
    previous.state !== "confirmed" &&
    next.state === "confirmed"
  );
}

export async function expectedStateMatches(
  tx: ManagedTransaction,
  reads: {
    getRecord: (name: string) => Promise<Record<string, unknown>>;
    reverseResolve: (address: string) => Promise<Record<string, unknown>>;
    checkAvailability: (name: string) => Promise<unknown>;
  },
) {
  const { action, name, values } = tx.expected;
  if (action === "register") {
    const [available, record] = await Promise.all([
      reads.checkAvailability(name),
      reads.getRecord(name),
    ]);
    return (
      available === false &&
      record?.found === true &&
      typeof record.owner === "string" &&
      record.owner.toLowerCase() === tx.wallet.toLowerCase()
    );
  }
  if (action === "set_primary") {
    const reverse = await reads.reverseResolve(tx.wallet);
    return (
      reverse?.found === true &&
      typeof reverse.name === "string" &&
      reverse.name.toLowerCase() === `${name}.gen`.toLowerCase()
    );
  }
  const record = await reads.getRecord(name);
  if (!record?.found) return false;
  if (action === "set_address") {
    return (
      typeof record.resolved === "string" &&
      record.resolved.toLowerCase() === values.resolved?.toLowerCase()
    );
  }
  if (action === "transfer") {
    return (
      typeof record.owner === "string" &&
      record.owner.toLowerCase() === values.owner?.toLowerCase()
    );
  }
  return profileFields.every(
    (field) => (record[field] || "") === (values[field] || ""),
  );
}
