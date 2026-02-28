import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import {
  useResolve,
  useProfile,
  useEpixNetPeers,
  useContentRoot,
  usePrimaryName,
  useXidWrite,
} from "../hooks/useXid";
import { XID_ADDRESS, XID_ABI, DNS_RECORD_TYPES } from "../config/contract";
import { DEFAULT_TLD, epixTestnet } from "../config/chain";
import { useRestApi } from "../contexts/EpixNetContext";
import { truncateAddress } from "../config/bech32";

interface DnsRecord {
  record_type: number;
  value: string;
  ttl: number;
}

export default function NameDetailPage() {
  const { tld = DEFAULT_TLD, name = "" } = useParams<{ tld: string; name: string }>();
  const { address } = useAccount();
  const { owner, isLoading: resolveLoading, refetch: refetchOwner } = useResolve(name, tld);
  const { avatar, bio, refetch: refetchProfile } = useProfile(name, tld);
  const { peers, isLoading: peersLoading, refetch: refetchPeers } = useEpixNetPeers(name, tld);
  const { root, updatedAt } = useContentRoot(name, tld);
  const { primaryName: pName, primaryTld: pTld, refetch: refetchPrimary } = usePrimaryName(address);
  const primaryWriter = useXidWrite();

  const isOwner = address && owner && address.toLowerCase() === owner.toLowerCase();
  const isPrimary = pName === name && pTld === tld;

  useEffect(() => {
    if (primaryWriter.isSuccess) {
      refetchPrimary();
    }
  }, [primaryWriter.isSuccess]);

  if (resolveLoading) {
    return <p className="text-secondary text-sm py-8">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/my-names"
          className="text-sm text-secondary hover:text-primary mb-2 inline-block transition-colors"
        >
          &larr; Back to My Names
        </Link>
        <h1 className="text-2xl font-semibold">
          {name}
          <span className="text-tertiary">.{tld}</span>
        </h1>
        {owner && (
          <p className="text-secondary text-sm mt-1">
            Owner:{" "}
            <span className="font-mono text-primary">{truncateAddress(owner)}</span>
            {isOwner && (
              <span className="ml-2 text-xs bg-accent-subtle text-accent px-2 py-0.5 rounded-full font-medium">
                You
              </span>
            )}
            {isPrimary && (
              <span className="ml-2 text-xs bg-badge-green text-badge-green px-2 py-0.5 rounded-full font-medium">
                Primary Name
              </span>
            )}
          </p>
        )}
        {isOwner && !isPrimary && (
          <button
            onClick={() => {
              primaryWriter.writeContract({
                address: XID_ADDRESS,
                abi: XID_ABI,
                functionName: "setPrimaryName",
                args: [name, tld],
              });
            }}
            disabled={primaryWriter.isPending || primaryWriter.isConfirming}
            className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          >
            {primaryWriter.isPending ? "Confirming..." : primaryWriter.isConfirming ? "Setting..." : "Set as Primary Name"}
          </button>
        )}
        {primaryWriter.isSuccess && (
          <p className="mt-1 text-sm text-success">Primary name updated!</p>
        )}
      </div>

      {/* Profile */}
      <ProfileSection
        name={name}
        tld={tld}
        avatar={avatar}
        bio={bio}
        isOwner={!!isOwner}
        onUpdate={refetchProfile}
      />

      {/* EpixNet Peers */}
      <EpixNetPeersSection
        name={name}
        tld={tld}
        isOwner={!!isOwner}
        peers={peers}
        peersLoading={peersLoading}
        contentRoot={root}
        contentRootUpdatedAt={updatedAt}
        onPeersChanged={() => { refetchPeers(); }}
      />

      {/* DNS Records */}
      <DNSRecordsSection name={name} tld={tld} isOwner={!!isOwner} />

      {/* Transfer Name (owner only) */}
      {isOwner && <TransferNameToggle name={name} tld={tld} ownerAddress={address!} onTransferred={refetchOwner} />}
    </div>
  );
}

/* ── Profile Section ──────────────────────────────────────────────── */

