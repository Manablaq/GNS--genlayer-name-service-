"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAccount } from "wagmi";
import { BRADBURY_EXPLORER_URL, CONTRACT_ADDRESS } from "@/lib/config";
import { getChallenge, getRecord, reverseResolve } from "@/lib/genlayer";
import {
  isAddress,
  normalizeProfile,
  PROFILE_LIMITS,
  safeEvidenceUrl,
  safeExternalUrl,
  validateName,
} from "@/lib/domain";
import { type GnsWriteMethod, writeGns } from "@/lib/wallet";
import { useTransactions } from "@/components/TransactionProvider";
import type { ExpectedState } from "@/lib/transactions";
import {
  AddressDisplay,
  ConfirmDialog,
  CopyButton,
  EmptyState,
  ErrorState,
  ExternalLink,
  InlineNotice,
  NameBadge,
  Skeleton,
  StatusBadge,
} from "@/components/ui";
type Action =
  | "profile"
  | "address"
  | "primary"
  | "transfer"
  | "renew"
  | "release"
  | "recovery"
  | "clear_recovery"
  | "initiate_recovery"
  | "cancel_recovery"
  | "execute_recovery"
  | "challenge"
  | null;
interface Profile {
  avatar: string;
  bio: string;
  twitter: string;
  github: string;
  website: string;
}
interface NameRecord extends Profile {
  found?: boolean;
  name: string;
  owner: string;
  resolved: string;
  status: "active" | "suspended" | "expired";
  expires_at: string;
  recovery_configured: boolean;
  recovery_address: string | null;
  recovery_pending: boolean;
  recovery_owner: string | null;
  recovery_available_at: string;
}
interface ProfileChallenge {
  found?: boolean;
  source_url?: string;
  claim?: string;
  action?: "keep" | "suspend";
  category?: string;
  confidence_bps?: number;
  summary?: string;
  decided_at?: string;
  challenged_profile?: Partial<Profile>;
}
export default function NamePage() {
  const params = useParams<{ name: string }>();
  const validation = validateName(params.name);
  const name = validation.canonical;
  const { address } = useAccount();
  const { add } = useTransactions();
  const [record, setRecord] = useState<NameRecord | null>(null);
  const [challenge, setChallenge] = useState<ProfileChallenge | null>(null);
  const [primary, setPrimary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState<Action>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [target, setTarget] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [claim, setClaim] = useState("");
  const [profile, setProfile] = useState({
    avatar: "",
    bio: "",
    twitter: "",
    github: "",
    website: "",
  });
  const load = useCallback(async () => {
    if (!validation.valid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [value, challengeValue] = await Promise.all([
        getRecord(name),
        getChallenge(name),
      ]);
      setRecord(value);
      setChallenge(challengeValue);
      if (value?.found) {
        setProfile({
          avatar: value.avatar || "",
          bio: value.bio || "",
          twitter: value.twitter || "",
          github: value.github || "",
          website: value.website || "",
        });
        const reverse = await reverseResolve(value.owner);
        setPrimary(reverse?.found && reverse.name === value.name);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to read profile.");
    } finally {
      setLoading(false);
    }
  }, [name, validation.valid]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  const isOwner =
    !!address && record?.owner?.toLowerCase() === address.toLowerCase();
  const isRecoveryAddress =
    !!address &&
    !!record?.recovery_address &&
    record.recovery_address.toLowerCase() === address.toLowerCase();
  const isActive = record?.status === "active";
  async function submit() {
    if (!address || !action || !record) return;
    if (
      (action === "address" || action === "transfer" || action === "recovery" || action === "initiate_recovery") &&
      !isAddress(target)
    ) {
      setSubmitError("Enter a non-zero 42-character address.");
      return;
    }
    if (action === "challenge" && (!safeEvidenceUrl(sourceUrl) || !claim.trim())) {
      setSubmitError("Provide a public HTTPS source with a DNS hostname and a specific claim.");
      return;
    }
    setBusy(true);
    setSubmitError("");
    try {
      let method: GnsWriteMethod;
      let args: string[];
      let expected: ExpectedState;
      let label: string;
      if (action === "profile") {
        const p = normalizeProfile(profile);
        const reinstating = record.status === "suspended";
        const changed = (Object.keys(p) as (keyof Profile)[]).some(
          (field) => p[field] !== (record[field] || ""),
        );
        if (reinstating && !changed) {
          setSubmitError(
            "Change at least one profile field before requesting reinstatement.",
          );
          setBusy(false);
          return;
        }
        method = reinstating ? "reinstate_profile" : "update_profile";
        args = [name, p.avatar, p.bio, p.twitter, p.github, p.website];
        expected = {
          action: reinstating ? "reinstate_profile" : "update_profile",
          name,
          values: p,
        };
        label = reinstating
          ? `Request reinstatement for ${record.name}`
          : `Update ${record.name} profile`;
      } else if (action === "address") {
        method = "set_address";
        args = [name, target];
        expected = {
          action: "set_address",
          name,
          values: { resolved: target },
        };
        label = `Change ${record.name} resolver`;
      } else if (action === "primary") {
        method = "set_primary";
        args = [name];
        expected = { action: "set_primary", name, values: {} };
        label = `Set ${record.name} primary`;
      } else if (action === "transfer") {
        method = "transfer";
        args = [name, target];
        expected = { action: "transfer", name, values: { owner: target } };
        label = `Transfer ${record.name}`;
      } else if (action === "renew") {
        method = "renew";
        args = [name];
        expected = { action: "renew", name, values: { expires_at_before: record.expires_at } };
        label = `Renew ${record.name}`;
      } else if (action === "release") {
        method = "release";
        args = [name];
        expected = { action: "release", name, values: {} };
        label = `Release ${record.name}`;
      } else if (action === "recovery") {
        method = "set_recovery";
        args = [name, target];
        expected = { action: "set_recovery", name, values: { recovery_address: target } };
        label = `Set recovery for ${record.name}`;
      } else if (action === "clear_recovery") {
        method = "clear_recovery";
        args = [name];
        expected = { action: "clear_recovery", name, values: {} };
        label = `Clear recovery for ${record.name}`;
      } else if (action === "initiate_recovery") {
        method = "initiate_recovery";
        args = [name, target];
        expected = { action: "initiate_recovery", name, values: {} };
        label = `Start recovery for ${record.name}`;
      } else if (action === "cancel_recovery") {
        method = "cancel_recovery";
        args = [name];
        expected = { action: "cancel_recovery", name, values: {} };
        label = `Cancel recovery for ${record.name}`;
      } else if (action === "execute_recovery") {
        method = "execute_recovery";
        args = [name];
        expected = { action: "execute_recovery", name, values: { owner: record.recovery_owner || "" } };
        label = `Execute recovery for ${record.name}`;
      } else {
        method = "challenge_profile";
        args = [name, sourceUrl, claim];
        expected = { action: "challenge_profile", name, values: { source_url: sourceUrl, claim } };
        label = `Challenge ${record.name} profile`;
      }
      const hash = await writeGns(address, method, args);
      add({
        chainId: 4221,
        wallet: address,
        hash,
        action: expected.action,
        label,
        expected,
      });
      setAction(null);
      setTarget("");
      setSourceUrl("");
      setClaim("");
      setBusy(false);
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Wallet submission failed.",
      );
      setBusy(false);
    }
  }
  if (loading)
    return (
      <section className="route-page">
        <div className="profile-skeleton">
          <Skeleton className="avatar large" />
          <Skeleton className="line title" />
          <Skeleton className="line" />
          <Skeleton className="block" />
        </div>
      </section>
    );
  if (error)
    return (
      <section className="route-page centered">
        <ErrorState message={error} retry={load} />
      </section>
    );
  if (!validation.valid || !record?.found)
    return (
      <section className="route-page centered">
        <EmptyState title={validation.display || "Invalid name"}>
          {validation.valid
            ? "No active resolver record was found for this name."
            : validation.reason}
          <Link
            className="button primary"
            href={`/?q=${encodeURIComponent(name)}`}
          >
            Search another name
          </Link>
        </EmptyState>
      </section>
    );
  const avatar = safeExternalUrl(record.avatar);
  return (
    <section className="route-page profile-page">
      <Link href="/" className="back-link">
        ← Back to resolver
      </Link>
      <article className="profile-hero">
        <div className="profile-identity">
          {avatar ? (
            <Image
              src={avatar}
              alt={` avatar`}
              width={96}
              height={96}
              unoptimized
            />
          ) : (
            <div className="avatar-initial large">
              {record.name[0].toUpperCase()}
            </div>
          )}
          <div>
            <div className="badge-row">
              <StatusBadge tone={isActive ? "accent" : "warning"}>
                {record.status}
              </StatusBadge>
              {primary && (
                <StatusBadge tone="success">Primary name</StatusBadge>
              )}
            </div>
            <h1>{record.name}</h1>
            <p>{record.bio || "This identity has not added a bio yet."}</p>
          </div>
        </div>
        <div className="profile-actions">
          {isActive ? (
            <Link className="button primary" href={`/send?name=${name}`}>
              Send GEN directly
            </Link>
          ) : (
            <span className="button secondary" aria-disabled="true">
              Resolution unavailable
            </span>
          )}
          <ExternalLink
            className="button secondary"
            href={`${BRADBURY_EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
          >
            Contract source ↗
          </ExternalLink>
        </div>
      </article>
      <div className="profile-layout">
        <div className="profile-main">
          <section className="surface">
            <header className="surface-head">
              <div>
                <p className="eyebrow">Resolution</p>
                <h2>Address records</h2>
              </div>
              <StatusBadge tone="success">Verified read</StatusBadge>
            </header>
            <div className="record-row">
              <div>
                <span>Resolved address</span>
                <AddressDisplay address={record.resolved} />
              </div>
              <CopyButton
                value={record.resolved}
                label="Copy resolved address"
              />
            </div>
            <div className="record-row">
              <div>
                <span>Registration status</span>
                <strong>{record.status}</strong>
                <small>Expires {new Date(Number(record.expires_at) * 1000).toLocaleDateString()}</small>
              </div>
            </div>
            <div className="record-row">
              <div>
                <span>Owner</span>
                <AddressDisplay address={record.owner} />
              </div>
              <CopyButton value={record.owner} label="Copy owner address" />
            </div>
            <InlineNotice>
              Direct payments target the resolved address. Ownership and payment
              destination can differ.
            </InlineNotice>
            {!isActive && (
              <InlineNotice tone="warning" title="Resolution is paused">
                This name cannot receive direct payments until it is renewed and active.
              </InlineNotice>
            )}
          </section>
          <section className="surface">
            <header className="surface-head">
              <div>
                <p className="eyebrow">Public profile</p>
                <h2>Identity details</h2>
              </div>
            </header>
            <div className="social-list">
              {record.twitter && (
                <ExternalLink href={`https://x.com/${record.twitter}`}>
                  X · @{record.twitter} ↗
                </ExternalLink>
              )}
              {record.github && (
                <ExternalLink href={`https://github.com/${record.github}`}>
                  GitHub · {record.github} ↗
                </ExternalLink>
              )}
              {record.website && (
                <ExternalLink href={record.website}>Website ↗</ExternalLink>
              )}
              {!record.twitter && !record.github && !record.website && (
                <p className="muted">No public links have been added.</p>
              )}
            </div>
          </section>
          <section className="surface">
            <header className="surface-head">
              <div>
                <p className="eyebrow">Profile review</p>
                <h2>Source-backed challenge</h2>
              </div>
            </header>
            <p className="muted">
              Any connected wallet may submit a public HTTPS source with a DNS hostname and a specific policy claim. Validators independently retrieve and review that source before a suspension can be recorded.
            </p>
            {challenge?.found && (
              <div className="record-row">
                <div>
                  <span>Latest decision</span>
                  <strong>{challenge.action} · {challenge.category}</strong>
                  <small>{challenge.summary}</small>
                  {challenge.challenged_profile && (
                    <small>
                      Decision is bound to the challenged profile snapshot
                      returned by the contract.
                    </small>
                  )}
                  {challenge.source_url && <ExternalLink href={challenge.source_url}>View evidence source ↗</ExternalLink>}
                </div>
                <StatusBadge tone={challenge.action === "suspend" ? "warning" : "success"}>
                  {Math.round((challenge.confidence_bps || 0) / 100)}% confidence
                </StatusBadge>
              </div>
            )}
            <button className="button secondary" disabled={!isActive || !address} onClick={() => setAction("challenge")}>
              Challenge public profile
            </button>
          </section>
        </div>
        <aside className="owner-panel">
          <p className="eyebrow">Owner controls</p>
          <h2>{isOwner ? "Manage identity" : "Public record"}</h2>
          {isOwner ? (
            <>
              <p>
                Each change requires an injected-wallet signature and is
                confirmed by a matching contract read.
              </p>
              <button
                className="owner-action"
                onClick={() => setAction("profile")}
                disabled={record.status === "expired"}
              >
                <span>
                  {record.status === "suspended"
                    ? "Remediate and request reinstatement"
                    : record.status === "expired"
                      ? "Renew before editing"
                    : "Edit profile"}
                </span>
                <small>
                  {record.status === "suspended"
                    ? "Change the profile and re-evaluate the stored evidence"
                    : record.status === "expired"
                      ? "Expired profiles cannot be edited until renewal"
                    : "Bio, avatar, and social links"}
                </small>
              </button>
              <button
                className="owner-action"
                onClick={() => setAction("address")}
                disabled={!isActive}
              >
                <span>Set resolved address</span>
                <small>Changes future direct-send destination</small>
              </button>
              <button
                className="owner-action"
                onClick={() => setAction("primary")}
                disabled={primary || !isActive}
              >
                <span>Make primary</span>
                <small>Updates reverse resolution</small>
              </button>
              <button
                className="owner-action danger-text"
                onClick={() => setAction("transfer")}
                disabled={!isActive}
              >
                <span>Transfer ownership</span>
                <small>Also resets resolution to new owner</small>
              </button>
              <button className="owner-action" onClick={() => setAction("renew")}>
                <span>Renew registration</span>
                <small>Extends the registration by one year</small>
              </button>
              <button className="owner-action" onClick={() => setAction("recovery")} disabled={!isActive}>
                <span>Configure recovery</span>
                <small>{record.recovery_configured ? "Replace the recovery address" : "Set a delayed recovery address"}</small>
              </button>
              {record.recovery_configured && (
                <button className="owner-action" onClick={() => setAction("clear_recovery")}>
                  <span>Clear recovery</span>
                  <small>Removes recovery access and any pending request</small>
                </button>
              )}
              {record.recovery_pending && (
                <button className="owner-action" onClick={() => setAction("cancel_recovery")}>
                  <span>Cancel pending recovery</span>
                  <small>Stops the delayed transfer before execution</small>
                </button>
              )}
              <button
                className="owner-action danger-text"
                onClick={() => setAction("release")}
                disabled={record.status === "suspended"}
              >
                <span>Release name</span>
                <small>
                  {record.status === "suspended"
                    ? "Reinstate before release; evidence cannot be erased"
                    : "Permanently removes this registration for anyone to claim"}
                </small>
              </button>
            </>
          ) : (
            <p className="muted">
              Connect the owner wallet to reveal management controls.
            </p>
          )}
          {isRecoveryAddress && isActive && !record.recovery_pending && (
            <button className="owner-action" onClick={() => setAction("initiate_recovery")}>
              <span>Start recovery</span>
              <small>Begins the on-chain seven-day recovery delay</small>
            </button>
          )}
          {record.recovery_pending && (
            <button className="owner-action danger-text" onClick={() => setAction("execute_recovery")}>
              <span>Execute recovery</span>
              <small>Available after the recorded recovery delay</small>
            </button>
          )}
        </aside>
      </div>
      <OwnerDialog
        action={action}
        record={record}
        profile={profile}
        setProfile={setProfile}
        target={target}
        setTarget={setTarget}
        sourceUrl={sourceUrl}
        setSourceUrl={setSourceUrl}
        claim={claim}
        setClaim={setClaim}
        busy={busy}
        error={submitError}
        onClose={() => {
          if (!busy) {
            setAction(null);
            setSubmitError("");
          }
        }}
        onConfirm={submit}
      />
    </section>
  );
}
function OwnerDialog({
  action,
  record,
  profile,
  setProfile,
  target,
  setTarget,
  sourceUrl,
  setSourceUrl,
  claim,
  setClaim,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  action: Action;
  record: NameRecord;
  profile: Profile;
  setProfile: (p: Profile) => void;
  target: string;
  setTarget: (v: string) => void;
  sourceUrl: string;
  setSourceUrl: (v: string) => void;
  claim: string;
  setClaim: (v: string) => void;
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const title = {
    profile:
      record.status === "suspended"
        ? "Remediate suspended profile"
        : "Edit public profile",
    address: "Change resolved address",
    primary: "Make primary identity",
    transfer: "Transfer ownership",
    renew: "Renew registration",
    release: "Release registration",
    recovery: "Configure recovery",
    clear_recovery: "Clear recovery",
    initiate_recovery: "Start recovery",
    cancel_recovery: "Cancel recovery",
    execute_recovery: "Execute recovery",
    challenge: "Challenge public profile",
  }[action || "profile"];
  const targetValid = isAddress(target);
  const invalidUrl =
    (profile.avatar && !safeExternalUrl(profile.avatar)) ||
    (profile.website && !safeExternalUrl(profile.website));
  const challengeInvalid = action === "challenge" && (!safeEvidenceUrl(sourceUrl) || !claim.trim());
  const targetAction = action === "address" || action === "transfer" || action === "recovery" || action === "initiate_recovery";
  const normalizedProfile = normalizeProfile(profile);
  const profileChanged = (Object.keys(normalizedProfile) as (keyof Profile)[]).some(
    (field) => normalizedProfile[field] !== (record[field] || ""),
  );
  const reinstatementInvalid =
    action === "profile" && record.status === "suspended" && !profileChanged;
  return (
    <ConfirmDialog
      open={!!action}
      title={title}
      confirmLabel={
        action === "transfer"
          ? "Transfer ownership"
          : action === "release"
            ? "Release name"
            : action === "challenge"
              ? "Submit challenge"
              : action === "profile" && record.status === "suspended"
                ? "Request reinstatement"
              : action === "execute_recovery"
                ? "Execute recovery"
                : "Submit change"
      }
      destructive={action === "transfer" || action === "release" || action === "execute_recovery"}
      confirmDisabled={Boolean(
        (targetAction && !targetValid) ||
          invalidUrl ||
          challengeInvalid ||
          reinstatementInvalid,
      )}
      busy={busy}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      {action === "profile" && (
        <div className="form-stack">
          {record.status === "suspended" && (
            <InlineNotice tone="warning" title="Source-backed reinstatement required">
              Change the profile to address the stored challenge. Validators will
              independently fetch its original source and decide whether that
              finding still applies before this name can become active.
            </InlineNotice>
          )}
          {(["bio", "avatar", "twitter", "github", "website"] as const).map(
            (field) => (
              <label className="field" key={field}>
                <span>
                  {field[0].toUpperCase() + field.slice(1)}
                  <small>
                    {profile[field].length}/{PROFILE_LIMITS[field]}
                  </small>
                </span>
                {field === "bio" ? (
                  <textarea
                    rows={3}
                    maxLength={PROFILE_LIMITS[field]}
                    value={profile[field]}
                    onChange={(e) =>
                      setProfile({ ...profile, [field]: e.target.value })
                    }
                  />
                ) : (
                  <input
                    maxLength={PROFILE_LIMITS[field]}
                    value={profile[field]}
                    onChange={(e) =>
                      setProfile({ ...profile, [field]: e.target.value })
                    }
                  />
                )}
              </label>
            ),
          )}
          {invalidUrl && (
            <p className="field-error">
              URLs must be valid HTTP(S) destinations.
            </p>
          )}
          {reinstatementInvalid && (
            <p className="field-error">
              A suspended profile cannot be reinstated with unchanged fields.
            </p>
          )}
        </div>
      )}
      {(action === "address" || action === "transfer" || action === "recovery" || action === "initiate_recovery") && (
        <>
          <label className="field">
            <span>
              {action === "address"
                ? "New resolved address"
                : action === "transfer"
                  ? "New owner address"
                  : action === "recovery"
                    ? "Recovery address"
                    : "New owner address"}
            </span>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="0x…"
            />
            <em className={!target || targetValid ? "" : "field-error"}>
              {target && !targetValid
                ? "Enter a non-zero 42-character address."
                : action === "transfer"
                  ? "The new owner receives ownership and resolution resets to that address."
                  : action === "recovery"
                    ? "This address can initiate a delayed ownership recovery."
                    : action === "initiate_recovery"
                      ? "The new owner can take control only after the seven-day delay."
                  : "Future direct sends will use this address."}
            </em>
          </label>
        </>
      )}
      {action === "primary" && (
        <InlineNotice>
          This wallet’s reverse resolver will return{" "}
          <NameBadge name={record.name} />.
        </InlineNotice>
      )}
      {action === "transfer" && (
        <InlineNotice tone="warning" title="This changes control">
          You will lose owner controls. If this is your primary name, that
          reverse record is cleared.
        </InlineNotice>
      )}
      {action === "renew" && (
        <InlineNotice>
          Renewal adds one year from the current expiry, or one year from now if
          the name has already expired. Renewal preserves a suspended status and
          does not bypass source-backed reinstatement.
        </InlineNotice>
      )}
      {action === "release" && (
        <InlineNotice tone="warning" title="This cannot be undone">
          The record, profile, and recovery configuration will be removed. Any
          non-suspension challenge is removed. A suspended record cannot use
          this action, and an expired suspension remains attached to the name
          until a changed profile passes source-backed review.
        </InlineNotice>
      )}
      {action === "clear_recovery" && (
        <InlineNotice tone="warning">
          Clearing recovery also cancels any pending recovery transfer.
        </InlineNotice>
      )}
      {action === "cancel_recovery" && (
        <InlineNotice>
          Only the current owner can cancel a recovery before execution.
        </InlineNotice>
      )}
      {action === "execute_recovery" && (
        <InlineNotice tone="warning">
          Execution succeeds only after the contract’s recorded recovery delay. The recovered record resets its resolver and removes recovery configuration.
        </InlineNotice>
      )}
      {action === "challenge" && (
        <div className="form-stack">
          <label className="field">
            <span>Public evidence URL</span>
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://example.org/evidence" maxLength={256} />
            <em>Use a publicly reachable HTTPS source with a DNS hostname. Validators fetch it independently.</em>
          </label>
          <label className="field">
            <span>Specific policy claim</span>
            <textarea rows={3} value={claim} onChange={(e) => setClaim(e.target.value)} maxLength={280} placeholder="Explain the claimed impersonation, deception, or abuse." />
          </label>
          {(!safeEvidenceUrl(sourceUrl) || !claim.trim()) && (
            <p className="field-error">Provide a public HTTPS source with a DNS hostname and a specific claim.</p>
          )}
        </div>
      )}
      {error && <InlineNotice tone="error">{error}</InlineNotice>}
    </ConfirmDialog>
  );
}
