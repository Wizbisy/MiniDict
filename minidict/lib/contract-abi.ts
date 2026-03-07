export const QUEST_ROUTER_ABI = [
  { inputs: [], name: "questCount", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "questId", type: "uint256" }], name: "getQuest", outputs: [{ components: [{ name: "id", type: "uint256" }, { name: "creator", type: "address" }, { name: "targetIdentifier", type: "string" }, { name: "actionType", type: "uint8" }, { name: "payoutPerClaim", type: "uint256" }, { name: "maxClaims", type: "uint256" }, { name: "claimCount", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "isActive", type: "bool" }], type: "tuple" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "questId", type: "uint256" }], name: "getRemainingClaims", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "questId", type: "uint256" }, { name: "user", type: "address" }], name: "hasUserClaimed", outputs: [{ type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "user", type: "address" }], name: "getUserNonce", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "creator", type: "address" }], name: "getCreatorQuests", outputs: [{ type: "uint256[]" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "protocolFeeBps", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "targetIdentifier", type: "string" }, { name: "actionType", type: "uint8" }, { name: "payoutPerClaim", type: "uint256" }, { name: "maxClaims", type: "uint256" }, { name: "deadline", type: "uint256" }], name: "createQuest", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "questId", type: "uint256" }, { name: "signature", type: "bytes" }], name: "claimReward", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "questId", type: "uint256" }], name: "deactivateQuest", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "questId", type: "uint256" }], name: "refundQuest", outputs: [], stateMutability: "nonpayable", type: "function" },
  { anonymous: false, inputs: [{ indexed: true, name: "questId", type: "uint256" }, { indexed: true, name: "creator", type: "address" }, { indexed: false, name: "targetIdentifier", type: "string" }, { indexed: false, name: "actionType", type: "uint8" }, { indexed: false, name: "payoutPerClaim", type: "uint256" }, { indexed: false, name: "maxClaims", type: "uint256" }, { indexed: false, name: "deadline", type: "uint256" }], name: "QuestCreated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "questId", type: "uint256" }, { indexed: true, name: "user", type: "address" }, { indexed: false, name: "payout", type: "uint256" }], name: "RewardClaimed", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "questId", type: "uint256" }], name: "QuestDeactivated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "questId", type: "uint256" }, { indexed: true, name: "creator", type: "address" }, { indexed: false, name: "refundAmount", type: "uint256" }], name: "QuestRefunded", type: "event" },
] as const

export const ERC20_ABI = [
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const

export const QUEST_VAULT_ABI = [
  { inputs: [{ name: "questId", type: "uint256" }], name: "getQuestBalance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }
] as const

export const CONTRACTS = {
  QUEST_ROUTER: "0x1829acb55fBB8EbEB2e47EAca55a1658B6b51041",
  QUEST_VAULT:  "0x59f298DD1449E35706E87bF93d4b90E4C494BD86",
  QUEST_REGISTRY: "0x969b5DD12E8ECb9eC5c0c845F4efa49fD8E1FF2A",
  USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
} as const

export const BASE_CHAIN_ID = 84532
export const BASE_RPC = "https://sepolia.base.org"
