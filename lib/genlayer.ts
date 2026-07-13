// lib/genlayer.ts
// Reads go through /api/contract (which uses genlayer-js server-side)
// Result is a JSON string that needs parsing
import { BRADBURY_EXPLORER_URL } from '@/lib/config'
import type { TransactionHash } from 'genlayer-js/types'

export const TX_POLL_INTERVAL_MS = 3000
export const TX_TIMEOUT_MS = 10 * 60 * 1000

async function readContract(method: string, args: unknown[] = []) {
  const res = await fetch('/api/contract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, args }),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error)

  // genlayer-js returns contract results as JSON strings — parse them
  let result = json.result
  if (typeof result === 'string') {
    try { result = JSON.parse(result) } catch {}
  }
  return result
}

export async function checkAvailability(name: string) { return readContract('is_available', [name]) }
export async function getRecord(name: string) { return readContract('get_record', [name]) }
export async function resolve(name: string) { return readContract('resolve', [name]) }
export async function reverseResolve(address: string) { return readContract('reverse_resolve', [address]) }
export async function getNamesByOwner(address: string, offset = 0, limit = 50) {
  return readContract('get_names_by_owner', [address, offset, limit])
}
export async function getStats() { return readContract('get_stats', []) }

export async function waitForAccepted(
  txHash: TransactionHash,
): Promise<{ success: boolean; status: 'ACCEPTED' | 'TIMEOUT' | 'ERROR'; error?: string }> {
  try {
    const { createClient } = await import('genlayer-js')
    const { testnetBradbury } = await import('genlayer-js/chains')
    const { TransactionStatus } = await import('genlayer-js/types')

    const client = createClient({ chain: testnetBradbury })
    await client.waitForTransactionReceipt({
      hash: txHash,
      status: TransactionStatus.ACCEPTED,
      interval: TX_POLL_INTERVAL_MS,
      retries: Math.ceil(TX_TIMEOUT_MS / TX_POLL_INTERVAL_MS),
    })
    return { success: true, status: 'ACCEPTED' }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.toLowerCase().includes('timeout')) {
      return { success: false, status: 'TIMEOUT', error: message }
    }
    return { success: false, status: 'ERROR', error: message }
  }
}

export function getExplorerTxUrl(txHash: string) {
  return `${BRADBURY_EXPLORER_URL}/tx/${txHash}`
}

export function shortAddress(addr: string) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function normalizeName(name: string) {
  let n = name.toLowerCase().trim()
  if (n.endsWith('.gen')) n = n.slice(0, -4)
  return n
}
