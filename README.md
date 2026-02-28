# xID

Decentralized identity and naming system for EpixChain. Register human-readable names, manage profiles, configure DNS records, and link EpixNet peers — all on-chain.

Hosted on EpixNet as a fully decentralized dApp with no centralized servers.

## Features

### Name Registration

- Register `name.epix` identities directly from the UI
- Real-time availability checking as you type
- Length-based pricing — shorter names cost more (fees pulled from on-chain TLD config)
- All registration fees are permanently burned
- Names are permanent and non-expiring

### Name Management

- **My Names** — View all names you own with pagination
- **Primary Name** — Set one of your names as your primary identity (used for reverse resolution)
- **Transfer** — Transfer name ownership to any EVM address (irreversible)

### Search & Resolution

- **Name Search** — Look up any name with instant debounced search
- **Forward Resolve** — Resolve a name to its owner address (EVM + Cosmos bech32)
- **Reverse Resolve** — Look up all names owned by an address (supports both `0x...` and `epix1...` formats)

### Profiles

- Set an avatar URL and bio for each name
- Profile data stored on-chain via the xID precompile
- Viewable by anyone through the name detail page

### DNS Records

- Full DNS record management: A, AAAA, NS, CNAME, MX, TXT, SRV
- Custom EPIXNET record type for linking EpixNet peer addresses
- Set TTL values per record
- Add and delete records through on-chain transactions

### EpixNet Peers

- Link EpixNet peer addresses to your name for decentralized content hosting
- Add peers with optional labels (e.g., "laptop", "server")
- Revoke compromised peers with on-chain audit trail (added/revoked block numbers)
- Auto-computed content root from active peers
- Security warnings when revoked peers are detected

### Pricing

- Live pricing pulled from on-chain TLD governance config (`/xid/v1/tlds`)
- Price tier tables showing fee breakdown by name length
- Interactive fee calculator — enter a name to see the exact cost
- Prices reflect governance votes in real-time

### Stats

- Total names registered across all TLDs
- Total fees burned with link to burn transactions on the explorer
- Per-TLD breakdown: name count, fees burned, active/disabled status

## Architecture

- **Framework**: React + TypeScript + Vite
- **Chain Interaction**: wagmi + viem (EVM precompile at `0x...0900`) + REST API queries
- **Wallet**: RainbowKit (MetaMask, WalletConnect, etc.)
- **Styling**: Tailwind CSS with CSS custom properties for dark/light theming
- **Hosting**: EpixNet (fully decentralized, peer-to-peer)
- **Network**: EpixChain Testnet (Chain ID: 1917)

### On-Chain Contracts

All name operations go through the xID precompile at `0x0000000000000000000000000000000000000900`:

| Function | Description |
| --- | --- |
| `register(name, tld)` | Register a new name |
| `transferName(name, tld, newOwner)` | Transfer ownership |
| `updateProfile(name, tld, avatar, bio)` | Set profile data |
| `setPrimaryName(name, tld)` | Set primary name for reverse resolution |
| `setDNSRecord(name, tld, type, value, ttl)` | Add/update DNS record |
| `deleteDNSRecord(name, tld, type)` | Remove DNS record |
| `setEpixNetPeer(name, tld, addr, label)` | Add EpixNet peer |
| `revokeEpixNetPeer(name, tld, addr)` | Revoke peer access |

### REST API Queries

| Endpoint | Description |
| --- | --- |
| `/xid/v1/tlds` | List all TLDs with pricing tiers |
| `/xid/v1/stats` | Global registration and burn stats |
| `/xid/v1/names/{address}` | All names owned by an address |
| `/xid/v1/reverse/{address}` | Primary name for an address |
| `/xid/v1/dns/{tld}/{name}` | DNS records for a name |

## Development

```bash
npm install
npm run dev
```

### Build for EpixNet

```bash
npm run build
```

The build outputs to the project root. After building, sign and publish through the EpixNet UI.
