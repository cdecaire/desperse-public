# Desperse Mobile App Plan - Updated with Reviewer Feedback

## Overview

Build Android mobile app with full feature parity (excluding admin/moderation management). iOS deferred to v2.0.

**Total timeline**: ~36 weeks (Phase 0 through Phase 7)

**Target**: Solana dApp Store (Android), Google Play (secondary)

## Summary of Changes from Original Plan

This plan incorporates feedback from technical review against the actual Desperse codebase. Key additions:

| Addition | Rationale |
|----------|-----------|
| **Phase 0: Technical Spikes** | Validate MWA, polyfills, uploads before committing to architecture |
| **Wallet Binding with Signature Proof** | Close security gap where `buyEdition()` trusts provided wallet addresses |
| **Mobile Upload Strategy** | Presigned URL flow for large file uploads |
| **EAS vs Prebuild Reconciliation** | Dev builds for MWA, EAS for production |
| **Fixed WalletAdapter Interface** | Cross-platform consistency with `signMessage` |
| **dApp Store Publishing Checklist** | Concrete work items for store submission |
| **Phased Feature Implementation** | 7 sub-phases (6A-6G) for testing and iteration |
| **Admin features web-only** | Users can submit reports, management stays on web |

---

## Phase 0: Technical Spikes (NEW - Week 0-2)

### Why This Phase is Critical

The original plan assumes MWA + EAS + Expo work together seamlessly. Solana Mobile docs recommend "build without EAS" for dev builds. This conflict must be resolved before restructuring the monorepo.

### Spike Directory Structure

All spikes are located at `D:\dev\desperse-spikes\` (separate from main repo):

```
D:\dev\desperse-spikes\
├── DECISIONS.md              # Consolidated decision tracking
├── KNOWN_CONSTRAINTS.md      # Constraints and risk register
├── mwa-expo-spike\           # Wave 1 - initialized with Expo + MWA deps
├── privy-expo-spike\         # Wave 1 - initialized with Expo + Privy deps
├── solana-runtime-spike\     # Wave 2 - README template only
└── mobile-upload-spike\      # Wave 2 - README template only
```

### Spike Prioritization

**Wave 1** (Critical Path - run first):
- Spike 0.1: MWA + Custom Dev Build
- Spike 0.4: Privy Expo SDK

**Wave 2** (After Wave 1 passes):
- Spike 0.2: Minimal Solana Runtime
- Spike 0.3: Mobile Upload Pipeline

Wave 1 validates the two foundational integrations (wallet signing + auth). If either fails, architecture decisions change significantly. Wave 2 can proceed in parallel once Wave 1 shows promise.

---

### Spike 0.1: MWA + Custom Development Build (3-5 days)

**Objective**: Confirm MWA works with custom Expo development build (not Expo Go).

Per [Solana Mobile Expo guidance](https://docs.solanamobile.com/react-native/expo), MWA requires native modules that cannot run in Expo Go. Must use custom development builds.

```bash
# Test sequence - Custom Development Build
npx create-expo-app@latest mwa-spike --template blank-typescript
cd mwa-spike
npx expo install @solana-mobile/mobile-wallet-adapter-protocol-web3js expo-dev-client

# Generate native project
npx expo prebuild --platform android

# Build custom dev client (this is the key difference from Expo Go)
npx expo run:android --device

# For day-to-day development after initial build:
npx expo start --dev-client
```

**Success criteria**:
- [ ] Custom dev client builds and installs on real Android device
- [ ] `transact()` connects to Phantom/Solflare/Backpack
- [ ] `wallet.authorize()` returns accounts with public key
- [ ] `wallet.signMessages()` works (needed for wallet binding)
- [ ] `wallet.signAndSendTransactions()` works
- [ ] `wallet.reauthorize()` works after app backgrounding
- [ ] Session persists across app restarts (auth_token storage)

**Decision Record Output**: Document exact dev build approach:
- Custom dev client vs standard Expo Go
- Native module requirements
- Day-to-day development workflow
- CI/CD build approach

**If spike fails**: Evaluate WalletConnect v2 as fallback (different UX, but broader wallet support).

### MWA Spike Results (PASSED 2025-01-17)

**Key Learnings:**

1. **`identity.icon` must be relative URI** - MWA protocol requires relative path, not absolute URL:
   ```typescript
   // WRONG - causes error: "-32602/When Specified, identity.icon must be a relative URI"
   identity: { icon: "https://desperse.app/favicon.ico" }

   // CORRECT
   identity: { icon: "/favicon.ico" }
   ```

2. **All major wallets work**: Phantom, Solflare, and Seeker built-in wallet all pass connect/authorize/sign tests.

3. **AndroidManifest.xml query** - May need MWA intent query for wallet discovery (Expo prebuild handles this automatically).

**Checklist**:
- [x] Create spike project with `create-expo-app`
- [x] Install MWA and expo-dev-client packages
- [x] Run `expo prebuild --platform android`
- [x] Build and install on physical Android device
- [x] Test `transact()` with Phantom wallet
- [x] Test `transact()` with Solflare wallet
- [x] Test `transact()` with Seeker built-in wallet
- [x] Test `wallet.authorize()` returns accounts
- [x] Test `wallet.signMessages()` with test message
- [ ] Test `wallet.signAndSendTransactions()` (devnet) - Partial (auth works, needs server for full tx)
- [x] Test `wallet.reauthorize()` after backgrounding
- [x] Test session persistence across app restart
- [x] Document decision record: dev build approach
- [ ] Document decision record: CI/CD build strategy

### Spike 0.2: Minimal Solana Runtime in React Native (2-3 days)

**Objective**: Determine the minimum Solana dependencies needed for Desperse mobile.

**Key insight**: We may not need `@solana/kit` at all if the server builds transactions and the wallet signs/sends them. This spike answers: what's the minimum needed?

| Operation | Requirement |
|-----------|-------------|
| Receive tx from server | Base64 decode → Uint8Array |
| Pass tx to MWA | Raw bytes (Uint8Array) |
| Display addresses | Base58 encode/decode |
| Display signatures | Base58 (already handled by MWA return) |
| RPC calls | **Maybe not needed** if MWA sends transactions |

**Test in RN**:
```typescript
import { Buffer } from 'buffer';
import bs58 from 'bs58';

// Test transaction deserialization (from buyEdition response)
const txBase64 = '...';
const txBytes = new Uint8Array(Buffer.from(txBase64, 'base64'));
// Verify bytes can be passed to MWA signAndSendTransactions()

