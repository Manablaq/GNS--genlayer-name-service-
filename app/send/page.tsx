"use client";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount, useSendTransaction } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatEther, parseEther } from "viem";
import { getRecord, getExplorerTxUrl } from "@/lib/genlayer";
import { resolvedAddressChanged, validateName } from "@/lib/domain";
import {
  AddressDisplay,
  ConfirmDialog,
  CopyButton,
  ErrorState,
  ExternalLink,
  InlineNotice,
  NameBadge,
  StatusBadge,
} from "@/components/ui";
interface ResolverRecord {
  found?: boolean;
  name: string;
  resolved: `0x${string}`;
  bio?: string;
}
export default function SendPage() {
  const query = useSearchParams();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { sendTransactionAsync } = useSendTransaction();
  const [name, setName] = useState(() => query.get("name") || "");
  const [record, setRecord] = useState<ResolverRecord | null>(null);
  const [state, setState] = useState<
    "idle" | "loading" | "found" | "missing" | "error"
  >("idle");
  const [amount, setAmount] = useState("");
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [changed, setChanged] = useState("");
  const [ack, setAck] = useState(false);
  const [hash, setHash] = useState("");
  const validation = validateName(name);
  let wei: bigint | null = null;
  try {
    wei = parseEther(amount);
  } catch {}
  const validAmount = wei !== null && wei > 0n;
  async function resolveName(e?: FormEvent) {
    e?.preventDefault();
    if (!validation.valid) return;
    setState("loading");
    setError("");
    try {
      const value = (await getRecord(validation.canonical)) as ResolverRecord;
      if (value?.found && value?.resolved) {
        setRecord(value);
        setState("found");
      } else setState("missing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "RPC read failed.");
      setState("error");
    }
  }
  async function send() {
    if (!record || !validation.valid || !wei) return;
    setBusy(true);
    setError("");
    try {
      const latest = (await getRecord(validation.canonical)) as ResolverRecord;
      if (!latest?.found || !latest.resolved)
        throw new Error(
          "The name no longer resolves. No transfer was submitted.",
        );
      if (resolvedAddressChanged(record.resolved, latest.resolved)) {
        setChanged(latest.resolved);
        setRecord(latest);
        setAck(false);
        setBusy(false);
        return;
      }
      const tx = await sendTransactionAsync({
        to: latest.resolved,
        value: wei,
      });
      setHash(tx);
      setReview(false);
      setBusy(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The wallet did not submit the transfer.",
      );
      setBusy(false);
    }
  }
  if (hash && record)
    return (
      <section className="route-page narrow">
        <header className="page-heading">
          <p className="eyebrow">Wallet transfer submitted</p>
          <h1>Sent directly.</h1>
          <p>GNS did not receive or custody this payment.</p>
        </header>
        <div className="success-panel">
          <StatusBadge tone="success">Wallet submitted</StatusBadge>
          <h2>{amount} GEN</h2>
          <p>
            to <NameBadge name={validation.canonical} />
          </p>
          <AddressDisplay address={record.resolved} />
          <ExternalLink
            className="button secondary"
            href={getExplorerTxUrl(hash)}
          >
            View wallet transaction ↗
          </ExternalLink>
          <button
            className="button ghost"
            onClick={() => {
              setHash("");
              setAmount("");
              setRecord(null);
              setState("idle");
            }}
          >
            Send another
          </button>
        </div>
      </section>
    );
  return (
    <section className="route-page narrow">
      <header className="page-heading">
        <p className="eyebrow">Direct wallet payment</p>
        <h1>Resolve. Review. Send.</h1>
        <p>
          Enter a .gen identity, verify its current destination, then send GEN
          directly from your injected wallet.
        </p>
      </header>
      <ol className="flow-steps">
        <li className={state !== "idle" ? "done" : "active"}>
          <span>1</span>Resolve
        </li>
        <li className={record ? "active" : ""}>
          <span>2</span>Review
        </li>
        <li>
          <span>3</span>Wallet
        </li>
      </ol>
      <form className="surface form-stack" onSubmit={resolveName}>
        <label className="field" htmlFor="recipient">
          <span>Recipient .gen name</span>
          <div className="suffix-input">
            <input
              id="recipient"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setState("idle");
                setRecord(null);
              }}
              placeholder="identity"
            />
            <b>.gen</b>
          </div>
          {!validation.valid && name && (
            <em className="field-error">{validation.reason}</em>
          )}
        </label>
        <button
          className="button secondary"
          disabled={!validation.valid || state === "loading"}
        >
          {state === "loading" ? "Reading resolver…" : "Resolve name"}
        </button>
      </form>
      {state === "error" && (
        <ErrorState
          title="Resolver unavailable"
          message={error}
          retry={() => resolveName()}
        />
      )}{" "}
      {state === "missing" && (
        <InlineNotice tone="error" title="Name not registered">
          No resolver record was returned. Check the spelling before continuing.
        </InlineNotice>
      )}
      {record && (
        <div className="surface recipient-card">
          <div className="recipient-head">
            <div className="avatar-initial">{record.name[0].toUpperCase()}</div>
            <div>
              <NameBadge name={record.name} />
              <p>{record.bio || "Public GNS resolver profile"}</p>
            </div>
            <StatusBadge tone="success">Resolved now</StatusBadge>
          </div>
          <div className="address-row">
            <AddressDisplay address={record.resolved} />
            <CopyButton value={record.resolved} label="Copy resolved address" />
          </div>
          <InlineNotice>
            Destination is read again immediately before wallet submission.
          </InlineNotice>
          <label className="field" htmlFor="amount">
            <span>Amount in GEN</span>
            <input
              id="amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.01"
            />
            {amount && !validAmount && (
              <em className="field-error">Enter a positive decimal amount.</em>
            )}
          </label>
          {!isConnected ? (
            <button className="button primary" onClick={openConnectModal}>
              Connect injected wallet
            </button>
          ) : (
            <button
              className="button primary"
              disabled={!validAmount}
              onClick={() => {
                setChanged("");
                setAck(false);
                setReview(true);
              }}
            >
              Review direct send
            </button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={review}
        title="Review direct wallet send"
        confirmLabel="Open wallet confirmation"
        busy={busy}
        onClose={() => !busy && setReview(false)}
        onConfirm={send}
      >
        <dl className="review-list">
          <div>
            <dt>Recipient</dt>
            <dd>{validation.display}</dd>
          </div>
          <div>
            <dt>Resolved address</dt>
            <dd className="break-anywhere">{record?.resolved}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{wei ? formatEther(wei) : "0"} GEN</dd>
          </div>
          <div>
            <dt>Path</dt>
            <dd>Your wallet → recipient</dd>
          </div>
        </dl>
        {changed && (
          <InlineNotice tone="warning" title="Resolved address changed">
            The current address is now{" "}
            <span className="break-anywhere">{changed}</span>. Review it
            carefully.
            <label className="check">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              I acknowledge this new destination.
            </label>
          </InlineNotice>
        )}
        {error && <InlineNotice tone="error">{error}</InlineNotice>}
        {changed && !ack && (
          <p className="field-error">
            Acknowledge the changed destination, then confirm again.
          </p>
        )}
      </ConfirmDialog>
    </section>
  );
}
