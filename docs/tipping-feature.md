# Tipping Feature — SKR (Seeker) Token Tips

## Overview

Users can send Seeker (SKR) token tips to creators. Tips serve two purposes:
1. **Profile tipping** — Show appreciation for a creator's work (any amount)
2. **Message unlock** — Tip a minimum amount to unlock DM eligibility with a creator

Only SKR tokens are supported for tipping.

---

## Token Details

| Field | Value |
|---|---|
| Token | Seeker (SKR) |
| Mint address | `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3` |
| Decimals | **6** |
| Token program | `spl-token` (standard, NOT Token-2022) |
| CoinGecko ID | `seeker` |
| Jupiter swap URL | `https://jup.ag/swap/SOL-SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3` |

---

## Database Schema

### `tip_status_enum`

```
'pending' | 'confirmed' | 'failed'
```

### `tips` Table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `from_user_id` | uuid (FK → users) | Sender |
| `to_user_id` | uuid (FK → users) | Recipient (creator) |
| `amount` | bigint | Raw token units (6 decimals). 50 SKR = `50000000` |
| `token_mint` | text | Always `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3` |
| `tx_signature` | text (nullable) | Solana transaction signature, set on confirm |
| `status` | tip_status_enum | `pending` → `confirmed` or `failed` |
| `context` | text (nullable) | `'profile'` or `'message_unlock'` |
| `created_at` | timestamp | Auto-set |
| `confirmed_at` | timestamp (nullable) | Set on confirmation |

**Indexes**: `from_user_id`, `to_user_id`, `status`, composite `(from_user_id, to_user_id, status)`, `tx_signature`

---

## User Preferences (Messaging)

Stored in `users.preferences` JSONB column under `messaging`:

```json
{
  "dmEnabled": true,
  "allowBuyers": true,
  "allowCollectors": true,
  "collectorMinCount": 3,
  "allowTippers": true,
  "tipMinAmount": 50
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `dmEnabled` | boolean | `true` | Master toggle for DMs |
| `allowBuyers` | boolean | `true` | Allow edition buyers to message |
| `allowCollectors` | boolean | `true` | Allow collectors to message |
| `collectorMinCount` | number | `3` | Minimum collectibles required |
| `allowTippers` | boolean | `true` | Allow tippers to message |
| `tipMinAmount` | number | `50` | Minimum SKR tip to unlock DMs (human-readable) |

---

## API Endpoints

### 1. `prepareTip` (POST, authenticated)

Builds an unsigned SPL token transfer transaction on the server.

**Input:**
```json
{
  "toUserId": "uuid",
  "amount": 50,
  "context": "profile | message_unlock",
  "walletAddress": "sender-wallet-address"
}
```

**Validation:**
- `amount`: positive number, max 10,000
- `context`: `"profile"` or `"message_unlock"`

**Response:**
```json
{
  "success": true,
  "tipId": "uuid",
  "transaction": "base64-encoded-unsigned-transaction",
  "blockhash": "...",
  "lastValidBlockHeight": 123456
}
```

**Server logic:**
1. Validates amount (0.01–10,000 SKR)
2. Prevents self-tipping
3. Checks rate limit (1 tip per sender→recipient per 24h)
4. Cancels any existing pending tips from same sender→recipient
5. Resolves recipient's primary wallet address
6. Converts amount to raw units (`amount * 10^6`)
7. Builds unsigned VersionedTransaction (V0) with instructions:
   - Create sender ATA if needed (idempotent)
   - Create recipient ATA if needed (sender pays)
   - SPL token transfer
8. Creates `pending` tip record in DB
9. Returns base64-encoded transaction

### 2. `confirmTip` (POST, authenticated)

Confirms a tip after the client signs and submits the transaction.

**Input:**
```json
{
  "tipId": "uuid",
  "txSignature": "solana-transaction-signature"
}
```

**Server logic:**
1. Verifies tip ownership (sender must match authenticated user)
2. Only confirms tips with `pending` status
3. Updates status to `confirmed`, sets `txSignature` and `confirmedAt`

### 3. `getTipStats` (POST, optional auth)

Gets aggregate tip statistics for a user.

**Input:**
```json
{
  "userId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "totalReceived": 150.5,
  "tipCount": 3
}
```

---

## Client-Side Tip Flow

### State Machine

```
idle → preparing → signing → confirming → success
                                        → failed
