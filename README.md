# Desperse

A social media platform where users upload media and optionally mint them as NFTs on Solana.

## Features

- **Post Creation** - Share photos, videos, and audio with optional NFT minting
  - Standard posts (no NFT)
  - Free collectibles (cNFTs via Metaplex Bubblegum)
  - Paid editions (Token Metadata NFTs with SOL/USDC pricing)
- **Dual Feed** - For You (global) and Following tabs
- **Profiles** - Posts, Collected NFTs, For Sale tabs with follow system
- **Search & Explore** - Discover creators and content
- **Notifications** - Follow, like, comment, collect, and purchase alerts
- **Content Moderation** - Reporting system with admin dashboard

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (Vite + React + SSR)
- **Routing:** [TanStack Router](https://tanstack.com/router) (file-based)
- **Data Fetching:** [TanStack Query](https://tanstack.com/query)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Database:** PostgreSQL ([Neon](https://neon.tech/)) + [Drizzle ORM](https://orm.drizzle.team/)
- **Auth:** [Privy](https://privy.io/) (email, social, embedded wallets)
- **Storage:** [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
- **Blockchain:** Solana (Mainnet) via [Helius](https://helius.dev/) RPC
- **NFTs:** [Metaplex](https://developers.metaplex.com/) (Bubblegum for cNFTs, Token Metadata for editions)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL database (recommend [Neon](https://neon.tech/))

### Environment Setup

Copy `.env.example` to `.env.local` and fill in the values:

```bash
# Database
DATABASE_URL=

# Privy
PRIVY_APP_ID=
PRIVY_APP_SECRET=

# Helius (Solana RPC)
HELIUS_API_KEY=

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=

# Platform Configuration
VITE_PLATFORM_FEE_BPS=500
VITE_PLATFORM_WALLET_ADDRESS=
```

### Installation

```bash
pnpm install
```

### Database Setup

```bash
# Generate migrations
pnpm db:generate

# Run migrations
pnpm db:migrate
```

### Development

```bash
pnpm dev
```

### Production Build

```bash
pnpm build
```

## Project Structure

```
src/
├── routes/           # File-based routing (TanStack Router)
├── components/       # React components
│   ├── layout/       # AppShell, TopNav, BottomNav, Sidebar
│   ├── feed/         # PostCard, CollectButton, BuyButton
│   ├── profile/      # Profile components
│   ├── forms/        # CreatePostForm, MediaUpload
│   ├── explore/      # SearchBar, SearchDropdown
│   ├── notifications/# NotificationItem
│   └── ui/           # shadcn/ui components
├── server/
│   ├── functions/    # Server functions (createServerFn)
│   ├── db/           # Drizzle schema and client
│   └── services/     # Business logic and blockchain
├── hooks/            # React hooks
├── lib/              # Utilities
└── config/           # Environment and design tokens
```

## Documentation

- [Product Requirements](docs-internal/project.md) - Full product spec
- [Engineering Tasks](docs-internal/tasks.md) - Implementation checklist

## Testing

```bash
pnpm test
```

## License

Private - All rights reserved.
