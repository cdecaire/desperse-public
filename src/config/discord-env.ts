/**
 * Discord verification environment access (server-only).
 *
 * Holds Discord app/bot credentials, the Desperse guild + role IDs, and the
 * settings for the Echoes holder-verification flow. Mirrors echoes-env.ts:
 * never prefix these with VITE_ — the bot token and signing key must never
 * reach the client bundle. Import only from server utils/routes.
 */

import { getEnvVar } from './env'
import { echoesEnv, getEchoesHeliusRpcUrl } from './echoes-env'

/**
 * On-chain Faction trait values, exactly as written in Echoes NFT metadata
 * (`attributes[] where trait_type === "Faction"`). These strings are the keys
 * used to map a held Echo to its Discord faction role — they must match the
 * metadata verbatim.
 */
export const ECHOES_FACTIONS = [
  'Syre Group',
  'Tessera Wardens',
  'The Siphon',
  'The Unwritten',
  'The Witnesses',
] as const

export type EchoesFaction = (typeof ECHOES_FACTIONS)[number]

/** Env var name holding the Discord role ID for each faction. */
const FACTION_ROLE_ENV: Record<EchoesFaction, string> = {
  'Syre Group': 'DISCORD_ROLE_SYRE_GROUP',
  'Tessera Wardens': 'DISCORD_ROLE_TESSERA_WARDENS',
  'The Siphon': 'DISCORD_ROLE_THE_SIPHON',
  'The Unwritten': 'DISCORD_ROLE_THE_UNWRITTEN',
  'The Witnesses': 'DISCORD_ROLE_THE_WITNESSES',
}

function buildFactionRoleMap(): Record<EchoesFaction, string> {
  const map = {} as Record<EchoesFaction, string>
  for (const faction of ECHOES_FACTIONS) {
    map[faction] = getEnvVar(FACTION_ROLE_ENV[faction], '')
  }
  return map
}

export const discordEnv = {
  /** Discord application (client) ID. */
  APP_ID: getEnvVar('DISCORD_APP_ID', ''),
  /** Ed25519 public key used to verify inbound interaction requests. */
  PUBLIC_KEY: getEnvVar('DISCORD_PUBLIC_KEY', ''),
  /** Bot token for REST calls (role grant/revoke, audit messages). Server-only. */
  BOT_TOKEN: getEnvVar('DISCORD_BOT_TOKEN', ''),
  /** Desperse guild (server) ID. */
  GUILD_ID: getEnvVar('DISCORD_GUILD_ID', ''),
  /** Private staff channel ID for the grant/revoke audit log. */
  AUDIT_CHANNEL_ID: getEnvVar('DISCORD_AUDIT_CHANNEL_ID', ''),
  /** Role granted to any verified Echoes holder. */
  ECHOES_HOLDER_ROLE_ID: getEnvVar('DISCORD_ROLE_ECHOES_HOLDER', ''),
  /** Faction value -> Discord role ID. */
  FACTION_ROLE_IDS: buildFactionRoleMap(),
  /** Verification session lifetime (minutes). */
  SESSION_TTL_MINUTES: Number(getEnvVar('DISCORD_VERIFY_SESSION_TTL_MINUTES', '10')),
  /** Consecutive empty re-checks tolerated before roles are revoked (grace window). */
  REVERIFY_GRACE_CYCLES: Number(getEnvVar('DISCORD_VERIFY_REVERIFY_GRACE_CYCLES', '1')),
  /** Max verification links one Discord user can create per minute (spam guard). */
  SESSION_RATE_PER_MIN: Number(getEnvVar('DISCORD_VERIFY_MAX_SESSIONS_PER_MIN', '5')),
  /** Master on/off switch for the verification feature. */
  ENABLED: getEnvVar('DISCORD_VERIFY_ENABLED', 'false') === 'true',
  /**
   * Optional override for the Echoes collection mint to gate on. Falls back to
   * the shared Echoes collection address, so the mainnet cutover at mint is a
   * config change, not a code change.
   */
  COLLECTION_ADDRESS_OVERRIDE: getEnvVar('DISCORD_VERIFY_COLLECTION_ADDRESS', ''),
  /**
   * Base URL the verify link points at (e.g. https://desperse.com). When empty,
   * the interactions endpoint derives it from the inbound request origin.
   */
  VERIFY_BASE_URL: getEnvVar('DISCORD_VERIFY_BASE_URL', ''),
} as const

/** Collection mint that held Echoes must belong to (verified DAS grouping). */
export function getVerifyCollectionAddress(): string {
  return discordEnv.COLLECTION_ADDRESS_OVERRIDE || echoesEnv.PFP_COLLECTION_ADDRESS
}

/** Helius RPC (DAS) endpoint used for the holdings check. */
export function getVerifyHeliusRpcUrl(): string {
  return getEchoesHeliusRpcUrl()
}
