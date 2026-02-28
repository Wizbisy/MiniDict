import { secp256k1 } from "@noble/curves/secp256k1"
import { keccak_256 } from "@noble/hashes/sha3"

function rlpEncode(input: Uint8Array | Uint8Array[]): Uint8Array {
  if (input instanceof Uint8Array) {
    if (input.length === 1 && input[0] < 0x80) {
      return input
    }
    return concatBytes(encodeLength(input.length, 0x80), input)
  }

  const output = input.map(rlpEncode)
  const totalLen = output.reduce((acc, item) => acc + item.length, 0)
  const encoded = new Uint8Array(totalLen)
  let offset = 0
  for (const item of output) {
    encoded.set(item, offset)
    offset += item.length
  }
  return concatBytes(encodeLength(totalLen, 0xc0), encoded)
}

function encodeLength(len: number, offset: number): Uint8Array {
  if (len < 56) {
    return new Uint8Array([len + offset])
  }
  const hexLen = len.toString(16)
  const lenBytes = hexToBytes(hexLen.length % 2 ? "0" + hexLen : hexLen)
  return concatBytes(new Uint8Array([offset + 55 + lenBytes.length]), lenBytes)
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLen = arrays.reduce((acc, a) => acc + a.length, 0)
  const result = new Uint8Array(totalLen)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex
  if (clean.length === 0) return new Uint8Array(0)
  const padded = clean.length % 2 ? "0" + clean : clean
  const bytes = new Uint8Array(padded.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("")
}

function numberToBytes(n: number | bigint | string): Uint8Array {
  if (typeof n === "string") {
    if (n === "0x" || n === "0x0" || n === "") return new Uint8Array(0)
    return hexToBytes(n)
  }
  const big = BigInt(n)
  if (big === BigInt(0)) return new Uint8Array(0)
  const hex = big.toString(16)
  return hexToBytes(hex)
}

export function getAddressFromPrivateKey(privateKey: string): string {
  const privKeyBytes = hexToBytes(privateKey)
  const pubKey = secp256k1.getPublicKey(privKeyBytes, false)
  const pubKeyNoPrefix = pubKey.slice(1)
  const hash = keccak_256(pubKeyNoPrefix)
  return "0x" + bytesToHex(hash.slice(12))
}


interface TxParams {
  nonce: string    
  gasPrice: string 
  gas: string      
  to: string       
  value: string    
  data: string     
  chainId: number
}

export async function signTransaction(tx: TxParams, privateKey: string): Promise<string> {
  const privKeyBytes = hexToBytes(privateKey)

  const rawTx = [
    numberToBytes(tx.nonce),
    numberToBytes(tx.gasPrice),
    numberToBytes(tx.gas),
    hexToBytes(tx.to),
    numberToBytes(tx.value),
    hexToBytes(tx.data),
    numberToBytes(tx.chainId),
    new Uint8Array(0),
    new Uint8Array(0),
  ]

  const encoded = rlpEncode(rawTx)
  const msgHash = keccak_256(encoded)

  const sig = secp256k1.sign(msgHash, privKeyBytes)
  const r = sig.r
  const s = sig.s
  const recovery = sig.recovery

  const v = BigInt(tx.chainId) * BigInt(2) + BigInt(35) + BigInt(recovery)

  const signedTx = [
    numberToBytes(tx.nonce),
    numberToBytes(tx.gasPrice),
    numberToBytes(tx.gas),
    hexToBytes(tx.to),
    numberToBytes(tx.value),
    hexToBytes(tx.data),
    numberToBytes(v),
    hexToBytes(r.toString(16).padStart(64, "0")),
    hexToBytes(s.toString(16).padStart(64, "0")),
  ]

  const signedEncoded = rlpEncode(signedTx)
  return "0x" + bytesToHex(signedEncoded)
}

export function functionSelector(signature: string): string {
  const bytes = new TextEncoder().encode(signature)
  const hash = keccak_256(bytes)
  return "0x" + bytesToHex(hash.slice(0, 4))
}
