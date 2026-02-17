# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Desperse is a Web3-enabled social media platform built on Solana. Users can:
- Share media (photos, videos, audio, 3D models, documents)
- Mint content as NFTs (free collectibles or paid editions)
- Follow users, like, comment, and collect content
- Direct message other users
- Trade editions with multi-currency support (SOL/USDC)

**Tech Stack:**
- TanStack Start (Vite + React 19 + SSR) with TanStack Router (file-based routing)
- TanStack Query v5 for data fetching
- PostgreSQL (Neon serverless) + Drizzle ORM
- Privy for authentication (email, social, embedded wallets)
- Solana mainnet via Helius RPC
- Metaplex (Bubblegum for cNFTs, Core for editions)
- Ably for real-time messaging
- Vercel Blob for media storage

## Commands

```bash
# Development
pnpm dev              # Start dev server on port 3000

# Build
pnpm build            # Production build

# Database (Drizzle ORM + PostgreSQL/Neon)
pnpm db:generate      # Generate migrations from schema changes
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema directly (dev only)
pnpm db:studio        # Open Drizzle Studio

# Testing
pnpm test             # Run vitest tests

# TypeScript
npx tsc               # Type check (noEmit mode)

# Blockchain Utilities
pnpm retry:fulfillment       # Recover failed edition purchases
pnpm list:purchases          # Inspect purchase states
pnpm repair:master-mints     # Fix orphaned mints
pnpm promote-user            # Grant admin role
```

## Deployment

**Vercel GitHub Integration** handles deployments automatically:

- **Production**: Push to `main` branch triggers automatic production deployment
- **Preview**: Push to any other branch creates a preview deployment

**DO NOT** run `npx vercel --prod` manually. This causes duplicate deployments since the GitHub integration already deploys on push. Just use `git push origin main` for production releases.

## Architecture

### Server Functions (TanStack Start)

Server functions use `createServerFn` from `@tanstack/react-start`. Located in `src/server/functions/`:

```typescript
import { createServerFn } from '@tanstack/react-start'
import { withAuth, withOptionalAuth } from '@/server/auth'

// Authenticated endpoint
export const myFunction = createServerFn({ method: 'POST' })
  .validator(schema)
  .handler(withAuth(async ({ data, user }) => {
    // user contains: { privyId, userId, email?, walletAddress? }
  }))

// Optional auth
export const publicFunction = createServerFn({ method: 'GET' })
  .handler(withOptionalAuth(async ({ data, user }) => {
    // user is null if not authenticated
  }))
```
# Desperse – Claude Guardrails

## Server Function Boundary Rules (TanStack Start – CRITICAL)

### DO NOT EXPORT RAW SERVER LOGIC FROM `src/server/functions/`

Files under `src/server/functions/` must **only** export `createServerFn` wrappers.

They must NOT export:
- raw `async` functions
- database logic
- Node-only APIs (`Buffer`, `crypto`, `fs`, etc.)
- helpers intended for internal reuse

### Why this rule exists

TanStack Start statically analyzes server function files during **client bundling**.
Even unused exports can be pulled into the client build.

If a file in `src/server/functions/` exports raw server logic:
- Node-only code can leak into the client bundle
- This commonly causes `Buffer is not defined` or similar SSR failures
- These errors are hard to trace and can break the entire app

This has already happened in this repo. Do not violate this rule.

---

## Correct Architecture

### `src/server/functions/*`
Public API layer for client → server calls.

Allowed:
- `createServerFn(...)`
- auth checks
- input validation
- calling internal utilities

Not allowed:
- database queries
- Drizzle imports
- crypto, Buffer, fs
- exporting raw helpers

Example (pattern only):

- server/functions/getThreads.ts
  - exports a createServerFn wrapper
  - calls an internal helper

---

### `src/server/utils/*`
Internal server-only logic.

Allowed:
- database access
- business logic
- shared helpers
- Node-only APIs

Example (pattern only):

- server/utils/getThreadsInternal.ts
  - performs database queries
  - contains business logic

---

## Required Call Flow

UI / hooks  
→ `createServerFn` (src/server/functions)  
→ internal helper (src/server/utils)  
→ database / Node APIs  

Do not shortcut this.

---

## Enforcement Checklist (Before Merging)

- [ ] No raw async exports from `src/server/functions/*`
- [ ] All DB logic lives in `src/server/utils/*`
- [ ] Client code never imports from `src/server/utils/*`
- [ ] App boots with `pnpm dev` after each phase

### Authentication

- Privy handles auth (email, social, embedded wallets)
- Client sends `_authorization` token in request body
- Server validates via `withAuth`/`withOptionalAuth` wrappers in `src/server/auth.ts`
- Never log `_authorization` tokens - use `redactSensitiveFields()` before logging

