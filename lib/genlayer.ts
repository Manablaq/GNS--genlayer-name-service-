// lib/genlayer.ts
// Reads go through /api/contract (which uses genlayer-js server-side)
// Result is a JSON string that needs parsing
import { BRADBURY_EXPLORER_URL } from '@/lib/config'
export { normalizeName } from '@/lib/domain'

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

export function getExplorerTxUrl(txHash: string) {
  return `${BRADBURY_EXPLORER_URL}/tx/${txHash}`
}

export function shortAddress(addr: string) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}
