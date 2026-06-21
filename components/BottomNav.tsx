'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export function BottomNav() {
  const path = usePathname()

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: 0, right: 0,
      display: 'flex', justifyContent: 'center', zIndex: 100,
      padding: '0 16px', gap: 10, flexWrap: 'wrap'
    }}>
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
      {/* Full ConnectButton with disconnect support */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'rgba(18,18,18,0.9)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999,
        padding: '4px 8px'
      }}>
        <ConnectButton
          accountStatus="full"
          showBalance={false}
          chainStatus="none"
        />
      </div>
    </div>
  )
}
