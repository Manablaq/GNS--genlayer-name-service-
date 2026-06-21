'use client'
import { useState } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { parseEther } from 'viem'
import { BottomNav } from '@/components/BottomNav'
import { getRecord, normalizeName, shortAddress } from '@/lib/genlayer'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function SendPage() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [nameInput, setNameInput] = useState('')
  const [amount, setAmount] = useState('')
  const [resolvedAddr, setResolvedAddr] = useState('')
  const [lookupState, setLookupState] = useState<'idle' | 'searching' | 'found' | 'not-found'>('idle')
  const [sendStatus, setSendStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle')
  const [txHash, setTxHash] = useState('')
  const [errMsg, setErrMsg] = useState('')

  async function handleLookup() {
    const name = normalizeName(nameInput)
    if (!name || name.length < 3) return
    setLookupState('searching')
    setResolvedAddr('')
    try {
      const record = await getRecord(name)
      const found = record?.found === true || record?.found === 'true'
      if (found && record?.address) {
        setResolvedAddr(record.address)
        setLookupState('found')
      } else {
        setLookupState('not-found')
      }
    } catch { setLookupState('not-found') }
  }

  async function handleSend() {
    if (!walletClient || !resolvedAddr || !amount) return
    setSendStatus('pending')
    setErrMsg('')

    try {
      // Plain wallet-to-wallet transfer — GEN goes directly to the owner's address
      const hash = await walletClient.sendTransaction({
        to: resolvedAddr as `0x${string}`,
        value: parseEther(amount),
      })
      setTxHash(hash)
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
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 8 }}>
          Type a <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>.gen</span> name — GEN goes straight to the owner's wallet
        </p>
      </div>

      {sendStatus === 'done' ? (
        <div className="card fade-up" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>✅</p>
          <p className="font-display" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Sent!</p>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 4 }}>
            {amount} GEN → <span className="name-display" style={{ fontSize: 14 }}>{normalizeName(nameInput)}.gen</span>
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', marginBottom: 20 }}>
            Delivered to {shortAddress(resolvedAddr)}
          </p>
          {txHash && (
            <a href={`https://explorer.testnet-chain.genlayer.com/tx/${txHash}`} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, color: 'rgba(123,47,255,0.8)', display: 'block', marginBottom: 20 }}>
              View on explorer →
            </a>
          )}
          <button className="btn-holo" style={{ padding: '12px 24px' }}
            onClick={() => { setSendStatus('idle'); setResolvedAddr(''); setNameInput(''); setAmount(''); setTxHash('') }}>
            Send again
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name input */}
          <div className="card fade-up" style={{ padding: '20px' }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 10, fontWeight: 500 }}>
              To (name or address)
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="gns-input"
                style={{ padding: '11px 14px', fontSize: 14 }}
                placeholder="albert.gen"
                value={nameInput}
                onChange={e => { setNameInput(e.target.value); setLookupState('idle'); setResolvedAddr('') }}
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
              />
              <button
                className="btn-outline"
                style={{ padding: '11px 16px', fontSize: 13, flexShrink: 0 }}
                onClick={handleLookup}
                disabled={!nameInput || nameInput.length < 3 || lookupState === 'searching'}
              >
                {lookupState === 'searching'
                  ? <div className="spinner" style={{ width: 14, height: 14 }} />
                  : 'Resolve'}
              </button>
            </div>

            {lookupState === 'found' && resolvedAddr && (
              <div className="fade-up" style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(0,232,121,0.06)', border: '1px solid rgba(0,232,121,0.2)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div className="pulse-dot" style={{ background: 'var(--success)' }} />
                  <span className="name-display" style={{ fontSize: 15 }}>{normalizeName(nameInput)}.gen</span>
                  <span className="tag tag-success">Resolved</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                  → {resolvedAddr}
                </p>
              </div>
            )}
            {lookupState === 'not-found' && (
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--error)' }}>Name not found. Check spelling or register it.</p>
            )}
          </div>

          {/* Amount */}
          {lookupState === 'found' && (
            <div className="card fade-up" style={{ padding: '20px' }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 10, fontWeight: 500 }}>
                Amount (GEN)
              </label>
              <input
                className="gns-input"
                style={{ padding: '11px 14px', fontSize: 18 }}
                placeholder="0.01"
                type="number"
                min="0"
                step="0.0001"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          )}

          {errMsg && (
            <p style={{ fontSize: 13, color: 'var(--error)', wordBreak: 'break-word' }}>{errMsg}</p>
          )}

          {lookupState === 'found' && amount && (
            <button
              className="btn-holo fade-up"
              style={{ padding: '15px', fontSize: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={handleSend}
              disabled={sendStatus === 'pending'}
            >
              {sendStatus === 'pending'
                ? <><div className="spinner" />Sending...</>
                : `Send ${amount} GEN to ${normalizeName(nameInput)}.gen`}
            </button>
          )}
        </div>
      )}
      <BottomNav />
    </main>
  )
}
