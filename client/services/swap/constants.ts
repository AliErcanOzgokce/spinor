import { type Address } from 'viem'
import { Token } from './types'

export const CONTRACT_ADDRESSES = {
  ROUTER: '0xbad4cd744F1aFf811859Ba9523Bd0bb3a766913D' as Address,
  FACTORY: '0x258Ca93BC0EBBaEDf8f3728e6B15C792a4f81Ea4' as Address,
  USDC: '0x5b4Df904F6DDb52fa6c92a8e175d44B89bEec30b' as Address
} as const

export const TOKENS: Token[] = [
  {
    address: CONTRACT_ADDRESSES.USDC,
    symbol: 'USDC',
    decimals: 6
  },
  {
    symbol: 'LST1',
    address: '0x765eC58a58B1De2F14Ca6a88f0c4CD8967BBeadF' as Address,
    decimals: 18
  },
  {
    symbol: 'LST2',
    address: '0x583244c44d04d6FFe9693Def783F39492852D664' as Address,
    decimals: 18
  },
  {
    symbol: 'LST3',
    address: '0xb3CbfB95A57318A8764F0533F5e43600daf18B07' as Address,
    decimals: 18
  },
  {
    symbol: 'LST4',
    address: '0x22a994FC9e4799AD4878075a9d43579D42D712F9' as Address,
    decimals: 18
  },
  {
    symbol: 'LRT1',
    address: '0xd579B67eb5dBe576A5D94260778bFE969139441d' as Address,
    decimals: 18
  },
  {
    symbol: 'LRT2',
    address: '0xC36232cdffb63D88AC7B36A3d94025535a9179f2' as Address,
    decimals: 18
  },
  {
    symbol: 'LRT3',
    address: '0x9EfDd2E0E9A55378626cB244997B2763d0D2ec1F' as Address,
    decimals: 18
  },
  {
    symbol: 'LRT4',
    address: '0x279CED13DfE2A4373A72EEdD1382DE4F39152bB0' as Address,
    decimals: 18
  }
]

export const USDC = TOKENS[0]
export const DEFAULT_SLIPPAGE = 0.5
export const MIN_AMOUNT = '0.1'
export const MAX_AMOUNT = '10' 