'use client'
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'
import { getNamesByOwner, shortAddress, formatGEN, normalizeName } from '@/lib/genlayer'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function MyNamesPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const [names, setNames] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!address) return
    setLoading(true)
    getNamesByOwner(address).then(n => {
      setNames(Array.isArray(n) ? n : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [address])

  if (!isConnected) return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 }}>
      <p className="font-display" style={{ fontSize: 22, fontWeight: 700 }}>Connect your wallet</p>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 8 }}>to view your .gen names</p>
      <ConnectButton />
      <BottomNav />
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', padding: '60px 20px 120px', maxWidth: 600, margin: '0 auto' }}>
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>Wallet</p>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>My Names</h1>
        <div className="address-chip">{shortAddress(address || '')}</div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : names.length === 0 ? (
        <div className="card fade-up" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 16 }}>🏷</p>
          <p className="font-display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No names yet</p>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>Register your first .gen name</p>
          <button className="btn-holo" style={{ padding: '12px 24px' }} onClick={() => router.push('/')}>Search names →</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {names.map((n, i) => {
            const displayName = n.name || `${normalizeName(n.name || '')}.gen`
            const hasBalance = BigInt(n.balance || '0') > 0n
            return (
              <div
                key={i}
                className="card fade-up"
                style={{ padding: '20px 20px', cursor: 'pointer', animationDelay: `${i * 0.06}s` }}
                onClick={() => router.push(`/name/${displayName.replace('.gen', '')}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {n.avatar ? (
                      <img src={n.avatar} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #7B2FFF, #FF2FA0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white', fontFamily: 'Syne, sans-serif', flexShrink: 0 }}>
                        {(displayName[0] || '?').toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="name-display" style={{ fontSize: 18 }}>{displayName}</p>
                      {n.bio && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{n.bio.slice(0, 50)}{n.bio.length > 50 ? '…' : ''}</p>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {hasBalance && (
                      <span className="tag tag-success">{formatGEN(n.balance)}</span>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>→ View</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <BottomNav />
    </main>
  )
}
