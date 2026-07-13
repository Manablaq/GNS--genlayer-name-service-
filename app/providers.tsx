'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { BRADBURY_CHAIN } from '@/lib/config'
import { TransactionProvider } from '@/components/TransactionProvider'
import { AppShell } from '@/components/AppShell'

const config = createConfig({
  chains: [BRADBURY_CHAIN],
  connectors: [injected()],
  transports: { [BRADBURY_CHAIN.id]: http() },
  ssr: false,
})

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#7B2FFF',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
          })}
        >
          <TransactionProvider><AppShell>{children}</AppShell></TransactionProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
