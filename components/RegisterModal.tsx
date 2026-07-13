"use client";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import {
  PROFILE_LIMITS,
  normalizeProfile,
  safeExternalUrl,
} from "@/lib/domain";
import { writeGns } from "@/lib/wallet";
import { useTransactions } from "./TransactionProvider";
import { registrationDraftKey } from "@/lib/transactions";
import { InlineNotice } from "./ui";
const empty = { avatar: "", bio: "", twitter: "", github: "", website: "" };
export function RegisterModal({
  name,
  onClose,
}: {
  name: string;
  onClose: () => void;
}) {
  const { address } = useAccount();
  const { add } = useTransactions();
  const dialogRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(() => {
    try {
      return {
        ...empty,
        ...JSON.parse(
          sessionStorage.getItem(registrationDraftKey(name)) || "{}",
        ),
      };
    } catch {
      return empty;
    }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const normalized = normalizeProfile(profile);
  const display = `${name}.gen`;
  useEffect(() => {
    busyRef.current = busy;
    onCloseRef.current = onClose;
  }, [busy, onClose]);
  useEffect(() => {
    sessionStorage.setItem(registrationDraftKey(name), JSON.stringify(profile));
  }, [profile, name]);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const frame = requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    });
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) onCloseRef.current();
      if (event.key !== "Tab") return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])',
      );
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("keydown", key);
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  const invalidUrl =
    (normalized.avatar && !safeExternalUrl(normalized.avatar)) ||
    (normalized.website && !safeExternalUrl(normalized.website));
  const invalidSocial = [normalized.twitter, normalized.github].some(
    (v) => v && !/^[A-Za-z0-9](?:[A-Za-z0-9_-]{0,62}[A-Za-z0-9])?$/.test(v),
  );
  async function submit() {
    if (!address) return;
    setBusy(true);
    setError("");
    try {
      const values = [
        normalized.avatar,
        normalized.bio,
        normalized.twitter,
        normalized.github,
        normalized.website,
      ];
      const optimisticData = Object.fromEntries(
        ["avatar", "bio", "twitter", "github", "website"].map((k, i) => [
          k,
          values[i],
        ]),
      );
      sessionStorage.setItem(
        registrationDraftKey(name),
        JSON.stringify(optimisticData),
      );
      const hash = await writeGns(address, "register", [name, ...values]);
      add({
        chainId: 4221,
        wallet: address,
        hash,
        action: "register",
        label: `Register ${display}`,
        expected: { action: "register", name, values: optimisticData },
        optimisticData,
      });
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The wallet did not submit the transaction.",
      );
      setBusy(false);
    }
  }
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="dialog registration-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-title"
      >
        <div className="dialog-head">
          <div>
            <p className="eyebrow">Claim identity · Step {step + 1} of 3</p>
            <h2 id="register-title">{display}</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close registration"
          >
            ×
          </button>
        </div>
        <div className="step-indicator" aria-hidden="true">
          <i className={step >= 0 ? "active" : ""} />
          <i className={step >= 1 ? "active" : ""} />
          <i className={step >= 2 ? "active" : ""} />
        </div>
        {step === 0 && (
          <div className="dialog-body">
            <h3>Confirm your name</h3>
            <p>
              You will own this resolver record from the connected wallet.
              Registration is moderated for deceptive or abusive identity
              claims.
            </p>
            <InlineNotice
              tone="warning"
              title="Policy moderation, not identity proof"
            >
              AI-assisted consensus evaluates the name against registry policy.
              Approval does not verify who you are or endorse the profile.
            </InlineNotice>
          </div>
        )}
        {step === 1 && (
          <div className="dialog-body form-stack">
            <h3>Build the profile</h3>
            <Field
              label="Bio"
              value={profile.bio}
              limit={PROFILE_LIMITS.bio}
              multiline
              onChange={(v) => setProfile({ ...profile, bio: v })}
              hint="A concise public description."
            />
            <Field
              label="Avatar URL"
              value={profile.avatar}
              limit={PROFILE_LIMITS.avatar}
              onChange={(v) => setProfile({ ...profile, avatar: v })}
              hint="https://example.com/avatar.png"
            />
            <div className="field-grid">
              <Field
                label="X username"
                value={profile.twitter}
                limit={PROFILE_LIMITS.twitter}
                onChange={(v) => setProfile({ ...profile, twitter: v })}
                hint="Example: genlayer"
              />
              <Field
                label="GitHub username"
                value={profile.github}
                limit={PROFILE_LIMITS.github}
                onChange={(v) => setProfile({ ...profile, github: v })}
                hint="Example: genlayerlabs"
              />
            </div>
            <Field
              label="Website"
              value={profile.website}
              limit={PROFILE_LIMITS.website}
              onChange={(v) => setProfile({ ...profile, website: v })}
              hint="https://example.com"
            />
            {invalidUrl && (
              <p className="field-error">
                Avatar and website must be valid HTTP(S) URLs.
              </p>
            )}
            {invalidSocial && (
              <p className="field-error">
                Social usernames may use letters, numbers, underscores, and
                hyphens.
              </p>
            )}
          </div>
        )}
        {step === 2 && (
          <div className="dialog-body">
            <h3>Review before signing</h3>
            <dl className="review-list">
              <div>
                <dt>Name</dt>
                <dd>{display}</dd>
              </div>
              <div>
                <dt>Owner / initial resolver</dt>
                <dd className="break-anywhere">{address}</dd>
              </div>
              <div>
                <dt>Profile</dt>
                <dd>
                  {normalized.bio ||
                  normalized.avatar ||
                  normalized.twitter ||
                  normalized.github ||
                  normalized.website
                    ? "Included"
                    : "Empty — editable later"}
                </dd>
              </div>
              <div>
                <dt>Network</dt>
                <dd>GenLayer Bradbury · 4221</dd>
              </div>
            </dl>
            <p className="muted">
              After wallet submission, this dialog closes. Consensus and the
              resulting owner record are checked globally while you continue
              using the app.
            </p>
            {error && (
              <InlineNotice tone="error" title="Submission not completed">
                {error}
              </InlineNotice>
            )}
          </div>
        )}
        <div className="dialog-actions">
          {step > 0 ? (
            <button
              className="button ghost"
              onClick={() => setStep(step - 1)}
              disabled={busy}
            >
              Back
            </button>
          ) : (
            <button className="button ghost" onClick={onClose}>
              Cancel
            </button>
          )}
          {step < 2 ? (
            <button
              className="button primary"
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !!(invalidUrl || invalidSocial)}
            >
              Continue
            </button>
          ) : (
            <button
              className="button primary"
              onClick={submit}
              disabled={busy || !address}
            >
              {busy ? "Confirm in wallet…" : "Sign registration"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
function Field({
  label,
  value,
  limit,
  onChange,
  hint,
  multiline = false,
}: {
  label: string;
  value: string;
  limit: number;
  onChange: (v: string) => void;
  hint: string;
  multiline?: boolean;
}) {
  const id = label.toLowerCase().replace(/\s/g, "-");
  return (
    <label className="field" htmlFor={id}>
      <span>
        {label}
        <small>
          {value.length}/{limit}
        </small>
      </span>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          maxLength={limit}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      ) : (
        <input
          id={id}
          value={value}
          maxLength={limit}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      <em>{hint}</em>
    </label>
  );
}
