'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { BottomNav } from '@/components/BottomNav'
import { RegisterModal } from '@/components/RegisterModal'
import { checkAvailability, normalizeName, getStats } from '@/lib/genlayer'
import { usePolling } from '@/hooks/usePolling'

type CheckState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function HomePage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [input, setInput] = useState('')
  const [checkState, setCheckState] = useState<CheckState>('idle')
  const [showRegister, setShowRegister] = useState(false)
  const { data: stats } = usePolling(getStats, 5000)
  const debounceRef = useRef<NodeJS.Timeout>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>()

  // Canvas background animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let width = 0, height = 0

    function resize() {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    let t = 0
    const dots: { x: number; y: number; r: number; phase: number; speed: number }[] = []
    for (let i = 0; i < 60; i++) {
      dots.push({
        x: Math.random() * 1200,
        y: Math.random() * 800,
        r: Math.random() * 1.5 + 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.008 + 0.004,
      })
    }

    function draw() {
      ctx.clearRect(0, 0, width, height)

      // Grid
      ctx.strokeStyle = 'rgba(123,47,255,0.04)'
      ctx.lineWidth = 1
      const gridSize = 60
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke()
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke()
      }

      // Floating dots
      t += 0.01
      dots.forEach(d => {
        const alpha = (Math.sin(t * d.speed * 10 + d.phase) + 1) / 2 * 0.4 + 0.05
        ctx.beginPath()
        ctx.arc(
          (d.x + Math.sin(t * d.speed + d.phase) * 30) % width,
          (d.y + Math.cos(t * d.speed * 0.7 + d.phase) * 20) % height,
          d.r,
          0, Math.PI * 2
        )
        // Gradient colors
        const hue = (t * 20 + d.phase * 50) % 360
        ctx.fillStyle = `hsla(${270 + Math.sin(d.phase) * 40},80%,70%,${alpha})`
        ctx.fill()
      })

      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animRef.current!)
    }
  }, [])

  // Debounced name check
  const checkName = useCallback((val: string) => {
    const name = normalizeName(val)
    if (!name || name.length < 3) {
      setCheckState(name.length > 0 && name.length < 3 ? 'invalid' : 'idle')
      return
    }
    setCheckState('checking')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await checkAvailability(name)
        if (result?.available === false) {
          setCheckState('taken')
        } else if (result?.available === true) {
          setCheckState('available')
        } else if (result?.reason === 'Invalid format.') {
          setCheckState('invalid')
        } else {
          setCheckState('idle')
        }
      } catch {
        setCheckState('idle')
      }
    }, 600)
  }, [])

  function handleInput(val: string) {
    setInput(val)
    setCheckState('idle')
    checkName(val)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      const name = normalizeName(input)
      if (checkState === 'taken') router.push(`/name/${name}`)
      if (checkState === 'available') {
        if (!isConnected) return
        setShowRegister(true)
      }
    }
  }

  const normalized = normalizeName(input)
  const displayName = normalized ? `${normalized}.gen` : ''

  return (
    <main style={{ minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px 120px' }}>
      {/* Canvas bg */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 560 }}>
        {/* Logo */}
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #7B2FFF, #FF2FA0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 800, color: 'white', fontFamily: 'Syne, sans-serif'
            }}>G</div>
            <span className="font-display" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>GNS</span>
          </div>
          <p className="font-display" style={{ fontSize: 'clamp(32px, 7vw, 52px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 12 }}>
            Your name.<br />
            <span className="name-display" style={{ fontSize: 'inherit' }}>On-chain.</span>
          </p>
          <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}>
            Register a <span style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>.gen</span> name. Send and receive GEN tokens with it.
          </p>
        </div>

        {/* Search bar */}
        <div className="fade-up-d1 holo-border" style={{ borderRadius: 16 }}>
          <div style={{ background: '#0D0D0D', borderRadius: 15, padding: '6px 6px 6px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: 15, flexShrink: 0 }}>⌨</span>
            <input
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', fontSize: 18,
                fontWeight: 500, letterSpacing: '0.01em'
              }}
              placeholder="search name..."
              value={input}
              onChange={e => handleInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              spellCheck={false}
              autoComplete="off"
            />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 15, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>.gen</span>
            <button
              className="btn-holo"
              style={{ padding: '10px 20px', fontSize: 14, borderRadius: 10, flexShrink: 0 }}
              onClick={() => {
                if (checkState === 'taken') router.push(`/name/${normalized}`)
                if (checkState === 'available') isConnected && setShowRegister(true)
              }}
              disabled={checkState === 'idle' || checkState === 'checking' || checkState === 'invalid'}
            >
              {checkState === 'checking' ? <div className="spinner" style={{ width: 14, height: 14 }} /> :
               checkState === 'taken' ? 'View' :
               checkState === 'available' ? 'Register' : 'Search'}
            </button>
          </div>
        </div>

        {/* Status indicator */}
        <div className="fade-up-d2" style={{ marginTop: 16, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {checkState === 'checking' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 13 }}>
              <div className="spinner" style={{ width: 14, height: 14 }} />
              Checking availability...
            </div>
          )}
          {checkState === 'available' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="fade-up">
              <div className="pulse-dot" style={{ background: 'var(--success)' }} />
              <span className="font-mono" style={{ fontSize: 15, color: 'var(--success)', fontWeight: 500 }}>{displayName}</span>
              <span className="tag tag-success">Available</span>
              {!isConnected && <span style={{ fontSize: 12, color: 'var(--muted)' }}>— connect wallet to register</span>}
            </div>
          )}
          {checkState === 'taken' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="fade-up">
              <div className="pulse-dot" style={{ background: 'var(--error)' }} />
              <span className="font-mono" style={{ fontSize: 15, color: 'var(--error)', fontWeight: 500 }}>{displayName}</span>
              <span className="tag tag-error">Taken</span>
              <button
                onClick={() => router.push(`/name/${normalized}`)}
                style={{ fontSize: 12, color: 'rgba(123,47,255,0.8)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                View profile →
              </button>
            </div>
          )}
          {checkState === 'invalid' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Names must be 3–32 characters, letters, numbers, or hyphens</span>
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="fade-up-d3" style={{ marginTop: 48, display: 'flex', justifyContent: 'center', gap: 32 }}>
            <div style={{ textAlign: 'center' }}>
              <p className="font-display" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>{stats.total_names}</p>
              <p style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>Names Registered</p>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center' }}>
              <p className="font-display" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>GEN</p>
              <p style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>Native Token</p>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center' }}>
              <p className="font-display" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>.gen</p>
              <p style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>Namespace</p>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
      {showRegister && normalized && (
        <RegisterModal
          name={normalized}
          onClose={() => setShowRegister(false)}
          onSuccess={() => { setShowRegister(false); router.push(`/name/${normalized}`) }}
        />
      )}
    </main>
  )
}
