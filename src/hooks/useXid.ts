import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import { XID_ADDRESS, XID_ABI, ZERO_ADDRESS } from "../config/contract";
import { DEFAULT_TLD } from "../config/chain";

export function useResolve(name: string, tld: string = DEFAULT_TLD) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: XID_ADDRESS,
    abi: XID_ABI,
    functionName: "resolve",
    args: [name, tld],
    query: { enabled: !!name },
  });

  return {
    owner: data as `0x${string}` | undefined,
    isAvailable: data === ZERO_ADDRESS,
    isLoading,
    error,
    refetch,
  };
}

export function useReverseResolve(addr: `0x${string}` | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: XID_ADDRESS,
    abi: XID_ABI,
    functionName: "reverseResolve",
    args: addr ? [addr] : undefined,
    query: { enabled: !!addr },
  });

  const result = data as [string, string] | undefined;
  return {
    name: result?.[0] || "",
    tld: result?.[1] || "",
    isLoading,
    error,
  };
}

export function useReverseResolveBech32(bech32Addr: string) {
  const { data, isLoading, error } = useReadContract({
    address: XID_ADDRESS,
    abi: XID_ABI,
    functionName: "reverseResolveBech32",
    args: [bech32Addr],
    query: { enabled: !!bech32Addr },
  });

  const result = data as [string, string] | undefined;
  return {
    name: result?.[0] || "",
    tld: result?.[1] || "",
    isLoading,
    error,
  };
}

export function usePrimaryName(addr: `0x${string}` | undefined) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: XID_ADDRESS,
    abi: XID_ABI,
    functionName: "getPrimaryName",
    args: addr ? [addr] : undefined,
    query: { enabled: !!addr },
  });

  const result = data as [string, string] | undefined;
  return {
    primaryName: result?.[0] || "",
    primaryTld: result?.[1] || "",
    isLoading,
    error,
    refetch,
  };
}

export function useRegistrationFee(name: string, tld: string = DEFAULT_TLD) {
  const { data, isLoading } = useReadContract({
    address: XID_ADDRESS,
    abi: XID_ABI,
    functionName: "getRegistrationFee",
    args: [name, tld],
    query: { enabled: !!name },
  });

  return {
    fee: data as bigint | undefined,
    feeFormatted: data ? formatEther(data as bigint) : "0",
    isLoading,
  };
}

export function useProfile(name: string, tld: string = DEFAULT_TLD) {
  const { data, isLoading, refetch } = useReadContract({
    address: XID_ADDRESS,
    abi: XID_ABI,
    functionName: "getProfile",
    args: [name, tld],
    query: { enabled: !!name },
  });

  const result = data as [string, string] | undefined;
  return {
    avatar: result?.[0] || "",
    bio: result?.[1] || "",
    isLoading,
    refetch,
  };
}

export function useEpixNetPeers(name: string, tld: string = DEFAULT_TLD) {
  const { data, isLoading, refetch } = useReadContract({
    address: XID_ADDRESS,
    abi: XID_ABI,
    functionName: "getEpixNetPeers",
    args: [name, tld],
    query: { enabled: !!name },
  });

  const result = data as [string[], string[], bigint[], boolean[], bigint[]] | undefined;
  const peers = result
    ? result[0].map((addr, i) => ({
        address: addr,
        label: result[1][i],
        addedAt: result[2][i],
        active: result[3][i],
        revokedAt: result[4][i],
      }))
    : [];

  return { peers, isLoading, refetch };
}

export function useContentRoot(name: string, tld: string = DEFAULT_TLD) {
  const { data, isLoading } = useReadContract({
    address: XID_ADDRESS,
    abi: XID_ABI,
    functionName: "getContentRoot",
    args: [name, tld],
    query: { enabled: !!name },
  });

  const result = data as [string, bigint] | undefined;
  return {
    root: result?.[0] || "",
    updatedAt: result?.[1] || BigInt(0),
    isLoading,
  };
}

export function useXidWrite() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return {
    writeContract,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
