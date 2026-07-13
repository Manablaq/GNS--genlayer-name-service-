import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import localFont from 'next/font/local'

const sans = localFont({ src: '../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2', variable: '--font-sans', display: 'swap', weight: '100 900' })
const mono = localFont({ src: '../node_modules/next/dist/next-devtools/server/font/geist-mono-latin.woff2', variable: '--font-mono', display: 'swap', weight: '100 900' })

export const metadata: Metadata = {
  title: 'GNS — GenLayer Name Service',
  description: 'Claim, resolve, and use human-readable .gen identities on GenLayer Bradbury.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
