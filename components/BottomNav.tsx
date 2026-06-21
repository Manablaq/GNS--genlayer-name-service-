'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccount, useDisconnect } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'

export function BottomNav() {
  const path = usePathname()
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()

  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''

  return (
    <>
      {/* Wallet button — top right, always visible */}
      <div style={{
        position: 'fixed', top: 16, right: 16, zIndex: 200,
      }}>
        {isConnected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              background: 'rgba(18,18,18,0.95)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 10,
              padding: '7px 14px',
              fontSize: 13,
              fontFamily: 'JetBrains Mono, monospace',
              color: 'rgba(235,235,235,0.8)',
            }}>
              {short}
            </div>
            <button
              onClick={() => disconnect()}
              style={{
                background: 'rgba(255,59,59,0.15)',
                border: '1px solid rgba(255,59,59,0.3)',
                borderRadius: 10,
                padding: '7px 14px',
                fontSize: 13,
                color: '#FF3B3B',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                transition: 'background 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,59,59,0.25)')}
              onMouseOut={e => (e.currentTarget.style.background = 'rgba(255,59,59,0.15)')}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={openConnectModal}
            className="btn-holo"
            style={{ padding: '9px 20px', fontSize: 14 }}
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <Link href="/" className={`nav-item ${path === '/' ? 'active' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          Search
        </Link>
        <Link href="/my-names" className={`nav-item ${path === '/my-names' ? 'active' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          My Names
        </Link>
        <Link href="/send" className={`nav-item ${path === '/send' ? 'active' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
          </svg>
          Send GEN
        </Link>
      </nav>
    </>
  )
}
