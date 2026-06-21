'use client'
import { useState } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { CONTRACT_ADDRESS } from '@/lib/config'
import { waitForTx } from '@/lib/genlayer'

interface Props {
  name: string
  onClose: () => void
  onSuccess: () => void
}

export function RegisterModal({ name, onClose, onSuccess }: Props) {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [form, setForm] = useState({ avatar: '', bio: '', twitter: '', github: '', website: '' })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'pending' | 'done' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  const displayName = name.endsWith('.gen') ? name : `${name}.gen`

  async function handleRegister() {
    if (!walletClient || !address) return
    setStatus('submitting')
    setErrMsg('')
    try {
      const txHash = await (walletClient as any).writeContract({
        address: CONTRACT_ADDRESS,
        abi: [{
          name: 'register',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'name', type: 'string' },
            { name: 'avatar', type: 'string' },
            { name: 'bio', type: 'string' },
            { name: 'twitter', type: 'string' },
            { name: 'github', type: 'string' },
            { name: 'website', type: 'string' },
          ],
          outputs: [],
        }],
        functionName: 'register',
        args: [name, form.avatar, form.bio, form.twitter, form.github, form.website],
      })
      setStatus('pending')
      const result = await waitForTx(txHash, s => {
        if (s === 'FINALIZED') setStatus('done')
      })
      if (result.success) {
        setStatus('done')
        setTimeout(onSuccess, 1200)
      } else {
        setStatus('error')
        setErrMsg('Transaction failed. Check GenExplorer for details.')
      }
    } catch (e: any) {
      setStatus('error')
      setErrMsg(e?.message || 'Transaction rejected.')
    }
  }

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content holo-border holo-border-subtle">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>Registering</p>
            <h2 className="name-display" style={{ fontSize: 28 }}>{displayName}</h2>
          </div>
          <button onClick={onClose} className="btn-outline" style={{ padding: '6px 12px', fontSize: 13 }}>✕</button>
        </div>

        {status === 'done' ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <p className="font-display" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Name registered!</p>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>{displayName} is yours.</p>
          </div>
        ) : (
          <>
            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'avatar', label: 'Avatar URL', placeholder: 'https://...' },
                { key: 'bio', label: 'Bio', placeholder: 'Builder on GenLayer...' },
                { key: 'twitter', label: 'Twitter/X', placeholder: '@handle' },
                { key: 'github', label: 'GitHub', placeholder: 'username' },
                { key: 'website', label: 'Website', placeholder: 'https://...' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6, fontWeight: 500 }}>{label}</label>
                  <input
                    className="gns-input"
                    style={{ padding: '10px 14px', fontSize: 13 }}
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    disabled={status !== 'idle'}
                  />
                </div>
              ))}
            </div>

            {errMsg && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.3)', borderRadius: 10, fontSize: 13, color: 'var(--error)' }}>
                {errMsg}
              </div>
            )}

            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <button className="btn-outline" onClick={onClose} style={{ flex: 1, padding: '12px' }}>Cancel</button>
              <button
                className="btn-holo"
                onClick={handleRegister}
                disabled={status !== 'idle' && status !== 'error'}
                style={{ flex: 2, padding: '12px', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {status === 'submitting' && <><div className="spinner" />Confirming...</>}
                {status === 'pending' && <><div className="spinner" />Processing...</>}
                {status === 'idle' && 'Register Name'}
                {status === 'error' && 'Try Again'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