function ProfileSection({
  name, tld, avatar, bio, isOwner, onUpdate,
}: {
  name: string; tld: string; avatar: string; bio: string;
  isOwner: boolean; onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editAvatar, setEditAvatar] = useState(avatar);
  const [editBio, setEditBio] = useState(bio);
  const { writeContract, hash, isPending, isConfirming, isSuccess, error } = useXidWrite();

  useEffect(() => {
    if (isSuccess && editing) {
      setEditing(false);
      onUpdate();
    }
  }, [isSuccess]);

  const handleSave = () => {
    writeContract({
      address: XID_ADDRESS,
      abi: XID_ABI,
      functionName: "updateProfile",
      args: [name, tld, editAvatar, editBio],
    });
  };

  return (
    <div className="bg-card rounded-lg border border-default p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">Profile</h2>
        {isOwner && !editing && (
          <button
            onClick={() => { setEditAvatar(avatar); setEditBio(bio); setEditing(true); }}
            className="text-sm text-accent hover:opacity-80 transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Avatar URL</label>
            <input
              type="text"
              value={editAvatar}
              onChange={(e) => setEditAvatar(e.target.value)}
              placeholder="https://example.com/avatar.png"
              className="w-full bg-input border border-default rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1">Bio</label>
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Tell the world about yourself"
              rows={3}
              className="w-full bg-input border border-default rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 resize-none transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isPending || isConfirming}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {isPending ? "Confirming..." : isConfirming ? "Waiting for tx..." : "Save Profile"}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={isPending || isConfirming}
              className="px-4 py-2 bg-input border border-default hover:bg-hover rounded-md text-sm text-primary disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
          {hash && (
            <p className="text-sm text-secondary">
              Tx:{" "}
              <a
                href={`${epixTestnet.blockExplorers.default.url}/tx/${hash}`}
                target="_blank"
                rel="noreferrer"
                className="text-accent font-mono"
              >
                {hash.slice(0, 16)}...
              </a>
            </p>
          )}
          {error && (
            <p className="text-error text-xs">{error.message?.split("\n")[0]}</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-4">
          {avatar ? (
            <img
              src={avatar}
              alt="avatar"
              className="w-14 h-14 rounded-full object-cover bg-input"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-input flex items-center justify-center text-tertiary text-xl">
              ?
            </div>
          )}
          <div>
            <p className="text-secondary text-sm">{bio || "No bio set"}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── EpixNet Peers Section ────────────────────────────────────────── */

function EpixNetPeersSection({
  name, tld, isOwner, peers, peersLoading, contentRoot, contentRootUpdatedAt, onPeersChanged,
}: {
  name: string; tld: string; isOwner: boolean;
  peers: { address: string; label: string; addedAt: bigint; active: boolean; revokedAt: bigint }[];
  peersLoading: boolean;
  contentRoot: string; contentRootUpdatedAt: bigint;
  onPeersChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [peerAddress, setPeerAddress] = useState("");
  const [peerLabel, setPeerLabel] = useState("");
  const addWriter = useXidWrite();
  const revokeWriter = useXidWrite();

  useEffect(() => {
    if (addWriter.isSuccess) {
      setAdding(false);
      setPeerAddress("");
      setPeerLabel("");
      onPeersChanged();
    }
  }, [addWriter.isSuccess]);

  useEffect(() => {
    if (revokeWriter.isSuccess) {
      onPeersChanged();
    }
  }, [revokeWriter.isSuccess]);

  const handleAddPeer = () => {
    if (!peerAddress) return;
    addWriter.writeContract({
      address: XID_ADDRESS,
      abi: XID_ABI,
      functionName: "setEpixNetPeer",
      args: [name, tld, peerAddress, peerLabel],
    });
  };

  const handleRevokePeer = (addr: string) => {
    revokeWriter.writeContract({
      address: XID_ADDRESS,
      abi: XID_ABI,
      functionName: "revokeEpixNetPeer",
      args: [name, tld, addr],
    });
  };

  return (
    <div className="bg-card rounded-lg border border-default p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">EpixNet Peers</h2>
        {isOwner && (
          <button
            onClick={() => setAdding(!adding)}
            className="text-sm text-accent hover:opacity-80 transition-colors"
          >
            {adding ? "Cancel" : "+ Add Peer"}
          </button>
        )}
      </div>

      {/* Add peer form */}
      {adding && isOwner && (
        <div className="mb-4 p-4 bg-input rounded-md space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Peer Address</label>
              <input
                type="text"
                value={peerAddress}
                onChange={(e) => setPeerAddress(e.target.value)}
                placeholder="0x... or epix1..."
                className="w-full bg-card border border-default rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Label (optional)</label>
              <input
                type="text"
                value={peerLabel}
                onChange={(e) => setPeerLabel(e.target.value)}
                placeholder="laptop, server, etc."
                className="w-full bg-card border border-default rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
          <button
            onClick={handleAddPeer}
            disabled={addWriter.isPending || addWriter.isConfirming || !peerAddress}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {addWriter.isPending ? "Confirming..." : addWriter.isConfirming ? "Waiting for tx..." : "Add Peer"}
          </button>
          {addWriter.hash && (
            <p className="text-sm text-secondary">
              Tx:{" "}
              <a
                href={`${epixTestnet.blockExplorers.default.url}/tx/${addWriter.hash}`}
                target="_blank"
                rel="noreferrer"
                className="text-accent font-mono"
              >
                {addWriter.hash.slice(0, 16)}...
              </a>
            </p>
          )}
          {addWriter.error && (
            <p className="text-error text-xs">{addWriter.error.message?.split("\n")[0]}</p>
          )}
        </div>
      )}

      {/* Revoked peer warning */}
      {isOwner && peers.some((p) => !p.active) && (
        <div className="mb-4 p-3 bg-badge-amber border border-default rounded-md">
          <p className="text-badge-amber text-sm">
            <strong>Warning:</strong> If a peer key was compromised, you must manually update
            the content root on each site where that peer had access to remove any unauthorized content.
          </p>
        </div>
      )}

      {/* Peer list */}
      {peersLoading ? (
        <p className="text-tertiary text-sm">Loading peers...</p>
      ) : peers.length === 0 ? (
        <p className="text-tertiary text-sm">No EpixNet peers configured.</p>
      ) : (
        <div className="space-y-2">
          {peers.map((peer) => (
            <div
              key={peer.address}
              className={`p-3 bg-input rounded-md ${peer.active ? "" : "opacity-50"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {peer.active ? (
                    <span className="text-xs bg-badge-green text-badge-green px-2 py-0.5 rounded-full font-medium">Active</span>
                  ) : (
                    <span className="text-xs bg-badge-red text-badge-red px-2 py-0.5 rounded-full font-medium">Revoked</span>
                  )}
                  {peer.label && (
                    <span className="text-xs font-mono bg-card border border-default px-2 py-0.5 rounded-md text-secondary">
                      {peer.label}
                    </span>
                  )}
                </div>
                {isOwner && peer.active && (
                  <button
                    onClick={() => handleRevokePeer(peer.address)}
                    disabled={revokeWriter.isPending || revokeWriter.isConfirming}
                    className="text-badge-amber hover:opacity-80 text-sm disabled:opacity-50 transition-colors"
                  >
                    Revoke
                  </button>
                )}
              </div>
              <p className={`font-mono text-sm mt-1 ${peer.active ? "text-primary" : "line-through text-tertiary"}`}>
                {peer.address}
              </p>
              <div className="flex gap-4 mt-1">
                {peer.addedAt > 0n && (
                  <span className="text-xs text-tertiary">
                    Added block #{peer.addedAt.toLocaleString()}
                  </span>
                )}
                {!peer.active && peer.revokedAt > 0n && (
                  <span className="text-xs text-tertiary">
                    Revoked block #{peer.revokedAt.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ))}
          {revokeWriter.hash && (
            <p className="text-sm text-secondary">
              Revoke tx:{" "}
              <a
                href={`${epixTestnet.blockExplorers.default.url}/tx/${revokeWriter.hash}`}
                target="_blank"
                rel="noreferrer"
                className="text-accent font-mono"
              >
                {revokeWriter.hash.slice(0, 16)}...
              </a>
            </p>
          )}
        </div>
      )}

      {/* Content Root subsection */}
      <div className="mt-4 pt-4 border-t border-default">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-secondary uppercase tracking-wider">Content Root</h3>
          <span className="text-xs text-tertiary">Auto-computed from active peers</span>
        </div>
        {contentRoot ? (
          <div className="space-y-1">
            <p className="font-mono text-sm text-primary break-all">{contentRoot}</p>
            <p className="text-xs text-tertiary">
              Updated at Block #{contentRootUpdatedAt.toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="text-tertiary text-sm">No content root (no active peers).</p>
        )}
      </div>
    </div>
  );
}

/* ── DNS Records Section ──────────────────────────────────────────── */

function DNSRecordsSection({
  name, tld, isOwner,
}: {
  name: string; tld: string; isOwner: boolean;
}) {
  const restApi = useRestApi();
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [recordType, setRecordType] = useState(0);
  const [recordValue, setRecordValue] = useState("");
  const [recordTTL, setRecordTTL] = useState("3600");
  const setWriter = useXidWrite();
  const delWriter = useXidWrite();

  const fetchRecords = () => {
    setLoading(true);
    fetch(`${restApi}/xid/v1/dns/${tld}/${name}`)
      .then((r) => r.json())
      .then((data) => setRecords(data.records || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecords();
  }, [name, tld]);

  useEffect(() => {
    if (setWriter.isSuccess) {
      setShowAdd(false);
      setRecordValue("");
      fetchRecords();
    }
  }, [setWriter.isSuccess]);

  useEffect(() => {
    if (delWriter.isSuccess) {
      fetchRecords();
    }
  }, [delWriter.isSuccess]);

  const handleAddRecord = () => {
    setWriter.writeContract({
      address: XID_ADDRESS,
      abi: XID_ABI,
      functionName: "setDNSRecord",
      args: [name, tld, recordType, recordValue, parseInt(recordTTL, 10)],
    });
  };

  const handleDeleteRecord = (type: number) => {
    delWriter.writeContract({
      address: XID_ADDRESS,
      abi: XID_ABI,
      functionName: "deleteDNSRecord",
      args: [name, tld, type],
    });
  };

  const getRecordLabel = (type: number) =>
    DNS_RECORD_TYPES.find((r) => r.type === type)?.label || `${type}`;

  const getRecordPlaceholder = () =>
    DNS_RECORD_TYPES.find((r) => r.type === recordType)?.placeholder || "Value";

  return (
    <div className="bg-card rounded-lg border border-default p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">DNS Records</h2>
        {isOwner && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-sm text-accent hover:opacity-80 transition-colors"
          >
            {showAdd ? "Cancel" : "+ Add Record"}
          </button>
        )}
      </div>

      {/* Add record form */}
      {showAdd && isOwner && (
        <div className="mb-4 p-4 bg-input rounded-md space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Type</label>
              <select
                value={recordType}
                onChange={(e) => setRecordType(Number(e.target.value))}
                className="w-full bg-card border border-default rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-colors"
              >
                <option value={0}>Select...</option>
                {DNS_RECORD_TYPES.map((rt) => (
                  <option key={rt.type} value={rt.type}>
                    {rt.label} ({rt.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Value</label>
              <input
                type="text"
                value={recordValue}
                onChange={(e) => setRecordValue(e.target.value)}
                placeholder={getRecordPlaceholder()}
                className="w-full bg-card border border-default rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">TTL (seconds)</label>
              <input
                type="number"
                value={recordTTL}
                onChange={(e) => setRecordTTL(e.target.value)}
                className="w-full bg-card border border-default rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
          <button
            onClick={handleAddRecord}
            disabled={setWriter.isPending || setWriter.isConfirming || !recordType || !recordValue}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {setWriter.isPending ? "Confirming..." : setWriter.isConfirming ? "Waiting for tx..." : "Add Record"}
          </button>
          {setWriter.hash && (
            <p className="text-sm text-secondary">
              Tx:{" "}
              <a
                href={`${epixTestnet.blockExplorers.default.url}/tx/${setWriter.hash}`}
                target="_blank"
                rel="noreferrer"
                className="text-accent font-mono"
              >
                {setWriter.hash.slice(0, 16)}...
              </a>
            </p>
          )}
          {setWriter.error && (
            <p className="text-error text-xs">{setWriter.error.message?.split("\n")[0]}</p>
          )}
        </div>
      )}

      {/* Record list */}
      {loading ? (
        <p className="text-tertiary text-sm">Loading records...</p>
      ) : records.length === 0 ? (
        <p className="text-tertiary text-sm">No DNS records configured.</p>
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <div
              key={record.record_type}
              className="flex items-center justify-between p-3 bg-input rounded-md"
            >
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono bg-card border border-default px-2 py-0.5 rounded-md text-secondary">
                  {getRecordLabel(record.record_type)}
                </span>
                <span className="font-mono text-sm">{record.value}</span>
                <span className="text-xs text-tertiary">TTL: {record.ttl}s</span>
              </div>
              {isOwner && (
                <button
                  onClick={() => handleDeleteRecord(record.record_type)}
                  disabled={delWriter.isPending || delWriter.isConfirming}
                  className="text-error hover:opacity-80 text-sm disabled:opacity-50 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
          {delWriter.hash && (
            <p className="text-sm text-secondary">
              Delete tx:{" "}
              <a
                href={`${epixTestnet.blockExplorers.default.url}/tx/${delWriter.hash}`}
                target="_blank"
                rel="noreferrer"
                className="text-accent font-mono"
              >
                {delWriter.hash.slice(0, 16)}...
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Transfer Name Toggle ─────────────────────────────────────────── */

function TransferNameToggle({
  name, tld, ownerAddress, onTransferred,
}: {
  name: string; tld: string; ownerAddress: string; onTransferred: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors"
      >
        <span className={`transition-transform text-xs ${expanded ? "rotate-90" : ""}`}>&#9654;</span>
        Transfer Name
      </button>
      {expanded && (
        <div className="mt-4">
          <TransferForm name={name} tld={tld} ownerAddress={ownerAddress} onTransferred={onTransferred} />
        </div>
      )}
    </div>
  );
}

function TransferForm({
  name, tld, ownerAddress, onTransferred,
}: {
  name: string; tld: string; ownerAddress: string; onTransferred: () => void;
}) {
  const [recipient, setRecipient] = useState("");
  const { writeContract, hash, isPending, isConfirming, isSuccess, error } = useXidWrite();
  const isSelf = ownerAddress && recipient
    ? recipient.toLowerCase() === ownerAddress.toLowerCase()
    : false;

  useEffect(() => {
    if (isSuccess) {
      onTransferred();
    }
  }, [isSuccess]);

  const handleTransfer = () => {
    writeContract({
      address: XID_ADDRESS,
      abi: XID_ABI,
      functionName: "transferName",
      args: [name, tld, recipient as `0x${string}`],
    });
  };

  return (
    <div className="bg-card rounded-lg border border-default p-6">
      <h2 className="text-base font-semibold mb-1">Transfer</h2>
      <p className="text-secondary text-sm mb-4">
        Transfer ownership of{" "}
        <span className="text-primary font-medium">{name}.{tld}</span> to another address.
        This is irreversible.
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="w-full bg-input border border-default rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-colors"
          />
          {recipient && !isAddress(recipient) && (
            <p className="text-error text-xs mt-1">Invalid EVM address</p>
          )}
          {isSelf && (
            <p className="text-warning text-xs mt-1">Cannot transfer to yourself</p>
          )}
        </div>
        <button
          onClick={handleTransfer}
          disabled={isPending || isConfirming || !isAddress(recipient) || isSelf}
          className="w-full py-2.5 rounded-md font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 hover:bg-red-500 text-white"
        >
          {isPending ? "Confirm in Wallet..." : isConfirming ? "Transferring..." : "Transfer Name"}
        </button>
        {hash && (
          <div className="p-3 rounded-md bg-input border border-default">
            <p className="text-xs text-secondary mb-1">Transaction</p>
            <a
              href={`${epixTestnet.blockExplorers.default.url}/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:opacity-80 text-xs font-mono break-all"
            >
              {hash.slice(0, 20)}...
            </a>
            {isSuccess && (
              <p className="text-success text-sm mt-2">
                Transfer successful! Name ownership has been transferred.
              </p>
            )}
          </div>
        )}
        {error && (
          <p className="text-error text-xs">{error.message?.split("\n")[0]}</p>
        )}
      </div>
    </div>
  );
}
