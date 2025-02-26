// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../dex/interfaces/IUniswapV2Router.sol";
import "../dex/interfaces/IUniswapV2Factory.sol";
import "../dex/interfaces/IUniswapV2Pair.sol";

/**
 * @title SpinorAgent
 * @dev A contract that automates trading operations on Uniswap V2 pools
 * @notice This contract can:
 * - Accept USDC deposits when paused
 * - Allow USDC withdrawals when paused
 * - Perform automated swaps between USDC and LST tokens
 * - Add and remove liquidity from Uniswap V2 pools
 * - Auto-pause after duration expires
 */
contract SpinorAgent is Ownable, Pausable {
    using SafeERC20 for IERC20;

    // Agent Strategy
    uint256 public tradeStrategy;
    uint256 public riskLevel;

    // Constants for calculations and limits
    uint256 private constant PRECISION = 1e18;
    uint256 private constant MAX_BPS = 10000; // 100%

    // Contract dependencies
    IUniswapV2Router public router;
    IUniswapV2Factory public factory;
    IERC20 public usdc;
    
    // Duration management
    uint256 public duration;
    uint256 public startTime;
    bool public isActive;
    
    // Events
    event USDCDeposited(address indexed user, uint256 amount);
    event USDCWithdrawn(address indexed user, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event LiquidityAdded(address indexed token, uint256 tokenAmount, uint256 usdcAmount);
    event LiquidityRemoved(address indexed token, uint256 tokenAmount, uint256 usdcAmount);
    event DurationSet(uint256 duration);
    event AgentStarted(uint256 startTime, uint256 endTime);
    event AgentExpired(uint256 endTime);

    /**
     * @dev Modifier to check if the duration has expired
     */
    modifier checkDuration() {
        if (isActive && block.timestamp > startTime + duration) {
            isActive = false;
            _pause();
            emit AgentExpired(block.timestamp);
            revert("Duration expired");
        }
        _;
    }

    constructor(
        address _router,
        address _factory,
        address _usdc,
        uint256 _tradeStrategy,
        uint256 _riskLevel
    ) {
        require(_router != address(0), "Invalid router address");
        require(_factory != address(0), "Invalid factory address");
        require(_usdc != address(0), "Invalid USDC address");
        
        router = IUniswapV2Router(_router);
        factory = IUniswapV2Factory(_factory);
        usdc = IERC20(_usdc);
        isActive = false;
        tradeStrategy = _tradeStrategy;
        riskLevel = _riskLevel;
    }

    /**
     * @notice Sets the duration for the agent's active period
     * @param _duration Duration in seconds
     */
    function setDuration(uint256 _duration) external whenPaused {
        require(_duration > 0, "Duration must be greater than 0");
        duration = _duration;
        emit DurationSet(_duration);
    }

    /**
     * @notice Starts the agent with the set duration
     */
    function start() external whenPaused {
        require(duration > 0, "Duration not set");
        startTime = block.timestamp;
        isActive = true;
        _unpause();
        emit AgentStarted(startTime, startTime + duration);
    }

    /**
     * @notice Deposits tokens into the contract
     * @param token Address of the token to deposit
     * @param amount Amount to deposit
     */
    function deposit(address token, uint256 amount) external whenPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(token == address(usdc), "Only USDC deposits allowed");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit USDCDeposited(msg.sender, amount);
    }

    /**
     * @notice Withdraws tokens from the contract
     * @param token Address of the token to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external whenPaused {
        require(amount > 0, "Amount must be greater than 0");
        
        IERC20(token).safeTransfer(msg.sender, amount);
        if (token == address(usdc)) {
            emit USDCWithdrawn(msg.sender, amount);
        }
    }

    /**
     * @notice Executes a swap between any token and USDC
     * @param tokenAddress Address of the token to swap with USDC
     * @param amountIn Amount of tokens to swap
     * @param minAmountOut Minimum amount of tokens to receive
     * @param isUsdcIn Whether USDC is the input token
     */
    function executeSwap(
        address tokenAddress,
        uint256 amountIn,
        uint256 minAmountOut,
        bool isUsdcIn
    ) external whenNotPaused checkDuration {
        require(tokenAddress != address(0), "Invalid token address");
        require(tokenAddress != address(usdc), "Cannot swap USDC for USDC");
        require(amountIn > 0, "Amount must be greater than 0");
        
        address tokenIn = isUsdcIn ? address(usdc) : tokenAddress;
        address tokenOut = isUsdcIn ? tokenAddress : address(usdc);
        
        // Check if pair exists
        address pair = factory.getPair(tokenAddress, address(usdc));
        require(pair != address(0), "Pair does not exist");
        
        // Check balance
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient balance for swap");
        
        // Approve router if needed
        IERC20(tokenIn).safeApprove(address(router), 0); // Reset approval
        IERC20(tokenIn).safeApprove(address(router), amountIn);
        
        // Create path for swap
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        // Execute swap
        uint[] memory amounts = router.swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp
        );
        
        emit SwapExecuted(tokenIn, tokenOut, amounts[0], amounts[1]);
    }

    /**
     * @notice Adds liquidity to any token/USDC pair
     * @param tokenAddress Address of the token to add liquidity with
     * @param tokenAmount Amount of token to add
     * @param usdcAmount Amount of USDC to add
     * @param minTokenAmount Minimum token amount to add as liquidity
     * @param minUsdcAmount Minimum USDC amount to add as liquidity
     */
    function addLiquidity(
        address tokenAddress,
        uint256 tokenAmount,
        uint256 usdcAmount,
        uint256 minTokenAmount,
        uint256 minUsdcAmount
    ) external whenNotPaused checkDuration {
        require(tokenAddress != address(0), "Invalid token address");
        require(tokenAddress != address(usdc), "Cannot add USDC-USDC liquidity");
        require(tokenAmount > 0 && usdcAmount > 0, "Amounts must be greater than 0");
        
        // Check balances
        uint256 tokenBalance = IERC20(tokenAddress).balanceOf(address(this));
        uint256 usdcBalance = usdc.balanceOf(address(this));
        require(tokenBalance >= tokenAmount, "Insufficient token balance");
        require(usdcBalance >= usdcAmount, "Insufficient USDC balance");
        
        // Reset and approve router
        IERC20(tokenAddress).safeApprove(address(router), 0);
        IERC20(address(usdc)).safeApprove(address(router), 0);
        IERC20(tokenAddress).safeApprove(address(router), tokenAmount);
        IERC20(address(usdc)).safeApprove(address(router), usdcAmount);
        
        // Add liquidity
        (uint256 amountToken, uint256 amountUsdc,) = 
            router.addLiquidity(
                tokenAddress,
                address(usdc),
                tokenAmount,
                usdcAmount,
                minTokenAmount,
                minUsdcAmount,
                address(this),
                block.timestamp
            );
            
        emit LiquidityAdded(tokenAddress, amountToken, amountUsdc);
    }

    /**
     * @notice Removes liquidity from any token/USDC pair
     * @param tokenAddress Address of the token in the pair
     * @param lpTokens Amount of LP tokens to burn
     * @param minTokenAmount Minimum token amount to receive
     * @param minUsdcAmount Minimum USDC amount to receive
     */
    function removeLiquidity(
        address tokenAddress,
        uint256 lpTokens,
        uint256 minTokenAmount,
        uint256 minUsdcAmount
    ) external whenNotPaused checkDuration {
        require(tokenAddress != address(0), "Invalid token address");
        require(tokenAddress != address(usdc), "Cannot remove USDC-USDC liquidity");
        require(lpTokens > 0, "LP tokens must be greater than 0");
        
        // Get pair address
        address pair = factory.getPair(tokenAddress, address(usdc));
        require(pair != address(0), "Pair does not exist");
        
        // Check LP token balance
        uint256 lpBalance = IERC20(pair).balanceOf(address(this));
        require(lpBalance >= lpTokens, "Insufficient LP token balance");
        
        // Reset and approve router
        IERC20(pair).safeApprove(address(router), 0);
        IERC20(pair).safeApprove(address(router), lpTokens);
        
        // Remove liquidity
        (uint256 amountToken, uint256 amountUsdc) = 
            router.removeLiquidity(
                tokenAddress,
                address(usdc),
                lpTokens,
                minTokenAmount,
                minUsdcAmount,
                address(this),
                block.timestamp
            );
            
        emit LiquidityRemoved(tokenAddress, amountToken, amountUsdc);
    }

    /**
     * @notice Pauses the contract
     */
    function pause() external onlyOwner {
        isActive = false;
        _pause();
    }

    /**
     * @notice Unpauses the contract
     */
    function unpause() external onlyOwner {
        require(duration > 0, "Duration not set");
        require(!isActive || block.timestamp <= startTime + duration, "Duration expired");
        _unpause();
    }

    /**
     * @notice Emergency withdrawal of any stuck tokens
     * @dev Only callable by owner
     * @param token Address of the token to withdraw
     */
    function emergencyWithdraw(address token) external onlyOwner {
        IERC20 tokenContract = IERC20(token);
        uint256 balance = tokenContract.balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");
        
        tokenContract.safeTransfer(owner(), balance);
    }

    /**
     * @notice Returns the remaining duration in seconds
     * @return Remaining duration in seconds, 0 if expired or not started
     */
    function getRemainingDuration() external view returns (uint256) {
        if (!isActive || block.timestamp >= startTime + duration) {
            return 0;
        }
        return (startTime + duration) - block.timestamp;
    }

    /**
     * @notice Updates the trade strategy
     * @param _strategy New strategy value (1-5)
     */
    function setTradeStrategy(uint256 _strategy) external onlyOwner {
        require(_strategy >= 1 && _strategy <= 5, "Invalid strategy value");
        tradeStrategy = _strategy;
    }

    /**
     * @notice Updates the risk level
     * @param _risk New risk level (1-4)
     */
    function setRiskLevel(uint256 _risk) external onlyOwner {
        require(_risk >= 1 && _risk <= 4, "Invalid risk level");
        riskLevel = _risk;
    }
} 