```

### Flow

1. **Prepare**: Call `prepareTip` → get unsigned transaction
2. **Sign**:
   - **Embedded wallet**: `signTransaction` → manual RPC `sendTransaction`
   - **External wallet**: `signAndSendTransaction` (wallet handles submission)
3. **Confirm**: Call `confirmTip` with `tipId` + `txSignature`
4. **Invalidate**: Refresh `dm-eligibility` and `tip-stats` query caches
5. **Success**: Toast notification, optional callback

### Timeouts
- Sign timeout: 2 minutes
- Send transaction timeout: 30 seconds

### Wallet Matching
The client verifies the signing wallet address matches the transaction's sender address. If the active wallet is a linked external wallet not connected via browser extension, the user sees: *"Your active wallet is not connected. Please connect it via your browser extension and try again."*

---

## DM Eligibility Integration

### Existing Eligibility Criteria (unchanged)
1. **Edition purchases** — Bought an edition from creator
2. **Collection threshold** — Collected N items from creator (configurable, default 3)
3. **Reciprocal purchase** — Creator bought from user
4. **Reciprocal collection** — Creator collected from user
5. **Existing thread** — Already have a conversation
6. **Self-messaging** — Own account

### New: Tip Unlock
- **Criteria**: Total confirmed tips from user → creator >= creator's `tipMinAmount`
- **Eligibility path**: `'tip_unlock'`
- **Cumulative**: Multiple tips are summed (e.g. two 25 SKR tips = 50 SKR total)

### Unlock Path Messages
- If never tipped: `"Tip {tipMinAmount} SKR to unlock messaging"`
- If partially tipped: `"Tip {remaining} more SKR to unlock messaging"`

### Implementation
The tip check is wrapped in `try/catch` — if it fails, DM eligibility still works based on other criteria. Tips are a non-critical addition to the eligibility system.

---

## Rate Limiting

- **1 tip per sender → recipient per 24 hours** (based on confirmed tips)
- Pending tips from the same pair are cancelled when a new tip is prepared
- Server-side enforcement only

---

## UI Components

### TipButton
Renders on creator profiles (non-own, authenticated). Icon-only ghost button with the Seeker "S" logo.

### TipDialog
- **Header**: Seeker icon + creator avatar (overlapping), "Tip {Creator Name}"
- **Description**: "Send Seeker tokens to show your appreciation for {FirstName}'s work."
- **Preset amounts**: `[50, 100, 250, 500]` SKR (pill buttons showing number only)
- **Custom amount**: Toggle between presets and custom input with "SKR" suffix
- **Balance display**: Inline "Balance: {amount} SKR"
- **Insufficient funds**: Send button disabled, "Get SKR" link to Jupiter swap
- **Footer**: "Cancel" (ghost) and "Send Tip" (primary, no icon)

### SeekerIcon
Theme-aware inline SVG using `currentColor`. Works in both light and dark mode.

### UnlockMessagingCard
Shows tip unlock option when user doesn't meet DM eligibility. Opens TipDialog with `context="message_unlock"` and `defaultAmount={tipMinAmount}`.

---

## Messaging Settings Page

Single card with:
1. **Master toggle**: "Direct Messages" — enable/disable all DMs
2. **Eligibility requirements** (visible when DMs enabled):
   - **Edition Buyers**: Toggle — "Own any of your editions"
   - **Collectors**: Toggle + inline number input — "At least {N} collectibles"
   - **Tippers**: Toggle + inline number input — "At least {N} SKR tipped"

Number inputs use debounced commit (800ms or on blur).

---

## Integration Points Summary

| Location | Component | Purpose |
|---|---|---|
| Profile page | `TipButton` | Tip any creator from their profile |
| Messaging (unlock card) | `UnlockMessagingCard` | Tip to unlock DM access |
| Messaging settings | Settings page | Creator configures tip threshold |
| DM eligibility check | Server-side | Tips counted in eligibility |
| Wallet menu | Balance display | Shows SKR balance |

---

## Error Handling

| Error | User Message |
|---|---|
| User cancels signing | "Transaction was cancelled." |
| Insufficient SKR balance | "Insufficient SKR balance. Please add funds and try again." |
| Simulation failure | "Transaction simulation failed. This may be a temporary issue — please try again." |
| Wallet not connected | "Your active wallet is not connected. Please connect it via your browser extension and try again." |
| Wallet mismatch | "Wallet mismatch. Please ensure your active wallet matches the connected wallet." |
| Rate limited | "You can only tip this user once per 24 hours." |
| Self-tip attempt | "Cannot tip yourself." |
