/**
 * Contract ABIs for trading services
 */

export const AGENT_ABI = [
    'function executeSwap(uint256 amountIn, uint256 minAmountOut, bool isUsdcIn) external',
    'function addLiquidity(uint256 tokenAmount, uint256 usdcAmount, uint256 minTokenAmount, uint256 minUsdcAmount) external',
    'function removeLiquidity(uint256 lpTokens, uint256 minTokenAmount, uint256 minUsdcAmount) external',
    'function currentLst() external view returns (address)',
    'function usdc() external view returns (address)'
];

export const ROUTER_ABI = [
    'function getAmountsOut(uint amountIn, address[] memory path) external view returns (uint[] memory amounts)',
    'function factory() external view returns (address)'
];

export const FACTORY_ABI = [
    'function getPair(address tokenA, address tokenB) external view returns (address)'
];

export const ERC20_ABI = [
    'function balanceOf(address account) external view returns (uint256)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function approve(address spender, uint256 amount) external returns (bool)'
];

export const PAIR_ABI = [
    'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function totalSupply() external view returns (uint256)',
    'function balanceOf(address account) external view returns (uint256)'
]; 