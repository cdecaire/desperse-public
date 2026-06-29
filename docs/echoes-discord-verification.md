# Echoes Discord Holder Verification

Self-hosted Discord verification for the Echoes collection. A member proves they
own an Echo (Solana) by signing a message — **never a transaction** — and the bot
grants the **Echoes Holder** role plus their **faction** role(s).

Runs entirely inside this app on Vercel: Discord **HTTP interactions** (no gateway
bot), Discord **REST** for role grants, **Helius DAS** for holdings, and the shared
Neon DB. No extra hosting.

## Architecture

```
Discord "Verify Wallet" button
   └─(signed interaction)─> POST /api/v1/discord/interactions  (Nitro, Ed25519-verified)
                                └─ creates a one-time session → ephemeral link
desperse.com/verify/<sessionId>  (Privy connect + signMessage, nonce-bound)
   └─ submitVerification (server fn)
        └─ verify signature → link wallet to account → Helius DAS holdings
           → reconcile Discord roles (REST) → audit log
Re-verification (P3): Vercel cron → re-check proven wallets → revoke if sold
```

**Role gating is signature-proven only.** Roles depend on wallets a user proved
control of via `signMessage` (table `discord_verified_wallets`), never on unproven
`userWallets` links. Holdings are the union across a user's proven wallets.

## Key files

| Area | Path |
|---|---|
| Config (env) | `src/config/discord-env.ts` |
| DB tables | `src/server/db/schema.ts` (`discord_*`) + migration `drizzle/0041_*.sql` |
| Interaction verify / responses | `src/server/utils/discord/interactions.ts` |
| Discord REST (roles, audit) | `src/server/utils/discord/rest.ts` |
| Role reconcile (holder + factions) | `src/server/utils/discord/roles.ts` |
| Sessions / holdings / orchestration | `src/server/utils/verification/{sessions,holdings,verify}.ts` |
| Interactions endpoint | `server/routes/api/v1/discord/interactions.post.ts` |
| Server fns | `src/server/functions/verification.ts` |
| Verify page | `src/routes/verify/$sessionId.tsx` |
| Button poster (ops) | `scripts/discord-post-verify-button.ts` (`pnpm discord:post-button <channelId>`) |

## Environment variables

Set in Vercel (and `.env.local` for local testing). None are `VITE_`-prefixed —
the bot token / signing key must never reach the client.

| Var | Purpose |
|---|---|
| `DISCORD_APP_ID` | Discord application (client) ID |
| `DISCORD_PUBLIC_KEY` | Ed25519 public key — verifies inbound interactions |
| `DISCORD_BOT_TOKEN` | Bot token for REST (role grant/revoke, audit) |
| `DISCORD_GUILD_ID` | Desperse guild ID |
| `DISCORD_AUDIT_CHANNEL_ID` | Staff channel for the grant/revoke audit log |
| `DISCORD_ROLE_ECHOES_HOLDER` | Role ID for the Echoes Holder role |
| `DISCORD_ROLE_SYRE_GROUP` | Role ID — faction "Syre Group" |
| `DISCORD_ROLE_TESSERA_WARDENS` | Role ID — faction "Tessera Wardens" |
| `DISCORD_ROLE_THE_SIPHON` | Role ID — faction "The Siphon" |
| `DISCORD_ROLE_THE_UNWRITTEN` | Role ID — faction "The Unwritten" |
| `DISCORD_ROLE_THE_WITNESSES` | Role ID — faction "The Witnesses" |
| `DISCORD_VERIFY_ENABLED` | `true` to enable the Verify button |
| `DISCORD_VERIFY_SESSION_TTL_MINUTES` | Link lifetime (default 10) |
| `DISCORD_VERIFY_REVERIFY_GRACE_CYCLES` | Empty re-checks before revoke (default 1; P3) |
| `DISCORD_VERIFY_BASE_URL` | Verify link origin (default: request origin) |
| `DISCORD_VERIFY_COLLECTION_ADDRESS` | Override Echoes collection mint (else `PFP_COLLECTION_ADDRESS`) |
| `DISCORD_VERIFY_CHANNEL_ID` | (optional) default channel for `discord:post-button` |

Reused from Echoes: `PFP_COLLECTION_ADDRESS`, `ECHOES_HELIUS_API_KEY` (devnet DAS).

## Discord Developer Portal setup

1. **Create the application** at <https://discord.com/developers/applications>.
   Copy **Application ID** → `DISCORD_APP_ID` and **Public Key** → `DISCORD_PUBLIC_KEY`.
2. **Bot** tab → add a bot → copy **token** → `DISCORD_BOT_TOKEN`. Keep it secret.
3. **Interactions Endpoint URL**: set to `https://desperse.com/api/v1/discord/interactions`.
   Discord sends a signed PING to validate it — the endpoint must be deployed and
   `DISCORD_PUBLIC_KEY` set first, or validation fails.
4. **Install / invite** the bot to the guild with the **Manage Roles** permission
   only (scope `bot`). In **Server Settings → Roles**, drag the bot's role **above**
   the Echoes Holder + all five faction roles (it can only manage roles below it).
5. Copy the **Guild ID**, the six **role IDs**, and the **audit channel ID**
   (enable Developer Mode → right-click → Copy ID) into the env vars.
6. Set `DISCORD_VERIFY_ENABLED=true`, deploy, then post the button:
   `pnpm discord:post-button <verifyChannelId>`.

## Manual verification (devnet)

Pre-launch, Echoes lives on devnet; the bot reads it via `ECHOES_HELIUS_API_KEY`.

1. Ensure a devnet test wallet holds an Echo from `PFP_COLLECTION_ADDRESS`.
2. In Discord, click **Verify Wallet** → confirm you get an ephemeral link to
   `…/verify/<id>` that expires in `SESSION_TTL_MINUTES`.
3. Open the link, sign in (Privy → silent Desperse account), connect/select the
   wallet holding the Echo, click **Sign & verify** (approve the *message* — no tx).
4. Confirm: the page shows success + factions; the **Echoes Holder** + faction
   roles appear in Discord; a line posts to the audit channel; `discord_links`,
   `discord_verified_wallets`, `discord_member_roles`, `discord_audit_log` have rows.
5. Negative checks: reusing the same link fails (single-use); a wallet with no Echo
   reports "no Echo found"; a wallet already linked to another Discord user is
   rejected.

## Status

- **Done (P1+P2):** interactions endpoint, one-time sessions, verify page, signature
  verification, account/wallet linking, DAS holdings, Echoes Holder + faction role
  assignment, audit log, button poster.
- **Next (P3):** scheduled re-verification + revocation (Vercel cron → re-check
  proven wallets, `emptyCycles` grace, DM nudge).
- **Then (P4):** admin slash commands (`/verify-status`, `/force-recheck`,
  `/unlink`, `/stats`).
- **Hardening (P5):** rate limits on the endpoints, escrow/staking edge handling.
- **Mainnet cutover (P6):** point `DISCORD_VERIFY_COLLECTION_ADDRESS` + RPC at the
  mainnet collection at mint.
```
