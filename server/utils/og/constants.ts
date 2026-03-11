/** OG image generation constants */

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

// Brand colors (zinc dark theme + purple-heart accent — matches src/styles.css dark mode)
export const COLORS = {
	bg: "#09090b", // zinc-950
	bgSubtle: "#18181b", // zinc-900
	accent: "#a213ff", // purple-heart-600 (--highlight in dark mode)
	accentLight: "#c86fff", // purple-heart-400
	text: "#fafafa", // zinc-50
	textMuted: "#a1a1aa", // zinc-400
	textDim: "#71717a", // zinc-500
	border: "#27272a", // zinc-800
} as const

// Post-type-specific accent colors (matches dark mode --tone-* variables from src/styles.css)
export const TYPE_COLORS = {
	post: { text: "#27e4b8" }, // caribbean-green-400 (--tone-standard)
	collectible: { text: "#947bff" }, // blue-gem-400 (--tone-collectible)
	edition: { text: "#b439ff" }, // purple-heart-500 (--tone-edition)
} as const

// Dot pattern SVG data URI (matches landing page hero: 1px dots, 40px grid)
function buildDotPatternUri(): string {
	const dots: string[] = []
	for (let x = 20; x < OG_WIDTH; x += 40) {
		for (let y = 20; y < OG_HEIGHT; y += 40) {
			dots.push(`<circle cx="${x}" cy="${y}" r="1" fill="${COLORS.textMuted}"/>`)
		}
	}
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">${dots.join("")}</svg>`
	return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
}

export const DOT_PATTERN_URI = buildDotPatternUri()

// Desperse logo SVG path (from Logo.tsx)
export const LOGO_PATH =
	"M237.841 497.826C268.168 493.915 290.894 488.335 314.722 478.948C389.042 449.671 443.371 391.778 463.561 320.347C476.573 274.312 476.111 220.907 462.305 175.021C450.144 134.603 424.171 95.1888 390.847 66.582C373.509 51.6991 357.556 41.3516 334.416 29.9808C302.689 14.3902 276.507 7.08708 232.16 1.45806C227.42 0.856436 191.01 0.502448 112.671 0.296378L0 0V250V500L112.671 499.719C222.301 499.445 225.68 499.394 237.841 497.826ZM23.4811 449.187V424.572L196.503 251.571L369.526 78.5699L372.422 80.7653C374.015 81.9727 379.75 87.3003 385.166 92.6043L395.013 102.248L209.247 288.025L23.4811 473.801V449.187ZM23.4811 367.769V342.776L171.171 195.104L318.862 47.4325L325.503 50.6948C333.115 54.4344 350.701 64.5299 350.701 65.1605C350.701 65.3927 277.077 139.198 187.091 229.172L23.4811 392.762V367.769ZM23.4811 286.731V261.737L140.344 144.89L257.206 28.0434L262.799 29.2199C275.371 31.8642 296.165 37.7264 296.165 38.6264C296.165 38.8732 234.811 100.421 159.823 175.399L23.4811 311.724V286.731ZM23.4811 205.313V180.698L102.566 101.625L181.652 22.5514L202.74 23.0471C214.338 23.3197 224.937 23.7995 226.293 24.1132L228.759 24.6836L126.12 127.306L23.4811 229.928V205.313ZM23.4811 124.273V99.6572L61.9354 61.213L100.39 22.7687L124.806 22.9687L149.223 23.1688L86.352 86.0285L23.4811 148.888V124.273ZM23.4811 46.2685V22.7901H47.147H70.8128L47.3409 46.2685C34.4313 59.1816 23.7817 69.7468 23.675 69.7468C23.5684 69.7468 23.4811 59.1816 23.4811 46.2685Z"