// Test address display
const address = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK';
const bytes = bs58.decode(address);
const back = bs58.encode(bytes); // Should match
```

**Success criteria**:
- [ ] `Buffer.from(base64, 'base64')` produces correct Uint8Array
- [ ] `bs58.encode()` / `bs58.decode()` work for addresses
- [ ] Transaction bytes from server can be passed directly to MWA signing
- [ ] Bundle size impact documented for required libs
- [ ] **Decision**: Do we need any Solana client libs beyond Buffer/bs58/TextEncoder?

**Checklist**:
- [ ] Add Buffer polyfill to spike project (`import { Buffer } from 'buffer'`)
- [ ] Add bs58 package for address encoding
- [ ] Test Base64 → Uint8Array conversion works
- [ ] Test Uint8Array → Base64 roundtrip matches original
- [ ] Test `bs58.encode()` and `bs58.decode()` for Solana addresses
- [ ] Test TextEncoder for message signing payloads
- [ ] Test transaction bytes from server can be passed to MWA
- [ ] Measure bundle size with `npx expo export`
- [ ] **Decision**: Document which Solana libs are actually needed
- [ ] **Decision**: Document which polyfills are required
- [ ] Document any Metro config changes needed

### Spike 0.3: Mobile Upload Pipeline (2-3 days)

**Objective**: Validate large file uploads from RN to Vercel Blob with reliability guarantees.

Current web flow uses direct client upload (`@vercel/blob/client`). Mobile needs:
- Multipart uploads for files >10MB (single PUT is unreliable on mobile networks)
- Retry with backoff for transient failures
- Background/foreground handling

**Test flow**:
1. Server generates client upload token via Vercel Blob API
2. Files <10MB: Single PUT with retry
3. Files ≥10MB: [Vercel Blob multipart upload](https://vercel.com/docs/storage/vercel-blob/using-blob-sdk#multipart-uploads)
4. Track upload progress for UI feedback
5. Handle app backgrounding (pause/resume or queue)

**Test scenarios**:
- 5MB image on WiFi (baseline)
- 25MB video on WiFi (multipart)
- 25MB video on 4G (multipart + retry)
- App backgrounded mid-upload (queue or resume)
- Network disconnect during upload (retry)

**Success criteria**:
- [ ] Single PUT works reliably for <10MB files
- [ ] Multipart upload completes for 25MB video
- [ ] Upload progress updates UI correctly
- [ ] Failed uploads retry with exponential backoff (1s, 2s, 4s)
- [ ] App foregrounding resumes or re-queues pending uploads

**Decision Record Output**: Document upload strategy:
- Multipart threshold (10MB recommended)
- Retry policy (attempts, backoff)
- Background behavior (queue vs cancel)
- Cleanup on failure

**Checklist**:
- [ ] Create test endpoint for presigned URL generation
- [ ] Test single PUT upload with 5MB image on WiFi
- [ ] Test single PUT upload with 5MB image on 4G
- [ ] Test multipart upload with 25MB video on WiFi
- [ ] Test multipart upload with 25MB video on 4G
- [ ] Implement upload progress tracking
- [ ] Test retry with network disconnect mid-upload
- [ ] Test app backgrounding during upload
- [ ] Test app foregrounding resume behavior
- [ ] Document multipart threshold decision
- [ ] Document retry policy (attempts, backoff intervals)
- [ ] Document background/foreground behavior

### Spike 0.4: Privy Expo SDK (2-3 days)

**Objective**: Validate `@privy-io/expo` authentication works with Desperse backend expectations.

**Success criteria**:
- [ ] Email login flow works
- [ ] Social login (Google) works
- [ ] Embedded Solana wallet created automatically on signup
- [ ] `getAccessToken()` returns valid JWT
- [ ] Token refresh works silently without breaking API calls
- [ ] **App restart persistence**: Close app, relaunch, still authenticated without user action
- [ ] **Backend compatibility**: Token works with existing `withAuth` middleware (Authorization header shape, expiry handling)

### Privy Spike Results (PASSED 2025-01-17)

**Key Learnings:**

1. **PrivyProvider requires BOTH `appId` AND `clientId`** - Mobile SDK needs both props:
   ```typescript
   <PrivyProvider appId={APP_ID} clientId={CLIENT_ID}>
   ```
   - `appId`: Found in main Privy dashboard settings
   - `clientId`: Found in Mobile client settings (starts with `client-`)

2. **Login methods are separate hooks** - The Expo SDK uses specialized hooks, not a single `login` method:
   ```typescript
   import { usePrivy, useLoginWithEmail, useLoginWithOAuth } from '@privy-io/expo';

   const { sendCode, loginWithCode } = useLoginWithEmail();
   const { login: oauthLogin } = useLoginWithOAuth();
   ```

3. **Use `isReady` not `ready`** - API differs from web SDK:
   ```typescript
   const { user, isReady, logout, getAccessToken } = usePrivy();
   const authenticated = !!user; // Check user object, not `authenticated` prop
   ```

4. **Privy Dashboard Mobile Client Setup** - Must configure:
   - **Allowed app identifiers**: Your Android package name (e.g., `app.desperse.mobile`)
   - **Allowed app URL schemes**: Your app scheme (e.g., `desperse`)

5. **Required Dependencies**:
   ```bash
   npx expo install expo-application expo-web-browser expo-linking expo-secure-store react-native-webview @privy-io/expo-native-extensions
   npm install @ethersproject/shims buffer
   ```

6. **Polyfill Setup** (must be first imports in entry file):
   ```typescript
   // index.ts
   import 'react-native-get-random-values';
   import '@ethersproject/shims';
   import { Buffer } from 'buffer';
   global.Buffer = Buffer;
   ```

7. **Metro config for jose package**:
   ```javascript
   // metro.config.js
   config.resolver.resolveRequest = (context, moduleName, platform) => {
     if (moduleName === 'jose') {
       return context.resolveRequest(
         { ...context, unstable_conditionNames: ['browser'] },
         moduleName,
         platform
       );
     }
     return context.resolveRequest(context, moduleName, platform);
   };
   ```

**Checklist**:
- [x] Install `@privy-io/expo` in spike project
- [x] Configure Privy provider with app ID AND client ID
- [x] Test email login flow
- [x] Test Google OAuth login flow
- [ ] Test Twitter OAuth login flow (if applicable)
- [x] Verify embedded Solana wallet created on signup
- [x] Test `getAccessToken()` returns valid token
- [ ] Verify token works with existing backend auth (API endpoint issue, not Privy)
- [ ] Test token refresh after expiry (needs long-term testing)
- [ ] Test logout and re-login flow
- [x] Document any Privy config differences from web

---

## Phase 0 Completion Gate

Before proceeding to Phase 1, all spikes must pass:
- [x] Spike 0.1: MWA + Build Pipeline - **PASSED** (2025-01-17)
- [ ] Spike 0.2: Minimal Solana Runtime - PENDING
- [ ] Spike 0.3: Mobile Upload - PENDING
- [x] Spike 0.4: Privy Expo SDK - **PASSED** (2025-01-17)
- [x] Decision records documented for Wave 1 spikes
- [ ] Go/no-go decision made on architecture (after Wave 2)

### Go/No-Go Decision Rubric

**GO if:**
- [x] MWA signing + session stability works on at least 2 wallets (Phantom + Solflare) - **CONFIRMED: Phantom, Solflare, Seeker all pass**
- [ ] Privy auth persists across app restart without user action - Needs testing
- [ ] Upload pipeline handles 25MB with predictable behavior (success or documented retry)
- [ ] Minimal Solana runtime dependencies confirmed (Buffer + bs58 sufficient, or document what else)

**PROCEED WITH CONSTRAINTS if:**
- [ ] One wallet is flaky but the other is stable → Document "Supported wallets: X" for v1
- [ ] Uploads work but background behavior is undefined → Document "Uploads require app to be foregrounded"
- [ ] Need additional polyfills but they're well-documented → Add to Phase 1 setup checklist

**NO-GO if:**
- [ ] Message signing is unreliable on both Phantom AND Solflare
- [ ] Session cannot persist across app restart (user must re-auth constantly)
- [ ] Dev build workflow requires undocumented hacks that aren't sustainable
- [ ] Bundle size is unacceptable (>5MB for Solana deps alone)

### Decision Tracking

All decisions are consolidated in:
- `D:\dev\desperse-spikes\DECISIONS.md` - All technical decisions with rationale
- `D:\dev\desperse-spikes\KNOWN_CONSTRAINTS.md` - Hard constraints, risk register, compatibility matrices

These artifacts flow to Phase 1 as requirements. No code is copied from spikes until Phase 1 begins.

---

## Phase 1: Monorepo Setup (Week 2-4)

*Same as original plan with one addition:*

### 1.3 Metro Configuration for pnpm Workspaces

Expo SDK 52+ has built-in monorepo support, but ensure shared packages transpile correctly:

```javascript
// apps/mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all packages in monorepo
config.watchFolders = [monorepoRoot];

