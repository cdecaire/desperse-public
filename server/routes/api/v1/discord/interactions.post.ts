/**
 * Discord interactions endpoint.
 * POST /api/v1/discord/interactions
 *
 * Discord delivers all interactions (button clicks, slash commands) here as
 * Ed25519-signed HTTP requests — no gateway connection required. We verify the
 * signature against the raw body, answer the PING handshake, and turn a
 * "Verify Wallet" button click into a one-time verification session + ephemeral
 * link the member opens to sign.
 */

import {
	defineEventHandler,
	readRawBody,
	getHeader,
	setResponseStatus,
	getRequestURL,
} from 'h3'
import { discordEnv } from '@/config/discord-env'
import {
	verifyInteractionSignature,
	InteractionType,
	ephemeralResponse,
	pongResponse,
} from '@/server/utils/discord/interactions'
import { createVerificationSession } from '@/server/utils/verification/sessions'

/** custom_id of the persistent "Verify Wallet" button. */
const VERIFY_CUSTOM_ID = 'verify_wallet'

interface DiscordInteraction {
	type: number
	data?: { custom_id?: string }
	member?: { user?: { id?: string } }
	user?: { id?: string }
}

export default defineEventHandler(async (event) => {
	const signature = getHeader(event, 'x-signature-ed25519')
	const timestamp = getHeader(event, 'x-signature-timestamp')
	// readRawBody defaults to utf8 -> string; we need the raw body for signature verify.
	const bodyStr = (await readRawBody(event)) || ''

	// 1. Verify Discord's request signature over the raw body
	if (
		!signature ||
		!timestamp ||
		!(await verifyInteractionSignature({ rawBody: bodyStr, signature, timestamp }))
	) {
		setResponseStatus(event, 401)
		return 'invalid request signature'
	}

	let interaction: DiscordInteraction
	try {
		interaction = JSON.parse(bodyStr)
	} catch {
		setResponseStatus(event, 400)
		return 'invalid body'
	}

	// 2. PING handshake
	if (interaction.type === InteractionType.PING) {
		return pongResponse
	}

	// 3. "Verify Wallet" button
	if (
		interaction.type === InteractionType.MESSAGE_COMPONENT &&
		interaction.data?.custom_id === VERIFY_CUSTOM_ID
	) {
		const discordUserId = interaction.member?.user?.id ?? interaction.user?.id
		if (!discordUserId) {
			return ephemeralResponse('Could not identify your Discord account. Please try again.')
		}

		if (!discordEnv.ENABLED) {
			return ephemeralResponse('Verification is not enabled yet. Please check back soon.')
		}

		try {
			const session = await createVerificationSession(discordUserId)
			const base = discordEnv.VERIFY_BASE_URL || getRequestURL(event).origin
			const link = `${base}/verify/${session.id}`
			return ephemeralResponse(
				[
					'**Verify your Echoes holdings**',
					'',
					'Open your one-time link below and sign with the wallet that holds your Echo:',
					link,
					'',
					`This link expires in ${discordEnv.SESSION_TTL_MINUTES} minutes. We will NEVER DM you a verify link or ask you to approve a transaction.`,
				].join('\n'),
			)
		} catch (err) {
			console.error(
				'[discordInteractions] session create failed:',
				err instanceof Error ? err.message : err,
			)
			return ephemeralResponse(
				'Something went wrong creating your verification link. Please try again.',
			)
		}
	}

	// 4. Anything else we don't handle yet
	return ephemeralResponse('Unsupported interaction.')
})
