"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { CONTRACT_ADDRESS, BRADBURY_EXPLORER_URL } from "@/lib/config";
import { shortAddress } from "@/lib/genlayer";
import { isPendingState } from "@/lib/transactions";
import { NetworkBadge } from "./ui";
import { ScrollProgress } from "./Motion";
import { useTransactions } from "./TransactionProvider";

const links = [
  ["/", "Discover"],
  ["/my-names", "My names"],
  ["/send", "Send"],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { active, setOpen } = useTransactions();
  const pending = active.filter((tx) => isPendingState(tx.state)).length;

  return (
    <>
      <ScrollProgress />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="app-header">
        <Link href="/" className="brand" aria-label="GNS home">
          <span className="brand-mark" aria-hidden="true">
            G
          </span>
          <span>
            <strong>GNS</strong>
            <small>Identity resolver</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={isCurrent(path, href) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <NetworkBadge />
          {active.length > 0 && (
            <button
              className="pending-button"
              onClick={() => setOpen(true)}
              aria-label={`Open transaction activity; ${pending} pending, ${active.length} total`}
            >
              Activity {pending > 0 && <span>{pending} pending</span>}
            </button>
          )}
          {isConnected ? (
            <div className="wallet-control">
              <button
                className="wallet-address"
                onClick={() => setOpen(true)}
                title={address}
              >
                {shortAddress(address || "")}
              </button>
              <button className="disconnect" onClick={() => disconnect()}>
                Disconnect
              </button>
            </div>
          ) : (
            <button
              className="button primary compact"
              onClick={openConnectModal}
            >
              Connect wallet
            </button>
          )}
        </div>
        {isConnected && chainId !== 4221 && (
          <div className="network-warning" role="alert">
            Wrong network — switch the injected wallet to Bradbury (4221).
          </div>
        )}
      </header>
      <main id="main-content" className="app-main">
        {children}
      </main>
      <footer className="app-footer">
        <div>
          <Link href="/" className="brand footer-brand">
            <span className="brand-mark">G</span>
            <span>
              <strong>GNS</strong>
              <small>Human-readable identity on GenLayer</small>
            </span>
          </Link>
          <p>
            Resolver-only infrastructure. GNS never custodies direct payments.
          </p>
        </div>
        <div className="footer-proof">
          <span>
            <i />
            Bradbury testnet · Chain 4221
          </span>
          <a
            href={`${BRADBURY_EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Verified contract · {shortAddress(CONTRACT_ADDRESS)} ↗
          </a>
          <a
            href="https://github.com/Manablaq/GNS--genlayer-name-service-"
            target="_blank"
            rel="noopener noreferrer"
          >
            Repository ↗
          </a>
        </div>
      </footer>
      <nav className="mobile-nav" aria-label="Mobile primary">
        {links.map(([href, label], index) => (
          <Link
            key={href}
            href={href}
            aria-current={isCurrent(path, href) ? "page" : undefined}
          >
            <span aria-hidden="true">{["⌕", "◇", "↗"][index]}</span>
            {label}
          </Link>
        ))}
        {active.length > 0 && (
          <button
            onClick={() => setOpen(true)}
            aria-label={`Open transaction activity; ${pending} pending, ${active.length} total`}
          >
            <span aria-hidden="true">{pending > 0 ? pending : "✓"}</span>
            Activity
          </button>
        )}
      </nav>
    </>
  );
}

function isCurrent(path: string, href: string) {
  return path === href || (href === "/" && path.startsWith("/name/"));
}