// Resolve packages from monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
```

**Phase 1 Checklist**:

### 1.1 Initialize Turborepo
- [ ] Create `pnpm-workspace.yaml` at repo root
- [ ] Create `turbo.json` with build/dev/lint pipelines
- [ ] Create `tsconfig.base.json` with shared compiler options
- [ ] Create root `package.json` with workspace scripts

### 1.2 Move Web App
- [ ] Create `apps/web/` directory
- [ ] Move `src/` → `apps/web/src/`
- [ ] Move `public/` → `apps/web/public/`
- [ ] Move `drizzle/` → `apps/web/drizzle/`
- [ ] Move config files (vite.config.ts, tailwind.config.ts, etc.)
- [ ] Update `apps/web/package.json` name to `@desperse/web`
- [ ] Update `apps/web/tsconfig.json` paths
- [ ] Fix all import paths in moved files
- [ ] Verify `pnpm dev:web` starts successfully
- [ ] Verify all existing features work

### 1.3 Metro Configuration
- [ ] Create `apps/mobile/` directory (placeholder)
- [ ] Create `apps/mobile/metro.config.js` with monorepo settings
- [ ] Test Metro resolves workspace packages

### 1.4 CI/CD Updates
- [ ] Update GitHub Actions for monorepo structure
- [ ] Update Vercel deployment config
- [ ] Verify web deploys successfully from `apps/web/`

**Phase 1 Completion Gate**:
- [ ] `pnpm dev:web` works identically to pre-migration
- [ ] All existing tests pass
- [ ] Vercel deployment successful
- [ ] No regression in web functionality

---

## Phase 2: Shared Packages (Week 4-6)

*Same as original plan with additions:*

### 2.4 Wallet Binding Types (NEW)

```typescript
// packages/shared/src/types/wallet.ts

/**
 * Transaction format standardization:
 * - All transactions are Solana VersionedTransaction (v0)
 * - Input: Base64-encoded serialized transaction (from server)
 * - signTransaction returns: Base64-encoded signed transaction
 * - signAndSendTransaction returns: Base58-encoded signature string
 */
export interface WalletAdapter {
  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // State
  publicKey: string | null;  // Base58 Solana address
  connected: boolean;
  connecting: boolean;

  /**
   * Sign a transaction without sending.
   * @param transactionBase64 - Base64-encoded VersionedTransaction (unsigned)
   * @returns Base64-encoded VersionedTransaction (signed)
   */
  signTransaction(transactionBase64: string): Promise<string>;

  /**
   * Sign multiple transactions without sending.
   * @param transactionsBase64 - Array of Base64-encoded VersionedTransactions
   * @returns Array of Base64-encoded signed transactions (same order)
   */
  signAllTransactions(transactionsBase64: string[]): Promise<string[]>;

  /**
   * Sign an arbitrary message (for wallet binding proof).
   * @param message - UTF-8 string message to sign
   * @returns Base58-encoded Ed25519 signature
   */
  signMessage(message: string): Promise<string>;

  /**
   * Sign and send a transaction to the network.
   * @param transactionBase64 - Base64-encoded VersionedTransaction (unsigned)
   * @returns Base58-encoded transaction signature
   */
  signAndSendTransaction(transactionBase64: string): Promise<string>;

  // Metadata
  walletType: 'embedded' | 'mwa';
  walletName: string;  // e.g., "Phantom", "Privy Embedded"
}

export interface WalletBindingChallenge {
  nonce: string;           // Server-generated, 32-byte hex
  message: string;         // Full message to sign
  expiresAt: number;       // Unix ms, 5 min from issue
}

export interface WalletBinding {
  walletAddress: string;   // Base58 Solana address
  signature: string;       // Base58 Ed25519 signature
  nonce: string;           // Server-issued nonce (for replay protection)
}
```

**Phase 2 Checklist**:

### 2.1 Create @desperse/shared Package
- [ ] Create `packages/shared/` directory
- [ ] Create `packages/shared/package.json`
- [ ] Create `packages/shared/tsconfig.json`
- [ ] Extract `src/constants/categories.ts` → `packages/shared/src/constants/`
- [ ] Extract `src/lib/errorUtils.ts` → `packages/shared/src/utils/`
- [ ] Extract `src/lib/tokenParsing.ts` → `packages/shared/src/utils/`
- [ ] Extract `src/lib/retryUtils.ts` → `packages/shared/src/utils/`
- [ ] Extract `src/lib/wallets.ts` → `packages/shared/src/utils/`
- [ ] Create `packages/shared/src/types/user.ts`
- [ ] Create `packages/shared/src/types/post.ts`
- [ ] Create `packages/shared/src/types/api.ts`
- [ ] Create `packages/shared/src/types/wallet.ts` (new WalletAdapter interface)
- [ ] Create barrel exports in `packages/shared/src/index.ts`
- [ ] Update web app imports to use `@desperse/shared`
- [ ] Verify web app builds and works

### 2.2 Create @desperse/api-client Package
- [ ] Create `packages/api-client/` directory
- [ ] Create `packages/api-client/package.json`
- [ ] Create `packages/api-client/tsconfig.json`
- [ ] Create `ApiClient` class with `baseUrl` and `getAuthToken` config
- [ ] Add methods for all 34 server functions
- [ ] Add proper TypeScript types for all request/response shapes
- [ ] Add error handling and response parsing
- [ ] Create barrel exports

### 2.3 Create @desperse/wallet Package (Placeholder)
- [ ] Create `packages/wallet/` directory
- [ ] Create `packages/wallet/package.json`
- [ ] Create `packages/wallet/tsconfig.json`
- [ ] Create `WalletAdapter` interface export
- [ ] Create placeholder for platform implementations

**Phase 2 Completion Gate**:
- [ ] `@desperse/shared` imports work in web app
- [ ] `@desperse/api-client` compiles successfully
- [ ] Web app builds without errors
- [ ] All existing tests pass

---

## Phase 3: API Layer + Wallet Binding (Week 6-8)

### 3.1 New: Wallet Binding with Server-Issued Nonce

**Database schema additions** (`apps/web/src/server/db/schema.ts`):

```typescript
// Nonces for wallet binding challenges (similar to downloadNonces)
export const walletBindingNonces = pgTable('wallet_binding_nonces', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  walletAddress: text('wallet_address').notNull(),
  nonce: text('nonce').notNull(),           // 32-byte hex, server-generated
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),             // Marks nonce as consumed
});

// Linked wallets with binding proof
export const userWallets = pgTable('user_wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  walletAddress: text('wallet_address').notNull().unique(),  // GLOBALLY UNIQUE: 1 wallet = 1 user
  bindingSignature: text('binding_signature').notNull(),
  bindingNonce: text('binding_nonce').notNull(),
  walletType: text('wallet_type').notNull(), // 'embedded' | 'mwa'
  boundAt: timestamp('bound_at').notNull().defaultNow(),
  lastVerifiedAt: timestamp('last_verified_at'),  // For future re-verification
  isPrimary: boolean('is_primary').default(false),
}, (table) => ({
  userWalletUnique: unique().on(table.userId, table.walletAddress),
  // Partial unique index: only one isPrimary=true per user
  // Note: Drizzle may need raw SQL for this
}));
```

**Server functions** (`apps/web/src/server/functions/walletBinding.ts`):

```typescript
// Step 1: Get challenge (server-issued nonce)
export const getWalletBindingChallenge = createServerFn({ method: 'POST' })
  .handler(async (input: unknown) => {
    const result = await withAuth(getWalletChallengeSchema, input);
    if (!result) return { success: false, error: 'auth_required' };

    const { auth, input: data } = result;

    // Generate 32-byte random nonce
    const nonce = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    // Store nonce
    await db.insert(walletBindingNonces).values({
      userId: auth.userId,
      walletAddress: data.walletAddress,
      nonce,
      expiresAt,
    });

    // Build message with domain, chain, intent
    const message = [
      'desperse.app wants you to link this wallet',
      '',
      `Domain: desperse.app`,
      `Chain: solana:mainnet`,
      `Intent: link_wallet`,
      `User: ${auth.userId}`,
      `Wallet: ${data.walletAddress}`,
      `Nonce: ${nonce}`,
      `Expires: ${expiresAt.toISOString()}`,
    ].join('\n');

    return { success: true, nonce, message, expiresAt: expiresAt.getTime() };
  });

