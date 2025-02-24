import { Token } from '@/services/swap/types';

export const TOKENS: { [key: string]: Token } = {
  USDC: {
    address: '0x5b4Df904F6DDb52fa6c92a8e175d44B89bEec30b',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },
  LST1: {
    address: '0x765eC58a58B1De2F14Ca6a88f0c4CD8967BBeadF',
    symbol: 'LST1',
    name: 'LST Token 1',
    decimals: 18,
  },
  LST2: {
    address: '0x583244c44d04d6FFe9693Def783F39492852D664',
    symbol: 'LST2',
    name: 'LST Token 2',
    decimals: 18,
  },
  LST3: {
    address: '0xb3CbfB95A57318A8764F0533F5e43600daf18B07',
    symbol: 'LST3',
    name: 'LST Token 3',
    decimals: 18,
  },
  LST4: {
    address: '0x22a994FC9e4799AD4878075a9d43579D42D712F9',
    symbol: 'LST4',
    name: 'LST Token 4',
    decimals: 18,
  },
  LRT1: {
    address: '0xd579B67eb5dBe576A5D94260778bFE969139441d',
    symbol: 'LRT1',
    name: 'LRT Token 1',
    decimals: 18,
  },
  LRT2: {
    address: '0xC36232cdffb63D88AC7B36A3d94025535a9179f2',
    symbol: 'LRT2',
    name: 'LRT Token 2',
    decimals: 18,
  },
  LRT3: {
    address: '0x9EfDd2E0E9A55378626cB244997B2763d0D2ec1F',
    symbol: 'LRT3',
    name: 'LRT Token 3',
    decimals: 18,
  },
  LRT4: {
    address: '0x279CED13DfE2A4373A72EEdD1382DE4F39152bB0',
    symbol: 'LRT4',
    name: 'LRT Token 4',
    decimals: 18,
  },
}; 