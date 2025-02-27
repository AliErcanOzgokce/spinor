import { type WalletClient } from 'wagmi'
import { BrowserProvider } from 'ethers'

export async function walletClientToProvider(walletClient: WalletClient) {
  const { chain, transport } = walletClient
  const provider = new BrowserProvider(transport)
  return provider
}

export async function walletClientToSigner(walletClient: WalletClient) {
  const provider = await walletClientToProvider(walletClient)
  return provider.getSigner()
} 