// Step 2: Verify signature and link wallet
export const linkWallet = createServerFn({ method: 'POST' })
  .handler(async (input: unknown) => {
    const result = await withAuth(linkWalletSchema, input);
    if (!result) return { success: false, error: 'auth_required' };

    const { auth, input: data } = result;

    // 1. Find and validate nonce
    const [nonceRecord] = await db.select()
      .from(walletBindingNonces)
      .where(and(
        eq(walletBindingNonces.userId, auth.userId),
        eq(walletBindingNonces.walletAddress, data.walletAddress),
        eq(walletBindingNonces.nonce, data.nonce),
        isNull(walletBindingNonces.usedAt),
        gt(walletBindingNonces.expiresAt, new Date())
      ))
      .limit(1);

    if (!nonceRecord) {
      return { success: false, error: 'Invalid or expired nonce' };
    }

    // 2. Verify Ed25519 signature (reuse pattern from downloadAuth.ts:325-347)
    const expectedMessage = [
      'desperse.app wants you to link this wallet',
      '',
      `Domain: desperse.app`,
      `Chain: solana:mainnet`,
      `Intent: link_wallet`,
      `User: ${auth.userId}`,
      `Wallet: ${data.walletAddress}`,
      `Nonce: ${data.nonce}`,
    ].join('\n');

    // Message must start with expected prefix (expiry line may vary)
    if (!data.message.startsWith(expectedMessage)) {
      return { success: false, error: 'Invalid message format' };
    }

    const isValid = await verifyWalletSignature(
      data.walletAddress,
      data.message,
      data.signature
    );
    if (!isValid) return { success: false, error: 'Invalid signature' };

    // 3. Mark nonce as used
    await db.update(walletBindingNonces)
      .set({ usedAt: new Date() })
      .where(eq(walletBindingNonces.id, nonceRecord.id));

    // 4. Check if wallet is already linked to another user
    const [existingBinding] = await db.select()
      .from(userWallets)
      .where(eq(userWallets.walletAddress, data.walletAddress))
      .limit(1);

    if (existingBinding && existingBinding.userId !== auth.userId) {
      return { success: false, error: 'Wallet already linked to another account' };
    }

    // 5. Store binding (upsert if re-linking to same user)
    await db.insert(userWallets).values({
      userId: auth.userId,
      walletAddress: data.walletAddress,
      bindingSignature: data.signature,
      bindingNonce: data.nonce,
      walletType: data.walletType,
    }).onConflictDoUpdate({
      target: [userWallets.userId, userWallets.walletAddress],
      set: {
        bindingSignature: data.signature,
        bindingNonce: data.nonce,
        lastVerifiedAt: new Date(),
      },
    });

    return { success: true };
  });
```

### 3.2 Modify `buyEdition()` to Verify Wallet Binding

**File**: `apps/web/src/server/functions/editions.ts` (lines 782-804)

```typescript
// BEFORE (current - trusts provided address)
if (providedWalletAddress) {
  const pubkey = new PublicKey(providedWalletAddress);
  buyerWallet = pubkey.toBase58();
}

// AFTER (with binding check)
if (providedWalletAddress) {
  // Verify wallet is linked to this user
  const linkedWallet = await db.select()
    .from(userWallets)
    .where(and(
      eq(userWallets.userId, userId),
      eq(userWallets.walletAddress, providedWalletAddress)
    ))
    .limit(1);

  if (!linkedWallet.length) {
    return {
      success: false,
      error: 'wallet_not_linked',
      message: 'Please link this wallet to your account before purchasing.',
    };
  }

  buyerWallet = providedWalletAddress;
}
```

### 3.3 HTTP API Routes for Mobile

*Same as original plan* - Add `/api/` routes that wrap existing server functions.

**Phase 3 Checklist**:

### 3.1 Database Schema Updates
- [ ] Add `walletBindingNonces` table to schema
- [ ] Add `userWallets` table to schema
- [ ] Add unique constraint on `userWallets.walletAddress` (global)
- [ ] Run `pnpm db:generate` to create migration
- [ ] Run `pnpm db:migrate` to apply migration
- [ ] Verify tables created in database

### 3.2 Wallet Binding Server Functions
- [ ] Create `src/server/functions/walletBinding.ts`
- [ ] Implement `getWalletBindingChallenge()` function
- [ ] Implement `linkWallet()` function
- [ ] Create `src/server/utils/walletVerification.ts`
- [ ] Implement Ed25519 signature verification (reuse downloadAuth pattern)
- [ ] Add Zod schemas for wallet binding inputs
- [ ] Write unit tests for signature verification
- [ ] Test challenge generation returns valid nonce
- [ ] Test linking with valid signature succeeds
- [ ] Test linking with invalid signature fails
- [ ] Test linking with expired nonce fails
- [ ] Test linking wallet already linked to another user fails

### 3.3 Modify buyEdition()
- [ ] Add wallet binding check in `buyEdition()` at line 782-804
- [ ] Test purchase with linked wallet succeeds
- [ ] Test purchase with unlinked wallet returns error
- [ ] Test purchase with user's embedded wallet still works (fallback)
- [ ] Update web app to handle `wallet_not_linked` error

### 3.4 HTTP API Routes
- [ ] Create `/api/posts/feed` route
- [ ] Create `/api/posts/:id` route
- [ ] Create `/api/posts` (create) route
- [ ] Create `/api/editions/buy` route
- [ ] Create `/api/editions/signature` route
- [ ] Create `/api/messages/threads` route
- [ ] Create `/api/messages` route
- [ ] Create `/api/users/:id/follow` route
- [ ] Create `/api/wallet/challenge` route
- [ ] Create `/api/wallet/link` route
- [ ] Configure CORS for mobile app origin
- [ ] Test all routes with Postman/curl

**Phase 3 Completion Gate**:
- [ ] Wallet binding tables exist in database
- [ ] `getWalletBindingChallenge()` returns valid nonce
- [ ] `linkWallet()` stores binding with signature proof
- [ ] `buyEdition()` rejects unlinked wallets
- [ ] All HTTP API routes accessible from external client
- [ ] Web app still works (no regression)

---

## Phase 4: Mobile App Foundation (Week 8-11)

**Phase 4 Checklist**:

### 4.1 Create Expo App
- [ ] Run `npx create-expo-app@latest apps/mobile --template blank-typescript`
- [ ] Install `expo-dev-client` for custom dev builds
- [ ] Install `expo-router` for navigation
- [ ] Install `expo-secure-store` for secure token storage
- [ ] Install `expo-linking` for deep links
- [ ] Install `expo-image` for optimized images
- [ ] Install `expo-av` for video/audio
- [ ] Install `expo-image-picker` for camera/gallery
- [ ] Install `@tanstack/react-query` for data fetching
- [ ] Install `@privy-io/expo` for authentication
- [ ] Install Tamagui packages for UI
- [ ] Install `@desperse/shared` and `@desperse/api-client` workspace deps
- [ ] Configure Metro for monorepo (metro.config.js)
- [ ] Run `expo prebuild --platform android`
- [ ] Verify app builds and runs on device

### 4.2 Tamagui Setup
- [ ] Create `tamagui.config.ts` with Desperse theme tokens
- [ ] Match web theme colors (highlight, background, foreground, muted, border)
- [ ] Create base components (Button, Card, Input, Text)
- [ ] Set up TamaguiProvider in root layout

### 4.3 Navigation Structure
- [ ] Create `app/_layout.tsx` (root with providers)
- [ ] Create `app/(public)/_layout.tsx` (unauthenticated routes)
- [ ] Create `app/(public)/login.tsx`
- [ ] Create `app/(auth)/_layout.tsx` (authenticated routes with tabs)
- [ ] Create tab navigator with 5 tabs (Feed, Explore, Create, Notifications, Profile)
- [ ] Create `app/(auth)/post/[id].tsx`
- [ ] Create `app/(auth)/user/[slug].tsx`
- [ ] Create `app/(auth)/messages/index.tsx`
- [ ] Create `app/(auth)/messages/[threadId].tsx`
- [ ] Create `app/(auth)/settings/index.tsx`
- [ ] Create `app/+not-found.tsx`

### 4.4 Core Providers
- [ ] Set up PrivyProvider with Expo config
- [ ] Set up TanStack Query provider
- [ ] Set up TamaguiProvider
- [ ] Create AuthContext for auth state
- [ ] Create ApiClient instance with auth token injection
- [ ] Test login flow completes successfully

**Phase 4 Completion Gate**:
- [ ] Mobile app boots with Expo Router navigation
- [ ] Login flow works with Privy
- [ ] Tab navigation functional
- [ ] Tamagui components render correctly
- [ ] API client can make authenticated requests

---

## Phase 5: Wallet Integration (Week 11-15)

### 5.1 MWA Implementation with Stable Singleton

**Issue from reviewer**: Original `useWallet()` sketch creates new adapter in `useMemo`, losing state on re-render.

**Fix**: Use `useRef` for stable singleton:

```typescript
// packages/wallet/src/hooks/useMWA.ts

