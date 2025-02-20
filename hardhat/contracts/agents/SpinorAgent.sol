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
    
    // Current trading token
    address public currentLst;

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
    function setDuration(uint256 _duration) external onlyOwner whenPaused {
        require(_duration > 0, "Duration must be greater than 0");
        duration = _duration;
        emit DurationSet(_duration);
    }

    /**
     * @notice Starts the agent with the set duration
     */
    function start() external onlyOwner whenPaused {
        require(duration > 0, "Duration not set");
        startTime = block.timestamp;
        isActive = true;
        _unpause();
        emit AgentStarted(startTime, startTime + duration);
    }

    /**
     * @dev Modifier to ensure the contract has sufficient token balance
     * @param token The token to check balance for
     * @param amount The required amount
     */
    modifier sufficientBalance(IERC20 token, uint256 amount) {
        require(
            token.balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );
        _;
    }

    /**
     * @notice Sets the token to trade with
     * @param token Address of the LST or LRT token to trade
     */
    function selectToken(address token) external onlyOwner checkDuration {
        require(token != address(0), "Invalid token address");
        require(token != address(usdc), "Cannot select USDC as token");
        currentLst = token;
    }

    /**
     * @notice Deposits tokens into the contract
     * @param token Address of the token to deposit
     * @param amount Amount to deposit
     */
    function deposit(address token, uint256 amount) external whenPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(token == address(usdc) || token == currentLst, "Invalid token");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Withdraws tokens from the contract
     * @param token Address of the token to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external whenPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(token == address(usdc) || token == currentLst, "Invalid token");
        
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    /**
     * @notice Executes a swap between the current token and USDC
     * @param amountIn Amount of tokens to swap
     * @param minAmountOut Minimum amount of tokens to receive
     * @param isUsdcIn Whether USDC is the input token
     */
    function executeSwap(
        uint256 amountIn,
        uint256 minAmountOut,
        bool isUsdcIn
    ) external whenNotPaused checkDuration {
        require(currentLst != address(0), "Token not selected");
        require(amountIn > 0, "Amount must be greater than 0");
        
        address tokenIn = isUsdcIn ? address(usdc) : currentLst;
        address tokenOut = isUsdcIn ? currentLst : address(usdc);
        
        // Approve router if needed
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
     * @notice Adds liquidity to the current token/USDC pair
     * @param tokenAmount Amount of current token to add
     * @param usdcAmount Amount of USDC to add
     * @param minTokenAmount Minimum token amount to add as liquidity
     * @param minUsdcAmount Minimum USDC amount to add as liquidity
     */
    function addLiquidity(
        uint256 tokenAmount,
        uint256 usdcAmount,
        uint256 minTokenAmount,
        uint256 minUsdcAmount
    ) external whenNotPaused checkDuration {
        require(currentLst != address(0), "Token not selected");
        require(tokenAmount > 0 && usdcAmount > 0, "Amounts must be greater than 0");
        
        // Approve router if needed
        IERC20(currentLst).safeApprove(address(router), tokenAmount);
        IERC20(address(usdc)).safeApprove(address(router), usdcAmount);
        
        // Add liquidity
        (uint256 amountToken, uint256 amountUsdc,) = 
            router.addLiquidity(
                currentLst,
                address(usdc),
                tokenAmount,
                usdcAmount,
                minTokenAmount,
                minUsdcAmount,
                address(this),
                block.timestamp
            );
            
        emit LiquidityAdded(currentLst, amountToken, amountUsdc);
    }

    /**
     * @notice Removes liquidity from the current token/USDC pair
     * @param lpTokens Amount of LP tokens to burn
     * @param minTokenAmount Minimum token amount to receive
     * @param minUsdcAmount Minimum USDC amount to receive
     */
    function removeLiquidity(
        uint256 lpTokens,
        uint256 minTokenAmount,
        uint256 minUsdcAmount
    ) external whenNotPaused checkDuration {
        require(currentLst != address(0), "Token not selected");
        require(lpTokens > 0, "LP tokens must be greater than 0");
        
        // Get pair address
        address pair = factory.getPair(currentLst, address(usdc));
        require(pair != address(0), "Pair does not exist");
        
        // Approve router to spend LP tokens
        IERC20(pair).safeApprove(address(router), lpTokens);
        
        // Remove liquidity
        (uint256 amountToken, uint256 amountUsdc) = 
            router.removeLiquidity(
                currentLst,
                address(usdc),
                lpTokens,
                minTokenAmount,
                minUsdcAmount,
                address(this),
                block.timestamp
            );
            
        emit LiquidityRemoved(currentLst, amountToken, amountUsdc);
    }

    /**
     * @notice Pauses the contract
     * @dev Only callable by owner
     */
    function pause() external onlyOwner {
        isActive = false;
        _pause();
    }

    /**
     * @notice Unpauses the contract
     * @dev Only callable by owner
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
} 