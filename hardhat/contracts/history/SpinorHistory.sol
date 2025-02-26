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
        uint256 gasUsed,
        uint256 blockNumber
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
        uint256 gasUsed;
        uint256 blockNumber;
    }

    // State variables
    mapping(bytes32 => TradeRecord) public trades;
    bytes32[] public tradeHashes;

    /**
     * @notice Records a trade in the history
     * @param timestamp Time when the trade occurred
     * @param actionType Type of action (swap/addLiquidity/removeLiquidity)
     * @param tokenA First token address
     * @param tokenB Second token address
     * @param amountA Amount of first token
     * @param amountB Amount of second token
     * @param reason Reason for the trade
     * @param txHash Transaction hash
     * @param status Transaction status
     * @param gasUsed Gas used in the transaction
     * @param blockNumber Block number of the transaction
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
        uint256 gasUsed,
        uint256 blockNumber
    ) external {
        require(txHash != bytes32(0), "Invalid transaction hash");
        require(bytes(actionType).length > 0, "Invalid action type");

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
            gasUsed: gasUsed,
            blockNumber: blockNumber
        });

        trades[txHash] = record;
        tradeHashes.push(txHash);

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
            gasUsed,
            blockNumber
        );
    }

    /**
     * @notice Gets the total number of trades recorded
     * @return Number of trades
     */
    function getTradeCount() external view returns (uint256) {
        return tradeHashes.length;
    }

    /**
     * @notice Gets trade records for a range of indices
     * @param start Start index
     * @param end End index (exclusive)
     * @return Array of trade records
     */
    function getTradeRange(uint256 start, uint256 end)
        external
        view
        returns (TradeRecord[] memory)
    {
        require(start < end, "Invalid range");
        require(end <= tradeHashes.length, "End out of bounds");

        uint256 length = end - start;
        TradeRecord[] memory records = new TradeRecord[](length);

        for (uint256 i = 0; i < length; i++) {
            records[i] = trades[tradeHashes[start + i]];
        }

        return records;
    }
} 