import { defineChain } from "viem";

const DEFAULT_RPC = "https://evmrpc.testnet.epix.zone/";

/** Create an EpixChain definition with an optional RPC override. */
export function createEpixChain(rpcUrl?: string) {
  return defineChain({
    id: 1917,
    name: "EpixChain Testnet",
    nativeCurrency: { name: "EPIX", symbol: "EPIX", decimals: 18 },
    rpcUrls: {
      default: { http: [rpcUrl || DEFAULT_RPC] },
    },
    blockExplorers: {
      default: { name: "EpixScan", url: "http://testscan.epix.zone" },
    },
    testnet: true,
  });
}

/** Static default — used by dev mode and as import fallback. */
export const epixTestnet = createEpixChain();

export const REST_API = "https://api.testnet.epix.zone";
export const DEFAULT_TLD = "epix";
