"use client";

import { useEffect, useRef } from "react";
import { useTransactions } from "./TransactionProvider";
import { getExplorerTxUrl, shortAddress } from "@/lib/genlayer";
import {
  isRetryableState,
  isTerminalState,
  txKey,
  TxState,
} from "@/lib/transactions";
import { ExternalLink, StatusBadge } from "./ui";

const labels: Record<TxState, string> = {
  submitted: "Submitted",
  processing: "Consensus processing",
  confirmation: "Confirming contract state",
  confirmation_delayed: "Confirmation delayed",
  confirmed: "Confirmed",
  execution_failed: "Execution failed",
  canceled: "Canceled",
  undetermined: "NO_MAJORITY · unresolved",
  unknown_retryable: "Check unavailable",
};

export function TransactionTray() {
  const { active, open, setOpen, retry, dismiss } = useTransactions();
  const closeButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (opener.current) closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    addEventListener("keydown", onKeyDown);
    return () => {
      removeEventListener("keydown", onKeyDown);
      if (opener.current?.isConnected) opener.current.focus();
      opener.current = null;
    };
  }, [open, setOpen]);

  if (!open) return null;
  return (
    <aside
      className="transaction-tray"
      aria-labelledby="transaction-tray-title"
    >
      <header>
        <div>
          <p className="eyebrow">Bradbury activity</p>
          <h2 id="transaction-tray-title">Transaction activity</h2>
        </div>
        <button
          ref={closeButton}
          className="icon-button"
          onClick={() => setOpen(false)}
          aria-label="Close transaction tray"
        >
          ×
        </button>
      </header>
      <div className="tray-list">
        {active.length === 0 ? (
          <p className="tray-empty">No transactions for this wallet.</p>
        ) : (
          active
            .slice()
            .reverse()
            .map((tx) => (
              <article className="transaction-item" key={txKey(tx)}>
                <div className="transaction-title">
                  <strong>{tx.label}</strong>
                  <StatusBadge tone={toneForState(tx.state)}>
                    {labels[tx.state]}
                  </StatusBadge>
                </div>
                <p>
                  {tx.detail ||
                    "The app checks the structured receipt and expected contract state in the background."}
                </p>
                <div className="transaction-meta">
                  <code>{shortAddress(tx.hash)}</code>
                  <ExternalLink href={getExplorerTxUrl(tx.hash)}>
                    Explorer ↗
                  </ExternalLink>
                </div>
                <div className="transaction-actions">
                  {isRetryableState(tx.state) && (
                    <button onClick={() => retry(txKey(tx))}>
                      Recheck existing receipt
                    </button>
                  )}
                  {isTerminalState(tx.state) && (
                    <button onClick={() => dismiss(txKey(tx))}>Dismiss</button>
                  )}
                </div>
              </article>
            ))
        )}
      </div>
    </aside>
  );
}

function toneForState(
  state: TxState,
): "success" | "error" | "warning" | "accent" {
  if (state === "confirmed") return "success";
  if (state === "execution_failed" || state === "canceled") return "error";
  if (state === "confirmation_delayed" || state === "undetermined")
    return "warning";
  return "accent";
}
