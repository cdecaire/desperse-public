# CLAUDE.md

Desperse is a Web3 social media platform on Solana. See `memory/ARCHITECTURE.md` for full system documentation.

**Tech Stack:** TanStack Start (Vite + React 19 + SSR), TanStack Router (file-based), TanStack Query v5, PostgreSQL (Neon) + Drizzle ORM, Privy auth, Solana mainnet via Helius RPC, Metaplex (Bubblegum cNFTs + Core editions), Ably real-time, Vercel Blob storage.

## Commands

```bash
pnpm dev              # Start dev server on port 3000
pnpm build            # Production build
pnpm db:generate      # Generate migrations from schema changes
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema directly (dev only)
pnpm db:studio        # Open Drizzle Studio
pnpm test             # Run vitest tests
npx tsc               # Type check (noEmit mode)
pnpm retry:fulfillment       # Recover failed edition purchases
pnpm list:purchases          # Inspect purchase states
pnpm repair:master-mints     # Fix orphaned mints
pnpm promote-user            # Grant admin role
```

## Deployment

Vercel GitHub Integration deploys automatically. **DO NOT** run `npx vercel --prod` manually — push to `main` for production, any other branch for preview.

## Workflow Orchestration

### Plan First
- Enter plan mode for any task spanning 3+ files or involving architectural decisions
- If an approach hits unexpected friction, **stop and re-plan immediately** — don't push through a failing strategy
- Write clear specs before coding to reduce mid-flight ambiguity

### Phased Execution
- Break multi-file changes into phases. Each phase must leave the app bootable (`pnpm dev` succeeds)
- Verify after each phase: `npx tsc` for type errors, `pnpm test` for regressions
- Do not proceed to the next phase until current phase is green

### Subagent Strategy
- Use subagents to keep the main context window clean
- Offload research, codebase exploration, and parallel analysis to subagents
- One focused task per subagent — don't overload a single agent
- For complex problems, prefer parallel subagents over sequential deep-dives

### Autonomous Problem Solving
- When encountering errors, attempt up to 3 self-repair cycles (read error → identify cause → fix → verify) before escalating
- If CI or tests fail after your changes, fix them without being asked
- Only escalate when genuinely blocked: missing credentials, unclear requirements, ambiguous product decisions

### Verification Before Done
- Never mark a task complete without proving it works
- For backend changes: type check + test + dev server boots
- For UI changes: describe expected behavior and how to verify
- Ask yourself: "Would a senior engineer approve this diff?"

## Server Function Boundary Rules (CRITICAL)

### `src/server/functions/*` — Public API Layer

Files here must **only** export `createServerFn` wrappers. This is the most critical architectural rule in the codebase. TanStack Start statically analyzes these files during client bundling — even unused exports can leak Node-only code into the browser bundle, causing `Buffer is not defined` or similar SSR failures.

**Pattern:**
```typescript
import { createServerFn } from '@tanstack/react-start'
import { withAuth, withOptionalAuth } from '@/server/auth'

export const myFunction = createServerFn({ method: 'POST' })
  .validator(schema)
  .handler(withAuth(async ({ data, user }) => {
    // user: { privyId, userId, email?, walletAddress? }
  }))

export const publicFunction = createServerFn({ method: 'GET' })
  .handler(withOptionalAuth(async ({ data, user }) => {
    // user is null if not authenticated
  }))
```

**Forbidden imports** (will leak Node-only code into client bundle):
- `@/server/db`, `@/server/db/schema` (database)
- `drizzle-orm`, `postgres` (ORM/driver)
- `node:crypto`, `node:fs`, `node:buffer` (Node built-ins)
- `@solana/web3.js`, `@metaplex-foundation/*` (blockchain SDKs — except `import type`)

**Allowed imports:**
- `createServerFn` from `@tanstack/react-start`
- `withAuth`, `withOptionalAuth` from `@/server/auth`
- `z` from `zod` (validation schemas)
- `@/server/utils/*` (internal helpers that encapsulate DB/Node logic)
- `@/config/env` (environment variable access)
- `import type` for anything (types are erased at compile time)

**Legacy exceptions:** Several files (`editions.ts`, `collect.ts`, `messaging.ts`, `downloadAuth.ts`, `likes.ts`, `follows.ts`, `comments.ts`) contain direct DB imports. These are known violations. When modifying these files, migrate DB logic to `src/server/utils/*`. **Do not add new direct DB imports.**

### Required Call Flow

```
UI / hooks → createServerFn (src/server/functions) → internal helper (src/server/utils) → database / Node APIs
```

Do not shortcut this.

### Enforcement Checklist (Before Merging)

- [ ] No new raw async exports from `src/server/functions/*`
- [ ] No new direct DB/Drizzle imports in `src/server/functions/*`
- [ ] All new DB logic lives in `src/server/utils/*`
- [ ] Client code never imports from `src/server/utils/*`
- [ ] App boots with `pnpm dev` after changes

## Safety Rules

