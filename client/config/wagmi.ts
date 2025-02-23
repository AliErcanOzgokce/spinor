import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { createAppKit } from '@reown/appkit/react'
import { type Chain } from 'viem'

// Define ABC Testnet
const abcTestnet = {
  id: 112,
  name: 'ABC Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'ABC',
    symbol: 'ABC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.abc.t.raas.gelato.cloud'],
      webSocket: ['wss://ws.abc.t.raas.gelato.cloud'],
    },
    public: {
      http: ['https://rpc.abc.t.raas.gelato.cloud'],
      webSocket: ['wss://ws.abc.t.raas.gelato.cloud'],
    },
  },
  blockExplorers: {
    default: { name: 'ABC Explorer', url: 'https://explorer.abc.t.raas.gelato.cloud' },
  },
  testnet: true,
} as const

// Get projectId from https://cloud.reown.com
export const projectId = '7b572b9e0a17ea9706a43092d0a57b89'

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// Create Wagmi Adapter with type assertion
export const wagmiAdapter = new WagmiAdapter({
  networks: [abcTestnet as unknown as Chain],
  projectId,
  ssr: true
})

// Set up metadata
const metadata = {
  name: 'Spinor',
  description: 'Spinor - Liquid Staking Protocol',
  url: 'https://spinor.xyz',
  icons: ['https://spinor.xyz/logo.png']
}

// Create modal with ABC Testnet as default network
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks: [abcTestnet as unknown as Chain],
  projectId,
  defaultNetwork: abcTestnet as unknown as Chain,
  metadata,
  features: {
    analytics: true
  }
}) 