// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title QuestRegistry
 * @author Wizbisy
 * @notice Central directory for the MiniDict Quest system on Base.
 * @dev Stores active Vault/Router proxy addresses and version history.
 *      UUPS upgradeable · AccessControl
 */
contract QuestRegistryUpgradeable is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    // Roles

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // State

    address public vault;
    address public router;
    address public usdc;
    address[] public routerHistory;
    address[] public vaultHistory;
    bool public systemActive;

    // Events

    event VaultUpdated(address indexed oldVault, address indexed newVault);
    event RouterUpdated(address indexed oldRouter, address indexed newRouter);
    event SystemStatusChanged(bool isActive);

    // Errors

    error ZeroAddress();
    error SystemNotActive();

    // Initializer

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @param _vault  Initial QuestVault proxy address
     * @param _router Initial QuestRouter proxy address
     * @param _usdc   USDC token address on Base
     * @param _admin  Initial admin
     */
    function initialize(
        address _vault,
        address _router,
        address _usdc,
        address _admin
    ) external initializer {
        if (
            _vault == address(0) ||
            _router == address(0) ||
            _usdc == address(0) ||
            _admin == address(0)
        ) revert ZeroAddress();

        __AccessControl_init();

        vault = _vault;
        router = _router;
        usdc = _usdc;
        systemActive = true;

        vaultHistory.push(_vault);
        routerHistory.push(_router);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
    }

    // Registry Updates

    /**
     * @notice Point registry to a new Vault proxy.
     * @param _newVault New vault address
     */
    function setVault(address _newVault) external onlyRole(OPERATOR_ROLE) {
        if (_newVault == address(0)) revert ZeroAddress();
        address oldVault = vault;
        vault = _newVault;
        vaultHistory.push(_newVault);
        emit VaultUpdated(oldVault, _newVault);
    }

    /**
     * @notice Point registry to a new Router proxy.
     * @param _newRouter New router address
     */
    function setRouter(address _newRouter) external onlyRole(OPERATOR_ROLE) {
        if (_newRouter == address(0)) revert ZeroAddress();
        address oldRouter = router;
        router = _newRouter;
        routerHistory.push(_newRouter);
        emit RouterUpdated(oldRouter, _newRouter);
    }

    /**
     * @notice Global kill switch. Frontends must check before interactions.
     * @param _active System status
     */
    function setSystemActive(
        bool _active
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        systemActive = _active;
        emit SystemStatusChanged(_active);
    }

    // Views

    /**
     * @notice Returns all system addresses in a single call.
     */
    function getSystemConfig()
        external
        view
        returns (address _vault, address _router, address _usdc, bool _active)
    {
        return (vault, router, usdc, systemActive);
    }

    function getRouterHistoryLength() external view returns (uint256) {
        return routerHistory.length;
    }

    function getVaultHistoryLength() external view returns (uint256) {
        return vaultHistory.length;
    }

    // UUPS

    function _authorizeUpgrade(
        address
    ) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
