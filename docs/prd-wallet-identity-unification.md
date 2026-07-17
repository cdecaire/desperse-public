# PRD: Unify wallet-address abbreviation into one canonical helper

Status: proposed — queued for Hermes. Separate from the onboarding re-trigger work (which will *consume* this).

## Context / why
Wallet-address abbreviation is derived ad-hoc in ~8 places with **inconsistent formats** — two ellipsis styles (ASCII `...` vs unicode `…`) and two prefix lengths (4 vs 6). Most critically, the **three signup paths disagree** on the `displayName` they store for wallet-only users, which makes any "is this the auto-generated default name?" comparison brittle. This is a consistency/correctness refactor, not a feature.

## Current state
Signup identity derivation — the part that matters, because this value is **persisted** as `users.displayName` / `users.usernameSlug`:
- `src/server/functions/auth.ts:26-39` — `formatWalletIdentifier()` → `display: '${p}…${s}'` (unicode), `slugBase: '${p}-${s}'`
- `src/server/utils/auth-standalone.ts:29-39` — **duplicate copy** of the same helper
- `src/server/utils/siws.ts:440-443` — **inline, divergent**: `abbreviated = '${p}...${s}'` (ASCII dots)

Display-only truncations (cosmetic, not persisted), for reference: `src/components/echoes/EchoesWalletButton.tsx`, `src/components/forms/CreatePostForm.tsx`, `src/routes/post/$postId.tsx`, `src/routes/verify/$sessionId.tsx`, `src/routes/settings/account/storage-credits.tsx` (6-char prefix), `src/routes/settings/account/wallets.tsx` (6-char prefix).

## Goal
One canonical, shared helper; all **signup paths** produce identical identity strings; a reusable "is default" detector for downstream consumers.

## Scope A — required (signup identity)
1. Create `src/lib/wallet-identity.ts` (in `lib` so both server signup and client code can import it):
   - `formatWalletIdentifier(address: string): { slugBase: string; display: string }`
     - `slugBase = '${address.slice(0,4)}-${address.slice(-4)}'`
     - `display  = '${address.slice(0,4)}…${address.slice(-4)}'` — **standardize on unicode `…`** (already used by 2 of 3 paths; nicer for a display name)
     - Preserve the existing empty/short-address guard (`{ slugBase: 'user', display: 'user' }` for empty input).
   - `isWalletDefaultDisplayName(name: string | null | undefined, address: string | null | undefined): boolean` — true if `name` equals the wallet abbreviation in **either** `…` **or** legacy `...` form. Tolerant so it still recognizes already-stored ASCII rows; downstream onboarding work will consume this.
2. Replace the duplicated `formatWalletIdentifier` in `auth.ts` and `auth-standalone.ts` with the import.
3. Update `siws.ts` to use `formatWalletIdentifier(...).display` for `displayName` (unifies it to `…`) and `.slugBase` for the slug input to `generateUniqueSlug`.
4. Unit tests for both helpers, incl. the dual-format tolerance and the empty-address guard.

## Scope B — optional stretch (display-only cleanup)
Consolidate the cosmetic `truncateAddress`/inline truncations onto a shared `abbreviateAddress(address, { prefix = 4 })` in the same module. **Open decision for the assignee/PM:** standardize display truncation on a 4- or 6-char prefix (currently mixed). If unsure, leave Scope B out — it is pure hygiene and can ship separately.

## Non-goals
- **No data migration.** Existing `...`-format `displayName` rows stay as-is; `isWalletDefaultDisplayName` handles both. Note: dev DB == prod DB (shared, no sandbox) — do **not** write a migration for this.
- **Not** the onboarding re-trigger / stricter-completeness change — that is a separate task that will *consume* `isWalletDefaultDisplayName`.
- Do not change slug-uniqueness behavior (`generateUniqueSlug` collision suffixes stay).

## Acceptance criteria
- All three signup paths import the single canonical helper; no duplicated/inline abbreviation logic remains in `auth.ts` / `auth-standalone.ts` / `siws.ts`.
- A new wallet-only signup persists `displayName = '${p}…${s}'` and `usernameSlug` derived from `'${p}-${s}'` across every path.
- `pnpm vitest` green (new tests included), `npx tsc --noEmit` clean, `pnpm build` succeeds.

## Verification notes (repo norms)
- Run `npx tsc --noEmit` + `pnpm test` + `pnpm build` locally — Vercel CI does not run tsc, so a green check is not type-clean on its own.
- No migration → `db:check` N/A. This touches the signup/auth path — verify a wallet signup still creates a user correctly.
