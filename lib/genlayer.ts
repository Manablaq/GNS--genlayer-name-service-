// lib/genlayer.ts
// Reads go through /api/contract (which uses genlayer-js server-side)
// Result is a JSON string that needs parsing

export const TX_POLL_INTERVAL_MS = 3000
export const TX_TIMEOUT_MS = 10 * 60 * 1000
const RPC = 'https://rpc.bradbury.genlayer.com'

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
export async function getBalance(name: string) { return readContract('get_balance', [name]) }
export async function getNamesByOwner(address: string) { return readContract('get_names_by_owner', [address]) }
export async function getStats() { return readContract('get_stats', []) }

export async function waitForTx(
  txHash: string,
  onStatus?: (s: string) => void
): Promise<{ success: boolean; status: string }> {
  const start = Date.now()
  while (Date.now() - start < TX_TIMEOUT_MS) {
    try {
      const id = Math.floor(Math.random() * 100000) + 1
      const res = await fetch(RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', method: 'eth_getTransactionReceipt', id, params: [txHash]
        }),
      })
      const json = await res.json()
      const r = json.result
      if (r) {
        const success = r.status === '0x1'
        onStatus?.(success ? 'FINALIZED' : 'FAILED')
        return { success, status: success ? 'FINALIZED' : 'FAILED' }
      }
      onStatus?.('PENDING')
    } catch {}
    await new Promise(r => setTimeout(r, TX_POLL_INTERVAL_MS))
  }
  return { success: false, status: 'TIMEOUT' }
}

export function shortAddress(addr: string) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function formatGEN(wei: string | number) {
  try {
    const n = BigInt(wei)
    const eth = Number(n) / 1e18
    if (eth === 0) return '0 GEN'
    if (eth < 0.0001) return '< 0.0001 GEN'
    return `${eth.toFixed(4)} GEN`
  } catch { return '0 GEN' }
}

export function normalizeName(name: string) {
  let n = name.toLowerCase().trim()
  if (n.endsWith('.gen')) n = n.slice(0, -4)
  return n
}
