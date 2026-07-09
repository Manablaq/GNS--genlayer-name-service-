'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { BottomNav } from '@/components/BottomNav'
import { getExplorerTxUrl, getRecord, shortAddress, formatGEN, waitForAccepted } from '@/lib/genlayer'
import { usePolling } from '@/hooks/usePolling'
import { CONTRACT_ADDRESS } from '@/lib/config'

export default function NamePage() {
  const { name } = useParams<{ name: string }>()
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { data: record, loading, refetch } = usePolling(() => getRecord(name), 5000)
  const [sendAmount, setSendAmount] = useState('')
  const [sendStatus, setSendStatus] = useState<'idle' | 'submitted' | 'accepted' | 'error'>('idle')
  const [withdrawStatus, setWithdrawStatus] = useState<'idle' | 'submitted' | 'accepted' | 'error'>('idle')
  const [sendTxHash, setSendTxHash] = useState('')
  const [withdrawTxHash, setWithdrawTxHash] = useState('')

  const displayName = `${name}.gen`
  const isOwner = address?.toLowerCase() === record?.owner?.toLowerCase()



  async function handleSend() {
    if (!address || !sendAmount) return
    setSendStatus('submitted')
    try {
      const { createClient } = await import('genlayer-js')
      const { testnetBradbury } = await import('genlayer-js/chains')
      type GenLayerClientConfig = NonNullable<Parameters<typeof createClient>[0]>
      const provider = (window as Window & { ethereum?: GenLayerClientConfig['provider'] }).ethereum
      const client = createClient({
        chain: testnetBradbury,
        account: address as `0x${string}`,
        provider,
      })
      const wei = BigInt(Math.floor(Number(sendAmount) * 1e18))
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'send_to_name',
        args: [name],
        value: wei,
      })
      setSendTxHash(txHash)
      const r = await waitForAccepted(txHash)
      if (r.success) {
        setSendStatus('accepted')
        refetch()
      } else setSendStatus('error')
    } catch { setSendStatus('error') }
  }

  async function handleWithdraw() {
    if (!address) return
    setWithdrawStatus('submitted')
    try {
      const { createClient } = await import('genlayer-js')
      const { testnetBradbury } = await import('genlayer-js/chains')
      type GenLayerClientConfig = NonNullable<Parameters<typeof createClient>[0]>
      const provider = (window as Window & { ethereum?: GenLayerClientConfig['provider'] }).ethereum
      const client = createClient({
        chain: testnetBradbury,
        account: address as `0x${string}`,
        provider,
      })
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'withdraw',
        args: [name],
        value: 0n,
      })
      setWithdrawTxHash(txHash)
      const r = await waitForAccepted(txHash)
      if (r.success) {
        setWithdrawStatus('accepted')
        refetch()
      } else setWithdrawStatus('error')
    } catch { setWithdrawStatus('error') }
  }

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

  const balance = record?.balance || '0'
  const hasBalance = BigInt(balance) > 0n

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
              <div className="address-chip" style={{ marginTop: 6 }}>{shortAddress(record.address || '')}</div>
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

          {/* Registered */}
          <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            Registered {record.registered_at ? new Date(record.registered_at).toLocaleDateString() : ''}
          </p>
        </div>
      </div>

      {/* Balance card */}
      <div className="card fade-up-d1" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>Balance</p>
            <p className="font-display" style={{ fontSize: 26, fontWeight: 800, color: hasBalance ? 'var(--success)' : 'var(--muted)' }}>
              {formatGEN(balance)}
            </p>
          </div>
          {isOwner && hasBalance && (
            <button
              className="btn-holo"
              style={{ padding: '10px 18px', fontSize: 13 }}
              onClick={handleWithdraw}
              disabled={withdrawStatus === 'submitted'}
            >
              {withdrawStatus === 'submitted' ? <div className="spinner" style={{ width: 14, height: 14 }} /> : 'Withdraw'}
            </button>
          )}
        </div>
        {withdrawStatus === 'accepted' && <p style={{ marginTop: 10, fontSize: 13, color: 'var(--success)' }}>Withdrawal accepted. Finalization may still be pending.</p>}
        {withdrawTxHash && <a href={getExplorerTxUrl(withdrawTxHash)} target="_blank" rel="noreferrer" style={{ marginTop: 8, display: 'inline-block', fontSize: 11, color: 'rgba(123,47,255,0.8)' }}>View withdrawal on explorer</a>}
      </div>

      {/* Send GEN */}
      <div className="card fade-up-d2" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Send GEN to {displayName}</p>
        {sendStatus === 'accepted' ? (
          <p style={{ color: 'var(--success)', fontSize: 14 }}>Accepted. GEN is credited to the name balance; finalization may still be pending.</p>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="gns-input"
              style={{ padding: '10px 14px', fontSize: 14 }}
              placeholder="Amount in GEN"
              type="number"
              min="0"
              step="0.0001"
              value={sendAmount}
              onChange={e => setSendAmount(e.target.value)}
              disabled={sendStatus === 'submitted'}
            />
            <button
              className="btn-holo"
              style={{ padding: '10px 20px', fontSize: 14, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={handleSend}
              disabled={!sendAmount || !isConnected || sendStatus === 'submitted'}
            >
              {sendStatus === 'submitted' ? <div className="spinner" style={{ width: 14, height: 14 }} /> : 'Send →'}
            </button>
          </div>
        )}
        {sendTxHash && <a href={getExplorerTxUrl(sendTxHash)} target="_blank" rel="noreferrer" style={{ marginTop: 8, display: 'inline-block', fontSize: 11, color: 'rgba(123,47,255,0.8)' }}>View send on explorer</a>}
        {sendStatus === 'error' && <p style={{ marginTop: 10, fontSize: 13, color: 'var(--error)' }}>Failed. Check balance and try again.</p>}
        {!isConnected && <p style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>Connect wallet to send GEN</p>}
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
