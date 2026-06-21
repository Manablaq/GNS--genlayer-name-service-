import { NextRequest, NextResponse } from 'next/server'
import { CONTRACT_ADDRESS } from '@/lib/config'

export async function POST(req: NextRequest) {
  try {
    const { method, args = [] } = await req.json()

    const { createClient, createAccount } = await import('genlayer-js')
    const { testnetBradbury } = await import('genlayer-js/chains')

    const client = createClient({
      chain: testnetBradbury,
      account: createAccount(),
    })

    const result = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: method,
      args,
    })

    return NextResponse.json({ result })
  } catch (e: any) {
    console.error('[GNS API]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
