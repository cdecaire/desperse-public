# Scripts

Utility scripts for inspecting Solana/Bubblegum data and debugging.

## Available Scripts

### Build

- `build.js` - Windows build wrapper that suppresses harmless symlink errors

### Blockchain Inspection (Read-only)

- `check-account-owner.js` - Check what program owns an account
- `check-asset-id.js` - Extract asset ID from a cNFT mint transaction
- `check-tx-accounts.js` - Check transaction accounts and identify addresses
- `check-platform-balance.ts` - Check platform wallet balance
- `inspect-edition-mints.ts` - Inspect edition minting model (checks SPL mint, metadata, master edition)

### Database Inspection (Read-only)

- `check-purchase-duplicates.ts` - Check for duplicate purchases and supply issues
- `list-purchases.ts` - List purchases for debugging

## Usage

```bash
# TypeScript scripts
pnpm tsx scripts/<script-name>.ts [args]

# JavaScript scripts
node scripts/<script-name>.js [args]
```

## Sensitive Scripts

Admin operations, key management, and database mutation scripts are in `scripts-internal/` (gitignored).