export function useMWA(): MWAWalletAdapter | null {
  const adapterRef = useRef<MWAAdapter | null>(null);
  const [state, setState] = useState({ connected: false, publicKey: null });

  // Create adapter once
  if (!adapterRef.current) {
    adapterRef.current = new MWAAdapter({
      onConnect: (pubkey) => setState({ connected: true, publicKey: pubkey }),
      onDisconnect: () => setState({ connected: false, publicKey: null }),
    });
  }

  return {
    ...adapterRef.current,
    ...state,
  };
}
```

### 5.2 Wallet Binding Flow (Mobile)

Two-step flow with server-issued nonce (mirrors protected download pattern).

```typescript
// apps/mobile/src/hooks/useWalletBinding.ts

export function useWalletBinding() {
  const wallet = useUnifiedWallet();
  const { getAuthHeaders, userId } = useAuth();  // userId from authenticated session

  const bindWallet = async () => {
    if (!wallet?.publicKey) throw new Error('Wallet not connected');
    if (!userId) throw new Error('Not authenticated');

    const headers = await getAuthHeaders();

    // Step 1: Get server-issued challenge (nonce + message)
    const challenge = await getWalletBindingChallenge({
      data: {
        walletAddress: wallet.publicKey,
        _authorization: headers.Authorization,
      },
    });

    if (!challenge.success) throw new Error(challenge.error);

    // Step 2: Sign message with wallet
    // Note: wallet.signMessage takes UTF-8 string, returns Base58 signature
    const signature = await wallet.signMessage(challenge.message);

    // Step 3: Submit signature to server
    const result = await linkWallet({
      data: {
        walletAddress: wallet.publicKey,
        signature,
        message: challenge.message,
        nonce: challenge.nonce,
        walletType: wallet.walletType,
        _authorization: headers.Authorization,
      },
    });

    if (!result.success) throw new Error(result.error);
    return result;
  };

  return { bindWallet };
}
```

**Security properties**:
- Server-issued nonce prevents replay attacks
- 5-minute expiry window limits attack surface
- Nonce marked as used after successful binding
- Global unique constraint: wallet can only be linked to one user
- userId comes from authenticated session, never client-provided
```

### 5.3 iOS: Deferred to v2.0

iOS is out of scope for v1.0. When implemented in v2.0:
- Use `@privy-io/expo` embedded Solana wallets (no MWA on iOS)
- Wallet binding flow will work identically (signMessage is supported)
- No additional wallet adapter needed (Privy handles everything)

**Note**: Do not include iOS in estimates or testing for v1.0.

**Phase 5 Checklist**:

### 5.1 MWA Implementation
- [ ] Install `@solana-mobile/mobile-wallet-adapter-protocol-web3js`
- [ ] Create `packages/wallet/src/adapters/MWAAdapter.ts`
- [ ] Implement `connect()` with `transact()` and `authorize()`
- [ ] Implement `disconnect()` with `deauthorize()`
- [ ] Implement `signMessage()` for wallet binding
- [ ] Implement `signTransaction()` for transaction signing
- [ ] Implement `signAndSendTransaction()` for direct sends
- [ ] Implement `reauthorize()` for session persistence
- [ ] Store auth_token in secure storage
- [ ] Create `hooks/useMWA.ts` with stable singleton pattern
- [ ] Test connect with Phantom on real device
- [ ] Test connect with Solflare on real device
- [ ] Test signMessage produces valid signature
- [ ] Test signAndSendTransaction on devnet

### 5.2 Wallet Binding Integration
- [ ] Create `hooks/useWalletBinding.ts`
- [ ] Implement `bindWallet()` with challenge/sign/submit flow
- [ ] Create wallet binding UI component
- [ ] Add binding prompt after MWA connect
- [ ] Handle "wallet already linked" error gracefully
- [ ] Store binding status in local state
- [ ] Test full binding flow on real device
- [ ] Verify server stores binding correctly

### 5.3 Unified Wallet Hook
- [ ] Create `hooks/useUnifiedWallet.ts`
- [ ] Return MWA adapter on Android
- [ ] Return null for iOS (placeholder for v2.0)
- [ ] Add wallet connection status to auth context
- [ ] Display connected wallet in UI

**Phase 5 Completion Gate**:
- [ ] MWA connects to Phantom/Solflare on real Android device
- [ ] `signMessage()` produces valid Ed25519 signature
- [ ] Wallet binding flow completes successfully
- [ ] Server accepts and stores wallet binding
- [ ] `buyEdition()` accepts bound wallet

---

## Phase 6: Feature Implementation (Week 15-28)

### Approach: Full Parity, Phased for Testing

All user-facing features required before launch. Admin/moderation management stays web-only (users can submit reports, admins manage via web dashboard).

**iOS deferred to v2.0** - Android only for initial release.

### Phase 6A: Core App Shell (Week 15-17)

Foundation that all other features build on.

| Feature | Screens | Key Files |
|---------|---------|-----------|
| **Tamagui setup** | Theme, tokens, base components | `tamagui.config.ts` |
| **Navigation** | Tab bar, stack navigators | `app/_layout.tsx`, `app/(auth)/_layout.tsx` |
| **Auth (Privy)** | Login, signup, logout | `app/(public)/login.tsx` |
| **API client** | TanStack Query setup, error handling | `lib/apiClient.ts`, `lib/queryClient.ts` |
| **MWA integration** | Connect, disconnect, binding flow | `hooks/useMWA.ts`, `hooks/useWalletBinding.ts` |

