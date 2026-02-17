# Desperse Android API Contract

**Version:** 1.0.0
**Last Updated:** 2026-01-31
**Status:** Active

This document defines the HTTP API contract for the Desperse Android native app. All endpoints are versioned under `/api/v1/` and return consistent JSON responses.

---

## Table of Contents

1. [General](#general)
   - [Base URL](#base-url)
   - [Authentication](#authentication)
   - [Response Envelope](#response-envelope)
   - [Error Codes](#error-codes)
   - [Standard Headers](#standard-headers)
2. [Tier 1: Health & Version](#tier-1-health--version)
   - [GET /api/v1/health](#get-apiv1health)
   - [GET /api/v1/version](#get-apiv1version)
3. [Tier 2: Authentication](#tier-2-authentication)
   - [POST /api/v1/auth/init](#post-apiv1authinit)
   - [GET /api/v1/users/me](#get-apiv1usersme)
4. [Tier 3: Editions (Purchase Flow)](#tier-3-editions-purchase-flow)
   - [POST /api/v1/editions/buy](#post-apiv1editionsbuy)
   - [POST /api/v1/editions/signature](#post-apiv1editionssignature)
   - [GET /api/v1/editions/purchase/:id/status](#get-apiv1editionspurchaseidstatus)
5. [Tier 4: Posts & Feed](#tier-4-posts--feed)
   - [GET /api/v1/posts](#get-apiv1posts)
   - [GET /api/v1/posts/:id](#get-apiv1postsid)

---

## General

### Base URL

| Environment | URL |
|-------------|-----|
| Production | `https://desperse.app` |
| Preview | `https://<branch>.desperse.app` |
| Development | `http://localhost:3000` |

### Authentication

All authenticated endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <privy_access_token>
```

The token is obtained from the Privy SDK after successful authentication.

### Response Envelope

**All endpoints return this envelope structure:**

```typescript
interface ApiEnvelope<T> {
  success: boolean;
  data?: T;                    // Present on success
  error?: {
    code: ErrorCode;           // Machine-readable error code
    message: string;           // Human-readable message
    details?: Record<string, unknown>;
  };
  meta?: {
    hasMore?: boolean;         // For paginated responses
    nextCursor?: string;       // Opaque cursor for next page
  };
  requestId: string;           // Always present, for debugging
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | Missing or invalid authentication token |
| `TOKEN_EXPIRED` | 401 | Token has expired, refresh required |
| `FORBIDDEN` | 403 | User lacks permission for this action |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |
| `TX_EXPIRED_BLOCKHASH` | 400 | Transaction blockhash expired, restart flow |
| `TX_INVALID_SIGNATURE` | 400 | Invalid transaction signature |
| `INSUFFICIENT_FUNDS` | 400 | Not enough SOL/USDC for transaction |
| `SOLD_OUT` | 400 | Edition sold out |

### Standard Headers

**All responses include:**

```
X-Request-Id: req_abc123          # Matches envelope requestId
X-Api-Version: 1                  # API version
X-RateLimit-Remaining: 95         # Requests remaining in window
X-RateLimit-Reset: 1706712000     # Unix timestamp when limit resets
Cache-Control: no-store           # For authenticated endpoints
```

---

## Tier 1: Health & Version

### GET /api/v1/health

Health check endpoint for uptime monitoring.

**Authentication:** Not required

**Request:**
```http
GET /api/v1/health
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "api": "1"
  },
  "requestId": "req_abc123"
}
```

---

### GET /api/v1/version

Version information for debugging and force-update checks.

**Authentication:** Not required

**Request:**
```http
GET /api/v1/version
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "api": "1",
    "build": "abc123def",
    "env": "production",
    "minAndroidVersion": "1.0.0",
    "currentAndroidVersion": "1.0.0"
  },
  "requestId": "req_def456"
}
```

**Fields:**
- `api`: API version number (string)
- `build`: Git commit SHA (first 9 chars)
- `env`: Environment (`"production"` | `"preview"` | `"development"`)
- `minAndroidVersion`: Minimum required Android app version (for force-update)
- `currentAndroidVersion`: Latest available Android app version

---

## Tier 2: Authentication

### POST /api/v1/auth/init

Initialize or update user after Privy authentication. Creates user if not exists.

**Authentication:** Required

**Request:**
```http
POST /api/v1/auth/init
Authorization: Bearer <privy_access_token>
Content-Type: application/json

{
  "walletAddress": "5xyzABCdefGHIjklMNOpqrstUVwxyz123456789",
  "email": "user@example.com",
  "name": "Display Name",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

**Fields:**
- `walletAddress` (required): Solana wallet address (32-44 chars)
- `email` (optional): User email address
- `name` (optional): Display name
- `avatarUrl` (optional): Avatar URL

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "privyId": "did:privy:xxx",
      "usernameSlug": "user-abc123",
      "displayName": "Display Name",
      "walletAddress": "5xyzABCdefGHIjklMNOpqrstUVwxyz123456789",
      "avatarUrl": "https://example.com/avatar.jpg",
      "bio": null,
      "createdAt": "2026-01-31T12:00:00Z",
      "updatedAt": "2026-01-31T12:00:00Z"
    },
    "isNewUser": false
  },
  "requestId": "req_ghi789"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required. Please log in."
  },
  "requestId": "req_jkl012"
}
```

---

### GET /api/v1/users/me

Get the currently authenticated user.

**Authentication:** Required

**Request:**
```http
GET /api/v1/users/me
Authorization: Bearer <privy_access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "privyId": "did:privy:xxx",
      "usernameSlug": "user-abc123",
      "displayName": "Display Name",
      "walletAddress": "5xyzABCdefGHIjklMNOpqrstUVwxyz123456789",
      "avatarUrl": "https://example.com/avatar.jpg",
      "bio": "User bio text",
      "createdAt": "2026-01-31T12:00:00Z",
      "updatedAt": "2026-01-31T12:00:00Z"
    }
  },
  "requestId": "req_mno345"
}
```

**Response (200 OK, unauthenticated):**
```json
{
  "success": true,
  "data": {
    "user": null
  },
  "requestId": "req_pqr678"
}
```

---

## Tier 3: Editions (Purchase Flow)

The edition purchase flow is a multi-step process:

1. **Buy**: Client initiates purchase, server returns unsigned transaction
2. **Sign**: Client signs transaction with Privy embedded wallet
3. **Submit**: Client submits signed transaction signature
4. **Poll**: Client polls for confirmation

### POST /api/v1/editions/buy

Initiate edition purchase. Returns unsigned transaction for client to sign.

**Authentication:** Required

**Request:**
```http
POST /api/v1/editions/buy
Authorization: Bearer <privy_access_token>
Content-Type: application/json
Idempotency-Key: <client-generated-uuid>

{
  "postId": "uuid-of-edition-post",
  "walletAddress": "optional-connected-wallet-address"
}
```

**Fields:**
- `postId` (required): UUID of the edition post
- `walletAddress` (optional): Connected wallet address (for browser extension wallets)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "purchaseId": "uuid",
    "status": "reserved",
    "unsignedTxBase64": "base64-encoded-versioned-transaction",
    "priceDisplay": "0.5 SOL",
    "expiresAt": "2026-01-31T12:01:00Z"
  },
  "requestId": "req_stu901"
}
```

**Fields:**
- `purchaseId`: UUID for tracking this purchase
- `status`: Initial status (`"reserved"`)
- `unsignedTxBase64`: Serialized V0 VersionedTransaction (standard base64)
- `priceDisplay`: Human-readable price string
- `expiresAt`: Blockhash expiry (~60s from now)

**Error Response (400, sold out):**
```json
{
  "success": false,
  "data": {
    "status": "sold_out"
  },
  "error": {
    "code": "SOLD_OUT",
    "message": "This edition is sold out."
  },
  "requestId": "req_vwx234"
}
```

**Error Response (400, insufficient funds):**
```json
{
  "success": false,
  "data": {
    "status": "insufficient_funds"
  },
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Not enough SOL. Required: 0.51 SOL"
  },
  "requestId": "req_yza567"
}
```

---

### POST /api/v1/editions/signature

Submit signed transaction after client signing.

**Authentication:** Not required (uses purchaseId)

**Request:**
```http
POST /api/v1/editions/signature
Content-Type: application/json

{
  "purchaseId": "uuid",
  "txSignature": "solana-transaction-signature-base58"
}
```

**Fields:**
- `purchaseId` (required): UUID from buy response
- `txSignature` (required): On-chain transaction signature (base58)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "submitted"
  },
  "requestId": "req_bcd890"
}
```

**Error Response (400, expired):**
```json
{
  "success": false,
  "error": {
    "code": "TX_EXPIRED_BLOCKHASH",
    "message": "Transaction blockhash expired. Please restart the purchase."
  },
  "requestId": "req_efg123"
}
```

---

### GET /api/v1/editions/purchase/:id/status

Poll for purchase confirmation status.

**Authentication:** Not required (uses purchaseId)

**Request:**
```http
GET /api/v1/editions/purchase/uuid/status
```

**Response (200 OK, pending):**
```json
{
  "success": true,
  "data": {
    "status": "submitted",
    "txSignature": "solana-tx-sig",
    "nftMint": null
  },
  "requestId": "req_hij456"
}
```

**Response (200 OK, confirmed):**
```json
{
  "success": true,
  "data": {
    "status": "confirmed",
    "txSignature": "solana-tx-sig",
    "nftMint": "solana-nft-mint-address"
  },
  "requestId": "req_klm789"
}
```

**Status Values:**

| Status | Meaning | Client Action |
|--------|---------|---------------|
| `reserved` | Unsigned tx created, awaiting signature | Sign and submit |
| `submitted` | Broadcast attempted | Continue polling |
| `awaiting_fulfillment` | Payment confirmed, minting starting | Continue polling |
| `minting` | NFT being minted | Continue polling |
| `master_created` | Collection created, edition next | Continue polling |
| `confirmed` | Complete, NFT minted | Success! |
| `failed` | Permanent failure | Show error, allow retry |
| `abandoned` | Timed out without submission | Allow new purchase |

---

## Tier 4: Posts & Feed

### GET /api/v1/posts

Get paginated feed of posts.

**Authentication:** Optional (affects personalization)

**Request:**
```http
GET /api/v1/posts?tab=for-you&cursor=2026-01-31T12:00:00Z&limit=20
Authorization: Bearer <privy_access_token>
```

**Query Parameters:**
- `tab` (optional): Feed tab (`"for-you"` | `"following"`, default: `"for-you"`)
- `cursor` (optional): Opaque cursor from previous response
- `limit` (optional): Items per page (1-50, default: 20)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "uuid",
        "type": "edition",
        "caption": "Post caption",
        "mediaUrl": "https://...",
        "coverUrl": "https://...",
        "price": "500000000",
        "currency": "SOL",
        "maxSupply": 100,
        "currentSupply": 5,
        "likeCount": 42,
        "commentCount": 7,
        "collectCount": 12,
        "isLiked": true,
        "isCollected": false,
        "user": {
          "id": "uuid",
          "usernameSlug": "artist",
          "displayName": "Artist Name",
          "avatarUrl": "https://..."
        },
        "createdAt": "2026-01-31T10:00:00Z"
      }
    ]
  },
  "meta": {
    "hasMore": true,
    "nextCursor": "2026-01-31T09:30:00Z"
  },
  "requestId": "req_nop012"
}
```

**Pagination Rules:**
- `nextCursor` is opaque - client MUST NOT parse or modify
- When `hasMore` is `false`, no more pages exist
- Empty results with `hasMore: false` = terminal state

---

### GET /api/v1/posts/:id

Get single post by ID.

**Authentication:** Optional (affects isLiked/isCollected)

**Request:**
```http
GET /api/v1/posts/uuid
Authorization: Bearer <privy_access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "post": {
      "id": "uuid",
      "type": "edition",
      "caption": "Post caption with #hashtags and @mentions",
      "mediaUrl": "https://...",
      "coverUrl": "https://...",
      "price": "500000000",
      "currency": "SOL",
      "maxSupply": 100,
      "currentSupply": 5,
      "nftName": "Edition Name",
      "nftDescription": "Edition description",
      "likeCount": 42,
      "commentCount": 7,
      "collectCount": 12,
      "isLiked": true,
      "isCollected": false,
      "isPurchased": false,
      "user": {
        "id": "uuid",
        "usernameSlug": "artist",
        "displayName": "Artist Name",
        "avatarUrl": "https://...",
        "bio": "Artist bio"
      },
      "assets": [
        {
          "id": "uuid",
          "url": "https://...",
          "mimeType": "image/jpeg",
          "role": "media",
          "sortOrder": 0
        }
      ],
      "createdAt": "2026-01-31T10:00:00Z"
    }
  },
  "requestId": "req_qrs345"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Post not found"
  },
  "requestId": "req_tuv678"
}
```

---

## Appendix: Transaction Signing Flow

### Android Client Implementation

```kotlin
suspend fun purchaseEdition(postId: String): PurchaseResult {
    while (true) {
        // 1. Get fresh unsigned transaction
        val buyResult = api.buyEdition(postId)
        val expiresAt = Instant.parse(buyResult.expiresAt)

        // 2. Check if we have time to sign (10s safety margin)
        if (Instant.now() > expiresAt.minusSeconds(10)) {
            continue // Transaction already stale, get a new one
        }

        // 3. Sign with Privy embedded wallet
        val signedTx = privy.signTransaction(buyResult.unsignedTxBase64)

        // 4. Broadcast transaction (client-side via RPC)
        val txSignature = solanaRpc.sendTransaction(signedTx)

        // 5. Submit signature to backend
        val submitResult = api.submitSignature(buyResult.purchaseId, txSignature)

        when (submitResult.error?.code) {
            "TX_EXPIRED_BLOCKHASH" -> continue  // Restart with fresh tx
            null -> {
                // 6. Poll for confirmation
                return pollForConfirmation(buyResult.purchaseId)
            }
            else -> return PurchaseResult.Failed(submitResult.error.message)
        }
    }
}
```

### Base64 Encoding Rules

| Field | Format | Notes |
|-------|--------|-------|
| `unsignedTxBase64` | Standard base64 (RFC 4648) | NOT URL-safe base64 |
| Android encoding | `Base64.NO_WRAP` | Avoid newlines in output |

---

## Changelog

### v1.0.0 (2026-01-31)
- Initial API contract for Android MVP
- Tier 1: Health and version endpoints
- Tier 2: Authentication endpoints
- Tier 3: Edition purchase flow
- Tier 4: Posts and feed (planned)