### Database Schema

Schema is in `src/server/db/schema.ts`. Key tables:

**Core:**
- `users` - User profiles (privyId, walletAddress, bio, role enum)
- `posts` - Content with type enum: 'post' | 'collectible' | 'edition'
- `postAssets` - Multi-asset support (media carousel + gated downloads)

**NFT:**
- `collections` - Free cNFT mints (Bubblegum, one per user per post)
- `purchases` - Paid editions (SOL/USDC, complex fulfillment state machine)

**Social:**
- `follows`, `likes`, `comments` - Social features
- `mentions` - @user mentions in posts/comments
- `tags`, `postTags` - Hashtag system

**Messaging:**
- `dmThreads` - Unified model (userAId < userBId), with read receipts
- `dmMessages` - Messages within threads

**Moderation:**
- `contentReports` - Report submissions with resolution workflow
- `notifications` - Activity notifications (follow, like, comment, collect, purchase, mention)

**Gated Content:**
- `downloadNonces` - Single-use nonces for download authorization
- `downloadTokens` - Persistent tokens for NFT owners

**Beta Feedback:**
- `betaFeedback` - User feedback (rating 1-5, message, screenshot, status: new|reviewed)

**Enums:**
- `postTypeEnum`: 'post' | 'collectible' | 'edition'
- `currencyEnum`: 'SOL' | 'USDC'
- `userRoleEnum`: 'user' | 'moderator' | 'admin'
- `contentTypeEnum`: 'post' | 'comment' | 'dm_thread' | 'dm_message'
- `reportStatusEnum`: 'open' | 'reviewing' | 'resolved' | 'rejected'
- `reportResolutionEnum`: 'removed' | 'no_action'
- `notificationTypeEnum`: 'follow' | 'like' | 'comment' | 'collect' | 'purchase' | 'mention'
- `notificationReferenceTypeEnum`: 'post' | 'comment'
- `feedbackStatusEnum`: 'new' | 'reviewed'
- `assetRoleEnum`: 'media' | 'download'

### Blockchain Integration

Solana mainnet via Helius RPC. Two minting paths:
- **Collectibles**: Free cNFTs via Metaplex Bubblegum (`src/server/services/blockchain/compressed/`)
- **Editions**: Paid NFTs via Metaplex Core (`src/server/services/blockchain/editions/`)

Edition purchases have a multi-step fulfillment state machine:
1. `reserved` → `submitted` → `awaiting_fulfillment` → `minting` → `master_created` (first purchase only) → `confirmed`
2. Error states: `failed`, `abandoned`, `blocked_missing_master`
3. Timestamps tracked: reservedAt, submittedAt, paymentConfirmedAt, mintingStartedAt, mintConfirmedAt

### File Structure Patterns

- `src/routes/` - TanStack Router file-based routes
- `src/server/functions/` - API endpoints (createServerFn) - ~70 endpoints
- `src/server/utils/` - Internal server logic (DB queries, Node APIs)
- `src/server/services/blockchain/` - NFT minting logic
- `src/hooks/` - React hooks (34 hooks for data fetching, mutations)
- `src/components/` - React components organized by feature (13 feature areas)
- `src/lib/` - Utility functions
- `src/config/env.ts` - Environment variable access
- `src/constants/` - Categories, tokens, and other constants

### Key Server Function Categories

- **Auth:** initAuth, getCurrentUser, whoami, getUserBySlug
- **Posts:** createPost, updatePost, deletePost, getPost, getFeed, getUserPosts, getPostCounts, regeneratePostMetadata
- **Editions:** buyEdition, submitPurchaseSignature, checkPurchaseStatus, cancelPendingPurchase, retryFulfillment, getUserPurchaseStatus
- **Collectibles:** prepareCollect, submitCollectSignature, checkCollectionStatus, cancelPendingCollect, getUserCollectionStatus, getCollectCount
- **Comments:** createComment, deleteComment, getPostComments, getCommentCount, getUserComments
- **Social:** followUser, unfollowUser, getFollowStatus, getFollowerCount, getFollowingCount, getFollowStats, getFollowersList, getFollowingList, likePost, unlikePost, getPostLikes, getUserLikes
- **Messaging:** getThreads, getOrCreateThread, archiveThread, blockInThread, sendMessage, getMessages, markThreadRead, deleteMessage, canUserMessage, getDmPreferences, updateDmPreferences
- **Notifications:** getNotificationCounters, getUnreadNotificationCount, getUserNotifications, markNotificationsAsRead, markAllNotificationsAsRead, clearAllNotifications
- **Explore:** getSuggestedCreators, getTrendingPosts, getFeaturedCreators, search, getPostsByCategory, searchTags, getTag, getPostsByTag, searchMentionUsers
- **Gated Downloads:** getDownloadNonce, verifyAndIssueToken, validateDownloadToken, checkAssetGating, getAssetDownloadInfo, getAssetPublicInfo
- **Moderation:** createReport, getReportsQueue, getReportDetails, hidePost, unhidePost, softDeletePost, hideComment, unhideComment, softDeleteComment, resolveReports
- **Profile:** getUserPreferences, updateUserPreferences, uploadAvatar, uploadHeaderBg, updateProfile, getUserCollections, getUserForSale, getCollectorsList
- **Wallet:** getWalletOverview, getSolPrice
- **Beta Feedback:** createBetaFeedback, getBetaFeedbackList, markBetaFeedbackReviewed
- **Media:** uploadMedia, deleteMedia, getUploadConfig
- **Utilities:** getAblyToken, checkRpcHealth, processHeliusWebhook, checkTxStatus

