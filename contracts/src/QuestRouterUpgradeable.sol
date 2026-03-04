// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./QuestVaultUpgradeable.sol";

/**
 * @title QuestRouterUpgradeable
 * @author Wizbisy
 * @notice Quest business logic for the MiniDict system on Base.
 * @dev Manages quest lifecycle, EIP-712 claim verification, and vault delegation.
 *      This contract holds zero funds — all USDC lives in QuestVault.
 *      UUPS upgradeable · AccessControl · Pausable · ReentrancyGuard · EIP712
 */
contract QuestRouterUpgradeable is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardTransient,
    EIP712Upgradeable,
    UUPSUpgradeable
{
    using ECDSA for bytes32;

    // Roles

    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Types

    enum ActionType {
        LIKE,
        RECAST,
        FOLLOW,
        MINT_NFT,
        CUSTOM
    }

    struct Quest {
        uint256 id;
        address creator;
        string targetIdentifier;
        ActionType actionType;
        uint256 payoutPerClaim;
        uint256 maxClaims;
        uint256 claimCount;
        uint256 deadline;
        bool isActive;
    }

    // State

    QuestVaultUpgradeable public vault;
    IERC20 public usdc;
    uint256 public questCount;
    uint256 public protocolFeeBps;

    uint256 public constant MAX_FEE_BPS = 1000;
    uint256 public constant MIN_PAYOUT = 10_000;
    uint256 public constant MAX_QUEST_COST = 1_000_000 * 1e6;

    mapping(uint256 => Quest) public quests;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    mapping(address => uint256[]) public creatorQuestIds;
    mapping(address => uint256) public claimNonces;

    // EIP-712

    bytes32 public constant CLAIM_TYPEHASH =
        keccak256("ClaimReward(uint256 questId,address user,uint256 nonce)");

    // Events

    event QuestCreated(
        uint256 indexed questId,
        address indexed creator,
        string targetIdentifier,
        ActionType actionType,
        uint256 payoutPerClaim,
        uint256 maxClaims,
        uint256 deadline
    );
    event RewardClaimed(
        uint256 indexed questId,
        address indexed user,
        uint256 payout
    );
    event QuestDeactivated(uint256 indexed questId);
    event QuestRefunded(
        uint256 indexed questId,
        address indexed creator,
        uint256 refundAmount
    );
    event ProtocolFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);

    // Errors

    error QuestNotActive(uint256 questId);
    error QuestExpired(uint256 questId);
    error QuestNotExpired(uint256 questId);
    error QuestFullyClaimed(uint256 questId);
    error AlreadyClaimed(uint256 questId, address user);
    error InvalidSignature();
    error InvalidDeadline();
    error InvalidPayout();
    error InvalidMaxClaims();
    error QuestCostOverflow();
    error FeeTooHigh();
    error NotQuestCreator();
    error ZeroAddress();

    // Initializer

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @param _vault          QuestVault proxy address
     * @param _usdc           USDC token address on Base
     * @param _admin          Initial admin
     * @param _signer         Backend signer wallet for claim verification
     * @param _protocolFeeBps Initial protocol fee (basis points, max 1000)
     */
    function initialize(
        address _vault,
        address _usdc,
        address _admin,
        address _signer,
        uint256 _protocolFeeBps
    ) external initializer {
        if (
            _vault == address(0) ||
            _usdc == address(0) ||
            _admin == address(0) ||
            _signer == address(0)
        ) revert ZeroAddress();
        if (_protocolFeeBps > MAX_FEE_BPS) revert FeeTooHigh();

        __AccessControl_init();
        __Pausable_init();
        __EIP712_init("MiniDictQuests", "1");

        vault = QuestVaultUpgradeable(_vault);
        usdc = IERC20(_usdc);
        protocolFeeBps = _protocolFeeBps;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
        _grantRole(SIGNER_ROLE, _signer);
    }

    // Quest Creation

    /**
     * @notice Fund a new quest. Creator must approve the Vault for the total cost.
     * @param targetIdentifier Off-chain reference (cast hash, FID, etc.)
     * @param actionType       Required user action
     * @param payoutPerClaim   USDC per claim (6 decimals, min 0.01 USDC)
     * @param maxClaims        Max claimers
     * @param deadline         Expiry timestamp
     */
    function createQuest(
        string calldata targetIdentifier,
        ActionType actionType,
        uint256 payoutPerClaim,
        uint256 maxClaims,
        uint256 deadline
    ) external whenNotPaused nonReentrant {
        if (deadline <= block.timestamp) revert InvalidDeadline();
        if (payoutPerClaim < MIN_PAYOUT) revert InvalidPayout();
        if (maxClaims == 0) revert InvalidMaxClaims();

        uint256 totalRewards = payoutPerClaim * maxClaims;
        if (totalRewards > MAX_QUEST_COST) revert QuestCostOverflow();

        uint256 fee = (totalRewards * protocolFeeBps) / 10_000;
        uint256 totalCost = totalRewards + fee;

        uint256 questId = questCount;

        quests[questId] = Quest({
            id: questId,
            creator: msg.sender,
            targetIdentifier: targetIdentifier,
            actionType: actionType,
            payoutPerClaim: payoutPerClaim,
            maxClaims: maxClaims,
            claimCount: 0,
            deadline: deadline,
            isActive: true
        });

        creatorQuestIds[msg.sender].push(questId);
        questCount++;

        vault.depositForQuest(questId, msg.sender, totalCost);

        if (fee > 0) {
            vault.collectFee(questId, fee);
        }

        emit QuestCreated(
            questId,
            msg.sender,
            targetIdentifier,
            actionType,
            payoutPerClaim,
            maxClaims,
            deadline
        );
    }

    // Claims
    /**
     * @notice Claim a quest reward with a backend-signed EIP-712 approval.
     * @param questId   Quest to claim
     * @param signature Backend-signed EIP-712 payload
     */
    function claimReward(
        uint256 questId,
        bytes calldata signature
    ) external whenNotPaused nonReentrant {
        Quest storage quest = quests[questId];

        if (!quest.isActive) revert QuestNotActive(questId);
        if (block.timestamp > quest.deadline) revert QuestExpired(questId);
        if (quest.claimCount >= quest.maxClaims)
            revert QuestFullyClaimed(questId);
        if (hasClaimed[questId][msg.sender])
            revert AlreadyClaimed(questId, msg.sender);

        uint256 nonce = claimNonces[msg.sender];
        bytes32 structHash = keccak256(
            abi.encode(CLAIM_TYPEHASH, questId, msg.sender, nonce)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        if (!hasRole(SIGNER_ROLE, signer)) revert InvalidSignature();

        hasClaimed[questId][msg.sender] = true;
        quest.claimCount++;
        claimNonces[msg.sender]++;

        vault.releaseForQuest(questId, msg.sender, quest.payoutPerClaim);

        emit RewardClaimed(questId, msg.sender, quest.payoutPerClaim);
    }

    // Quest Management

    /**
     * @notice Deactivate a quest (creator or admin). Stops new claims.
     * @param questId Quest to deactivate
     */
    function deactivateQuest(uint256 questId) external {
        Quest storage quest = quests[questId];
        if (!quest.isActive) revert QuestNotActive(questId);
        if (
            msg.sender != quest.creator &&
            !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)
        ) revert NotQuestCreator();

        quest.isActive = false;
        emit QuestDeactivated(questId);
    }

    /**
     * @notice Refund unspent USDC to the quest creator after expiry or deactivation.
     * @param questId Quest to refund
     */
    function refundQuest(uint256 questId) external nonReentrant {
        Quest storage quest = quests[questId];

        if (msg.sender != quest.creator) revert NotQuestCreator();

        if (quest.isActive && block.timestamp <= quest.deadline)
            revert QuestNotExpired(questId);

        if (quest.isActive) {
            quest.isActive = false;
            emit QuestDeactivated(questId);
        }

        uint256 remaining = vault.getQuestBalance(questId);
        if (remaining == 0) return;

        vault.refundForQuest(questId, quest.creator, remaining);
        emit QuestRefunded(questId, quest.creator, remaining);
    }

    // Admin

    /**
     * @notice Update protocol fee.
     * @param newFeeBps New fee in basis points (max 1000 = 10%)
     */
    function setProtocolFee(
        uint256 newFeeBps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        uint256 oldFeeBps = protocolFeeBps;
        protocolFeeBps = newFeeBps;
        emit ProtocolFeeUpdated(oldFeeBps, newFeeBps);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // Views

    function getQuest(uint256 questId) external view returns (Quest memory) {
        return quests[questId];
    }

    function hasUserClaimed(
        uint256 questId,
        address user
    ) external view returns (bool) {
        return hasClaimed[questId][user];
    }

    function getCreatorQuests(
        address creator
    ) external view returns (uint256[] memory) {
        return creatorQuestIds[creator];
    }

    function getRemainingClaims(
        uint256 questId
    ) external view returns (uint256) {
        Quest storage quest = quests[questId];
        if (!quest.isActive || block.timestamp > quest.deadline) return 0;
        return quest.maxClaims - quest.claimCount;
    }

    function getUserNonce(address user) external view returns (uint256) {
        return claimNonces[user];
    }

    // UUPS

    function _authorizeUpgrade(
        address
    ) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
