import { NextRequest, NextResponse } from 'next/server'
import { CONTRACT_ADDRESS } from '@/lib/config'

const NAME_RE = /^[a-z0-9-]{3,32}(?:\.gen)?$/i
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

const READ_METHODS = {
  resolve: ['name'],
  reverse_resolve: ['address'],
  get_record: ['name'],
  is_available: ['name'],
  get_balance: ['name'],
  get_names_by_owner: ['address'],
  get_stats: [],
} as const

type ReadMethod = keyof typeof READ_METHODS

function isReadMethod(method: unknown): method is ReadMethod {
  return typeof method === 'string' && method in READ_METHODS
}

function validateArgs(method: ReadMethod, args: unknown[]) {
  const expected = READ_METHODS[method]
  if (args.length !== expected.length) {
    return `Expected ${expected.length} argument(s) for ${method}.`
  }

  for (let i = 0; i < expected.length; i += 1) {
    const value = args[i]
    if (typeof value !== 'string') return `Argument ${i + 1} must be a string.`

    if (expected[i] === 'name' && !NAME_RE.test(value.trim())) {
      return 'Invalid name. Use 3-32 letters, numbers, or hyphens, optionally ending in .gen.'
    }

    if (expected[i] === 'address' && !ADDRESS_RE.test(value.trim())) {
      return 'Invalid address. Expected a 42-character 0x-prefixed address.'
    }
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const { method, args = [] } = body as { method?: unknown; args?: unknown }
    if (!isReadMethod(method)) {
      return NextResponse.json({ error: 'Unsupported read method.' }, { status: 400 })
    }

    if (!Array.isArray(args)) {
      return NextResponse.json({ error: 'Args must be an array.' }, { status: 400 })
    }

    const validationError = validateArgs(method, args)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const { createClient } = await import('genlayer-js')
    const { testnetBradbury } = await import('genlayer-js/chains')

    const client = createClient({
      chain: testnetBradbury,
    })

    const result = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: method,
      args: args.map((arg) => typeof arg === 'string' ? arg.trim() : arg),
    })

    return NextResponse.json({ result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Contract read failed.'
    console.error('[GNS API]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
