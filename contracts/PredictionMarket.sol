// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PredictionMarket
 * @notice Social engagement prediction market on Base using USDC
 * @dev Admin-gated market creation, USDC betting, automatic settlement
 */
contract PredictionMarket is Ownable, ReentrancyGuard {
    // ---- Types ----

    enum MetricType {
        LIKES,
        RECASTS,
        REPLIES,
        FOLLOWERS
    }

    struct Market {
        uint256 id;
        string castHash;
        MetricType metricType;
        uint256 targetValue;
        uint256 deadline;
        uint256 totalYesAmount;
        uint256 totalNoAmount;
        bool resolved;
        bool outcome; // true = target was met (YES wins)
        address creator;
    }

    struct UserPosition {
        uint256 yesAmount;
        uint256 noAmount;
        bool claimed;
    }

    // ---- State ----

    IERC20 public immutable usdc;
    uint256 public marketCount;
    uint256 public constant MIN_BET = 1e6; // 1 USDC (6 decimals)
    uint256 public constant PROTOCOL_FEE_BPS = 200; // 2% fee

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => UserPosition)) public userPositions;
    mapping(address => uint256[]) public userMarketIds;

    // ---- Events ----

    event MarketCreated(
        uint256 indexed id,
        string castHash,
        MetricType metricType,
        uint256 targetValue,
        uint256 deadline
    );

    event BetPlaced(
        uint256 indexed marketId,
        address indexed user,
        bool prediction,
        uint256 amount
    );

    event MarketResolved(
        uint256 indexed marketId,
        bool outcome,
        uint256 actualValue
    );

    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount
    );

    // ---- Constructor ----

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    // ---- Admin Functions ----

    /**
     * @notice Create a new prediction market (admin only)
     * @param castHash Farcaster cast hash to track
     * @param metricType Type of engagement metric
     * @param targetValue Target value for the metric
     * @param deadline Unix timestamp when market resolves
     * @param initialLiquidity USDC amount to seed both pools (split 50/50). Set to 0 for no initial liquidity.
     */
    function createMarket(
        string calldata castHash,
        MetricType metricType,
        uint256 targetValue,
        uint256 deadline,
        uint256 initialLiquidity
    ) external onlyOwner {
        require(deadline > block.timestamp, "Deadline must be in the future");
        require(targetValue > 0, "Target must be positive");
        require(bytes(castHash).length > 0, "Cast hash required");

        uint256 yesPool = 0;
        uint256 noPool = 0;

        // Seed initial liquidity if provided
        if (initialLiquidity > 0) {
            require(
                usdc.transferFrom(msg.sender, address(this), initialLiquidity),
                "USDC transfer failed"
            );
            yesPool = initialLiquidity / 2;
            noPool = initialLiquidity - yesPool; // handles odd amounts
        }

        uint256 id = marketCount;
        markets[id] = Market({
            id: id,
            castHash: castHash,
            metricType: metricType,
            targetValue: targetValue,
            deadline: deadline,
            totalYesAmount: yesPool,
            totalNoAmount: noPool,
            resolved: false,
            outcome: false,
            creator: msg.sender
        });

        marketCount++;

        emit MarketCreated(id, castHash, metricType, targetValue, deadline);
    }

    /**
     * @notice Resolve a market with the actual engagement value (admin only)
     * @param marketId Market to resolve
     * @param actualValue The actual engagement value at deadline
     */
    function resolveMarket(
        uint256 marketId,
        uint256 actualValue
    ) external onlyOwner {
        Market storage market = markets[marketId];
        require(!market.resolved, "Already resolved");
        require(block.timestamp >= market.deadline, "Too early to resolve");

        market.resolved = true;
        market.outcome = actualValue >= market.targetValue;

        emit MarketResolved(marketId, market.outcome, actualValue);
    }

    // ---- User Functions ----

    /**
     * @notice Place a bet on a market
     * @param marketId Market to bet on
     * @param prediction true = YES (target will be met), false = NO
     * @param amount USDC amount (6 decimals)
     */
    function placeBet(
        uint256 marketId,
        bool prediction,
        uint256 amount
    ) external nonReentrant {
        Market storage market = markets[marketId];
        require(!market.resolved, "Market already resolved");
        require(block.timestamp < market.deadline, "Market expired");
        require(amount >= MIN_BET, "Below minimum bet");

        // Transfer USDC from user
        require(
            usdc.transferFrom(msg.sender, address(this), amount),
            "USDC transfer failed"
        );

        // Record position
        UserPosition storage pos = userPositions[marketId][msg.sender];

        // Track user's market IDs (only first bet)
        if (pos.yesAmount == 0 && pos.noAmount == 0) {
            userMarketIds[msg.sender].push(marketId);
        }

        if (prediction) {
            pos.yesAmount += amount;
            market.totalYesAmount += amount;
        } else {
            pos.noAmount += amount;
            market.totalNoAmount += amount;
        }

        emit BetPlaced(marketId, msg.sender, prediction, amount);
    }

    /**
     * @notice Claim winnings from a resolved market
     * @param marketId Market to claim from
     */
    function claimWinnings(uint256 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.resolved, "Market not resolved");

        UserPosition storage pos = userPositions[marketId][msg.sender];
        require(!pos.claimed, "Already claimed");

        uint256 winnings = _calculateWinnings(market, pos);
        require(winnings > 0, "No winnings");

        pos.claimed = true;

        // Apply protocol fee
        uint256 fee = (winnings * PROTOCOL_FEE_BPS) / 10000;
        uint256 payout = winnings - fee;

        require(usdc.transfer(msg.sender, payout), "USDC transfer failed");
        if (fee > 0) {
            require(usdc.transfer(owner(), fee), "Fee transfer failed");
        }

        emit WinningsClaimed(marketId, msg.sender, payout);
    }

    // ---- View Functions ----

    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    function getUserBet(
        uint256 marketId,
        address user
    )
        external
        view
        returns (uint256 yesAmount, uint256 noAmount, bool claimed)
    {
        UserPosition storage pos = userPositions[marketId][user];
        return (pos.yesAmount, pos.noAmount, pos.claimed);
    }

    function getUserMarketIds(
        address user
    ) external view returns (uint256[] memory) {
        return userMarketIds[user];
    }

    function getClaimableAmount(
        uint256 marketId,
        address user
    ) external view returns (uint256) {
        Market storage market = markets[marketId];
        if (!market.resolved) return 0;

        UserPosition storage pos = userPositions[marketId][user];
        if (pos.claimed) return 0;

        uint256 winnings = _calculateWinnings(market, pos);
        uint256 fee = (winnings * PROTOCOL_FEE_BPS) / 10000;
        return winnings - fee;
    }

    function _calculateWinnings(
        Market storage market,
        UserPosition storage pos
    ) internal view returns (uint256) {
        uint256 totalPool = market.totalYesAmount + market.totalNoAmount;
        if (totalPool == 0) return 0;

        if (market.outcome) {
            // YES won - distribute total pool to YES bettors proportionally
            if (market.totalYesAmount == 0) return 0;
            return (pos.yesAmount * totalPool) / market.totalYesAmount;
        } else {
            // NO won - distribute total pool to NO bettors proportionally
            if (market.totalNoAmount == 0) return 0;
            return (pos.noAmount * totalPool) / market.totalNoAmount;
        }
    }
}