**Verification**: User can login, connect MWA wallet, bind wallet with signature.

**Phase 6A Checklist**:
- [ ] Tamagui theme matches web design system
- [ ] All base components created (Button, Card, Input, Text, Avatar)
- [ ] Tab bar with 5 tabs functional
- [ ] Stack navigation for detail screens works
- [ ] Login screen implemented
- [ ] Logout functionality works
- [ ] API client initialized with auth token
- [ ] TanStack Query configured with cache settings
- [ ] MWA connect button on profile/settings
- [ ] Wallet binding prompt appears after connect
- [ ] Binding success/error states handled
- [ ] Connected wallet address displayed in UI

---

### Phase 6B: Browse & Discovery (Week 17-19)

Read-only content consumption.

| Feature | Screens | Server Functions Used |
|---------|---------|----------------------|
| **Feed** | Home (For You, Following tabs) | `getPosts`, `getFeed` |
| **Post detail** | Single post view, media player | `getPostDetail` |
| **Profiles** | User profile, follower counts | `getUserProfile`, `getFollowers`, `getFollowing` |
| **Explore** | Trending, categories, search | `getTrendingPosts`, `search`, `getSuggestedCreators` |

**Verification**: User can browse all content, view any profile, search.

**Phase 6B Checklist**:
- [ ] Feed screen with For You / Following tabs
- [ ] Infinite scroll with cursor pagination
- [ ] Pull-to-refresh functionality
- [ ] Post card component (image, video, avatar, stats)
- [ ] Post detail screen with full media
- [ ] Video player with controls
- [ ] Audio player with controls
- [ ] Profile screen with user info
- [ ] Profile posts grid/list view
- [ ] Follower/following counts display
- [ ] Explore screen with trending posts
- [ ] Category filtering
- [ ] Search screen with query input
- [ ] Search results display
- [ ] Suggested creators section
- [ ] Empty states for no results
- [ ] Loading skeletons

---

### Phase 6C: Social Interactions (Week 19-21)

User-to-user engagement (non-wallet features).

| Feature | Screens | Server Functions Used |
|---------|---------|----------------------|
| **Follow/Unfollow** | Profile action buttons | `followUser`, `unfollowUser` |
| **Likes** | Post action button | `likePost`, `unlikePost` |
| **Comments** | Comment list, compose | `getComments`, `createComment`, `deleteComment` |
| **Notifications** | Activity feed, badges | `getNotifications`, `markNotificationAsRead` |
| **Report content** | Report modal (submit only) | `reportContent` |

**Note**: Report management stays on web (`getReports`, `resolveReport` not needed in mobile).

**Verification**: Full social loop - follow, like, comment, receive notifications.

**Phase 6C Checklist**:
- [ ] Follow button on profile screens
- [ ] Unfollow confirmation dialog
- [ ] Optimistic UI update for follow/unfollow
- [ ] Like button on post cards and detail
- [ ] Like animation/feedback
- [ ] Optimistic UI update for likes
- [ ] Comments section on post detail
- [ ] Comment compose input
- [ ] Comment submission
- [ ] Delete own comment functionality
- [ ] Notifications screen
- [ ] Notification types: follow, like, comment, mention
- [ ] Unread badge on tab icon
- [ ] Mark notification as read on tap
- [ ] Mark all as read functionality
- [ ] Report content modal
- [ ] Report reason selection
- [ ] Report submission confirmation
- [ ] Pull-to-refresh on all lists

---

### Phase 6D: Wallet Features (Week 21-24)

On-chain transactions requiring MWA signing.

| Feature | Screens | Server Functions Used |
|---------|---------|----------------------|
| **Collect (cNFTs)** | Collect button + sign flow | `collectPost` |
| **Buy editions** | Purchase flow + sign flow | `buyEdition`, `submitPurchaseSignature`, `checkPurchaseStatus` |
| **Wallet overview** | Balance, owned NFTs | `getWalletOverview`, `getOwnedNfts` |
| **Protected downloads** | Gated asset access | `getDownloadNonce`, `verifyAndIssueToken` |

**Verification**: Full purchase flow - buy edition, sign with MWA, receive NFT, download gated content.

**Phase 6D Checklist**:
- [ ] Collect button on collectible posts
- [ ] Collect flow: check wallet → sign → submit
- [ ] Collect success/error handling
- [ ] Buy button on edition posts
- [ ] Buy flow: price display → wallet check → sign → poll status
- [ ] Edition price display (SOL/USDC)
- [ ] Supply remaining display
- [ ] Sold out state handling
- [ ] Transaction signing modal
- [ ] Transaction pending state
- [ ] Transaction confirmed state
- [ ] Transaction failed state with retry
- [ ] Wallet overview screen
- [ ] SOL balance display
- [ ] USDC balance display
- [ ] Owned NFTs grid
- [ ] NFT detail view
- [ ] Protected download button on gated assets
- [ ] Download auth flow: nonce → sign → token → download
- [ ] File download with progress
- [ ] Download error handling

---

### Phase 6E: Content Creation (Week 24-26)

User-generated content with media uploads.

| Feature | Screens | Server Functions Used |
|---------|---------|----------------------|
| **Create post** | Camera, gallery, caption, categories | `createPost`, presigned upload |
| **Create collectible** | Mint as free cNFT option | `createPost` (with collectible type) |
| **Create edition** | Pricing, supply, master mint | `createPost` (with edition type) |
| **Edit profile** | Avatar, bio, display name | `updateProfile`, presigned upload |

**Verification**: Full creator flow - create post with media, mint as edition, sell to another user.

**Phase 6E Checklist**:
- [ ] Create post screen
- [ ] Camera capture integration
- [ ] Gallery picker integration
- [ ] Multi-image selection (up to 10)
- [ ] Image preview and reordering
- [ ] Video recording/selection
- [ ] Video preview
- [ ] Caption input with character limit
- [ ] Category selection
- [ ] Hashtag input/suggestions
- [ ] Upload progress indicator
- [ ] Multipart upload for large files (>10MB)
- [ ] Upload retry on failure
- [ ] Post type selector (post, collectible, edition)
- [ ] Collectible toggle (free mint option)
- [ ] Edition pricing input (SOL/USDC)
- [ ] Edition supply input
- [ ] Downloadable asset attachment (for editions)
- [ ] Cover image selection for audio/docs
- [ ] Post submission
- [ ] Success confirmation and navigation
- [ ] Edit profile screen
- [ ] Avatar upload
- [ ] Display name input
- [ ] Bio input
- [ ] Username slug (read-only display)

---

### Phase 6F: Direct Messages (Week 26-28)

Real-time messaging with Ably + reliability guarantees.

| Feature | Screens | Server Functions Used |
|---------|---------|----------------------|
| **Thread list** | Conversations, unread badges | `getThreads` |
| **Conversation** | Messages, compose, read receipts | `getMessages`, `sendMessage`, `markThreadRead` |
| **Real-time** | Ably subscription | `getAblyToken` |
| **Start conversation** | From profile action | `getOrCreateThread` |

**Reliable Messaging Contract**:

| Scenario | Behavior |
|----------|----------|
| **App foregrounded** | Ably real-time subscription active, instant delivery |
| **App backgrounded** | Ably disconnects; on foreground, fetch latest from server |
| **App killed** | No push notifications in v1.0; user sees unread on next open |
| **Offline send** | Queue message locally, send on reconnect with retry |
| **Network flaky** | Ably reconnects automatically; poll server if disconnected >30s |
| **Message ordering** | Server timestamp is source of truth, not Ably ordering |
| **Read receipts** | Optimistic update, server confirms, sync on reconnect |

