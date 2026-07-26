# SKR Tip Payment Integrity Contract

Date: 2026-07-26
Status: implementation-ready security contract

## Goal

A tip is creditable only after Desperse proves that the exact wallet authenticated and selected at preparation paid the exact prepared SKR amount to the recipient wallet captured at preparation, in one confirmed Solana transaction. A transaction signature can credit at most one tip.

Current release blockers are in `src/server/utils/tips-internal.ts`: preparation accepts an unverified client wallet, does not persist payment endpoints, and confirmation marks a row confirmed without reading the transaction. `tips.tx_signature` also has only a non-unique index.

## Non-negotiable invariants

1. Client input and `user_wallets` membership are not identity proof. `fromUserId` and `privyId` come from `withAuth`; the requested sender must be a Solana wallet in that Privy user's server-fetched linked accounts.
2. Payment intent is immutable after the unsigned transaction is built. Confirmation never re-resolves either user's current wallet.
3. `pending` means uncredited. A pending row may have a submitted signature while RPC visibility or verification is outstanding.
4. Persist and uniquely reserve the signature before any RPC verification. Never verify first and persist later.
5. Only a successful verification transition may set `status = confirmed` and `confirmed_at`.
6. Every credit-bearing query must require both `status = confirmed` and `verification_version = 1`.
7. Missing or incomplete RPC data never relaxes an assertion. It produces a retry or a terminal unverifiable failure.

## Prepared payment snapshot

Extend `tips` in `src/server/db/schema.ts`. New preparation writes `verification_version = 1` and the following immutable values:

| Column | Meaning |
| --- | --- |
| `from_wallet_address` | Canonical base58 sender wallet selected by the authenticated user |
| `to_wallet_address` | Canonical base58 recipient destination resolved at preparation |
| `source_token_account` | Expected sender SKR ATA returned by the transaction builder |
| `destination_token_account` | Expected recipient SKR ATA returned by the builder |
| `token_mint` | Existing raw mint snapshot, fixed to `SKR_MINT` |
| `token_program` | SPL program used by the builder, fixed to `TOKEN_PROGRAM_ID` for this version |
| `token_decimals` | `SKR_DECIMALS`, currently 6 |
| `amount` | Existing exact raw bigint amount |
| `prepared_blockhash` | Blockhash embedded in the prepared message |
| `last_valid_block_height` | Expiry boundary returned with that blockhash |
| `prepared_message_hash` | SHA-256 of the exact serialized v0 message bytes returned for signing |

Add lifecycle fields: `verification_version integer NOT NULL DEFAULT 0`, `signature_submitted_at`, `verification_claim_key`, `verification_claimed_at`, `verification_attempts integer NOT NULL DEFAULT 0`, `incomplete_observation_count integer NOT NULL DEFAULT 0`, `first_incomplete_at`, `next_verification_at`, `last_verification_code`, and `failed_at`.

Database columns used only by version 1 may remain nullable for legacy rows. Add a check constraint requiring every immutable snapshot field when `verification_version = 1`. Application code must never update snapshot fields after insert.

### Sender identity decision

`walletAddress` may remain in the prepare request only as a wallet selection. The authoritative ownership source is `PrivyClient.getUser(auth.privyId)` on the server. Accept the requested address only when:

- it is a valid canonical Solana address, and
- the server-fetched Privy user contains an exact linked account with `type = wallet`, `chainType = solana`, and that canonical address.

`user_wallets` and `users.wallet_address` are preference/cache data only. They are not acceptable fallbacks because the current wallet-management endpoints can insert addresses without a possession proof. Otherwise return `wallet_not_verified`. Do not use an arbitrary request value or silently switch to another wallet. Persist the Privy-verified value and build the transaction for it. If Privy cannot return linked accounts, fail closed and do not prepare a tip.

Confirmation supplies a second possession proof: the prepared sender must be a required signer of the exact prepared message that lands on-chain. Both the authenticated Privy link and the transaction signature are required.

