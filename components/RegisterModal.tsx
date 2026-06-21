'use client'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { CONTRACT_ADDRESS } from '@/lib/config'

interface Props {
  name: string
  onClose: () => void
  onSuccess: () => void
}

export function RegisterModal({ name, onClose, onSuccess }: Props) {
  const { address } = useAccount()
  const [status, setStatus] = useState<'idle' | 'confirming' | 'pending' | 'done' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  const displayName = name.endsWith('.gen') ? name : `${name}.gen`

  async function handleRegister() {
    if (!address) return
    setStatus('confirming')
    setErrMsg('')

    try {
      // Use genlayer-js for proper GenLayer transaction encoding
      const { createClient } = await import('genlayer-js')
      const { testnetBradbury } = await import('genlayer-js/chains')

      const client = createClient({
        chain: testnetBradbury,
        account: address,
      })

      // Connect to browser wallet (MetaMask)
      await (client as any).connect('testnetBradbury')

      const txHash = await (client as any).writeContract({
        account: address,
        address: CONTRACT_ADDRESS,
        functionName: 'register',
        args: [name, '', '', '', '', ''],
        value: BigInt(0),
      })

      setStatus('pending')

      // Poll for receipt
      const start = Date.now()
      while (Date.now() - start < 10 * 60 * 1000) {
        await new Promise(r => setTimeout(r, 3000))
        try {
          const receipt = await (client as any).getTransactionReceipt({ hash: txHash })
          if (receipt) {
            setStatus('done')
            setTimeout(onSuccess, 1200)
            return
          }
        } catch {}
      }
      setStatus('error')
      setErrMsg('Timed out. Check GenExplorer for the transaction.')
    } catch (e: any) {
      setStatus('error')
      setErrMsg(e?.message?.slice(0, 200) || 'Transaction rejected.')
    }
  }

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content holo-border holo-border-subtle">

        {/* Header */}
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
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>Name registered on GenLayer.</p>
          </div>
        ) : (
          <>
            {/* Simple info card — no form fields needed */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Name</span>
                <span className="font-mono" style={{ fontSize: 13 }}>{displayName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Owner</span>
                <span className="font-mono" style={{ fontSize: 13 }}>
                  {address ? `${address.slice(0,6)}...${address.slice(-4)}` : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Network</span>
                <span style={{ fontSize: 13, color: 'var(--success)' }}>GenLayer Bradbury</span>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
              This registers <strong style={{ color: 'var(--text)' }}>{displayName}</strong> on-chain. 
              AI validators will verify the name is appropriate. You can update your profile after.
            </p>

            {errMsg && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.3)', borderRadius: 10, fontSize: 13, color: 'var(--error)' }}>
                {errMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-outline" onClick={onClose} style={{ flex: 1, padding: '13px' }}>
                Cancel
              </button>
              <button
                className="btn-holo"
                onClick={handleRegister}
                disabled={status !== 'idle' && status !== 'error'}
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
