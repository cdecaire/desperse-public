# Wallet Balance Fetching — Migration to Helius Wallet API

## Previous Approach (4+ API calls)

The wallet overview previously made multiple separate calls per wallet:

1. **`getBalance`** (Helius RPC) — SOL balance only
2. **`getTokenAccountsByOwner`** (Helius RPC) — USDC balance only
3. **`getAssetsByOwner`** (Helius DAS/RPC) — Token discovery, metadata, icons, price info
4. **`getAssetsByOwner`** again (Helius DAS/RPC) — NFTs (with `showFungible: false`)

**Problem**: The DAS API has indexing lag for some tokens (notably SKR/Seeker), returning 0 balance or missing them entirely. SOL and USDC had dedicated direct RPC calls, but everything else relied on DAS.

---

## New Approach: Helius Wallet API v1 (1 call + fallback)

**Endpoint**: `GET https://api.helius.xyz/v1/wallet/{address}/balances`

**Docs**: https://www.helius.dev/docs/wallet-api/balances

### Primary Call

```
GET https://api.helius.xyz/v1/wallet/{address}/balances?api-key={API_KEY}&showNfts=true&showZeroBalance=false
```

**Query Parameters:**

| Parameter         | Value   | Purpose                            |
| ----------------- | ------- | ---------------------------------- |
| `showNfts`        | `true`  | Include NFTs in the same response  |
| `showZeroBalance` | `false` | Exclude empty token accounts       |

**Response shape:**

```json
{
  "balances": [
    {
      "mint": "So11111111111111111111111111111111111111112",
      "symbol": "SOL",
      "name": "Solana",
      "balance": 3.598,
      "decimals": 9,
      "pricePerToken": 84.97,
      "usdValue": 305.78,
      "logoUri": "https://...",
      "tokenProgram": "spl-token"
    }
  ],
  "nfts": [
    {
      "mint": "...",
      "name": "NFT Name",
      "imageUri": "https://...",
      "collectionName": "Collection",
      "collectionAddress": "...",
      "compressed": false
    }
  ],
  "totalUsdValue": 1073.25,
  "pagination": { "page": 1, "limit": 100, "hasMore": false }
}
```

This single call replaces `getBalance` + `getTokenAccountsByOwner` + both `getAssetsByOwner` calls.

### RPC Fallback for Missing App Tokens

The Wallet API uses DAS under the hood for token discovery, so some tokens (like SKR) may not appear. For any **app tokens** not returned in `balances`, do a direct RPC call:

```
POST https://mainnet.helius-rpc.com/?api-key={API_KEY}

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getTokenAccountsByOwner",
  "params": [
    "{walletAddress}",
    { "mint": "{tokenMintAddress}" },
    { "encoding": "jsonParsed" }
  ]
}
```

Parse the balance from `result.value[].account.data.parsed.info.tokenAmount`:

- `amount` — raw integer balance
- `decimals` — number of decimal places
- Human-readable balance = `amount / 10^decimals`

### Supplementary: CoinGecko for 24h Price Change

The Wallet API's `pricePerToken` updates hourly (from DAS). For real-time prices and 24h change percentages on key tokens, we still call CoinGecko:

```
GET https://api.coingecko.com/api/v3/simple/price?ids=solana,usd-coin,seeker&vs_currencies=usd&include_24hr_change=true
```

For app tokens, prefer the CoinGecko price over the Wallet API price. Use CoinGecko's `usd_24h_change` for the change percentage badge.

---

## Token Constants

| Token        | Mint Address                                        | Decimals | CoinGecko ID |
| ------------ | --------------------------------------------------- | -------- | ------------ |
| SOL          | `So11111111111111111111111111111111111111112`        | 9        | `solana`     |
| USDC         | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`    | 6        | `usd-coin`   |
| SKR (Seeker) | `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`     | **6**    | `seeker`     |

**Important**: SKR has 6 decimals, not 9. This was a bug we fixed — it caused transaction failures.

---

## Summary of Call Flow

```
┌─────────────────────────────────────────────────┐
│  1. Helius Wallet API (balances + NFTs)         │
│     GET /v1/wallet/{addr}/balances              │
│     → All token balances, USD values, metadata  │
│     → NFTs with showNfts=true                   │
├─────────────────────────────────────────────────┤
│  2. RPC Fallback (only for missing app tokens)  │
│     POST getTokenAccountsByOwner                │
│     → SKR, USDC if not in step 1               │
├─────────────────────────────────────────────────┤
│  3. CoinGecko (24h price change)                │
│     GET /api/v3/simple/price                    │
│     → Real-time prices + changePct24h           │
├─────────────────────────────────────────────────┤
│  4. Merge                                       │
│     → Wallet API for metadata/icons/discovery   │
│     → RPC for accurate app token balances       │
│     → CoinGecko for price change badges         │
└─────────────────────────────────────────────────┘
```

Steps 1, 2, and 3 can all run in parallel.