### Recipient decision

Resolve the recipient once, before building the transaction:

1. Load the recipient's `privyId` and preferred primary address.
2. Fetch that Privy user server-side and build its canonical linked Solana-address set.
3. Use the preferred address only if it belongs to that set. If it does not, use the Privy embedded Solana wallet when exactly one exists; otherwise return `recipient_wallet_unverified` and require the recipient to select a verified primary wallet.

Do not silently use an unproven `user_wallets` or legacy address as a payment destination. Persist the resolved destination before returning the transaction. A later primary-wallet change does not alter or invalidate this tip. A new tip uses the new verified wallet.

`buildTipTransaction` should return the source ATA, destination ATA, and SHA-256 message hash in addition to its current transaction, blockhash, and last-valid-height values. Hash `VersionedTransaction.message.serialize()`, not the unsigned transaction envelope whose placeholder signatures differ from the confirmed transaction. Preparation persists exactly those values.

### Amount decision

Use raw bigint units as the contract. Accept at most six fractional digits and reject values that cannot be represented exactly instead of relying on rounding. Keep existing product minimum/maximum policy unchanged. Persist decimals even though SKR currently has a constant value so a future mint/program change cannot reinterpret old rows.

### Existing pending rows

Preparation may auto-fail an unsigned pending row only after its prepared blockhash is past `last_valid_block_height + 150`. Before then return `tip_in_progress`; the client may resume that prepared intent. It must not cancel or replace a pending row that already has a signature; that row is owned by reconciliation. Return `confirmation_pending` for an existing submitted tip to the same recipient.

## Confirmation assertion algorithm

Implement a pure verifier in a new server-only helper, for example `src/server/utils/tip-payment-verifier.ts`. Use `getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 })`. Query the configured primary and fallback RPC independently when the first result is null; null is a visibility result, not an exception.

A transaction is valid only when all checks pass in this order:

1. The transaction exists at `confirmed` or `finalized` commitment. If `meta.err` is non-null, return `transaction_failed`.
2. Reconstruct the complete account-key list, including loaded address-table keys. If the message, keys, instructions, or token-balance arrays needed below cannot be reconstructed, classify the response as incomplete rather than guessing.
3. The prepared sender is account key 0 (fee payer) and is within the message header's required-signer range. Otherwise return `sender_mismatch`.
4. Normalize all outer and inner instructions. Recognize `Transfer` and `TransferChecked` instructions from both supported SPL token program IDs so a transfer over the prepared accounts under the wrong program can be classified. A malformed candidate instruction returns `malformed_transaction`; a candidate under a program other than the snapshot returns `token_program_mismatch`.
5. Partition candidate legs in order: no leg authorized by `from_wallet_address` from `source_token_account` returns `sender_mismatch`; such a source leg with no `destination_token_account` match returns `recipient_mismatch`. Keep only direct legs whose source, destination, authority, and program all equal the prepared snapshot. A `TransferChecked` leg must also name the prepared mint and decimals.
6. Multiple matching direct legs are allowed only between that same prepared account pair. Sum their raw amounts and require the sum to equal the prepared `amount`. Never pair a debit and credit merely because global transaction deltas happen to match, and never aggregate unrelated token accounts.
7. Normalize `preTokenBalances` and `postTokenBalances` by account index. Source pre and post entries and destination post entry are mandatory. Destination pre may be treated as zero only if the exact prepared transaction contains the canonical idempotent ATA-create instruction for `destination_token_account`; otherwise its absence is incomplete data. Required balance entries must include owner, mint, decimals, and program metadata. Missing metadata is incomplete data, not a mismatch.
8. For the prepared source and destination accounts, require exact mint, token program, and decimals. Require source owner `from_wallet_address` and destination owner `to_wallet_address`.
9. Require exact net deltas: source `pre - post == amount` and destination `post - pre == amount`. Extra instructions may exist, but any additional movement through either prepared token account that changes these exact deltas invalidates the tip.
10. Serialize the confirmed v0 message and require its SHA-256 to equal `prepared_message_hash`; also require its recent blockhash to equal `prepared_blockhash`. This binds confirmation to the exact server-prepared message and rejects an otherwise equivalent historical/public transfer. Wallet-added instructions or a replaced blockhash require a new preparation, not relaxed confirmation.