### Idempotency
- All write endpoints must handle duplicate calls gracefully
- Use check-then-insert with unique constraint catch for tables with unique keys (likes, follows, collections)
- Before allowing blockchain retry, **always** check on-chain transaction status first
- Never mint without a DB reservation state (`reserved` or `pending`)

### Transaction Safety
- This codebase does **NOT** use `db.transaction()`. Do not introduce transactions
- Use atomic `UPDATE ... WHERE` with optimistic concurrency (check affected rows)
- Supply modifications use `sql\`currentSupply + 1\`` with WHERE guard — never read-modify-write
- Atomic claims use a unique `fulfillmentKey` + WHERE conditions to prevent concurrent minting

### Payment & Blockchain
- **Never auto-retry a signed transaction submission.** Write operations = single attempt only
- Use `executeWriteOperation` for sends (no retry). Use `executeWithFallback` for reads only
- RPC fallback for writes only on infrastructure errors (503, 502, ECONNREFUSED), never on transaction errors
- Validate balance before building payment transaction (SOL + USDC dual check for USDC)
- Check `DISABLE_FEE_SUBSIDY` before any subsidized mint (circuit breaker)
- Stale claim threshold = 2 minutes (fulfillment claims and pending collects)

### Environment Security
- Never prefix secrets with `VITE_` (client-exposed)
- Never log `_authorization` tokens — use `redactSensitiveFields()` from `@/server/auth`
- Client sends `_authorization` in request body; server strips it before schema parsing via `stripAuthorization()`

## Performance Guardrails

### N+1 Prevention
- Use JOINs or batch queries (`Promise.all`) instead of looping individual queries
- When fetching related data for a list, use `IN` clauses or JOINs, not per-item queries

### Pagination
- Always use cursor-based pagination with ISO datetime cursor (not offset-based)
- Fetch `limit + 1` rows, set `hasMore = result.length > limit`, return `result.slice(0, limit)`
- Default limits: 20 for feeds/threads, 50 for messages/comments, 100 for wallet holdings
- **Never return unbounded result sets.** All list queries must have `.limit()`

### Indexes & Queries
- Any new WHERE clause on a table with >10k expected rows must have a corresponding index
- Composite indexes: equality columns first, range columns last
- Use `.limit(1)` for single-record lookups
- Avoid `SELECT *` (`.select()` with no args) on hot paths — specify needed columns

## Observability & Logging

### Convention
- All log lines must use `[FunctionName]` prefix: `console.log('[buyEdition] Starting purchase for post', postId)`
- `console.log` for success/info milestones, `console.warn` for recoverable issues, `console.error` for failures
- Log state transitions explicitly: `[fulfillPurchase] Status: awaiting_fulfillment → minting`

### Redaction Policy
- **Never** log `_authorization` tokens. Use `redactSensitiveFields()` before logging any input object
- **Never** log full private keys
- Truncate wallet addresses in error logs: `wallet.slice(0, 8) + '...'`
- Truncate transaction signatures in error logs: `txSig.slice(0, 20) + '...'`

### Monitoring Prefixes
- Fee subsidy events: `[Fee Subsidy]` prefix + JSON payload
- RPC fallback events: `[RPC Provider]` prefix
- Failed fulfillments: `[fulfillPurchase]` or `[fulfillPurchaseDirect]` prefix
- Stale record cleanup: `[functionName] Auto-marked stale...` pattern

## Error Handling Patterns

### Non-Critical Operations
After the primary operation succeeds, wrap side effects in try-catch so they don't break the response:

```typescript
await db.insert(likes).values({ userId, postId })  // Primary — let it throw

try {
  await db.insert(notifications).values({ ... })   // Non-critical — catch and warn
} catch (err) {
  console.warn('[likePost] Failed to create notification:', err instanceof Error ? err.message : 'Unknown')
}
return { success: true }
```

Applied to: notifications, metadata snapshots, mention processing, push notifications.

### Transaction Status Recovery
Before allowing retry, check if the previous tx actually confirmed on-chain:

```typescript
if (existing.txSignature && existing.status !== 'confirmed') {
  const txStatus = await checkTransactionStatus(existing.txSignature)
  if (txStatus.status === 'confirmed' || txStatus.status === 'finalized') {
    await db.update(collections).set({ status: 'confirmed' })...
    return { success: true, status: 'already_collected' }
  }
}
```

### Unique Constraint Race Conditions
Handle duplicate key errors from concurrent requests gracefully:

```typescript
try {
  await db.insert(likes).values({ userId, postId })
} catch (insertError) {
  const msg = insertError instanceof Error ? insertError.message : ''
  if (msg.includes('unique') || msg.includes('duplicate')) {
    return { success: true, message: 'Already liked' }  // Race condition — intent achieved
  }
  throw insertError
}
```

## Code Style

- Biome for linting/formatting (tabs, double quotes)
- Zod for validation schemas
- shadcn/ui components in `src/components/ui/`
- Tailwind CSS v4
- @solana/kit for Solana RPC (NOT web3.js)
- Path alias: `@/` maps to `./src/`
