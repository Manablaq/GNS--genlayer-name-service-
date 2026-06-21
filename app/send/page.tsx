'use client'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { BottomNav } from '@/components/BottomNav'
import { getRecord, normalizeName, formatGEN } from '@/lib/genlayer'
import { CONTRACT_ADDRESS } from '@/lib/config'
import { TransactionStatus } from 'genlayer-js/types'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function SendPage() {
  const { address, isConnected } = useAccount()
  const [nameInput, setNameInput] = useState('')
  const [amount, setAmount] = useState('')
  const [resolvedRecord, setResolvedRecord] = useState<any>(null)
  const [lookupState, setLookupState] = useState<'idle' | 'searching' | 'found' | 'not-found'>('idle')
  const [sendStatus, setSendStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle')
  const [txHash, setTxHash] = useState('')
  const [errMsg, setErrMsg] = useState('')

  async function handleLookup() {
    const name = normalizeName(nameInput)
    if (!name || name.length < 3) return
    setLookupState('searching')
    setResolvedRecord(null)
    try {
      const record = await getRecord(name)
      if (record?.found === true || record?.found === 'true') {
        setResolvedRecord(record)
        setLookupState('found')
      } else {
        setLookupState('not-found')
      }
    } catch { setLookupState('not-found') }
  }

  async function handleSend() {
    if (!address || !resolvedRecord || !amount) return
    setSendStatus('pending')
    setErrMsg('')

    try {
      const { createClient } = await import('genlayer-js')
      const { testnetBradbury } = await import('genlayer-js/chains')

      const client = createClient({
        chain: testnetBradbury,
        account: address as `0x${string}`,
      })

      try { await (client as any).connect('testnetBradbury') } catch {}

      const wei = BigInt(Math.floor(parseFloat(amount) * 1e18))
      const name = normalizeName(nameInput)

      const hash = await (client as any).writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'send_to_name',
        args: [name],
        value: wei,
      })

      setTxHash(hash)

      await (client as any).waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
        interval: 4000,
        retries: 60,
      })

      setSendStatus('done')
    } catch (e: any) {
      setSendStatus('error')
      setErrMsg((e?.message || String(e)).slice(0, 200))
    }
  }

  if (!isConnected) return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 }}>
      <p className="font-display" style={{ fontSize: 22, fontWeight: 700 }}>Connect your wallet</p>
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
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>{amount} GEN → {normalizeName(nameInput)}.gen</p>
          {txHash && (
            <a href={`https://explorer-bradbury.genlayer.com/tx/${txHash}`} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, color: 'rgba(123,47,255,0.8)', fontFamily: 'JetBrains Mono, monospace' }}>
              View on GenExplorer →
            </a>
          )}
          <div style={{ marginTop: 20 }}>
            <button className="btn-holo" style={{ padding: '12px 24px' }}
              onClick={() => { setSendStatus('idle'); setResolvedRecord(null); setNameInput(''); setAmount(''); setTxHash('') }}>
              Send again
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card fade-up" style={{ padding: '20px' }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 10, fontWeight: 500 }}>Recipient .gen name</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="gns-input" style={{ padding: '11px 14px', fontSize: 14 }}
                placeholder="example.gen"
                value={nameInput}
                onChange={e => { setNameInput(e.target.value); setLookupState('idle'); setResolvedRecord(null) }}
                onKeyDown={e => e.key === 'Enter' && handleLookup()} />
              <button className="btn-outline" style={{ padding: '11px 16px', fontSize: 13, flexShrink: 0 }}
                onClick={handleLookup}
                disabled={!nameInput || nameInput.length < 3 || lookupState === 'searching'}>
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
            {lookupState === 'not-found' && <p style={{ marginTop: 12, fontSize: 13, color: 'var(--error)' }}>Name not registered.</p>}
          </div>

          {lookupState === 'found' && (
            <div className="card fade-up" style={{ padding: '20px' }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 10, fontWeight: 500 }}>Amount (GEN)</label>
              <input className="gns-input" style={{ padding: '11px 14px', fontSize: 16 }}
                placeholder="0.01" type="number" min="0" step="0.0001"
                value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
          )}

          {errMsg && <p style={{ fontSize: 13, color: 'var(--error)', wordBreak: 'break-word' }}>{errMsg}</p>}

          {lookupState === 'found' && amount && (
            <button className="btn-holo fade-up"
              style={{ padding: '14px', fontSize: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={handleSend} disabled={sendStatus === 'pending'}>
              {sendStatus === 'pending' ? <><div className="spinner" />Processing...</> : `Send ${amount} GEN →`}
            </button>
          )}
        </div>
      )}
      <BottomNav />
    </main>
  )
}
