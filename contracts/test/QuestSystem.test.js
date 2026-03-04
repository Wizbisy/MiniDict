const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("MiniDict Quest System", function () {
  let usdc, vault, router, registry;
  let admin, signer, creator, user1, user2;
  
  const MIN_PAYOUT = 10000; // 0.01 USDC
  const MAX_CLAIMS = 10;
  const PROT_FEE_BPS = 250; // 2.5%
  
  beforeEach(async function () {
    [admin, signer, creator, user1, user2] = await ethers.getSigners();
    
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    
    const Vault = await ethers.getContractFactory("QuestVaultUpgradeable");
    vault = await upgrades.deployProxy(Vault, [await usdc.getAddress(), admin.address], { kind: "uups" });
    await vault.waitForDeployment();
    
    const Router = await ethers.getContractFactory("QuestRouterUpgradeable");
    router = await upgrades.deployProxy(Router, [
      await vault.getAddress(),
      await usdc.getAddress(),
      admin.address,
      signer.address,
      PROT_FEE_BPS
    ], { kind: "uups" });
    await router.waitForDeployment();
    
    const Registry = await ethers.getContractFactory("QuestRegistryUpgradeable");
    registry = await upgrades.deployProxy(Registry, [
      await vault.getAddress(),
      await router.getAddress(),
      await usdc.getAddress(),
      admin.address
    ], { kind: "uups" });
    await registry.waitForDeployment();
    
    const ROUTER_ROLE = await vault.ROUTER_ROLE();
    await vault.grantRole(ROUTER_ROLE, await router.getAddress());
  });

  describe("Initialization & Access Control", function () {
    it("Should set correct roles", async function () {
      expect(await router.hasRole(await router.SIGNER_ROLE(), signer.address)).to.be.true;
      expect(await vault.hasRole(await vault.ROUTER_ROLE(), await router.getAddress())).to.be.true;
    });

    it("Registry should return correct system addresses", async function () {
      const config = await registry.getSystemConfig();
      expect(config._vault).to.equal(await vault.getAddress());
      expect(config._router).to.equal(await router.getAddress());
    });
  });

  describe("Quest Creation", function () {
    it("Should create a quest and escrow funds logic correctly", async function () {
      const payout = MIN_PAYOUT;
      const totalRewards = payout * MAX_CLAIMS;
      const fee = (totalRewards * PROT_FEE_BPS) / 10000;
      const totalCost = totalRewards + fee;
      
      await usdc.mint(creator.address, totalCost);
      await usdc.connect(creator).approve(await vault.getAddress(), totalCost);

      const deadline = (await time.latest()) + 86400; // +1 day
      
      await expect(router.connect(creator).createQuest(
        "castHash123",
        1, 
        payout,
        MAX_CLAIMS,
        deadline
      )).to.emit(router, "QuestCreated")
        .withArgs(0, creator.address, "castHash123", 1, payout, MAX_CLAIMS, deadline)
        .and.to.emit(vault, "FundsDeposited")
        .withArgs(0, creator.address, totalCost)
        .and.to.emit(vault, "ProtocolFeeCollected")
        .withArgs(0, fee);

      expect(await vault.getQuestBalance(0)).to.equal(totalRewards);
      expect(await vault.protocolFeeBalance()).to.equal(fee);
      
      const quest = await router.getQuest(0);
      expect(quest.creator).to.equal(creator.address);
      expect(quest.isActive).to.be.true;
    });
  });

  describe("Claiming Rewards (EIP-712)", function () {
    let questId = 0;
    let payout = MIN_PAYOUT;
    let deadline;

    beforeEach(async function () {
      const totalRewards = payout * MAX_CLAIMS;
      const fee = (totalRewards * PROT_FEE_BPS) / 10000;
      const totalCost = totalRewards + fee;
      
      await usdc.mint(creator.address, totalCost);
      await usdc.connect(creator).approve(await vault.getAddress(), totalCost);

      deadline = (await time.latest()) + 86400;
      await router.connect(creator).createQuest("cast123", 1, payout, MAX_CLAIMS, deadline);
    });

    it("Should allow user to claim with valid backend signature", async function () {
      const nonce = await router.getUserNonce(user1.address);
      const network = await ethers.provider.getNetwork();
      
      const domain = {
        name: "MiniDictQuests",
        version: "1",
        chainId: network.chainId,
        verifyingContract: await router.getAddress()
      };

      const types = {
        ClaimReward: [
          { name: "questId", type: "uint256" },
          { name: "user", type: "address" },
          { name: "nonce", type: "uint256" }
        ]
      };

      const value = { questId, user: user1.address, nonce };
      
      const signature = await signer.signTypedData(domain, types, value);

      await expect(router.connect(user1).claimReward(questId, signature))
        .to.emit(router, "RewardClaimed")
        .withArgs(questId, user1.address, payout)
        .and.to.emit(vault, "FundsReleased")
        .withArgs(questId, user1.address, payout);

      expect(await usdc.balanceOf(user1.address)).to.equal(payout);
      expect(await router.hasUserClaimed(questId, user1.address)).to.be.true;
    });

    it("Should reject double claims", async function () {
      const nonce = await router.getUserNonce(user1.address);
      const network = await ethers.provider.getNetwork();
      const domain = { name: "MiniDictQuests", version: "1", chainId: network.chainId, verifyingContract: await router.getAddress() };
      const types = { ClaimReward: [{ name: "questId", type: "uint256" }, { name: "user", type: "address" }, { name: "nonce", type: "uint256" }] };
      const value = { questId, user: user1.address, nonce };
      const signature = await signer.signTypedData(domain, types, value);

      await router.connect(user1).claimReward(questId, signature);
      
      await expect(router.connect(user1).claimReward(questId, signature))
        .to.be.revertedWithCustomError(router, "AlreadyClaimed");
    });
  });

  describe("Quest Management & Refunds", function () {
    let questId = 0;
    beforeEach(async function () {
      const payout = MIN_PAYOUT;
      const totalCost = (payout * 2) + ((payout * 2 * PROT_FEE_BPS) / 10000);
      await usdc.mint(creator.address, totalCost);
      await usdc.connect(creator).approve(await vault.getAddress(), totalCost);
      await router.connect(creator).createQuest("cast123", 1, payout, 2, (await time.latest()) + 86400);
    });

    it("Should allow creator to deactivate and refund if expired", async function () {
      await time.increase(86401);
      
      const expectedRefund = MIN_PAYOUT * 2;

      await expect(router.connect(creator).refundQuest(questId))
        .to.emit(router, "QuestRefunded")
        .withArgs(questId, creator.address, expectedRefund);
      
      expect(await usdc.balanceOf(creator.address)).to.equal(expectedRefund);
      expect(await vault.getQuestBalance(questId)).to.equal(0);
    });
  });
});
