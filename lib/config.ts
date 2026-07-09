export const CONTRACT_ADDRESS = '0x15Ca354C73D7f8Ffa02a1e644dCDf41958a7b8A2' as `0x${string}`
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
