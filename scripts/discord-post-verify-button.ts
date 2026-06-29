/**
 * Post (or refresh) the persistent "Verify Wallet" button in a Discord channel.
 *
 * One-time ops action — run after the bot is in the guild with the Manage Roles
 * permission. The button has custom_id "verify_wallet", which the interactions
 * endpoint (server/routes/api/v1/discord/interactions.post.ts) handles.
 *
 * Usage:
 *   pnpm discord:post-button <channelId>
 *   # or set DISCORD_VERIFY_CHANNEL_ID in .env.local and omit the arg
 */

const API_BASE = 'https://discord.com/api/v10'
const VERIFY_CUSTOM_ID = 'verify_wallet'

async function main() {
	const token = process.env.DISCORD_BOT_TOKEN
	const channelId = process.argv[2] || process.env.DISCORD_VERIFY_CHANNEL_ID

	if (!token) {
		console.error('Missing DISCORD_BOT_TOKEN in environment (.env.local).')
		process.exit(1)
	}
	if (!channelId) {
		console.error(
			'Usage: pnpm discord:post-button <channelId>  (or set DISCORD_VERIFY_CHANNEL_ID)',
		)
		process.exit(1)
	}

	const body = {
		content: [
			'**Verify your Echoes holdings**',
			'',
			'Click below to prove you hold an Echo and receive your Holder + faction roles.',
			'You only sign a message — never a transaction. No funds move.',
		].join('\n'),
		components: [
			{
				type: 1, // action row
				components: [
					{
						type: 2, // button
						style: 1, // primary
						label: 'Verify Wallet',
						custom_id: VERIFY_CUSTOM_ID,
					},
				],
			},
		],
	}

	const res = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
		method: 'POST',
		headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})

	if (!res.ok) {
		console.error(`Failed: ${res.status} ${res.statusText}`)
		console.error(await res.text())
		process.exit(1)
	}

	const msg = (await res.json()) as { id?: string }
	console.log(`Posted Verify button to channel ${channelId} (message ${msg.id}).`)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
