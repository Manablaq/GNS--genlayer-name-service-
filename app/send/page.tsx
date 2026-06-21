'use client'
import { useState } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'
import { checkAvailability, getRecord, normalizeName, formatGEN, waitForTx } from '@/lib/genlayer'
import { CONTRACT_ADDRESS } from '@/lib/config'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function SendPage() {
  const { isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const router = useRouter()
  const [nameInput, setNameInput] = useState('')
  const [amount, setAmount] = useState('')
  const [resolvedRecord, setResolvedRecord] = useState<any>(null)
  const [lookupState, setLookupState] = useState<'idle' | 'searching' | 'found' | 'not-found'>('idle')
  const [sendStatus, setSendStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle')

  async function handleLookup() {
    const name = normalizeName(nameInput)
    if (!name) return
    setLookupState('searching')
    setResolvedRecord(null)
    try {
      const record = await getRecord(name)
      if (record?.found) {
        setResolvedRecord(record)
        setLookupState('found')
      } else {
        setLookupState('not-found')
      }
    } catch { setLookupState('not-found') }
  }

  async function handleSend() {
    if (!walletClient || !resolvedRecord || !amount) return
    setSendStatus('pending')
    try {
      const wei = BigInt(Math.floor(parseFloat(amount) * 1e18))
      const name = normalizeName(nameInput)
      const txHash = await (walletClient as any).writeContract({
        address: CONTRACT_ADDRESS,
        abi: [{
          name: 'send_to_name', type: 'function', stateMutability: 'payable',
          inputs: [{ name: 'name', type: 'string' }], outputs: [],
        }],
        functionName: 'send_to_name',
        args: [name],
        value: wei,
      })
      const r = await waitForTx(txHash)
      if (r.success) setSendStatus('done')
      else setSendStatus('error')
    } catch { setSendStatus('error') }
  }

  if (!isConnected) return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 }}>
      <p className="font-display" style={{ fontSize: 22, fontWeight: 700 }}>Connect your wallet</p>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 8 }}>to send GEN tokens</p>
      <ConnectButton />
      <BottomNav />
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', padding: '60px 20px 120px', maxWidth: 480, margin: '0 auto' }}>
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8 }}>Transfer</p>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>Send GEN</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 8 }}>Send GEN tokens to any .gen name</p>
      </div>

      {sendStatus === 'done' ? (
        <div className="card fade-up" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>✅</p>
          <p className="font-display" style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Sent!</p>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>{amount} GEN sent to {normalizeName(nameInput)}.gen</p>
          <button className="btn-holo" style={{ padding: '12px 24px' }} onClick={() => { setSendStatus('idle'); setResolvedRecord(null); setNameInput(''); setAmount('') }}>Send again</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name lookup */}
          <div className="card fade-up" style={{ padding: '20px' }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 10, fontWeight: 500 }}>Recipient .gen name</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="gns-input"
                style={{ padding: '11px 14px', fontSize: 14 }}
                placeholder="manablaq.gen"
                value={nameInput}
                onChange={e => { setNameInput(e.target.value); setLookupState('idle'); setResolvedRecord(null) }}
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
              />
              <button
                className="btn-outline"
                style={{ padding: '11px 16px', fontSize: 13, flexShrink: 0 }}
                onClick={handleLookup}
                disabled={!nameInput || lookupState === 'searching'}
              >
                {lookupState === 'searching' ? <div className="spinner" style={{ width: 14, height: 14 }} /> : 'Look up'}
              </button>
            </div>

            {lookupState === 'found' && resolvedRecord && (
              <div className="fade-up" style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(0,232,121,0.06)', border: '1px solid rgba(0,232,121,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="pulse-dot" style={{ background: 'var(--success)' }} />
                <div>
                  <p className="name-display" style={{ fontSize: 16 }}>{normalizeName(nameInput)}.gen</p>
                  <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{resolvedRecord.address}</p>
                </div>
              </div>
            )}
            {lookupState === 'not-found' && (
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--error)' }}>Name not registered.</p>
            )}
          </div>

          {/* Amount */}
          {lookupState === 'found' && (
            <div className="card fade-up" style={{ padding: '20px' }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 10, fontWeight: 500 }}>Amount (GEN)</label>
              <input
                className="gns-input"
                style={{ padding: '11px 14px', fontSize: 16 }}
                placeholder="0.01"
                type="number"
                min="0"
                step="0.0001"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          )}

          {lookupState === 'found' && amount && (
            <button
              className="btn-holo fade-up"
              style={{ padding: '14px', fontSize: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={handleSend}
              disabled={sendStatus === 'pending'}
            >
              {sendStatus === 'pending' ? <><div className="spinner" />Processing...</> : `Send ${amount} GEN →`}
            </button>
          )}

          {sendStatus === 'error' && <p style={{ fontSize: 13, color: 'var(--error)', textAlign: 'center' }}>Transaction failed. Check your balance.</p>}
        </div>
      )}

      <BottomNav />
    </main>
  )
}
