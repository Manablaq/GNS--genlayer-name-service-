'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAccount, useWalletClient } from 'wagmi'
import { BottomNav } from '@/components/BottomNav'
import { getRecord, shortAddress, formatGEN, waitForTx } from '@/lib/genlayer'
import { CONTRACT_ADDRESS } from '@/lib/config'

export default function NamePage() {
  const { name } = useParams<{ name: string }>()
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [record, setRecord] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showSend, setShowSend] = useState(false)
  const [sendAmount, setSendAmount] = useState('')
  const [sendStatus, setSendStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle')
  const [withdrawStatus, setWithdrawStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle')

  const displayName = `${name}.gen`
  const isOwner = address?.toLowerCase() === record?.owner?.toLowerCase()

  useEffect(() => {
    setLoading(true)
    getRecord(name).then(r => {
      setRecord(r)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [name])

  async function handleSend() {
    if (!walletClient || !sendAmount) return
    setSendStatus('pending')
    try {
      const wei = BigInt(Math.floor(parseFloat(sendAmount) * 1e18)).toString()
      const txHash = await (walletClient as any).writeContract({
        address: CONTRACT_ADDRESS,
        abi: [{
          name: 'send_to_name', type: 'function', stateMutability: 'payable',
          inputs: [{ name: 'name', type: 'string' }], outputs: [],
        }],
        functionName: 'send_to_name',
        args: [name],
        value: BigInt(wei),
      })
      const r = await waitForTx(txHash)
      if (r.success) {
        setSendStatus('done')
        getRecord(name).then(setRecord)
      } else setSendStatus('error')
    } catch { setSendStatus('error') }
  }

  async function handleWithdraw() {
    if (!walletClient) return
    setWithdrawStatus('pending')
    try {
      const txHash = await (walletClient as any).writeContract({
        address: CONTRACT_ADDRESS,
        abi: [{
          name: 'withdraw', type: 'function', stateMutability: 'nonpayable',
          inputs: [{ name: 'name', type: 'string' }], outputs: [],
        }],
        functionName: 'withdraw',
        args: [name],
      })
      const r = await waitForTx(txHash)
      if (r.success) {
        setWithdrawStatus('done')
        getRecord(name).then(setRecord)
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
              <img src={record.avatar} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(123,47,255,0.4)' }} />
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
              disabled={withdrawStatus === 'pending'}
            >
              {withdrawStatus === 'pending' ? <div className="spinner" style={{ width: 14, height: 14 }} /> : 'Withdraw'}
            </button>
          )}
        </div>
        {withdrawStatus === 'done' && <p style={{ marginTop: 10, fontSize: 13, color: 'var(--success)' }}>Withdrawn successfully!</p>}
      </div>

      {/* Send GEN */}
      <div className="card fade-up-d2" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Send GEN to {displayName}</p>
        {sendStatus === 'done' ? (
          <p style={{ color: 'var(--success)', fontSize: 14 }}>✓ Sent successfully!</p>
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
              disabled={sendStatus === 'pending'}
            />
            <button
              className="btn-holo"
              style={{ padding: '10px 20px', fontSize: 14, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={handleSend}
              disabled={!sendAmount || !isConnected || sendStatus === 'pending'}
            >
              {sendStatus === 'pending' ? <div className="spinner" style={{ width: 14, height: 14 }} /> : 'Send →'}
            </button>
          </div>
        )}
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
