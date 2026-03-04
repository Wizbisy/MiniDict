const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer, signer, user] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const network = await ethers.provider.getNetwork();
  
  let usdcAddress = process.env.USDC_ADDRESS;
  let signerAddress = process.env.SIGNER_ADDRESS;

  if (network.chainId === 84532n) {
    usdcAddress = usdcAddress || "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    signerAddress = signerAddress || "0x7d33eF502BC843d0a12Ec2ADA057Dcc7eFe9ccf2";
    console.log("Detecting Base Sepolia... Using specific parameters.");
  }

  if (!usdcAddress) {
    console.log("No USDC provided. Deploying Mock USDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log("Mock USDC deployed to:", usdcAddress);
  }

  const adminAddress = deployer.address;
  if (!signerAddress) {
    signerAddress = signer ? signer.address : deployer.address;
  }
  const protocolFeeBps = 250;

  const Vault = await ethers.getContractFactory("QuestVaultUpgradeable");
  const vault = await upgrades.deployProxy(Vault, [usdcAddress, adminAddress], { kind: "uups" });
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("QuestVaultUpgradeable deployed to:", vaultAddress);

  const Router = await ethers.getContractFactory("QuestRouterUpgradeable");
  const router = await upgrades.deployProxy(Router, [
    vaultAddress,
    usdcAddress,
    adminAddress,
    signerAddress,
    protocolFeeBps
  ], { kind: "uups" });
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("QuestRouterUpgradeable deployed to:", routerAddress);

  const Registry = await ethers.getContractFactory("QuestRegistryUpgradeable");
  const registry = await upgrades.deployProxy(Registry, [
    vaultAddress,
    routerAddress,
    usdcAddress,
    adminAddress
  ], { kind: "uups" });
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("QuestRegistryUpgradeable deployed to:", registryAddress);

  const ROUTER_ROLE = await vault.ROUTER_ROLE();
  const tx = await vault.grantRole(ROUTER_ROLE, routerAddress);
  await tx.wait();
  console.log("Granted ROUTER_ROLE to QuestRouter in QuestVault");

  console.log("\nDeployment Complete!");
  console.log("====================");
  console.log("Vault:", vaultAddress);
  console.log("Router:", routerAddress);
  console.log("Registry:", registryAddress);
  console.log("USDC:", usdcAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
