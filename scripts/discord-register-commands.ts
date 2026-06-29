/**
 * Register (overwrite) the Echoes admin slash commands for the guild.
 *
 * Guild commands update instantly (global ones take ~1h), so this targets the
 * single Desperse guild. Re-run any time the command set changes.
 *
 * Usage: pnpm discord:register
 */

export {} // standalone script — make it a module so top-level names don't collide

const API_BASE = 'https://discord.com/api/v10'
const MANAGE_ROLES = '268435456' // default_member_permissions: staff-only

// Option types: 3 = STRING, 6 = USER
const commands = [
	{
		name: 'verify-status',
		description: "Show a member's Echoes verification status",
		default_member_permissions: MANAGE_ROLES,
		options: [{ type: 6, name: 'user', description: 'Member to look up', required: true }],
	},
	{
		name: 'force-recheck',
		description: "Re-check a member's Echoes holdings now",
		default_member_permissions: MANAGE_ROLES,
		options: [{ type: 6, name: 'user', description: 'Member to re-check', required: true }],
	},
	{
		name: 'unlink',
		description: "Unlink a member's wallet(s) and remove Echoes roles",
		default_member_permissions: MANAGE_ROLES,
		options: [
			{ type: 6, name: 'user', description: 'Member', required: true },
			{ type: 3, name: 'wallet', description: 'Specific wallet (omit to unlink all)', required: false },
		],
	},
	{
		name: 'stats',
		description: 'Echoes verification stats',
		default_member_permissions: MANAGE_ROLES,
	},
]

async function main() {
	const token = process.env.DISCORD_BOT_TOKEN
	const appId = process.env.DISCORD_APP_ID
	const guildId = process.env.DISCORD_GUILD_ID
	if (!token || !appId || !guildId) {
		console.error('Missing DISCORD_BOT_TOKEN / DISCORD_APP_ID / DISCORD_GUILD_ID in .env.local')
		process.exit(1)
	}

	const res = await fetch(`${API_BASE}/applications/${appId}/guilds/${guildId}/commands`, {
		method: 'PUT',
		headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify(commands),
	})

	if (!res.ok) {
		console.error(`Failed: ${res.status} ${res.statusText}`)
		console.error(await res.text())
		process.exit(1)
	}

	const registered = (await res.json()) as Array<{ name: string }>
	console.log(
		`Registered ${registered.length} guild command(s): ${registered.map((c) => '/' + c.name).join(', ')}`,
	)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
