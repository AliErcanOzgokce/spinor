// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SpinorHistory
 * @dev Contract for storing trade history of the Spinor AI Agent
 */
contract SpinorHistory is Ownable {
    // Events
    event TradeRecorded(
        uint256 timestamp,
        string actionType,
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        string reason,
        bytes32 txHash,
        string status,
        uint256 tradeStrategy,
        uint256 riskLevel,
        int256 pnl,
        uint256 apy
    );

    // Structs
    struct TradeRecord {
        uint256 timestamp;
        string actionType;
        address tokenA;
        address tokenB;
        uint256 amountA;
        uint256 amountB;
        string reason;
        bytes32 txHash;
        string status;
        uint256 tradeStrategy;
        uint256 riskLevel;
        int256 pnl;
        uint256 apy;
    }

    // State variables
    TradeRecord[] public tradeHistory;

    /**
     * @notice Records a trade in history
     * @param timestamp Time of the trade
     * @param actionType Type of action (swap, addLiquidity, removeLiquidity)
     * @param tokenA First token address
     * @param tokenB Second token address
     * @param amountA Amount of first token
     * @param amountB Amount of second token
     * @param reason Reason for the trade
     * @param txHash Transaction hash
     * @param status Transaction status
     * @param tradeStrategy Current trade strategy (1-5)
     * @param riskLevel Current risk level (1-4)
     * @param pnl Profit/Loss in USDC (can be negative)
     * @param apy Current APY for LST/LRT strategies
     */
    function recordTradeHistory(
        uint256 timestamp,
        string memory actionType,
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        string memory reason,
        bytes32 txHash,
        string memory status,
        uint256 tradeStrategy,
        uint256 riskLevel,
        int256 pnl,
        uint256 apy
    ) external {
        require(txHash != bytes32(0), "Invalid transaction hash");
        require(bytes(actionType).length > 0, "Invalid action type");
        require(tradeStrategy >= 1 && tradeStrategy <= 5, "Invalid trade strategy");
        require(riskLevel >= 1 && riskLevel <= 4, "Invalid risk level");

        TradeRecord memory record = TradeRecord({
            timestamp: timestamp,
            actionType: actionType,
            tokenA: tokenA,
            tokenB: tokenB,
            amountA: amountA,
            amountB: amountB,
            reason: reason,
            txHash: txHash,
            status: status,
            tradeStrategy: tradeStrategy,
            riskLevel: riskLevel,
            pnl: pnl,
            apy: apy
        });

        tradeHistory.push(record);

        emit TradeRecorded(
            timestamp,
            actionType,
            tokenA,
            tokenB,
            amountA,
            amountB,
            reason,
            txHash,
            status,
            tradeStrategy,
            riskLevel,
            pnl,
            apy
        );
    }

    /**
     * @notice Gets the total number of trades
     * @return uint256 Number of trades
     */
    function getTradeCount() external view returns (uint256) {
        return tradeHistory.length;
    }
} 