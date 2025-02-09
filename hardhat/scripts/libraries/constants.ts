import { ethers } from "ethers";

export const CONSTANTS = {
    // Time constants
    DEADLINE_MINUTES: 20,
    
    // Default values
    DEFAULT_SLIPPAGE_TOLERANCE: 0.5,
    DEFAULT_GAS_LIMIT: 5000000,
    
    // Contract function ABIs
    FACTORY_ABI: [
        "function getPair(address, address) external view returns (address)",
        "function createPair(address tokenA, address tokenB) external returns (address pair)",
    ],
    
    ROUTER_ABI: [
        "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
        "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)",
        "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
    ],
    
    PAIR_ABI: [
        "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
        "function token0() external view returns (address)",
        "function token1() external view returns (address)",
        "function approve(address spender, uint value) external returns (bool)",
        "function totalSupply() external view returns (uint)",
        "function balanceOf(address owner) external view returns (uint)",
        "function transfer(address to, uint value) external returns (bool)",
        "function allowance(address owner, address spender) external view returns (uint)",
    ],
    
    // Common values
    MAX_UINT256: ethers.constants.MaxUint256,
    ZERO_ADDRESS: ethers.constants.AddressZero,
} 