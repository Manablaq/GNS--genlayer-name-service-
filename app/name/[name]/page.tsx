'use client'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { BottomNav } from '@/components/BottomNav'
import { getRecord, shortAddress } from '@/lib/genlayer'
import { usePolling } from '@/hooks/usePolling'

export default function NamePage() {
  const { name } = useParams<{ name: string }>()
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { data: record, loading } = usePolling(() => getRecord(name), 5000)

  const displayName = `${name}.gen`
  const isOwner = address?.toLowerCase() === record?.owner?.toLowerCase()

  if (loading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </main>
  )

  if (!record?.found) return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <p className="font-mono" style={{ fontSize: 18, color: 'var(--error)', marginBottom: 12 }}>{displayName}</p>
      <p style={{ color: 'var(--muted)', marginBottom: 24 }}>This name is not registered.</p>
      <button className="btn-holo" style={{ padding: '12px 24px' }} onClick={() => router.push(`/?q=${name}`)}>Register it →</button>
      <BottomNav />
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', padding: '60px 20px 120px', maxWidth: 600, margin: '0 auto' }}>
      {/* Back */}
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Back
      </button>

      {/* Holographic name card */}
      <div className="holo-border fade-up" style={{ borderRadius: 20, marginBottom: 20 }}>
        <div style={{ background: '#0D0D0D', borderRadius: 19, padding: '28px 24px', position: 'relative', overflow: 'hidden' }}>
          {/* Background glow */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(123,47,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            {record.avatar ? (
              <Image src={record.avatar} alt="" width={56} height={56} unoptimized style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(123,47,255,0.4)' }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #7B2FFF, #FF2FA0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'white', fontFamily: 'Syne, sans-serif', flexShrink: 0 }}>
                {(name[0] || '?').toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="name-display" style={{ fontSize: 'clamp(22px,5vw,32px)' }}>{displayName}</h1>
              <div className="address-chip" style={{ marginTop: 6 }}>{shortAddress(record.resolved || '')}</div>
            </div>
          </div>

          {/* Bio */}
          {record.bio && (
            <p style={{ color: 'rgba(235,235,235,0.7)', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{record.bio}</p>
          )}

          {/* Links */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {record.twitter && <a href={`https://x.com/${record.twitter.replace('@','')}`} target="_blank" rel="noreferrer" className="tag tag-muted">𝕏 {record.twitter}</a>}
            {record.github && <a href={`https://github.com/${record.github}`} target="_blank" rel="noreferrer" className="tag tag-muted">⌥ {record.github}</a>}
            {record.website && <a href={record.website} target="_blank" rel="noreferrer" className="tag tag-holo">↗ website</a>}
          </div>

        </div>
      </div>

      {/* Direct wallet send */}
      <div className="card fade-up-d2" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Send GEN to {displayName}</p>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14 }}>Payments go directly from your wallet to the resolved address. GNS V2 never takes custody.</p>
        <button className="btn-holo" style={{ padding: '10px 20px', fontSize: 14 }} onClick={() => router.push(`/send?name=${name}`)} disabled={!isConnected}>
          Continue to wallet send →
        </button>
      </div>

      {/* Owner actions */}
      {isOwner && (
        <div className="card fade-up-d3" style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: 12, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Owner Actions</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn-outline" style={{ padding: '9px 16px', fontSize: 13 }} onClick={() => router.push('/my-names')}>Manage Names</button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}