**Ably Limits Handling** (free tier: 6M messages/month, 200 concurrent connections):
- Monitor usage via Ably dashboard
- If approaching limits, implement polling fallback
- Consider upgrading or self-hosted alternative before launch if needed

**NOT in v1.0** (deferred to v1.1+):
- Push notifications when app backgrounded/killed
- Typing indicators
- Message reactions
- Media attachments in DMs

**Verification**: Full DM flow - start conversation, send/receive messages in real-time, messages persist across app restart.

**Phase 6F Checklist**:
- [ ] Thread list screen
- [ ] Thread preview (last message, timestamp)
- [ ] Unread indicator on threads
- [ ] Conversation screen
- [ ] Message list with timestamps
- [ ] Message compose input
- [ ] Send button
- [ ] Sent/delivered/read status indicators
- [ ] Ably token auth integration
- [ ] Ably real-time subscription setup
- [ ] New message handler (refetch)
- [ ] Read receipt handler (invalidate)
- [ ] Ably reconnection on foreground
- [ ] Polling fallback when Ably disconnected >30s
- [ ] Offline message queue
- [ ] Queue flush on reconnect
- [ ] Start conversation from profile
- [ ] Get or create thread logic
- [ ] Empty state for no conversations
- [ ] Error state for connection issues

---

### Phase 6G: Settings & Polish (Week 28-30)

Final touches before launch.

| Feature | Screens | Notes |
|---------|---------|-------|
| **Settings** | Preferences screen | Notification toggles, linked wallets |
| **Wallet management** | View/remove linked wallets | Uses `userWallets` table |
| **Error states** | Empty states, error boundaries | Consistent UX |
| **Loading states** | Skeletons, pull-to-refresh | Polish |
| **Deep linking** | `desperse://post/{id}`, `desperse://user/{slug}` | App Links |

**Verification**: App handles all edge cases gracefully.

**Phase 6G Checklist**:
- [ ] Settings screen
- [ ] Notification preferences toggles
- [ ] Linked wallets list
- [ ] Add wallet button (triggers MWA + binding)
- [ ] Remove wallet functionality
- [ ] Primary wallet selection
- [ ] Logout button
- [ ] App version display
- [ ] Privacy policy link
- [ ] Terms of service link
- [ ] Support/feedback link
- [ ] Empty states for all lists
- [ ] Error boundaries for crash recovery
- [ ] Loading skeletons for all screens
- [ ] Pull-to-refresh on all lists
- [ ] Deep link handling: `desperse://post/{id}`
- [ ] Deep link handling: `desperse://user/{slug}`
- [ ] Deep link handling: `desperse://messages/{threadId}`
- [ ] App Links verification file
- [ ] Haptic feedback on key actions
- [ ] Keyboard avoidance on forms
- [ ] Safe area handling
- [ ] Landscape orientation handling (or lock to portrait)

---

### Features NOT in Mobile v1.0

| Feature | Reason | Where to Use |
|---------|--------|--------------|
| Admin dashboard | Low usage, complex UI | Web only |
| Moderation queue | Admin-only feature | Web only |
| Report resolution | Admin-only feature | Web only |
| User role management | Admin-only feature | Web only |
| Hide post (admin) | Admin-only feature | Web only |
| Push notifications | Deferred to v1.1 | N/A |
| iOS app | Deferred to v2.0 | N/A |

---

## Phase 6H: Security & Observability (Week 28-30)

### Mobile Security Checklist

