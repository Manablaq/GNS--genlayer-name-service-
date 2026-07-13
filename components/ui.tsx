"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { safeExternalUrl } from "@/lib/domain";

export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`skeleton ${className}`} />;
}
export function StatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "error" | "warning" | "accent";
  children: React.ReactNode;
}) {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}
export function InlineNotice({
  tone = "neutral",
  title,
  children,
}: {
  tone?: "neutral" | "success" | "error" | "warning";
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`notice notice-${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {title && <strong>{title}</strong>}
      <div>{children}</div>
    </div>
  );
}
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-mark" aria-hidden="true">
        ◇
      </div>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function ErrorState({
  title = "Unable to load data",
  message,
  retry,
}: {
  title?: string;
  message?: string;
  retry?: () => void;
}) {
  return (
    <div className="empty-state" role="alert">
      <div className="empty-mark error-mark" aria-hidden="true">
        !
      </div>
      <h2>{title}</h2>
      <p>{message || "The Bradbury RPC did not return a usable response."}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Retry read
        </button>
      )}
    </div>
  );
}
export function SectionHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="section-header">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </header>
  );
}
export function NameBadge({ name }: { name: string }) {
  const value = name.endsWith(".gen") ? name : `${name}.gen`;
  return <span className="name-badge">{value}</span>;
}
export function NetworkBadge() {
  return (
    <span className="network-badge">
      <i aria-hidden="true" />
      Bradbury · 4221
    </span>
  );
}
export function AddressDisplay({
  address,
  label = "Address",
}: {
  address: string;
  label?: string;
}) {
  return (
    <span className="address-display" title={`${label}: ${address}`}>
      {address}
    </span>
  );
}
export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button
      className="copy-button"
      onClick={copy}
      aria-label={`${label}: ${value}`}
    >
      {copied ? "Copied" : "Copy"}
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}
export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const safe = safeExternalUrl(href);
  if (!safe) return null;
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
export function RouteLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Confirm",
  busy = false,
  destructive = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
      if (e.key === "Tab") {
        const dialog = document.querySelector("[data-dialog]");
        const controls = dialog?.querySelectorAll<HTMLElement>(
          'button,input,a,[tabindex]:not([tabindex="-1"])',
        );
        if (!controls?.length) return;
        const first = controls[0],
          last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>("[data-dialog] button")?.focus(),
    );
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [open, busy, onClose]);
  if (!open) return null;
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        data-dialog
      >
        <div className="dialog-head">
          <h2 id="dialog-title">{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">
          <button className="button ghost" onClick={onClose} disabled={busy}>
            Go back
          </button>
          <button
            className={`button ${destructive ? "danger" : "primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Confirm in wallet…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