### Path Aliases

`@/` maps to `./src/` (configured in tsconfig.json)

## Error Handling Patterns

### Non-Critical Operations (IMPORTANT)

When server functions perform side effects after the main operation, wrap them in try-catch to prevent failures from breaking the primary operation.

**Pattern:**
```typescript
// Primary operation - let exceptions bubble up
await db.insert(likes).values({ userId, postId })

// Non-critical operations - wrap in try-catch
try {
  await db.insert(notifications).values({ ... })
} catch (notifError) {
  console.warn('[functionName] Failed to create notification:',
    notifError instanceof Error ? notifError.message : 'Unknown error')
}

return { success: true, ... }
```

**Applied to:** notifications, metadata snapshots, mention processing, analytics

**Why:** Without this pattern, if the notification insert fails after the like is committed, the API returns an error even though the like succeeded. This causes the client to show "failed" while the action actually worked.

### Transaction Status Recovery

For blockchain operations, always check on-chain status before allowing retry:

```typescript
// Before allowing retry, check if previous tx actually confirmed
if (existing.txSignature && existing.status !== 'confirmed') {
  const txStatus = await checkTransactionStatus(existing.txSignature)
  if (txStatus.status === 'confirmed' || txStatus.status === 'finalized') {
    // Update DB and return already_collected/already_purchased
    await db.update(collections).set({ status: 'confirmed' })...
    return { success: true, status: 'already_collected' }
  }
}
```

This prevents duplicate minting if the client's polling timed out but the tx actually confirmed.

### Unique Constraint Race Conditions

For tables with unique constraints (likes, follows, collections), handle duplicate key errors gracefully:

```typescript
// Check if already exists
const [existing] = await db.select()...
if (existing) return { success: true, message: 'Already liked' }

// Insert with race condition handling
try {
  await db.insert(likes).values({ userId, postId })
} catch (insertError) {
  const errorMsg = insertError instanceof Error ? insertError.message : ''
  if (errorMsg.includes('unique') || errorMsg.includes('duplicate')) {
    // Another request beat us - that's fine, the like exists
    return { success: true, message: 'Already liked', isLiked: true }
  }
  throw insertError  // Re-throw other errors
}
```

**Why:** Double-taps and network retries can cause two requests to pass the "already exists" check before either commits. The second insert fails with a unique constraint violation, but the user's intent (like/follow) was achieved by the first request.

## Code Style

- Biome for linting/formatting (tabs, double quotes)
- Zod for validation schemas
- shadcn/ui components in `src/components/ui/`
- Tailwind CSS v4
- @solana/kit for Solana RPC (NOT web3.js)

## Environment Variables

**Essential (required for dev):**
- `DATABASE_URL` - Neon PostgreSQL connection
- `PRIVY_APP_ID`, `PRIVY_APP_SECRET` - Auth
- `HELIUS_API_KEY` - Solana RPC

**Optional (feature-gated):**
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage
- `ABLY_API_KEY` - Real-time messaging

**Platform Configuration:**
- `VITE_PLATFORM_FEE_BPS` - Platform fee (basis points, default 500 = 5%)
- `VITE_PLATFORM_WALLET_ADDRESS` - Fee collection wallet
- `VITE_COLLECT_RATE_LIMIT` - Daily collect limit (default 10)
- `VITE_COLLECT_BURST_LIMIT` - Per-minute collect limit (default 2)