This instruction-plus-balance check handles recipient ATA creation, inner instructions, and split transfer instructions without allowing unrelated debits and credits to be paired. It also prevents an offsetting transfer from hiding a wrong payment.

Stable terminal verifier codes and precedence are: `transaction_failed`; `malformed_transaction`; `sender_mismatch`; `recipient_mismatch`; `token_program_mismatch`; `mint_mismatch`; `decimals_mismatch`; `amount_mismatch`; then `prepared_message_mismatch`. Incomplete data is not a terminal mismatch until the reconciliation threshold below. Evaluate all evidence needed for the highest-priority applicable code, then return the first code in this list. This makes fixtures with several corrupt fields deterministic. User-facing copy may collapse these to “Transaction did not match the prepared tip,” but logs retain the stable code and a truncated signature.

## Atomic signature claim and replay protection

Replace `tips_tx_signature_idx` with:

```sql
CREATE UNIQUE INDEX "tips_tx_signature_unique_idx"
ON "tips" ("tx_signature")
WHERE "tx_signature" IS NOT NULL;
```

The confirmation sequence is:

1. Validate the base58 signature shape before touching the row.
2. The request path may claim only a row whose `tx_signature IS NULL`. Atomically update the owned version-1 row with one `UPDATE ... WHERE ... RETURNING`: require `status = pending`, null signature, and no live claim. In the same statement set `tx_signature`, `signature_submitted_at`, a new random claim key/time, increment attempts, and leave `next_verification_at` null.
3. Only the returned caller performs RPC verification. This write occurs before the first RPC call, so delayed visibility is durable and the unique index closes the cross-tip race.
4. A PostgreSQL `23505` from `tips_tx_signature_unique_idx` maps to `signature_reused`, never a generic 500.
5. Finalize with another conditional update requiring the same row, `status = pending`, signature, and claim key. Valid evidence sets confirmed fields. Retryable evidence clears the claim and schedules the next attempt. Terminal evidence sets failed fields. All three paths use `RETURNING` and only the winner may emit side effects.

After a signature is persisted, browser retries are status reads only and cannot reacquire the claim or bypass backoff. If the initial claim update returns no row, read the row and resolve deterministically:

- same tip already confirmed with the same signature: idempotent `confirmed` success;
- same tip pending with the same signature: `confirmation_pending` success, no credit yet;
- same tip failed with the same signature: return its stored terminal code;
- same tip already has another signature: `signature_mismatch`;
- another tip owns the signature: `signature_reused`;
- wrong authenticated owner: `unauthorized`.

Never replace a persisted signature on a tip.

## Delayed visibility and reconciliation ownership

Application-owned reconciliation is mandatory; the sender's browser and private eligibility lookups are not owners.

Add:

- `src/server/jobs/tip-reconciliation.ts`, exporting a bounded batch runner;
- `server/routes/api/v1/tips/reconcile.get.ts`, protected fail-closed by `CRON_SECRET`;
- a Vercel cron entry running every minute;
- an authenticated tip-status read so a client that receives `confirmation_pending` can poll without attempting another send.

The runner selects at most 50 version-1 pending rows with a non-null signature, no live claim, and either `next_verification_at IS NULL` or a due timestamp, oldest first. This explicit null case recovers a process that crashed after persisting the signature but before scheduling a retry. Each row is claimed with `UPDATE ... WHERE status = pending AND tx_signature = :signature AND (claim is null or stale) AND (next verification is null or due) RETURNING`. A two-minute claim lease allows recovery after a crashed worker. Multiple runner instances are safe.

