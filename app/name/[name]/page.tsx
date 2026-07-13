"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAccount } from "wagmi";
import { BRADBURY_EXPLORER_URL, CONTRACT_ADDRESS } from "@/lib/config";
import { getRecord, reverseResolve } from "@/lib/genlayer";
import {
  isAddress,
  normalizeProfile,
  PROFILE_LIMITS,
  safeExternalUrl,
  validateName,
} from "@/lib/domain";
import { writeGns } from "@/lib/wallet";
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
type Action = "profile" | "address" | "primary" | "transfer" | null;
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
}
export default function NamePage() {
  const params = useParams<{ name: string }>();
  const validation = validateName(params.name);
  const name = validation.canonical;
  const { address } = useAccount();
  const { add } = useTransactions();
  const [record, setRecord] = useState<NameRecord | null>(null);
  const [primary, setPrimary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState<Action>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [target, setTarget] = useState("");
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
      const value = await getRecord(name);
      setRecord(value);
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
  async function submit() {
    if (!address || !action || !record) return;
    setBusy(true);
    setSubmitError("");
    try {
      let method: "update_profile" | "set_address" | "set_primary" | "transfer";
      let args: string[];
      let expected: ExpectedState;
      let label: string;
      if (action === "profile") {
        const p = normalizeProfile(profile);
        method = "update_profile";
        args = [name, p.avatar, p.bio, p.twitter, p.github, p.website];
        expected = { action: "update_profile", name, values: p };
        label = `Update ${record.name} profile`;
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
      } else {
        method = "transfer";
        args = [name, target];
        expected = { action: "transfer", name, values: { owner: target } };
        label = `Transfer ${record.name}`;
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
              <StatusBadge tone="accent">On-chain identity</StatusBadge>
              {primary && (
                <StatusBadge tone="success">Primary name</StatusBadge>
              )}
            </div>
            <h1>{record.name}</h1>
            <p>{record.bio || "This identity has not added a bio yet."}</p>
          </div>
        </div>
        <div className="profile-actions">
          <Link className="button primary" href={`/send?name=${name}`}>
            Send GEN directly
          </Link>
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
                <span>Owner</span>
                <AddressDisplay address={record.owner} />
              </div>
              <CopyButton value={record.owner} label="Copy owner address" />
            </div>
            <InlineNotice>
              Direct payments target the resolved address. Ownership and payment
              destination can differ.
            </InlineNotice>
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
              >
                <span>Edit profile</span>
                <small>Bio, avatar, and social links</small>
              </button>
              <button
                className="owner-action"
                onClick={() => setAction("address")}
              >
                <span>Set resolved address</span>
                <small>Changes future direct-send destination</small>
              </button>
              <button
                className="owner-action"
                onClick={() => setAction("primary")}
                disabled={primary}
              >
                <span>Make primary</span>
                <small>Updates reverse resolution</small>
              </button>
              <button
                className="owner-action danger-text"
                onClick={() => setAction("transfer")}
              >
                <span>Transfer ownership</span>
                <small>Also resets resolution to new owner</small>
              </button>
            </>
          ) : (
            <p className="muted">
              Connect the owner wallet to reveal management controls.
            </p>
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
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const title = {
    profile: "Edit public profile",
    address: "Change resolved address",
    primary: "Make primary identity",
    transfer: "Transfer ownership",
  }[action || "profile"];
  const targetValid = isAddress(target);
  const invalidUrl =
    (profile.avatar && !safeExternalUrl(profile.avatar)) ||
    (profile.website && !safeExternalUrl(profile.website));
  return (
    <ConfirmDialog
      open={!!action}
      title={title}
      confirmLabel={
        action === "transfer" ? "Transfer ownership" : "Submit change"
      }
      destructive={action === "transfer"}
      busy={busy}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      {action === "profile" && (
        <div className="form-stack">
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
        </div>
      )}
      {(action === "address" || action === "transfer") && (
        <>
          <label className="field">
            <span>
              {action === "address"
                ? "New resolved address"
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
      {error && <InlineNotice tone="error">{error}</InlineNotice>}
    </ConfirmDialog>
  );
}
