// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title QuestVaultUpgradeable
 * @author Wizbisy
 * @notice Secure USDC escrow vault for the MiniDict Quest system on Base.
 * @dev Holds all protocol funds. Business logic is delegated to QuestRouter.
 *      UUPS upgradeable · AccessControl · Pausable · ReentrancyGuard
 */
contract QuestVaultUpgradeable is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardTransient,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    // Roles

    bytes32 public constant ROUTER_ROLE = keccak256("ROUTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // State

    IERC20 public usdc;
    mapping(uint256 => uint256) public questBalances;
    uint256 public totalLocked;
    uint256 public protocolFeeBalance;

    // Events

    event FundsDeposited(
        uint256 indexed questId,
        address indexed from,
        uint256 amount
    );
    event FundsReleased(
        uint256 indexed questId,
        address indexed to,
        uint256 amount
    );
    event FundsRefunded(
        uint256 indexed questId,
        address indexed to,
        uint256 amount
    );
    event ProtocolFeeCollected(uint256 indexed questId, uint256 feeAmount);
    event ProtocolFeeWithdrawn(address indexed to, uint256 amount);

    // Errors

    error InsufficientQuestBalance(
        uint256 questId,
        uint256 requested,
        uint256 available
    );
    error InsufficientFeeBalance(uint256 requested, uint256 available);
    error ZeroAmount();
    error ZeroAddress();

    // Initializer

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @param _usdc  USDC token address on Base
     * @param _admin Initial admin (receives DEFAULT_ADMIN_ROLE + PAUSER_ROLE)
     */
    function initialize(address _usdc, address _admin) external initializer {
        if (_usdc == address(0) || _admin == address(0)) revert ZeroAddress();

        __AccessControl_init();
        __Pausable_init();

        usdc = IERC20(_usdc);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
    }

    // Router-Only

    /**
     * @notice Pull USDC from `from` into escrow for a quest.
     * @param questId Quest identifier
     * @param from    Creator wallet (must have approved this vault)
     * @param amount  USDC amount (6 decimals)
     */
    function depositForQuest(
        uint256 questId,
        address from,
        uint256 amount
    ) external onlyRole(ROUTER_ROLE) whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();

        questBalances[questId] += amount;
        totalLocked += amount;

        usdc.safeTransferFrom(from, address(this), amount);

        emit FundsDeposited(questId, from, amount);
    }

    /**
     * @notice Release USDC from quest escrow to a claimer.
     * @param questId Quest identifier
     * @param to      Recipient wallet
     * @param amount  USDC to send
     */
    function releaseForQuest(
        uint256 questId,
        address to,
        uint256 amount
    ) external onlyRole(ROUTER_ROLE) whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();

        uint256 available = questBalances[questId];
        if (amount > available)
            revert InsufficientQuestBalance(questId, amount, available);

        questBalances[questId] -= amount;
        totalLocked -= amount;

        usdc.safeTransfer(to, amount);

        emit FundsReleased(questId, to, amount);
    }

    /**
     * @notice Refund remaining USDC from a quest back to its creator.
     * @param questId Quest identifier
     * @param to      Creator wallet
     * @param amount  USDC to refund
     */
    function refundForQuest(
        uint256 questId,
        address to,
        uint256 amount
    ) external onlyRole(ROUTER_ROLE) whenNotPaused nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();

        uint256 available = questBalances[questId];
        if (amount > available)
            revert InsufficientQuestBalance(questId, amount, available);

        questBalances[questId] -= amount;
        totalLocked -= amount;

        usdc.safeTransfer(to, amount);

        emit FundsRefunded(questId, to, amount);
    }

    /**
     * @notice Move protocol fee from quest escrow into fee balance.
     * @param questId   Quest identifier
     * @param feeAmount Fee in USDC
     */
    function collectFee(
        uint256 questId,
        uint256 feeAmount
    ) external onlyRole(ROUTER_ROLE) whenNotPaused nonReentrant {
        if (feeAmount == 0) revert ZeroAmount();

        uint256 available = questBalances[questId];
        if (feeAmount > available)
            revert InsufficientQuestBalance(questId, feeAmount, available);

        questBalances[questId] -= feeAmount;
        totalLocked -= feeAmount;
        protocolFeeBalance += feeAmount;

        emit ProtocolFeeCollected(questId, feeAmount);
    }

    // Admin

    /**
     * @notice Withdraw accumulated protocol fees.
     * @param to     Recipient
     * @param amount USDC to withdraw
     */
    function withdrawProtocolFees(
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (amount > protocolFeeBalance)
            revert InsufficientFeeBalance(amount, protocolFeeBalance);

        protocolFeeBalance -= amount;

        usdc.safeTransfer(to, amount);

        emit ProtocolFeeWithdrawn(to, amount);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // Views

    function getQuestBalance(uint256 questId) external view returns (uint256) {
        return questBalances[questId];
    }

    // UUPS

    function _authorizeUpgrade(
        address
    ) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