Backoff after a retryable result is 15 seconds, 30 seconds, 1 minute, 2 minutes, 5 minutes, then 10 minutes capped. Add up to 20 percent jitter in production; inject time/randomness in tests. The one-minute cron may observe a later effective retry, which is acceptable. Log batch counts and each state transition with `[reconcilePendingTips]`; never log full auth data.

Classification:

- RPC timeout, 429/5xx, or provider outage: retry indefinitely at the cap and alert after 30 minutes; an outage is not proof of payment failure.
- Transaction null while its blockhash may still be valid: retry.
- Transaction null from both providers after current block height exceeds `last_valid_block_height + 150`: terminal `transaction_expired`.
- Confirmed transaction with `meta.err`: terminal `transaction_failed`.
- Confirmed, complete transaction that violates an assertion: terminal verifier code immediately.
- Confirmed transaction with persistently incomplete account/instruction/balance data: try both providers; increment `incomplete_observation_count` and set `first_incomplete_at` only when both providers successfully return the same unusable response class. Provider errors do not increment this counter. After 12 such observations spanning at least 30 minutes, terminal `transaction_unverifiable`. Never credit from incomplete data.

Public stats need no denormalized refresh. They converge on the atomic status transition because they are database aggregates. Update every tip-credit read, including `getTipStatsInternal`, `getTotalTipsFromTo`, message eligibility paths, follow/leaderboard eligibility, and transaction-history enrichment, to require `verification_version = 1`. Client polling invalidates `tip-stats` and `dm-eligibility` only after it observes `confirmed`.

User-visible outcomes:

- `confirmed`: success toast, run success callbacks, invalidate credit queries.
- `confirmation_pending`: neutral “Tip sent. Confirmation is still processing.” Do not grant unlocks or show credited totals yet.
- `signature_reused`: “This transaction was already used for another tip.”
- terminal mismatch/failure: “The transaction could not be verified for this tip.”

## Migration and rollout

Follow the repository migration workflow exactly: edit the schema, run `pnpm db:generate`, inspect the generated SQL, apply with `pnpm db:migrate`, then rerun generate and require “No schema changes.” Commit SQL, snapshot, and journal together. Never use `db:push`.

Rollout order:

1. Before creating the unique index, query duplicate non-null signatures. If any exist, export the involved IDs/statuses/signatures for audit, mark every colliding row failed with `last_verification_code = legacy_signature_collision`, and clear `tx_signature`. Do not select an arbitrary winner.
2. Add nullable snapshot/lifecycle columns, defaults, the version-1 completeness check, the due-work index on `(status, next_verification_at)`, and the partial unique signature index.
3. Do not backfill sender/recipient/token-account snapshots from current profiles. Those values are not historical preparation evidence.
4. Existing pending rows are terminally marked `legacy_unverifiable`.
5. Existing confirmed rows remain preserved for audit as `verification_version = 0`, but all credit-bearing reads stop counting them. Historical credit may be restored only by a separate audited on-chain migration with equivalent evidence; it is not part of this release.
6. Deploy the read filters, version-1 prepare/confirm path, status endpoint, and reconciliation runner together. Confirm the cron is authorized and producing bounded summary logs before enabling the tip UI.

This rollout intentionally prefers temporary loss of unverifiable legacy credit over carrying insecure credit into the release.

## Required test matrix

