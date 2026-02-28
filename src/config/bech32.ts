import { bech32 } from "bech32";

const BECH32_PREFIX = "epix";

export function evmToBech32(evmAddress: string): string {
  const hex = evmAddress.replace("0x", "");
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  const words = bech32.toWords(new Uint8Array(bytes));
  return bech32.encode(BECH32_PREFIX, words);
}

export function truncateAddress(addr: string, chars: number = 6): string {
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
}
