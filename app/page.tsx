"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { checkAvailability, getRecord, getStats } from "@/lib/genlayer";
import { validateName } from "@/lib/domain";
import { BRADBURY_EXPLORER_URL, CONTRACT_ADDRESS } from "@/lib/config";
import { RegisterModal } from "@/components/RegisterModal";
import { AnimatedNumber, Reveal } from "@/components/Motion";
import {
  ExternalLink,
  InlineNotice,
  NameBadge,
  SectionHeader,
  Skeleton,
  StatusBadge,
} from "@/components/ui";
type SearchState =
  | "idle"
  | "loading"
  | "available"
  | "registered"
  | "invalid"
  | "reserved"
  | "error";
interface SearchRecord {
  found?: boolean;
  resolved?: string;
}
const RECENT = "gns:recent-searches:v1";
function loadRecent() {
  if (typeof window === "undefined") return [];
  try {
    const v: unknown = JSON.parse(localStorage.getItem(RECENT) || "[]");
    return Array.isArray(v)
      ? v
          .filter(
            (x): x is string => typeof x === "string" && validateName(x).valid,
          )
          .slice(0, 5)
      : [];
  } catch {
    return [];
  }
}
export default function HomePage() {
  const router = useRouter();
  const query = useSearchParams();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [input, setInput] = useState(() => query.get("q") || "");
  const [state, setState] = useState<SearchState>("idle");
  const [record, setRecord] = useState<SearchRecord | null>(null);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [register, setRegister] = useState(false);
  const [stats, setStats] = useState<number | null>(null);
  const request = useRef(0);
  useEffect(() => {
    getStats()
      .then((v) => setStats(Number(v?.total_names)))
      .catch(() => setStats(null));
  }, []);
  useEffect(() => {
    const validation = validateName(input);
    const id = ++request.current;
    const timer = setTimeout(
      async () => {
        if (!input) {
          setState("idle");
          return;
        }
        if (!validation.valid) {
          setState(validation.reserved ? "reserved" : "invalid");
          setError(validation.reason);
          return;
        }
        setState("loading");
        try {
          const available = await checkAvailability(validation.canonical);
          if (id !== request.current) return;
          if (available === true) {
            setRecord(null);
            setState("available");
          } else {
            const value = (await getRecord(
              validation.canonical,
            )) as SearchRecord;
            if (id !== request.current) return;
            setRecord(value);
            setState(value?.found ? "registered" : "error");
          }
        } catch (e) {
          if (id === request.current) {
            setError(
              e instanceof Error ? e.message : "Bradbury RPC unavailable.",
            );
            setState("error");
          }
        }
      },
      validation.valid ? 420 : 0,
    );
    return () => clearTimeout(timer);
  }, [input]);
  const validation = validateName(input);
  function remember() {
    if (!validation.valid) return;
    const next = [
      validation.canonical,
      ...recent.filter((n) => n !== validation.canonical),
    ].slice(0, 5);
    setRecent(next);
    localStorage.setItem(RECENT, JSON.stringify(next));
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    remember();
    if (!validation.valid) return;
    if (state === "registered") router.push(`/name/${validation.canonical}`);
    if (state === "available") {
      if (isConnected) setRegister(true);
      else openConnectModal?.();
    }
  }
  return (
    <>
      <section className="hero">
        <div className="identity-grid" aria-hidden="true" />
        <div className="hero-copy">
          <Reveal>
            <p className="eyebrow">
              <span className="live-dot" />
              Live on GenLayer Bradbury
            </p>
            <h1>
              Own the name.
              <br />
              <span>Resolve the identity.</span>
            </h1>
            <p className="hero-lede">
              Claim a human-readable <code>.gen</code> identity, attach a public
              profile, and receive direct wallet payments without giving custody
              to GNS.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <form className="resolver-search" onSubmit={submit}>
              <label htmlFor="name-search">Find a .gen identity</label>
              <div className="search-control">
                <input
                  id="name-search"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="yourname"
                  autoComplete="off"
                  spellCheck={false}
                />
                <span>.gen</span>
                <button
                  className="button primary"
                  disabled={
                    state === "loading" ||
                    state === "idle" ||
                    state === "invalid" ||
                    state === "reserved"
                  }
                >
                  {state === "loading"
                    ? "Resolving…"
                    : state === "registered"
                      ? "View identity"
                      : state === "available"
                        ? isConnected
                          ? "Claim name"
                          : "Connect to claim"
                        : "Search"}
                </button>
              </div>
              <div className="search-feedback" aria-live="polite">
                {state === "loading" && (
                  <>
                    <Skeleton className="line" />
                    <span>Reading the active resolver…</span>
                  </>
                )}
                {state === "available" && (
                  <>
                    <StatusBadge tone="success">Available</StatusBadge>
                    <strong>{validation.display}</strong>
                    <span>Ready for registration.</span>
                  </>
                )}
                {state === "registered" && (
                  <>
                    <StatusBadge tone="accent">Registered</StatusBadge>
                    <strong>{validation.display}</strong>
                    <span>Resolves to {record?.resolved?.slice(0, 10)}…</span>
                  </>
                )}
                {(state === "invalid" || state === "reserved") && (
                  <>
                    <StatusBadge tone="warning">
                      {state === "reserved" ? "Reserved" : "Invalid"}
                    </StatusBadge>
                    <span>{error}</span>
                  </>
                )}
                {state === "error" && (
                  <>
                    <StatusBadge tone="error">RPC unavailable</StatusBadge>
                    <span>
                      Could not verify on-chain state. Retry before acting.
                    </span>
                  </>
                )}
              </div>
            </form>
            {recent.length > 0 && (
              <div className="recent-searches">
                <span>Recent</span>
                {recent.map((n) => (
                  <button key={n} onClick={() => setInput(n)}>
                    {n}.gen
                  </button>
                ))}
                <button
                  className="clear"
                  onClick={() => {
                    localStorage.removeItem(RECENT);
                    setRecent([]);
                  }}
                >
                  Clear history
                </button>
              </div>
            )}
          </Reveal>
          <div className="trust-row">
            <span>✓ Verified active contract</span>
            <span>◇ Resolver-only</span>
            <span>↗ Direct non-custodial send</span>
          </div>
        </div>
        <aside className="identity-proof">
          <div className="proof-orbit" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <p className="eyebrow">Resolution proof</p>
          <NameBadge name="identity" />
          <dl>
            <div>
              <dt>Human name</dt>
              <dd>identity.gen</dd>
            </div>
            <div>
              <dt>Resolver</dt>
              <dd>0x5e7B…Cdd9</dd>
            </div>
            <div>
              <dt>Payment path</dt>
              <dd>Wallet → resolved address</dd>
            </div>
          </dl>
          <InlineNotice>
            Profiles are public resolver records—not identity verification.
          </InlineNotice>
        </aside>
      </section>
      <section className="section">
        <Reveal>
          <SectionHeader
            eyebrow="Resolver lifecycle"
            title="One name. Three useful layers."
          >
            GNS turns a wallet address into a public identity surface without
            becoming a custodian.
          </SectionHeader>
        </Reveal>
        <div className="feature-grid">
          {[
            [
              "01",
              "Claim",
              "Choose a valid name. AI-assisted validator consensus applies registration policy—not real-world identity proof.",
            ],
            [
              "02",
              "Resolve",
              "Read the owner, destination address, profile, and primary reverse name from the active contract.",
            ],
            [
              "03",
              "Use",
              "Share a memorable identity and send GEN directly from a wallet to its current resolved address.",
            ],
          ].map((x, i) => (
            <Reveal key={x[0]} delay={i * 70}>
              <article className="feature-card">
                <span>{x[0]}</span>
                <h3>{x[1]}</h3>
                <p>{x[2]}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="section proof-section">
        <Reveal>
          <SectionHeader
            eyebrow="Verified network proof"
            title="Contract state, not marketing numbers."
          >
            All live values come from GenLayer Bradbury reads.
          </SectionHeader>
        </Reveal>
        <div className="metrics">
          <article>
            <span>Registered names</span>
            <strong>
              {stats === null ? "—" : <AnimatedNumber value={stats} />}
            </strong>
            <small>
              {stats === null ? "RPC read unavailable" : "get_stats result"}
            </small>
          </article>
          <article>
            <span>Network</span>
            <strong>4221</strong>
            <small>Bradbury testnet</small>
          </article>
          <article>
            <span>Public methods</span>
            <strong>11</strong>
            <small>5 writes · 6 views</small>
          </article>
        </div>
        <ExternalLink
          className="contract-link"
          href={`${BRADBURY_EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
        >
          <span>Active verified contract</span>
          <code>{CONTRACT_ADDRESS}</code>
          <b>Open explorer ↗</b>
        </ExternalLink>
      </section>
      <section className="section payment-section">
        <Reveal>
          <div>
            <p className="eyebrow">Non-custodial by architecture</p>
            <h2>Your wallet sends to their wallet.</h2>
            <p>
              GNS resolves the name to an address. Before a direct send, the app
              reads that address again and asks you to review any change. The
              registry never receives, holds, or forwards the funds.
            </p>
            <div className="payment-flow" aria-label="Payment flow">
              <span>Sender wallet</span>
              <i>resolves .gen</i>
              <span>Recipient address</span>
            </div>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <aside>
            <h3>Resolver boundary</h3>
            <ul>
              <li>Stores names and public profile data</li>
              <li>Maps names to owner-selected addresses</li>
              <li>Does not expose deposit or withdrawal methods</li>
              <li>Does not claim direct transfers are contract consensus</li>
            </ul>
            <a className="button secondary" href="/send">
              Resolve and send
            </a>
          </aside>
        </Reveal>
      </section>
      <section className="final-cta">
        <Reveal>
          <p className="eyebrow">A human layer for Bradbury</p>
          <h2>Start with the name people remember.</h2>
          <button
            className="button primary"
            onClick={() => document.getElementById("name-search")?.focus()}
          >
            Search a .gen identity
          </button>
        </Reveal>
      </section>
      {register && validation.valid && (
        <RegisterModal
          name={validation.canonical}
          onClose={() => setRegister(false)}
        />
      )}
    </>
  );
}