| Case | Expected persistence | User-visible/API outcome |
| --- | --- | --- |
| Valid happy path | Version-1 snapshot unchanged; signature stored once; one pending-to-confirmed transition; `confirmed_at` set | `confirmed`; stats and eligibility include exactly one tip |
| Unverified sender selection | Requested address is absent from the authenticated Privy user's server-fetched linked Solana accounts | No row; `wallet_not_verified` |
| Spoofed sender transaction | Wallet B is prepared but returned transaction evidence debits wallet A | Signature remains on the row for audit; row failed with `sender_mismatch`; no credit |
| Unverified recipient preference | Stored primary is absent from the recipient's Privy-linked set and no unambiguous embedded fallback exists | No row; `recipient_wallet_unverified` |
| Signature reuse under concurrency | Two tips race with one signature; unique index leaves signature on exactly one row; at most one row confirms | Loser receives `signature_reused`; one credit total |
| Same-tip concurrent retry | One verifier owns claim; other request sees same persisted signature and pending/confirmed state | `confirmation_pending` or idempotent `confirmed`, never reused and never double credit |
| Equivalent historical/public transfer | Sender, recipient, mint, and amount match, but message hash/blockhash differs from preparation | Row failed with `prepared_message_mismatch`; no credit |
| Recipient wallet changes after prepare | Snapshot remains old destination; valid tx to old prepared destination confirms even if current primary changed | `confirmed`; recipient user receives credit |
| Payment to newly changed wallet, not snapshot | Exact destination assertion fails; row terminal | `recipient_mismatch`; no credit |
| Delayed RPC visibility | Signature is persisted while row stays pending; retry metadata advances; later runner confirms same row | Initial neutral pending outcome, eventual confirmed stats without browser ownership |
| RPC outage | Row remains pending, claim releases, backoff advances; no confirmed timestamp | Pending message; no premature stats/unlock |
| Expired/dropped signature | After both-provider null plus block-height grace, row becomes failed `transaction_expired` | Failure on status read; no credit |
| Malformed or unrelated transaction | Signature persists for audit; exact assertion fails; row becomes failed with deterministic code | Verification failure; no credit |
| Wrong mint/program/decimals | Row failed with matching stable code | No credit |
| Split matching instructions | Direct legs over the same prepared account pair sum exactly and exact account deltas match | `confirmed` once |
| Unrelated matching global debit/credit | No direct prepared account pair, or prepared account deltas differ | Terminal mismatch; no credit |
| Recipient ATA created in transaction | Missing pre-balance is treated as zero only for the exact destination account; post metadata matches snapshot | `confirmed` |
| Reconciler duplicate runs/crash lease | Conditional claim/finalize permits one transition; stale claim is recoverable after two minutes | No duplicate credit or side effects |
| Crash after signature persistence | Signature and claim are stored, but no next-retry timestamp is written; runner later selects the null timestamp after lease expiry | Neutral pending, then normal convergence; row is not stranded |
| Browser retry during backoff | Status endpoint reads the pending row but does not claim or invoke RPC | Existing schedule is unchanged; neutral pending outcome |
| Legacy confirmed row | Preserved at version 0 and excluded by all credit reads | Not shown in secure totals/eligibility |

The replay/concurrency test must run against PostgreSQL or the generated migration/index, not only mocked Drizzle calls. Pure verifier fixtures must include legacy and v0 transactions, inner instructions, loaded addresses, ATA creation, malformed balance arrays, and exact bigint amounts.

## Implementation sequence and verification

1. Migration and schema contract in `src/server/db/schema.ts` plus generated `drizzle/*` files.
2. Pure transaction verifier and fixture tests.
3. Preparation wallet validation and immutable snapshot persistence in `tips-internal.ts` and `tip-transaction.ts`.
4. Atomic signature claim/finalization and stable result mapping.
5. Durable reconciliation job, cron route, and status endpoint.
6. Version-1 credit filters and pending client behavior.

Required checks:

```bash
pnpm db:generate
# inspect generated SQL; only this contract may appear
pnpm db:migrate
pnpm db:generate              # expected: No schema changes
pnpm routes:generate
pnpm test --run
npx tsc --noEmit
pnpm build
```

Release is blocked if the unique index cannot be created, a version-1 row can exist without its complete snapshot, any test can credit without all assertions, the cron is not demonstrably running, or any confirmed-only read still accepts version-0 tips.
