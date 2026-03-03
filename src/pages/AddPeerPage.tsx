import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { usePrimaryName, useXidWrite } from "../hooks/useXid";
import { XID_ADDRESS, XID_ABI } from "../config/contract";
import { epixFrame } from "../config/epixframe";

export default function AddPeerPage() {
  // Read from the real query string (works both inside HashRouter and standalone).
  // The EpixNet wrapper forwards query params from the outer URL to the iframe.
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const peerAddress = params.get("addPeer") || params.get("address") || "";
  const returnTo = params.get("returnTo") || "";

  const { address, isConnected } = useAccount();
  const { primaryName, primaryTld, isLoading: nameLoading } = usePrimaryName(address);
  const writer = useXidWrite();
  const [peerStatus, setPeerStatus] = useState<"idle" | "polling" | "confirmed">("idle");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAdd = () => {
    if (!primaryName || !peerAddress) return;
    writer.writeContract({
      address: XID_ADDRESS,
      abi: XID_ABI,
      functionName: "setEpixNetPeer",
      args: [primaryName, primaryTld, peerAddress, "epixnet"],
    });
  };

  const pollPeerResolution = useCallback(async () => {
    if (!epixFrame.isEmbedded || !peerAddress) {
      // Not inside EpixNet — just redirect after a short delay
      if (returnTo) {
        setTimeout(() => { window.location.href = returnTo; }, 1500);
      }
      return;
    }

    setPeerStatus("polling");

    // Invalidate the EpixNet cache for this peer address
    try {
      await epixFrame.cmd("xidInvalidateCache", { peer_address: peerAddress });
    } catch (_) { /* ignore */ }

    // Poll xidResolve every 3 seconds until it returns a name
    pollRef.current = setInterval(async () => {
      try {
        // Invalidate before each attempt so we don't get stale cached results
        await epixFrame.cmd("xidInvalidateCache", { peer_address: peerAddress });
        const result = await epixFrame.cmd<{ name?: string } | null>("xidResolve", { peer_address: peerAddress });
        if (result && result.name) {
          // Peer resolved — stop polling and redirect
          if (pollRef.current) clearInterval(pollRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setPeerStatus("confirmed");
          if (returnTo) {
            setTimeout(() => { window.location.href = returnTo; }, 1000);
          }
        }
      } catch (_) { /* ignore errors, keep polling */ }
    }, 3000);

    // Timeout after 60 seconds — redirect anyway
    timeoutRef.current = setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
      setPeerStatus("confirmed");
      if (returnTo) {
        window.location.href = returnTo;
      }
    }, 60000);
  }, [peerAddress, returnTo]);

  useEffect(() => {
    if (writer.isSuccess && peerStatus === "idle") {
      pollPeerResolution();
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [writer.isSuccess, peerStatus, pollPeerResolution]);

  return (
    <div className="max-w-lg mx-auto mt-12 p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--color-text)" }}>
        Add EpixNet Peer
      </h1>

      {!isConnected ? (
        <div className="space-y-4">
          <p className="text-secondary">
            Connect your wallet to add an EpixNet peer address to your xID.
          </p>
          <ConnectButton />
        </div>
      ) : nameLoading ? (
        <div className="flex items-center gap-2">
          <div
            className="animate-spin rounded-full h-4 w-4 border-2 border-transparent"
            style={{ borderTopColor: "var(--color-accent)" }}
          />
          <span className="text-secondary">Looking up your xID...</span>
        </div>
      ) : !primaryName ? (
        <div className="space-y-4">
          <div className="p-4 rounded-lg" style={{ background: "var(--color-surface)" }}>
            <p style={{ color: "var(--color-text)" }}>
              No xID name found for your wallet. You need to register an xID name first.
            </p>
          </div>
          <ConnectButton />
        </div>
      ) : writer.isSuccess ? (
        <div className="p-4 rounded-lg" style={{ background: "var(--color-surface)" }}>
          <p className="text-lg font-semibold" style={{ color: "#22c55e" }}>
            Peer added successfully!
          </p>
          <p className="text-secondary mt-2">
            <span className="font-mono text-sm">{peerAddress}</span>
            {" "}has been added to <strong>{primaryName}.{primaryTld}</strong>.
          </p>
          {returnTo && peerStatus === "polling" ? (
            <div className="flex items-center gap-2 mt-3">
              <div
                className="animate-spin rounded-full h-4 w-4 border-2 border-transparent"
                style={{ borderTopColor: "var(--color-accent)" }}
              />
              <span className="text-secondary">Waiting for peer confirmation...</span>
            </div>
          ) : returnTo && peerStatus === "confirmed" ? (
            <p className="text-secondary mt-2">Redirecting back...</p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-lg" style={{ background: "var(--color-surface)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-secondary text-sm">Your xID</span>
              <span className="font-semibold" style={{ color: "var(--color-text)" }}>
                {primaryName}.{primaryTld}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary text-sm">Peer address to add</span>
              <span
                className="font-mono text-sm break-all"
                style={{ color: "var(--color-text)" }}
              >
                {peerAddress}
              </span>
            </div>
          </div>

          {writer.error ? (
            <div className="p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.1)" }}>
              <p className="text-sm" style={{ color: "#ef4444" }}>
                {(writer.error as Error).message?.slice(0, 200) || "Transaction failed"}
              </p>
            </div>
          ) : null}

          <button
            onClick={handleAdd}
            disabled={writer.isPending || writer.isConfirming || !peerAddress}
            className="w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors"
            style={{
              background: writer.isPending || writer.isConfirming ? "#4b5563" : "var(--color-accent)",
              cursor: writer.isPending || writer.isConfirming ? "not-allowed" : "pointer",
            }}
          >
            {writer.isPending
              ? "Confirm in wallet..."
              : writer.isConfirming
              ? "Confirming..."
              : "Add Peer Address"}
          </button>

          <ConnectButton />
        </div>
      )}
    </div>
  );
}
