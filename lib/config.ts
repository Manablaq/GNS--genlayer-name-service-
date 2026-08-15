export const CONTRACT_ADDRESS = '0x676561784d0864EaFF87F281bA1Af9E2c2e9F090' as `0x${string}`
export const BRADBURY_RPC_URL = 'https://rpc-bradbury.genlayer.com'
export const BRADBURY_EXPLORER_URL = 'https://explorer-bradbury.genlayer.com'

export const BRADBURY_CHAIN = {
  id: 4221,
  name: 'GenLayer Bradbury',
  nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
  rpcUrls: {
    default: { http: [BRADBURY_RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'GenExplorer', url: BRADBURY_EXPLORER_URL },
  },
} as const

export const TX_POLL_INTERVAL_MS = 3000
export const TX_TIMEOUT_MS = 10 * 60 * 1000
