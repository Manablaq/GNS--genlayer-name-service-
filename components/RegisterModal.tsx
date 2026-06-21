'use client'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { CONTRACT_ADDRESS } from '@/lib/config'
import { TransactionStatus } from 'genlayer-js/types'

interface Props {
  name: string
  onClose: () => void
  onSuccess: () => void
}

export function RegisterModal({ name, onClose, onSuccess }: Props) {
  const { address } = useAccount()
  const [status, setStatus] = useState<'idle' | 'confirming' | 'pending' | 'done' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')
  const [txHash, setTxHash] = useState('')

  const displayName = name.endsWith('.gen') ? name : `${name}.gen`

  async function handleRegister() {
    if (!address) return
    setStatus('confirming')
    setErrMsg('')

    try {
      const { createClient } = await import('genlayer-js')
      const { testnetBradbury } = await import('genlayer-js/chains')

      const client = createClient({
        chain: testnetBradbury,
        account: address as `0x${string}`,
      })

      // Try to switch network — ignore if Snaps not available (Bradbury may already be added)
      try {
        await (client as any).connect('testnetBradbury')
      } catch (connectErr: any) {
        // wallet_getSnaps not supported — continue, user's wallet likely already on Bradbury
        console.log('connect() skipped:', connectErr?.message)
      }

      // Send the transaction — genlayer-js handles correct encoding
      const hash = await (client as any).writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'register',
        args: [name, '', '', '', '', ''],
        value: BigInt(0),
      })

      setTxHash(hash)
      setStatus('pending')

      // Wait for ACCEPTED status
      const receipt = await (client as any).waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
        interval: 4000,
        retries: 60,
      })

      setStatus('done')
      setTimeout(onSuccess, 1500)
    } catch (e: any) {
      setStatus('error')
      const msg = e?.message || String(e)
      setErrMsg(msg.slice(0, 300))
    }
  }

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content holo-border holo-border-subtle">

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>
              Registering
            </p>
            <h2 className="name-display" style={{ fontSize: 32 }}>{displayName}</h2>
          </div>
          <button onClick={onClose} className="btn-outline" style={{ padding: '6px 12px', fontSize: 13 }}>✕</button>
        </div>

        {status === 'done' ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <p className="font-display" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              {displayName} is yours!
            </p>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>Name registered on GenLayer.</p>
            {txHash && (
              <a
                href={`https://explorer-bradbury.genlayer.com/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: 'rgba(123,47,255,0.8)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                View on GenExplorer →
              </a>
            )}
          </div>
        ) : (
          <>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Name</span>
                <span className="font-mono" style={{ fontSize: 13 }}>{displayName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Owner</span>
                <span className="font-mono" style={{ fontSize: 13 }}>
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Network</span>
                <span style={{ fontSize: 13, color: 'var(--success)' }}>GenLayer Bradbury</span>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
              AI validators will verify the name is appropriate. You can update your profile after registration.
            </p>

            {status === 'pending' && txHash && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(0,232,121,0.06)', border: '1px solid rgba(0,232,121,0.2)', borderRadius: 10, fontSize: 12 }}>
                <p style={{ color: 'var(--success)', marginBottom: 4 }}>Transaction submitted — awaiting validators...</p>
                <a href={`https://explorer-bradbury.genlayer.com/tx/${txHash}`} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                  {txHash.slice(0, 20)}...
                </a>
              </div>
            )}

            {errMsg && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.3)', borderRadius: 10, fontSize: 13, color: 'var(--error)', wordBreak: 'break-word' }}>
                {errMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-outline" onClick={onClose} style={{ flex: 1, padding: '13px' }} disabled={status === 'pending'}>
                Cancel
              </button>
              <button
                className="btn-holo"
                onClick={handleRegister}
                disabled={status === 'confirming' || status === 'pending'}
                style={{ flex: 2, padding: '13px', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {status === 'confirming' && <><div className="spinner" />Confirm in wallet...</>}
                {status === 'pending' && <><div className="spinner" />Processing...</>}
                {status === 'idle' && `Register ${displayName}`}
                {status === 'error' && 'Try Again'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
