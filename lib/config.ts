export const CONTRACT_ADDRESS = '0x15Ca354C73D7f8Ffa02a1e644dCDf41958a7b8A2' as `0x${string}`

export const BRADBURY_CHAIN = {
  id: 4221,
  name: 'GenLayer Bradbury',
  nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-bradbury.genlayer.com'] },
  },
  blockExplorers: {
    default: { name: 'GenExplorer', url: 'https://explorer-bradbury.genlayer.com' },
  },
} as const

export const TX_POLL_INTERVAL_MS = 3000
export const TX_TIMEOUT_MS = 10 * 60 * 1000
