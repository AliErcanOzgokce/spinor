// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./libraries/Math.sol";

contract UniswapV2Router {
    using SafeERC20 for IERC20;

    address public immutable factory;
    
    modifier ensure(uint deadline) {
        require(deadline >= block.timestamp, 'UniswapV2Router: EXPIRED');
        _;
    }

    constructor(address _factory) {
        factory = _factory;
    }

    function _getOrCreatePair(address tokenA, address tokenB) internal returns (address pair) {
        pair = IUniswapV2Factory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = IUniswapV2Factory(factory).createPair(tokenA, tokenB);
        }
    }

    function _calculateOptimalAmounts(
        uint amountADesired,
        uint amountBDesired,
        uint reserveA,
        uint reserveB
    ) internal pure returns (uint amountA, uint amountB) {
        if (reserveA == 0 && reserveB == 0) {
            return (amountADesired, amountBDesired);
        }
        
        uint amountBOptimal = quote(amountADesired, reserveA, reserveB);
        if (amountBOptimal <= amountBDesired) {
            return (amountADesired, amountBOptimal);
        }
        
        uint amountAOptimal = quote(amountBDesired, reserveB, reserveA);
        return (amountAOptimal, amountBDesired);
    }

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin
    ) internal virtual returns (uint amountA, uint amountB) {
        require(amountADesired >= amountAMin, 'UniswapV2Router: INSUFFICIENT_A_AMOUNT');
        require(amountBDesired >= amountBMin, 'UniswapV2Router: INSUFFICIENT_B_AMOUNT');
        
        address pair = _getOrCreatePair(tokenA, tokenB);
        (uint reserveA, uint reserveB,) = IUniswapV2Pair(pair).getReserves();
        
        (amountA, amountB) = _calculateOptimalAmounts(amountADesired, amountBDesired, reserveA, reserveB);
        require(amountA >= amountAMin, 'UniswapV2Router: INSUFFICIENT_A_AMOUNT');
        require(amountB >= amountBMin, 'UniswapV2Router: INSUFFICIENT_B_AMOUNT');
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external virtual ensure(deadline) returns (uint amountA, uint amountB, uint liquidity) {
        address pair = _getOrCreatePair(tokenA, tokenB);
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        
        _transferTokensToPair(tokenA, tokenB, pair, amountA, amountB);
        liquidity = IUniswapV2Pair(pair).mint(to);
    }

    function _transferTokensToPair(
        address tokenA,
        address tokenB,
        address pair,
        uint amountA,
        uint amountB
    ) internal {
        IERC20(tokenA).safeTransferFrom(msg.sender, pair, amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, pair, amountB);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) public virtual ensure(deadline) returns (uint amountA, uint amountB) {
        address pair = IUniswapV2Factory(factory).getPair(tokenA, tokenB);
        IERC20(pair).safeTransferFrom(msg.sender, pair, liquidity);
        (amountA, amountB) = IUniswapV2Pair(pair).burn(to);
        require(amountA >= amountAMin, 'UniswapV2Router: INSUFFICIENT_A_AMOUNT');
        require(amountB >= amountBMin, 'UniswapV2Router: INSUFFICIENT_B_AMOUNT');
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external virtual ensure(deadline) returns (uint[] memory amounts) {
        require(path.length >= 2, 'UniswapV2Router: INVALID_PATH');
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        
        for (uint i; i < path.length - 1; i++) {
            address pair = IUniswapV2Factory(factory).getPair(path[i], path[i + 1]);
            IUniswapV2Pair pairContract = IUniswapV2Pair(pair);
            (uint reserve0, uint reserve1,) = pairContract.getReserves();
            address token0 = pairContract.token0();
            
            (uint reserveIn, uint reserveOut) = path[i] == token0 
                ? (reserve0, reserve1) 
                : (reserve1, reserve0);
                
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
        require(amounts[amounts.length - 1] >= amountOutMin, 'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT');

        // Transfer tokens to the first pair
        IERC20(path[0]).safeTransferFrom(msg.sender, IUniswapV2Factory(factory).getPair(path[0], path[1]), amounts[0]);
        
        _swap(amounts, path, to);
    }

    function quote(uint amountA, uint reserveA, uint reserveB) internal pure returns (uint amountB) {
        require(amountA > 0, 'UniswapV2Router: INSUFFICIENT_AMOUNT');
        require(reserveA > 0 && reserveB > 0, 'UniswapV2Router: INSUFFICIENT_LIQUIDITY');
        amountB = amountA * reserveB / reserveA;
    }

    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) internal pure returns (uint amountOut) {
        require(amountIn > 0, 'UniswapV2Router: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Router: INSUFFICIENT_LIQUIDITY');
        uint amountInWithFee = amountIn * 997;
        uint numerator = amountInWithFee * reserveOut;
        uint denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    function _swap(uint[] memory amounts, address[] memory path, address _to) internal virtual {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            address pair = IUniswapV2Factory(factory).getPair(input, output);
            uint amountOut = amounts[i + 1];
            (uint amount0Out, uint amount1Out) = input < output ? (uint(0), amountOut) : (amountOut, uint(0));
            IUniswapV2Pair(pair).swap(amount0Out, amount1Out, _to);
        }
    }
} 