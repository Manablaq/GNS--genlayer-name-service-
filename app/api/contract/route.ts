import { NextRequest, NextResponse } from 'next/server'
import { CONTRACT_ADDRESS } from '@/lib/config'

const RPC = 'https://rpc.bradbury.genlayer.com'

// Bradbury requires integer JSON-RPC IDs
async function bradburyFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (init?.body) {
    try {
      const body = JSON.parse(init.body as string)
      if (typeof body.id === 'string') body.id = parseInt(body.id, 10) || 1
      init = { ...init, body: JSON.stringify(body) }
    } catch {}
  }
  return fetch(input as string, init)
}

export async function POST(req: NextRequest) {
  try {
    const { method, args = [] } = await req.json()

    // Dynamic import to avoid SSR issues
    const { createClient } = await import('genlayer-js')

    const client = createClient({
      network: 'custom',
      endpoint: RPC,
      fetch: bradburyFetch,
    } as any)

    const result = await (client as any).readContract({
      address: CONTRACT_ADDRESS,
      functionName: method,
      args,
    })

    return NextResponse.json({ result })
  } catch (e: any) {
    // Fallback: direct gen_call with object data (not stringified)
    try {
      const { method, args = [] } = await req.json().catch(() => ({ method: '', args: [] }))
      const id = Math.floor(Math.random() * 100000) + 1
      const res = await bradburyFetch(RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id,
          method: 'gen_call',
          params: [{ to: CONTRACT_ADDRESS, data: { function: method, args } }, 'latest'],
        }),
      })
      const json = await res.json()
      if (json.error) throw new Error(JSON.stringify(json.error))
      const raw = json.result
      const result = raw ? JSON.parse(raw) : null
      return NextResponse.json({ result })
    } catch (e2: any) {
      return NextResponse.json({ error: e.message + ' | ' + e2.message }, { status: 500 })
    }
  }
}
