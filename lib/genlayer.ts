import { CONTRACT_ADDRESS, TX_POLL_INTERVAL_MS, TX_TIMEOUT_MS } from './config'

const RPC = 'https://rpc.bradbury.genlayer.com'

// ── Read contract (view methods) ──────────────────────────────────────────────

async function readContract(method: string, args: unknown[] = []) {
  const id = Math.floor(Math.random() * 1000000)
  const body = {
    jsonrpc: '2.0',
    method: 'gen_call',
    id,
    params: [{
      to: CONTRACT_ADDRESS,
      data: { function: method, args },
    }, 'latest'],
  }

  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error.message)
  const raw = json.result
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function checkAvailability(name: string) {
  return readContract('is_available', [name])
}

export async function getRecord(name: string) {
  return readContract('get_record', [name])
}

export async function resolve(name: string) {
  return readContract('resolve', [name])
}

export async function reverseResolve(address: string) {
  return readContract('reverse_resolve', [address])
}

export async function getBalance(name: string) {
  return readContract('get_balance', [name])
}

export async function getNamesByOwner(address: string) {
  return readContract('get_names_by_owner', [address])
}

export async function getStats() {
  return readContract('get_stats', [])
}

// ── Wait for TX ───────────────────────────────────────────────────────────────

export async function waitForTx(
  txHash: string,
  onStatus?: (s: string) => void,
): Promise<{ success: boolean; status: string }> {
  const start = Date.now()
  while (Date.now() - start < TX_TIMEOUT_MS) {
    try {
      const id = Math.floor(Math.random() * 1000000)
      const res = await fetch(RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          id,
          params: [txHash],
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
    } catch {
      // retry
    }
    await new Promise(r => setTimeout(r, TX_POLL_INTERVAL_MS))
  }
  return { success: false, status: 'TIMEOUT' }
}

// ── Format helpers ────────────────────────────────────────────────────────────

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
  } catch {
    return '0 GEN'
  }
}

export function normalizeName(name: string) {
  let n = name.toLowerCase().trim()
  if (n.endsWith('.gen')) n = n.slice(0, -4)
  return n
}
