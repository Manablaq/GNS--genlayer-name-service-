import { NextRequest, NextResponse } from 'next/server'
import { CONTRACT_ADDRESS } from '@/lib/config'

const RPC = 'https://rpc.bradbury.genlayer.com'

async function bradburyFetch(url: string, options: RequestInit) {
  if (options.body) {
    try {
      const body = JSON.parse(options.body as string)
      if (typeof body.id === 'string') body.id = parseInt(body.id, 10) || 1
      options = { ...options, body: JSON.stringify(body) }
    } catch {}
  }
  return fetch(url, options)
}

async function readContract(method: string, args: unknown[] = []) {
  const id = Math.floor(Math.random() * 100000) + 1
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id,
    method: 'gen_call',
    params: [{
      to: CONTRACT_ADDRESS,
      data: JSON.stringify({ function: method, args }),
    }, 'latest'],
  })
  const res = await bradburyFetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error))
  const raw = json.result
  if (raw === null || raw === undefined) return null
  try { return JSON.parse(raw) } catch { return raw }
}

export async function POST(req: NextRequest) {
  try {
    const { method, args = [] } = await req.json()
    const result = await readContract(method, args)
    return NextResponse.json({ result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
