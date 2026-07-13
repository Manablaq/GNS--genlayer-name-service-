"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { getNamesByOwner, getRecord, reverseResolve } from "@/lib/genlayer";
import { pageOffset } from "@/lib/domain";
import {
  AddressDisplay,
  EmptyState,
  ErrorState,
  NameBadge,
  Skeleton,
  StatusBadge,
} from "@/components/ui";

const PAGE_SIZE = 12;

interface OwnerIndex {
  names?: string[];
  total?: number | string;
}

interface NameRecord {
  name: string;
  resolved?: string;
  avatar?: string;
  bio?: string;
  twitter?: string;
  github?: string;
  website?: string;
}

interface ReverseRecord {
  found?: boolean;
  name?: string;
}

export default function MyNamesPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [records, setRecords] = useState<NameRecord[]>([]);
  const [primary, setPrimary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!address) return;
    await Promise.resolve();
    setLoading(true);
    setError("");
    try {
      const result = (await getNamesByOwner(
        address,
        pageOffset(page, PAGE_SIZE),
        PAGE_SIZE,
      )) as OwnerIndex;
      const details = await Promise.all(
        (result.names || []).map(
          (name) => getRecord(name) as Promise<NameRecord>,
        ),
      );
      const reverse = (await reverseResolve(address)) as ReverseRecord;
      setTotal(Number(result.total || 0));
      setRecords(details);
      setPrimary(reverse.found ? reverse.name || "" : "");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to read owner index.",
      );
    } finally {
      setLoading(false);
    }
  }, [address, page]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (!isConnected) {
    return (
      <section className="route-page centered">
        <EmptyState title="Connect to view your names">
          Ownership is read directly from the active contract for the connected
          wallet.
          <button className="button primary" onClick={openConnectModal}>
            Connect injected wallet
          </button>
        </EmptyState>
      </section>
    );
  }

  return (
    <section className="route-page">
      <header className="page-heading split">
        <div>
          <p className="eyebrow">Owner dashboard</p>
          <h1>My names</h1>
          <p>Manage identities indexed to your connected wallet.</p>
        </div>
        <AddressDisplay address={address || ""} />
      </header>
      <div className="dashboard-stats">
        <article>
          <span>Total owned</span>
          <strong>{loading ? "—" : total}</strong>
        </article>
        <article>
          <span>Primary identity</span>
          <strong className="small">{primary || "Not set"}</strong>
        </article>
        <article>
          <span>Page</span>
          <strong>{page}</strong>
        </article>
      </div>
      {error ? (
        <ErrorState message={error} retry={load} />
      ) : loading ? (
        <NameGridSkeleton />
      ) : records.length === 0 ? (
        <EmptyState title="No .gen names yet">
          Your first identity will appear here after registration is confirmed.
          <Link href="/" className="button primary">
            Search available names
          </Link>
        </EmptyState>
      ) : (
        <div className="name-grid">
          {records.map((record) => (
            <NameCard
              key={record.name}
              record={record}
              primary={primary}
              address={address}
            />
          ))}
        </div>
      )}
      {total > PAGE_SIZE && (
        <nav className="pagination" aria-label="Names pagination">
          <button
            className="button ghost"
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </button>
          <span>
            Showing {pageOffset(page, PAGE_SIZE) + 1}–
            {Math.min(total, pageOffset(page, PAGE_SIZE) + PAGE_SIZE)} of{" "}
            {total}
          </span>
          <button
            className="button ghost"
            disabled={pageOffset(page + 1, PAGE_SIZE) >= total}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}

function NameGridSkeleton() {
  return (
    <div className="name-grid">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="name-card" key={index}>
          <Skeleton className="avatar" />
          <Skeleton className="line" />
          <Skeleton className="line short" />
        </div>
      ))}
    </div>
  );
}

function NameCard({
  record,
  primary,
  address,
}: {
  record: NameRecord;
  primary: string;
  address?: string;
}) {
  const complete = [
    record.avatar,
    record.bio,
    record.twitter,
    record.github,
    record.website,
  ].filter(Boolean).length;
  const ownerResolver =
    record.resolved?.toLowerCase() === address?.toLowerCase();
  return (
    <article className="name-card">
      <div className="card-top">
        <div className="avatar-initial">{record.name[0].toUpperCase()}</div>
        <div>
          <NameBadge name={record.name} />
          {primary === record.name && (
            <StatusBadge tone="accent">Primary</StatusBadge>
          )}
        </div>
      </div>
      <dl>
        <div>
          <dt>Profile</dt>
          <dd>{complete}/5 fields</dd>
        </div>
        <div>
          <dt>Resolver</dt>
          <dd>{ownerResolver ? "Owner wallet" : "Custom address"}</dd>
        </div>
      </dl>
      <div
        className="progress"
        aria-label={`Profile ${complete} of 5 fields complete`}
      >
        <i style={{ width: `${complete * 20}%` }} />
      </div>
      <div className="card-actions">
        <Link
          href={`/name/${record.name.replace(".gen", "")}`}
          className="button secondary compact"
        >
          Manage
        </Link>
        <Link
          href={`/send?name=${record.name}`}
          className="button ghost compact"
        >
          Send
        </Link>
      </div>
    </article>
  );
}
