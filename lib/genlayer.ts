// lib/genlayer.ts — direct client-side reads using official genlayer-js pattern
import { CONTRACT_ADDRESS } from './config'

export const TX_POLL_INTERVAL_MS = 3000
export const TX_TIMEOUT_MS = 10 * 60 * 1000

// Lazy singleton client — created once, reused
let _clientPromise: Promise<any> | null = null

async function getClient(): Promise<any> {
  if (!_clientPromise) {
    _clientPromise = (async () => {
      const { createClient } = await import('genlayer-js')
      const { testnetBradbury } = await import('genlayer-js/chains')
      return createClient({ chain: testnetBradbury })
    })()
  }
  return _clientPromise
}

async function readContract(method: string, args: unknown[] = []) {
  const client = await getClient()
  const result = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: method,
    args,
    stateStatus: 'accepted',
  })
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
  const client = await getClient()
  const start = Date.now()
  while (Date.now() - start < TX_TIMEOUT_MS) {
    try {
      const receipt = await client.getTransactionReceipt({ hash: txHash })
      if (receipt) {
        const success = receipt.statusName === 'FINALIZED' || receipt.resultName === 'AGREE'
        onStatus?.(success ? 'FINALIZED' : receipt.statusName || 'FAILED')
        return { success, status: receipt.statusName || 'DONE' }
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