**Feature Flags:**
- `VITE_FEATURE_MULTI_ASSET_STANDARD` - Multi-asset for posts (default true)
- `VITE_FEATURE_MULTI_ASSET_COLLECTIBLE` - Multi-asset for collectibles (default true)
- `VITE_FEATURE_MULTI_ASSET_EDITION` - Multi-asset for editions (default true)

**Blockchain:**
- `HELIUS_WEBHOOK_SECRET` - Webhook signature verification
- `BUBBLEGUM_TREE_ADDRESS` - Compressed NFT tree address
- `COMPRESSED_MINT_FEE_PAYER_PRIVATE_KEY` - Fee payer for cNFT mints
- `PLATFORM_AUTHORITY_PRIVATE_KEY` - Authority for editions
- `FALLBACK_RPC_URL` - Secondary RPC endpoint
- `RPC_TIMEOUT_MS` - RPC timeout (default 10s)
- `DISABLE_FEE_SUBSIDY` - Circuit breaker for fee subsidy

**Rate Limiting:**
- `COLLECT_IP_RATE_LIMIT` - Daily collect limit per IP (default 30)
- `COLLECT_BURST_WINDOW_SECONDS` - Burst window duration (default 60)
- `POST_RATE_LIMIT` - Daily posts per user (default 10)
- `HANDLE_CHANGE_RATE_LIMIT` - Username change attempts (default 3)
- `PROFILE_USERNAME_CHANGE_LIMIT_DAYS` - Days between free changes (default 30)

## Key Features

### DM Eligibility System

Users can message creators based on configurable eligibility criteria:
1. **Edition purchases** - Bought an edition from creator
2. **Collection threshold** - Collected N items from creator (configurable, default 3)
3. **Reciprocal purchase** - Creator bought from user
4. **Reciprocal collection** - Creator collected from user
5. **Existing thread** - Already have a conversation
6. **Self-messaging** - Messaging own account

Creators can configure preferences in `users.preferences.messaging`:
- `dmEnabled` - Master toggle for DMs
- `allowBuyers` - Allow buyers to message
- `allowCollectors` - Allow collectors to message
- `collectorMinCount` - Minimum collections required

### Gated Downloads

Two-step authentication flow for protected downloads:
1. **Nonce generation** - `getDownloadNonce()` creates single-use nonce (5-min expiry)
2. **Signature verification** - `verifyAndIssueToken()` validates Ed25519 signature
3. **Token issuance** - Returns reusable download token (2-min default expiry)
4. **Download** - `getAssetDownloadInfo()` validates token and returns signed URL

Assets have roles: `media` (carousel) or `download` (download-only), with `isGated` flag.

### Multi-Asset Posts

Posts can have multiple assets with different roles:
- **Media assets** - Displayed in carousel, previewable
- **Download assets** - Available only for download (gated or public)

Each post type can independently enable multi-asset via feature flags.

### RPC Resilience

Auto-failover RPC provider with:
- Primary RPC (Helius) with configurable timeout
- Secondary fallback RPC for retries
- Exponential backoff (2x attempts before fallback)
- Read operations: retryable with fallback
- Write operations: no auto-retry (prevent double-send)

### User Preferences

Stored as JSONB in `users.preferences`:
```typescript
{
  theme?: 'light' | 'dark' | 'system'
  explorer?: 'orb' | 'solscan' | 'solana-explorer' | 'solanafm'
  notifications?: {
    follows?: boolean
    likes?: boolean
    comments?: boolean
    collects?: boolean
    purchases?: boolean
    mentions?: boolean
    messages?: boolean
  }
  messaging?: {
    dmEnabled?: boolean
    allowBuyers?: boolean
    allowCollectors?: boolean
    collectorMinCount?: number
  }
}
```

### Wallet Overview

Aggregates data across multiple wallets (embedded + linked):
- SOL/USDC balances
- Token holdings (100 limit)
- NFT holdings (100 limit)
- Transaction history enriched with app context (correlates with purchases/collects)
- SOL price via CoinGecko (90s cache)

## Routes

**Public:** `/`, `/about`, `/privacy`, `/terms`, `/fees`, `/changelog`, `/explore`, `/search`, `/create`
**Discovery:** `/category/$categorySlug`, `/tag/$tagSlug`
**Profiles:** `/profile/$slug`, `/profile` (own)
**Posts:** `/post/$postId`, `/post/$postId/edit`, `/$slug` (catch-all)
**Notifications:** `/notifications`
**Settings:** `/settings/*` (account, profile-info, wallets, security, notifications, messaging, help)
**Admin:** `/admin`, `/admin/moderation`, `/admin/moderation/$reportId`, `/admin/feedback`, `/admin/feedback/$feedbackId`
**Dev:** `/dev/*` (auth-test, db-test, wallet-test, component showcases)