| Item | Implementation | Priority |
|------|----------------|----------|
| **Secure token storage** | `expo-secure-store` (Keychain/Keystore) | Required |
| **No secrets in bundle** | Verify no API keys in JS bundle | Required |
| **Certificate pinning** | Optional for v1.0, consider for high-value flows | Optional |
| **Root/jailbreak detection** | Detect and log (don't block) | Optional |
| **Debug builds blocked** | Ensure release builds have no debug flags | Required |

**Token storage implementation**:
```typescript
import * as SecureStore from 'expo-secure-store';

// Store Privy refresh token securely
await SecureStore.setItemAsync('privy_refresh_token', token);

// Retrieve
const token = await SecureStore.getItemAsync('privy_refresh_token');
```

### API Security

| Item | Implementation |
|------|----------------|
| **Rate limiting** | Add per-user and per-IP limits on `/api/*` endpoints |
| **Request size limits** | Max 5MB for non-upload endpoints |
| **Replay protection** | Server-issued nonces for wallet binding (already in plan) |
| **Input validation** | Zod schemas on all endpoints (existing pattern) |

### Observability

| Item | Tool | Purpose |
|------|------|---------|
| **Crash reporting** | Sentry (`sentry-expo`) | Catch and triage crashes |
| **Performance metrics** | Sentry Performance | Track upload, buy, collect flow times |
| **Analytics** | PostHog or Amplitude | User behavior, funnel analysis |
| **Feature flags** | LaunchDarkly or Statsig | Staged rollout, kill switches |

**High-risk flows to flag**:
- Uploads (can disable if storage issues)
- MWA signing (can fallback to "use web" message)
- Real-time DMs (can fallback to polling)

### Staged Rollout Plan

1. **Internal testing** (Week 30): Team-only on dApp Store
2. **Beta** (Week 31-32): Invite-only, 50-100 users
3. **Soft launch** (Week 33): Public on dApp Store, no marketing
4. **Full launch** (Week 34+): Marketing push

**Phase 6H Checklist**:

### Security Implementation
- [ ] Install `expo-secure-store`
- [ ] Create `lib/secureStorage.ts` wrapper
- [ ] Store Privy tokens in secure storage
- [ ] Store MWA auth tokens in secure storage
- [ ] Verify no API keys in JS bundle (bundle analysis)
- [ ] Verify release builds have no debug flags
- [ ] Add certificate pinning for API calls (optional)
- [ ] Add root/jailbreak detection (optional)

### API Security
- [ ] Add rate limiting middleware to `/api/*` routes
- [ ] Configure per-user rate limits
- [ ] Configure per-IP rate limits
- [ ] Add request size limits (5MB max)
- [ ] Verify Zod validation on all endpoints

### Observability Setup
- [ ] Install `sentry-expo`
- [ ] Configure Sentry DSN
- [ ] Test crash reporting (intentional crash)
- [ ] Set up Sentry Performance monitoring
- [ ] Configure upload, buy, collect flow tracing
- [ ] Set up analytics (PostHog or Amplitude)
- [ ] Configure key event tracking
- [ ] Set up feature flag service (LaunchDarkly/Statsig)
- [ ] Create flags for: uploads, MWA, DMs
- [ ] Test flag toggling

### Staged Rollout Preparation
- [ ] Create internal testing APK
- [ ] Test with team members
- [ ] Create beta testing group
- [ ] Document beta feedback process
- [ ] Plan soft launch metrics to track

---

## Phase 6I: Store Compliance (Week 30-32)

### Google Play Risk Tracking

Google Play "Cryptocurrency Exchanges and Software Wallets" policy may apply. Track as risk item.

| Requirement | Status | Notes |
|-------------|--------|-------|
| **Country restrictions** | Research needed | Some countries require licensing |
| **Crypto disclosure** | Add to app description | "This app facilitates NFT transactions on Solana" |
| **Age rating** | Likely 17+ | Due to real-money transactions |
| **Financial services** | Probably N/A | We're not a wallet, but verify |

**Action items**:
- [ ] Review Google Play crypto policy before Phase 7
- [ ] Consult legal if country restrictions apply
- [ ] Prepare policy-compliant app description
- [ ] Have backup plan if Play Store rejects (dApp Store only)

### Solana dApp Store Requirements

Per [Solana Mobile publishing docs](https://docs.solanamobile.com/dapp-publishing):

| Asset | Requirement |
|-------|-------------|
| **App icon** | 512x512 PNG |
| **Screenshots** | 5-8 screenshots, phone resolution |
| **Feature graphic** | 1024x500 PNG |
| **Short description** | 80 chars max |
| **Full description** | 4000 chars max |
| **Demo video** | Recommended, showing MWA flow |

**Phase 6I Checklist**:

### Google Play Research
- [ ] Review Google Play crypto app policies
- [ ] Document applicable requirements
- [ ] Identify country restrictions (if any)
- [ ] Consult legal if needed
- [ ] Prepare policy-compliant app description
- [ ] Document backup plan if rejected

### Solana dApp Store Assets
- [ ] Create app icon (512x512 PNG)
- [ ] Create feature graphic (1024x500 PNG)
- [ ] Capture screenshots (5-8, phone resolution)
- [ ] Write short description (80 chars max)
- [ ] Write full description (4000 chars max)
- [ ] Record demo video showing MWA flow
- [ ] Prepare privacy policy URL
- [ ] Prepare terms of service URL
- [ ] Set up support email

### Publisher Account Setup
- [ ] Create Solana dApp Store publisher account
- [ ] Set up publisher wallet
- [ ] Configure storage provider for assets
- [ ] Complete publisher verification (if required)

---

## Phase 7: Testing & Deployment (Week 32-36)

### 7.1 Build Pipeline Reconciliation

**Development** (prebuild for MWA native modules):
```bash
npx expo prebuild --platform android
npx expo run:android --device
```

**Production** (EAS for store builds):
```bash
eas build --platform android --profile production
```

**Key insight**: EAS works fine for production builds. The conflict is only for development where you need native module debugging.

### 7.2 dApp Store Publishing Checklist

**Publisher Setup**:
- [ ] Create Solana dApp Store publisher account
- [ ] Set up publisher wallet for on-chain app listing
- [ ] Prepare storage provider for app assets

**App Listing NFT**:
- [ ] App name: "Desperse"
- [ ] Description: Social media platform for creators on Solana
- [ ] Category: Social
- [ ] Screenshots (5-8 required)
- [ ] Demo video showing MWA flow

**Technical Requirements**:
- [ ] MWA protocol implemented correctly
- [ ] Uses `solana:mainnet` chain identifier
- [ ] App identity configured:
  ```typescript
  identity: {
    name: 'Desperse',
    uri: 'https://desperse.app',
    icon: 'https://desperse.app/icon.png',
  }
  ```
- [ ] No debug flags in release APK

**Compliance**:
- [ ] Privacy policy URL
- [ ] Terms of service URL
- [ ] Support email
- [ ] Age rating (if applicable)

**Submission**:
- [ ] Generate signed APK via EAS
- [ ] Submit via dApp Store publisher portal
- [ ] Monitor approval status

### 7.3 Google Play (Secondary)

After dApp Store validation:
- [ ] Review Google Play crypto app policies
- [ ] Ensure compliance with "Cryptocurrency Exchanges and Software Wallets" guidelines
- [ ] Submit via EAS + Play Console

**Phase 7 Checklist**:

### Testing
- [ ] Complete unit tests for shared packages
- [ ] Complete unit tests for API client
- [ ] Integration tests for wallet binding flow
- [ ] Integration tests for purchase flow
- [ ] E2E tests for critical paths (Maestro)
- [ ] E2E test: login → browse → like
- [ ] E2E test: login → connect wallet → bind → buy edition
- [ ] E2E test: login → create post → publish
- [ ] E2E test: login → DM → send message
- [ ] Device testing: multiple Android versions (11, 12, 13, 14)
- [ ] Device testing: different screen sizes
- [ ] Performance testing: feed scroll performance
- [ ] Performance testing: upload large video
- [ ] Security audit: penetration testing (optional)

### Build & Release
- [ ] Configure EAS for production builds
- [ ] Generate signed APK via EAS
- [ ] Verify APK passes lint checks
- [ ] Verify no debug flags in release
- [ ] Test release APK on real device
- [ ] Configure app signing keys
- [ ] Store signing keys securely

### dApp Store Submission
- [ ] Upload APK to dApp Store
- [ ] Submit app listing NFT
- [ ] Upload all required assets
- [ ] Submit for review
- [ ] Monitor approval status
- [ ] Address any review feedback
- [ ] Publish to dApp Store

### Post-Launch
- [ ] Monitor Sentry for crashes
- [ ] Monitor analytics for user behavior
- [ ] Set up alerting for critical errors
- [ ] Prepare hotfix process
- [ ] Document known issues
- [ ] Gather user feedback
- [ ] Plan v1.1 improvements

**Phase 7 Completion Gate**:
- [ ] App accepted on Solana dApp Store
- [ ] No critical crashes in first 24 hours
- [ ] Core flows working for real users

---

## Decisions Confirmed

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Wallet binding** | Implement before launch | Security requirement - MWA wallets need signature proof |
| **Launch scope** | Full parity (phased) | All user features required, admin/moderation stays web-only |
| **iOS timing** | Deferred to v2.0 | Focus Android, validate on dApp Store first |
| **Admin features** | Web only | Users can submit reports, admins manage via web dashboard |

---

## Critical Files to Modify

### Server-side (in `apps/web/` after monorepo migration)

| File | Change |
|------|--------|
| `src/server/db/schema.ts` | Add `walletBindingNonces` and `userWallets` tables |
| `src/server/functions/editions.ts:782-804` | Add wallet binding check in `buyEdition()` |
| `src/server/functions/walletBinding.ts` | New - `getWalletBindingChallenge()` + `linkWallet()` |
| `src/server/utils/walletVerification.ts` | New - reuse Ed25519 verify from `downloadAuth.ts:325-347` |

### Mobile-side (in `apps/mobile/`)

| File | Change |
|------|--------|
| `hooks/useMWA.ts` | MWA adapter with stable singleton pattern |
| `hooks/useWalletBinding.ts` | Two-step challenge/sign/submit flow |
| `lib/apiClient.ts` | HTTP client with auth header injection |
| `lib/secureStorage.ts` | Wrapper around `expo-secure-store` |
| `tamagui.config.ts` | Theme tokens matching web |

### Shared packages (in `packages/`)

| Package | Key Files |
|---------|-----------|
| `@desperse/shared` | `types/wallet.ts`, `schemas/walletBinding.ts` |
| `@desperse/api-client` | `client.ts` with all endpoint wrappers |

---

## Verification Steps

| Phase | Verification |
|-------|--------------|
| **Phase 0** | All 4 spikes pass success criteria, decision records documented |
| **Phase 1** | `pnpm dev:web` works, Metro resolves workspace packages |
| **Phase 2** | `@desperse/shared` imports work in both web and mobile |
| **Phase 3** | `getWalletBindingChallenge()` + `linkWallet()` work, `buyEdition()` rejects unlinked wallets |
| **Phase 4** | Mobile app boots with Expo Router navigation |
| **Phase 5** | MWA connect → get challenge → sign message → binding flow works on real device |
| **Phase 6A** | User can login, connect MWA, bind wallet |
| **Phase 6B** | User can browse all content, view any profile, search |
| **Phase 6C** | Full social loop - follow, like, comment, receive notifications |
| **Phase 6D** | Full purchase flow - buy edition, sign with MWA, receive NFT |
| **Phase 6E** | Full creator flow - create post with media, mint as edition |
| **Phase 6F** | Full DM flow - send/receive messages, messages persist across app restart |
| **Phase 6G** | App handles all edge cases, deep links work |
| **Phase 6H** | Sentry reporting crashes, feature flags operational |
| **Phase 6I** | Store assets prepared, compliance checklist complete |
| **Phase 7** | App accepted on Solana dApp Store |
