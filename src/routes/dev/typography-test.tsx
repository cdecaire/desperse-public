/**
 * Development route — Desperse Design System
 * Route: /dev/typography-test
 *
 * The single source of truth for visual and written language across Desperse.
 * Every spec on this page maps to a token, utility, or principle that lives in
 * the codebase. If something on a real surface conflicts with this page, the
 * page is right and the surface is drifting.
 *
 * Sections:
 *   1. Brand
 *   2. Voice & Tone
 *   3. Color
 *   4. Typography
 *   5. Spacing
 *   6. Radii
 *   7. Elevation
 *   8. Motion
 *   9. Iconography
 *  10. Writing
 *  11. Patterns
 */

import { createFileRoute } from '@tanstack/react-router'
import { Card } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { useTheme } from '@/components/providers/ThemeProvider'

export const Route = createFileRoute('/dev/typography-test')({
	component: DesignSystemPage,
})

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

function Section({
	id,
	eyebrow,
	title,
	subtitle,
	children,
}: {
	id: string
	eyebrow?: string
	title: string
	subtitle?: string
	children: React.ReactNode
}) {
	return (
		<section id={id} className="mt-16 md:mt-20 lg:mt-24 first:mt-0 scroll-mt-24 lg:scroll-mt-8">
			<header className="mb-8 max-w-2xl">
				{eyebrow && (
					<p className="text-label-xs text-muted-foreground mb-3">{eyebrow}</p>
				)}
				<h2 className="text-heading-1">{title}</h2>
				{subtitle && (
					<p className="text-body-lg text-muted-foreground mt-3">{subtitle}</p>
				)}
			</header>
			{children}
		</section>
	)
}

function Subsection({
	title,
	subtitle,
	children,
}: {
	title: string
	subtitle?: string
	children: React.ReactNode
}) {
	return (
		<div className="mt-10 md:mt-12 first:mt-0">
			<header className="mb-5 max-w-2xl">
				<h3 className="text-heading-3">{title}</h3>
				{subtitle && (
					<p className="text-body-md text-muted-foreground mt-2">{subtitle}</p>
				)}
			</header>
			{children}
		</div>
	)
}

function Rule({ children }: { children: React.ReactNode }) {
	return (
		<li className="flex gap-3">
			<Icon
				name="check"
				variant="regular"
				className="text-(--caribbean-green-600) dark:text-(--caribbean-green-400) mt-1 shrink-0"
			/>
			<span className="text-body-md">{children}</span>
		</li>
	)
}

function Anti({ children }: { children: React.ReactNode }) {
	return (
		<li className="flex gap-3">
			<Icon
				name="xmark"
				variant="regular"
				className="text-(--torch-red-600) dark:text-(--torch-red-400) mt-1 shrink-0"
			/>
			<span className="text-body-md">{children}</span>
		</li>
	)
}

function Code({ children }: { children: React.ReactNode }) {
	return (
		<code className="text-mono-sm bg-muted px-1.5 py-0.5 rounded normal-case">
			{children}
		</code>
	)
}

// ---------------------------------------------------------------------------
// 1. Brand
// ---------------------------------------------------------------------------

const principles = [
	{
		title: 'Content over chrome',
		body: "The creator's work is the interface. Minimize UI that competes with media. Navigation, controls, and metadata support — they never overshadow.",
	},
	{
		title: 'Speed is a feature',
		body: 'Every interaction should feel instant. Prefer skeleton states over spinners. Reduce clicks to complete actions. Perceived performance matters as much as real performance.',
	},
	{
		title: 'Progressive disclosure',
		body: 'Show the essential, reveal the advanced. Blockchain complexity (minting, transactions, wallets) is abstracted behind familiar patterns until the user needs detail.',
	},
	{
		title: 'Earned density',
		body: 'Start sparse, allow density. Feeds are generous; settings and admin views can be compact. Match information density to user intent.',
	},
	{
		title: 'Systematic consistency',
		body: 'Use the design tokens. Every new element should feel like it was always part of the family. When in doubt, use what already exists.',
	},
]

const brandReferences = [
	{ name: 'Zora · Foundation', desc: 'Art-forward, Web3-native' },
	{ name: 'SuperRare · Exchange.Art', desc: 'Premium collectible feel' },
	{ name: 'Linear · Vercel', desc: 'Developer-grade polish and speed' },
	{ name: 'Instagram · TikTok', desc: 'Proven content-first social patterns' },
]

const antiPatterns = [
	'Overly playful or bubbly UI',
	'Excessive animations and easter eggs',
	'Neon glow effects',
	'Busy dashboards with floating widgets',
	'"Web3 for Web3\'s sake" — wallet jargon, hex addresses in faces, blockchain-first UX',
]

function BrandSection() {
	return (
		<Section
			id="brand"
			eyebrow="01"
			title="Brand"
			subtitle="Desperse is a content-first platform for crypto-native creators. The product is the artwork — our job is to disappear behind it."
		>
			<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
				<Card className="p-5 md:p-6">
					<p className="text-label-xs text-muted-foreground mb-3">Personality</p>
					<p className="text-heading-3">Minimal. Focused. Sharp.</p>
					<p className="text-body-md text-muted-foreground mt-3">
						Confidence comes from restraint. We use silence as a design element.
					</p>
				</Card>
				<Card className="p-6">
					<p className="text-label-xs text-muted-foreground mb-3">Audience</p>
					<p className="text-heading-3">Crypto-native creators</p>
					<p className="text-body-md text-muted-foreground mt-3">
						They live in Web3. They expect speed, precision, and respect for their time.
					</p>
				</Card>
				<Card className="p-6">
					<p className="text-label-xs text-muted-foreground mb-3">Aesthetic</p>
					<p className="text-heading-3">Dark by default</p>
					<p className="text-body-md text-muted-foreground mt-3">
						Zinc-950 base, purple-heart accent. Subtle shadows. Tight radius. No glow.
					</p>
				</Card>
			</div>

			<Subsection
				title="Principles"
				subtitle="Five rules that resolve disagreements about a design. When something feels wrong, it's usually because one of these is being violated."
			>
				<ol className="space-y-5">
					{principles.map((p, i) => (
						<li key={p.title} className="flex gap-5">
							<span className="text-mono-md text-muted-foreground shrink-0 w-8 pt-0.5">
								{String(i + 1).padStart(2, '0')}
							</span>
							<div>
								<p className="text-title-lg">{p.title}</p>
								<p className="text-body-md text-muted-foreground mt-1 max-w-2xl">
									{p.body}
								</p>
							</div>
						</li>
					))}
				</ol>
			</Subsection>

			<Subsection title="References & Anti-patterns">
				<div className="grid md:grid-cols-2 gap-4 md:gap-6">
					<Card className="p-6">
						<p className="text-label-xs text-muted-foreground mb-4">In the family</p>
						<ul className="space-y-3">
							{brandReferences.map((r) => (
								<li key={r.name} className="flex items-baseline justify-between gap-4">
									<span className="text-title-sm">{r.name}</span>
									<span className="text-body-sm text-muted-foreground text-right">
										{r.desc}
									</span>
								</li>
							))}
						</ul>
					</Card>
					<Card className="p-6">
						<p className="text-label-xs text-muted-foreground mb-4">Not us</p>
						<ul className="space-y-3">
							{antiPatterns.map((a) => (
								<Anti key={a}>{a}</Anti>
							))}
						</ul>
					</Card>
				</div>
			</Subsection>
		</Section>
	)
}

// ---------------------------------------------------------------------------
// 2. Voice & Tone
// ---------------------------------------------------------------------------

const voiceTraits = [
	{
		we: 'Direct',
		not: 'Curt',
		body: 'Get to the point. Lead with the verb. Skip "Please" and "Kindly."',
	},
	{
		we: 'Plain',
		not: 'Dumbed down',
		body: 'Use everyday words for everyday actions. Use precise words for precise things.',
	},
	{
		we: 'Confident',
		not: 'Cocky',
		body: 'State what is, not what we think might be. No "We believe" or "We hope."',
	},
	{
		we: 'Quiet',
		not: 'Cold',
		body: 'Warmth lives in the verbs and the silence around them, not in exclamation marks.',
	},
]

const tonePairs = [
	{
		ctx: 'Success',
		bad: '🎉 Awesome! Your post was successfully published to the platform!',
		good: 'Posted.',
	},
	{
		ctx: 'Error · recoverable',
		bad: 'Oops! Something went wrong. Please try again later or contact support.',
		good: "Couldn't reach the network. Try again.",
	},
	{
		ctx: 'Error · user-caused',
		bad: 'Invalid input. The data you entered does not meet the requirements.',
		good: 'Username must be 3–20 characters, letters and numbers only.',
	},
	{
		ctx: 'Empty state',
		bad: "It looks like there's nothing here yet. Why not create something?",
		good: 'No posts yet. Create your first.',
	},
	{
		ctx: 'Confirmation',
		bad: 'Are you absolutely sure you want to permanently delete this post?',
		good: 'Delete this post? This is permanent.',
	},
]

function VoiceSection() {
	return (
		<Section
			id="voice"
			eyebrow="02"
			title="Voice & Tone"
			subtitle="Voice is who we are. Tone is how we sound in a moment. Voice is constant; tone shifts to match the user's situation."
		>
			<Subsection title="Voice traits">
				<div className="grid sm:grid-cols-2 gap-4">
					{voiceTraits.map((t) => (
						<Card key={t.we} className="p-5">
							<div className="flex items-baseline gap-2 mb-2">
								<span className="text-title-lg">We are {t.we.toLowerCase()}.</span>
								<span className="text-body-sm text-muted-foreground">
									Not {t.not.toLowerCase()}.
								</span>
							</div>
							<p className="text-body-md text-muted-foreground">{t.body}</p>
						</Card>
					))}
				</div>
			</Subsection>

			<Subsection
				title="Tone in context"
				subtitle="The voice doesn't change. The volume does. Match the user's emotional state — celebrate quietly, apologize precisely, instruct directly."
			>
				<Card className="p-0 overflow-hidden">
					<div className="hidden md:grid grid-cols-12 border-b border-border bg-muted/40 px-5 py-3">
						<div className="col-span-3 text-label-md text-muted-foreground">
							Context
						</div>
						<div className="col-span-4 text-label-md text-muted-foreground">
							Off-brand
						</div>
						<div className="col-span-5 text-label-md text-muted-foreground">
							On-brand
						</div>
					</div>
					{tonePairs.map((p, i) => (
						<div
							key={p.ctx}
							className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-0 px-4 py-4 md:px-5 ${
								i < tonePairs.length - 1 ? 'border-b border-border' : ''
							}`}
						>
							<div className="md:col-span-3 text-title-sm">{p.ctx}</div>
							<div className="md:col-span-4 text-body-sm text-muted-foreground line-through decoration-(--torch-red-500)/40">
								<span className="md:hidden text-label-xs not-line-through decoration-transparent text-muted-foreground/70 mr-2 align-middle">Off</span>
								{p.bad}
							</div>
							<div className="md:col-span-5 text-body-md">
								<span className="md:hidden text-label-xs text-muted-foreground/70 mr-2">On</span>
								{p.good}
							</div>
						</div>
					))}
				</Card>
			</Subsection>

			<Subsection title="Mechanics">
				<div className="grid md:grid-cols-2 gap-4 md:gap-6">
					<Card className="p-6">
						<p className="text-label-xs text-muted-foreground mb-4">Do</p>
						<ul className="space-y-3">
							<Rule>Sentence case for buttons, labels, and titles ("Create post").</Rule>
							<Rule>Title case for proper nouns and product names only ("Solana", "Desperse").</Rule>
							<Rule>Oxford comma. Em dashes for asides — like this.</Rule>
							<Rule>Numerals for everything (12, not twelve). Currency right-aligned.</Rule>
							<Rule>Verbs over nouns. "Collect," not "Collection."</Rule>
						</ul>
					</Card>
					<Card className="p-6">
						<p className="text-label-xs text-muted-foreground mb-4">Don't</p>
						<ul className="space-y-3">
							<Anti>ALL CAPS for emphasis. Use weight or color instead.</Anti>
							<Anti>Exclamation marks. The product earns excitement; the copy doesn't.</Anti>
							<Anti>Emoji in product surfaces. They belong to the user, not the UI.</Anti>
							<Anti>"Please." Polite is warm; "please" is filler.</Anti>
							<Anti>Wallet/blockchain jargon when a plain word works ("collect" not "mint" in feed).</Anti>
						</ul>
					</Card>
				</div>
			</Subsection>
		</Section>
	)
}

// ---------------------------------------------------------------------------
// 3. Color
// ---------------------------------------------------------------------------

const semanticTokens = [
	{ name: 'background', desc: 'App canvas' },
	{ name: 'foreground', desc: 'Default text on canvas' },
	{ name: 'card', desc: 'Surface raised above canvas' },
	{ name: 'card-foreground', desc: 'Text on card' },
	{ name: 'muted', desc: 'Subtle background fill' },
	{ name: 'muted-foreground', desc: 'Secondary text, hints, captions' },
	{ name: 'border', desc: 'Default 1px divider' },
	{ name: 'input', desc: 'Form control surface' },
	{ name: 'ring', desc: 'Focus ring' },
	{ name: 'primary', desc: 'High-emphasis action' },
	{ name: 'primary-foreground', desc: 'Text on primary' },
	{ name: 'secondary', desc: 'Low-emphasis surface' },
	{ name: 'accent', desc: 'Hover/selected fill' },
	{ name: 'destructive', desc: 'Irreversible action' },
	{ name: 'destructive-foreground', desc: 'Text on destructive' },
]

const palettes = [
	{ name: 'zinc', desc: 'Neutral. Background, text, borders. Hue 264°, near-zero chroma.', accent: 950, hue: 264 },
	{ name: 'purple-heart', desc: 'Edition / brand accent. Magenta-purple, hue 309°.', accent: 700, hue: 309 },
	{ name: 'blue-gem', desc: 'Collectible tone. Violet-blue, hue 285°.', accent: 600, hue: 285 },
	{ name: 'caribbean-green', desc: 'Standard tone / success. Teal-green, hue 173°. 600 darkened for AA.', accent: 600, hue: 173 },
	{ name: 'flush-orange', desc: 'Warning. Amber-orange, hue 52°. Use 700 for body text on white.', accent: 700, hue: 52 },
	{ name: 'azure-radiance', desc: 'Info. Sky-blue, hue 250°.', accent: 600, hue: 250 },
	{ name: 'torch-red', desc: 'Destructive. Red, hue 22°. 600 darkened for AA.', accent: 600, hue: 22 },
] as const

const ramp = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

const tones = [
	{ name: 'tone-standard', label: 'Standard post', surface: 'caribbean-green' },
	{ name: 'tone-collectible', label: 'Collectible', surface: 'blue-gem' },
	{ name: 'tone-edition', label: 'Edition', surface: 'purple-heart' },
	{ name: 'tone-warning', label: 'Warning', surface: 'flush-orange' },
	{ name: 'tone-info', label: 'Info', surface: 'azure-radiance' },
]

const darkTones = [
	{ name: 'tone-edition-dark', label: 'Edition · dark', oklch: 'oklch(62% 0.295 318)', note: 'Electric magenta. Fill-tuned for the brand glow.' },
	{ name: 'tone-collectible-dark', label: 'Collectible · dark', oklch: 'oklch(72% 0.225 285)', note: 'Saturated violet, the cooler sibling.' },
	{ name: 'tone-standard-dark', label: 'Standard · dark', oklch: 'oklch(78% 0.205 168)', note: 'Vivid mint — alive, not forest.' },
	{ name: 'tone-info-dark', label: 'Info · dark', oklch: 'oklch(76% 0.165 235)', note: 'Clean cyan-blue, distinctly not violet.' },
	{ name: 'tone-warning-dark', label: 'Warning · dark', oklch: 'oklch(82% 0.165 65)', note: 'Warm amber, never yellow.' },
	{ name: 'highlight-dark', label: 'Highlight · dark', oklch: 'oklch(70% 0.285 318)', note: 'Edition family, alpha-tuned for fills and overlays.' },
	{ name: 'destructive-dark', label: 'Destructive · dark', oklch: 'oklch(68% 0.225 25)', note: 'Threaded between two contrast walls.' },
]

function SemanticSwatch({ name, desc }: { name: string; desc: string }) {
	const bg = `var(--${name})`
	const isText = name.endsWith('foreground')
	const isBorder = name === 'border' || name === 'input' || name === 'ring'
	return (
		<div className="flex items-center gap-4 py-3 border-b border-border last:border-b-0">
			{isText ? (
				<div className="w-20 h-12 rounded-md bg-card border border-border flex items-center justify-center">
					<span className="text-title-sm" style={{ color: bg }}>
						Aa
					</span>
				</div>
			) : isBorder ? (
				<div
					className="w-20 h-12 rounded-md bg-background"
					style={{ border: `2px solid ${bg}` }}
				/>
			) : (
				<div
					className="w-20 h-12 rounded-md border border-border/50"
					style={{ background: bg }}
				/>
			)}
			<div className="min-w-0 flex-1">
				<p className="text-title-sm">{name}</p>
				<p className="text-body-sm text-muted-foreground">{desc}</p>
			</div>
			<Code>--{name}</Code>
		</div>
	)
}

function PaletteRamp({ name }: { name: (typeof palettes)[number]['name'] }) {
	return (
		<div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5 sm:gap-1">
			{ramp.map((step) => (
				<div key={step} className="flex flex-col gap-1.5">
					<div
						className="aspect-square rounded-md border border-border/30"
						style={{ background: `var(--${name}-${step})` }}
					/>
					<span className="text-mono-sm text-muted-foreground text-center">{step}</span>
				</div>
			))}
		</div>
	)
}

function ColorSection() {
	return (
		<Section
			id="color"
			eyebrow="03"
			title="Color"
			subtitle="Three layers: semantic tokens (use these in components), palette ramps (use these to extend), and tone tokens (use these for post types). Colors are authored in OKLCH for perceptual uniformity, gamut control, and dark-mode vibrancy."
		>
			<Card className="p-6 bg-muted/30 border-dashed mb-8">
				<p className="text-label-xs text-muted-foreground mb-2">Why OKLCH</p>
				<p className="text-body-md">
					OKLCH separates lightness, chroma, and hue along axes that match how
					eyes work. The same chroma value reads as the same vibrancy regardless
					of hue — meaning we can build ramps that step evenly, lock hue across a
					palette, and push saturation safely without leaving the sRGB gamut.
				</p>
			</Card>
			<Subsection
				title="Semantic tokens"
				subtitle="The default vocabulary. If you reach for a hex value or a palette step in a component, you're probably missing a semantic token."
			>
				<Card className="p-2 px-5">
					{semanticTokens.map((t) => (
						<SemanticSwatch key={t.name} name={t.name} desc={t.desc} />
					))}
				</Card>
			</Subsection>

			<Subsection
				title="Palette ramps"
				subtitle="11 stops per color. Use 50–100 for fills, 200–400 for hover/disabled, 500–700 for the brand-grade hue, 800–950 for emphasis on light backgrounds."
			>
				<div className="space-y-8">
					{palettes.map((p) => (
						<div key={p.name}>
							<div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 sm:gap-4 mb-3">
								<div className="min-w-0">
									<p className="text-title-lg">{p.name}</p>
									<p className="text-body-sm text-muted-foreground">{p.desc}</p>
								</div>
								<Code>--{p.name}-{p.accent} (anchor)</Code>
							</div>
							<PaletteRamp name={p.name} />
						</div>
					))}
				</div>
			</Subsection>

			<Subsection
				title="Tone system"
				subtitle="Post types and feedback states each map to one of the named palettes. Don't apply ramps directly; reach for the tone token so the meaning travels with the color. Active values switch automatically with the theme — what you see below reflects the current mode."
			>
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
					{tones.map((t) => (
						<Card key={t.name} className="p-4 sm:p-5">
							<div
								className="h-14 sm:h-16 rounded-md mb-3"
								style={{ background: `var(--${t.name})` }}
							/>
							<p className="text-title-sm">{t.label}</p>
							<p className="text-mono-sm text-muted-foreground mt-1">--{t.name}</p>
						</Card>
					))}
				</div>
			</Subsection>

			<Subsection
				title="Dark-tuned tones"
				subtitle="Dark mode uses dedicated, boosted-chroma values rather than reusing the light-mode ramp. The dark canvas tolerates — and benefits from — more saturation. These tokens are always defined; they activate via the .dark class. Edition leans pinker and more electric than its light-mode counterpart by design."
			>
				<div className="rounded-lg overflow-hidden bg-(--zinc-950) p-4 sm:p-6">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
						{darkTones.map((t) => (
							<div
								key={t.name}
								className="rounded-md p-4"
								style={{
									background: 'oklch(20% 0.005 264)',
									border: '1px solid oklch(30% 0.005 264)',
								}}
							>
								<div
									className="h-14 rounded mb-3"
									style={{ background: `var(--${t.name})` }}
								/>
								<p className="text-title-sm" style={{ color: 'oklch(95% 0.005 264)' }}>
									{t.label}
								</p>
								<p
									className="text-mono-sm mt-1"
									style={{ color: 'oklch(70% 0.005 264)' }}
								>
									{t.oklch}
								</p>
								<p
									className="text-body-sm mt-2"
									style={{ color: 'oklch(75% 0.005 264)' }}
								>
									{t.note}
								</p>
							</div>
						))}
					</div>
				</div>
			</Subsection>

			<Subsection title="Accessibility">
				<Card className="p-6">
					<ul className="space-y-3">
						<Rule>All semantic foreground/background pairs clear WCAG AA (4.5:1 body, 3:1 large text and UI).</Rule>
						<Rule>Light-mode tone-warning uses flush-orange-700 because 600 cannot pass AA body-text on white in sRGB. Use 700 for text; 600 is fine for icons and large text.</Rule>
						<Rule>Caribbean-green and torch-red have their 600 step deliberately darkened (45% L and 53% L respectively) so the tone token clears AA on white.</Rule>
						<Rule>Dark-mode tones target 5:1 to 9:1 against the canvas — comfortable headroom rather than spec-minimum.</Rule>
						<Rule>Destructive on dark is threaded carefully: 5.1:1 against canvas, 3.1:1 reverse (white-on-fill). Drops to AA-Large only if reverse contrast becomes a problem; use bold weight or larger size.</Rule>
					</ul>
				</Card>
			</Subsection>

			<Subsection title="Rules">
				<Card className="p-6">
					<ul className="space-y-3">
						<Rule>Components use semantic tokens (<Code>bg-card</Code>, <Code>text-muted-foreground</Code>). Palette steps appear only in <Code>styles.css</Code> and the rare editorial illustration.</Rule>
						<Rule>Brand accent is purple-heart-700 in light, the dedicated edition-dark token in dark. Used for highlights and selected states — never for body text.</Rule>
						<Rule>Destructive is torch-red-600 in light, destructive-dark in dark. Reserved for irreversible actions (delete, leave, revoke).</Rule>
						<Rule>Pair tone backgrounds with tone-foreground equivalents. Don't mix palettes (no purple bg with green text).</Rule>
						<Anti>Don't write <Code>oklch()</Code> values inline in components. The seven palettes and their tone tokens cover every case — extend the system if you need a new value.</Anti>
					</ul>
				</Card>
			</Subsection>

			<Subsection title="Future · Display-P3">
				<Card className="p-6 bg-muted/30 border-dashed">
					<p className="text-body-md">
						The most saturated tokens (<Code>--tone-edition-dark</Code>,{' '}
						<Code>--highlight-dark</Code>) are clamped at the sRGB magenta boundary
						around C ≈ 0.295. In Display-P3 the same hue reaches C ≈ 0.36 — the
						difference between "saturated magenta" and "fluorescent." A future{' '}
						<Code>@media (color-gamut: p3)</Code> override pass can unlock that
						headroom on capable displays. The greens, blues, and amber have sRGB
						headroom already; no P3 gain there.
					</p>
				</Card>
			</Subsection>
		</Section>
	)
}

// ---------------------------------------------------------------------------
// 4. Typography
// ---------------------------------------------------------------------------

type TypeSpec = {
	name: string
	cls: string
	size: string
	weight: number
	lineHeight: string
	tracking: string
	use: string
	sample?: string
}

function SpecRow({ spec }: { spec: TypeSpec }) {
	return (
		<div className="grid grid-cols-12 gap-4 items-baseline py-5 border-b border-border last:border-b-0">
			<div className="col-span-12 md:col-span-3">
				<p className="text-title-sm">{spec.name}</p>
				<code className="text-mono-sm text-muted-foreground normal-case">{spec.cls}</code>
				<p className="text-caption text-muted-foreground mt-1">{spec.use}</p>
			</div>
			<div className={`col-span-12 md:col-span-6 ${spec.cls}`}>
				{spec.sample ?? "The quick brown fox jumps over the lazy dog"}
			</div>
			<div className="col-span-12 md:col-span-3 text-mono-sm text-muted-foreground space-y-0.5 normal-case">
				<div>size {spec.size}</div>
				<div>weight {spec.weight}</div>
				<div>leading {spec.lineHeight}</div>
				<div>tracking {spec.tracking}</div>
			</div>
		</div>
	)
}

const display: TypeSpec[] = [
	{
		name: 'Display 4XL',
		cls: 'text-display-4xl',
		size: 'clamp(4.5rem, 12vw, 12rem)',
		weight: 800,
		lineHeight: '0.9',
		tracking: '-0.05em',
		use: 'Editorial wordmark — closing/opening flourish on marketing only',
		sample: 'Desperse.',
	},
	{
		name: 'Display 3XL',
		cls: 'text-display-3xl',
		size: '6rem',
		weight: 700,
		lineHeight: '0.95',
		tracking: '-0.045em',
		use: 'Marketing section openers (replaces text-5xl md:text-7xl)',
		sample: 'What Desperse is.',
	},
	{
		name: 'Display 2XL',
		cls: 'text-display-2xl',
		size: '4.5rem',
		weight: 700,
		lineHeight: '1.0',
		tracking: '-0.04em',
		use: 'Marketing hero — one per page max',
		sample: 'Permanent art.',
	},
	{
		name: 'Display XL',
		cls: 'text-display-xl',
		size: '3.75rem',
		weight: 700,
		lineHeight: '1.05',
		tracking: '-0.035em',
		use: 'Landing-page section openers',
		sample: 'Built for collectors.',
	},
	{
		name: 'Display LG',
		cls: 'text-display-lg',
		size: '3rem',
		weight: 700,
		lineHeight: '1.1',
		tracking: '-0.03em',
		use: 'Feature page hero (Echoes, Preservation)',
		sample: 'Preserve the work.',
	},
]

const heading: TypeSpec[] = [
	{ name: 'Heading 1', cls: 'text-heading-1', size: '2.25rem', weight: 600, lineHeight: '1.15', tracking: '-0.025em', use: 'Top-level page title (one per route)', sample: 'Discover new work' },
	{ name: 'Heading 2', cls: 'text-heading-2', size: '1.75rem', weight: 600, lineHeight: '1.2', tracking: '-0.02em', use: 'Major section title within a page', sample: 'Recently collected' },
	{ name: 'Heading 3', cls: 'text-heading-3', size: '1.375rem', weight: 600, lineHeight: '1.25', tracking: '-0.015em', use: 'Subsection title', sample: 'Pricing & royalties' },
	{ name: 'Heading 4', cls: 'text-heading-4', size: '1.125rem', weight: 600, lineHeight: '1.3', tracking: '-0.01em', use: 'Tertiary subsection / settings group', sample: 'Notification preferences' },
]

const title: TypeSpec[] = [
	{ name: 'Title LG', cls: 'text-title-lg', size: '1rem', weight: 600, lineHeight: '1.4', tracking: '-0.01em', use: 'Card titles, modal headers, post titles in feed', sample: 'Untitled (gold rush)' },
	{ name: 'Title SM', cls: 'text-title-sm', size: '0.875rem', weight: 600, lineHeight: '1.4', tracking: '-0.005em', use: 'Compact card titles, list-row titles, sidebar items', sample: 'Edition #042' },
]

const body: TypeSpec[] = [
	{ name: 'Body LG', cls: 'text-body-lg', size: '1.0625rem', weight: 400, lineHeight: '1.6', tracking: '-0.005em', use: 'Long-form reading (about, terms, post body)', sample: "Desperse is a content-first platform. Every pixel should serve the creator's work, and the interface should recede so the art advances." },
	{ name: 'Body MD', cls: 'text-body-md', size: '0.9375rem', weight: 400, lineHeight: '1.55', tracking: '-0.005em', use: 'Default UI prose, comments, descriptions', sample: 'Built on Solana. cNFT editions for accessible drops, Core editions for premium series. Storage on Arweave for permanence.' },
	{ name: 'Body SM', cls: 'text-body-sm', size: '0.8125rem', weight: 400, lineHeight: '1.5', tracking: '0', use: 'Secondary prose, helper text, dense lists', sample: 'You can change this later from the privacy settings. Existing followers will not be removed.' },
]

const label: TypeSpec[] = [
	{ name: 'Label LG', cls: 'text-label-lg', size: '0.875rem', weight: 600, lineHeight: '1.25', tracking: '-0.005em', use: 'Buttons, primary form labels, tabs', sample: 'Collect edition' },
	{ name: 'Label MD', cls: 'text-label-md', size: '0.75rem', weight: 600, lineHeight: '1.2', tracking: '0', use: 'Compact controls, badges, metadata labels', sample: '12 collectors' },
	{ name: 'Label XS', cls: 'text-label-xs', size: '0.6875rem', weight: 600, lineHeight: '1.2', tracking: '0.06em', use: 'Eyebrow labels, section dividers (auto UPPERCASE)', sample: 'Trending now' },
	{ name: 'Caption', cls: 'text-caption', size: '0.75rem', weight: 400, lineHeight: '1.4', tracking: '0', use: 'Timestamps, helper captions, image attribution', sample: 'Posted 2 hours ago · 14 likes' },
]

const mono: TypeSpec[] = [
	{ name: 'Mono MD', cls: 'text-mono-md', size: '0.8125rem', weight: 400, lineHeight: '1.5', tracking: '0', use: 'Code blocks, full hashes', sample: '5J7s...8xQp · 0xab12cd34ef' },
	{ name: 'Mono SM', cls: 'text-mono-sm', size: '0.6875rem', weight: 500, lineHeight: '1.2', tracking: '0.02em', use: 'Inline addresses, IDs, technical pills', sample: 'tx_5J7s8xQp' },
]

function TypographySection() {
	return (
		<Section
			id="typography"
			eyebrow="04"
			title="Typography"
			subtitle="Six tiers — Display, Heading, Title, Body, Label, Mono. Each utility bundles size, weight, line-height, and tracking. Compose with color and margin; don't override the four paired properties individually."
		>
			<Card className="p-6 bg-muted/30 border-dashed">
				<h3 className="text-heading-4 mb-3">Foundations</h3>
				<dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
					{[
						['Sans', 'Figtree (300–900)'],
						['Mono', 'DM Mono (300–500)'],
						['Base size', '14px desktop / 16px mobile'],
						['Scale ratio', '1.200 (Minor Third)'],
						['Default body weight', '400 (regular)'],
						['Default heading weight', '600 (semibold)'],
						['OpenType features', 'kern · liga · calt'],
						['Mono numerics', 'tabular-nums (always)'],
					].map(([k, v]) => (
						<div
							key={k}
							className="flex justify-between border-b border-border/60 py-1.5 text-body-sm"
						>
							<dt className="text-muted-foreground">{k}</dt>
							<dd className="text-title-sm">{v}</dd>
						</div>
					))}
				</dl>
			</Card>

			<Subsection title="Display" subtitle="Marketing only. Reserved for landing pages, feature reveals, and brand moments. Never use in product surfaces.">
				{display.map((s) => (
					<SpecRow key={s.name} spec={s} />
				))}
			</Subsection>

			<Subsection title="Heading" subtitle="Maps to semantic h1–h4. One Heading 1 per route. Anything below h4 should be a Title, not a Heading.">
				{heading.map((s) => (
					<SpecRow key={s.name} spec={s} />
				))}
			</Subsection>

			<Subsection title="Title" subtitle="Repeating UI primitives — card titles, modal headers, list-row titles. Not page hierarchy; they sit inside Headings.">
				{title.map((s) => (
					<SpecRow key={s.name} spec={s} />
				))}
			</Subsection>

			<Subsection title="Body" subtitle="Reading text. Body LG for long-form, Body MD for default UI, Body SM for dense secondary content.">
				{body.map((s) => (
					<SpecRow key={s.name} spec={s} />
				))}
			</Subsection>

			<Subsection title="Label" subtitle="Functional UI text. Tighter than body; never wraps to a third line. Caption is the only non-semibold label.">
				{label.map((s) => (
					<SpecRow key={s.name} spec={s} />
				))}
			</Subsection>

			<Subsection title="Mono" subtitle="DM Mono. For code, addresses, hashes, and IDs. Never for prose.">
				{mono.map((s) => (
					<SpecRow key={s.name} spec={s} />
				))}
			</Subsection>

			<Subsection
				title="Vertical rhythm"
				subtitle="Margins between blocks are tied to the heading tier above, not the content below — consistent breathing room regardless of what follows."
			>
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b border-border text-left">
								<th className="py-3 pr-4 text-label-lg">Element</th>
								<th className="py-3 pr-4 text-label-lg">Top</th>
								<th className="py-3 pr-4 text-label-lg">Bottom</th>
								<th className="py-3 text-label-lg">Notes</th>
							</tr>
						</thead>
						<tbody>
							{[
								['Display', '0', 'mb-6', 'Hero owns its own spacing'],
								['Heading 1', '0', 'mb-4', 'One per route, top of page'],
								['Heading 2 (mid-doc)', 'mt-12', 'mb-3', 'First H2 in a section: mt-0'],
								['Heading 3', 'mt-8', 'mb-2', '—'],
								['Heading 4', 'mt-6', 'mb-2', '—'],
								['Title (in card)', '0', 'mb-1.5', 'Subtitle/body sits tight beneath'],
								['Paragraph (Body)', '0', 'mb-4', 'Last child: mb-0'],
								['List (ul/ol)', '0', 'mb-4', 'Items: mb-1'],
								['Eyebrow / Label XS', '0', 'mb-3', 'Above its parent heading'],
								['Hr / divider', 'my-8', '—', 'Major section break'],
							].map(([el, top, bot, note]) => (
								<tr key={el} className="border-b border-border/60 last:border-b-0">
									<td className="py-2.5 pr-4 text-body-sm">{el}</td>
									<td className="py-2.5 pr-4 text-mono-sm normal-case">{top}</td>
									<td className="py-2.5 pr-4 text-mono-sm normal-case">{bot}</td>
									<td className="py-2.5 text-body-sm text-muted-foreground">{note}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Subsection>
		</Section>
	)
}

// ---------------------------------------------------------------------------
// 5. Spacing
// ---------------------------------------------------------------------------

const spacingScale = [
	{ token: '0.5', px: '2px', use: 'Hairline gap, icon-text micro-pad' },
	{ token: '1', px: '4px', use: 'Tight icon-text gap' },
	{ token: '1.5', px: '6px', use: 'Subtitle-to-meta gap' },
	{ token: '2', px: '8px', use: 'Default chip/badge padding' },
	{ token: '3', px: '12px', use: 'Comfortable inline gap' },
	{ token: '4', px: '16px', use: 'Card padding (mobile), section gap' },
	{ token: '6', px: '24px', use: 'Card padding (desktop), block gap' },
	{ token: '8', px: '32px', use: 'Major section gap' },
	{ token: '12', px: '48px', use: 'Page section gap' },
	{ token: '16', px: '64px', use: 'Hero / marketing section gap' },
	{ token: '24', px: '96px', use: 'Marketing block separation' },
]

function SpacingSection() {
	return (
		<Section
			id="spacing"
			eyebrow="05"
			title="Spacing"
			subtitle="Built on a 4px grid (with 8px as the dominant rhythm). Every margin, padding, and gap should snap to this scale. Arbitrary values like p-[7px] are a smell."
		>
			<Card className="p-2 px-5">
				<div className="grid grid-cols-12 border-b border-border py-3 text-label-md text-muted-foreground">
					<div className="col-span-2">Token</div>
					<div className="col-span-2">Pixels</div>
					<div className="col-span-4">Visual</div>
					<div className="col-span-4">Use</div>
				</div>
				{spacingScale.map((s) => {
					const px = parseInt(s.px)
					return (
						<div
							key={s.token}
							className="grid grid-cols-12 items-center py-3 border-b border-border last:border-b-0"
						>
							<div className="col-span-2 text-mono-md normal-case">{s.token}</div>
							<div className="col-span-2 text-mono-sm text-muted-foreground">{s.px}</div>
							<div className="col-span-4">
								<div
									className="h-3 bg-foreground/80 rounded-sm"
									style={{ width: `${Math.min(px * 2, 200)}px` }}
								/>
							</div>
							<div className="col-span-4 text-body-sm text-muted-foreground">{s.use}</div>
						</div>
					)
				})}
			</Card>

			<Subsection title="Rules">
				<Card className="p-6">
					<ul className="space-y-3">
						<Rule>Use the scale. <Code>p-2 p-3 p-4 p-6 p-8</Code>, not <Code>p-[10px]</Code>.</Rule>
						<Rule>Outside-in: page padding ≥ section gap ≥ card padding ≥ inline gap.</Rule>
						<Rule>Cards: p-4 on mobile, p-6 on desktop. Page gutter: px-4 on mobile, px-6 on desktop.</Rule>
						<Rule>Stack rhythm with <Code>space-y-*</Code> over per-child margins when items are related.</Rule>
						<Anti>Don't mix axis-direction utilities to fake spacing (no <Code>mt-3 mb-4</Code> in alternation).</Anti>
					</ul>
				</Card>
			</Subsection>
		</Section>
	)
}

// ---------------------------------------------------------------------------
// 6. Radii
// ---------------------------------------------------------------------------

const radii = [
	{ token: 'none', value: '0px', use: 'Full-bleed media, edge-to-edge dividers' },
	{ token: 'xs', value: '4px', use: 'Pills, small chips, swatches' },
	{ token: 'sm', value: '8px', use: 'Default — buttons, inputs, cards' },
	{ token: 'md', value: '12px', use: 'Modals, larger cards, sheets' },
	{ token: 'lg', value: '16px', use: 'Hero cards, marketing surfaces' },
	{ token: 'xl', value: '20px', use: 'Editorial / large feature blocks' },
	{ token: 'full', value: '9999px', use: 'Avatars, status dots, FAB' },
]

function RadiiSection() {
	return (
		<Section
			id="radii"
			eyebrow="06"
			title="Radii"
			subtitle="Tight corners over soft. Small radii feel sharper and more deliberate. Reserve larger radii for editorial and avatar contexts."
		>
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
				{radii.map((r) => (
					<div key={r.token} className="space-y-3">
						<div
							className="aspect-square bg-muted border border-border"
							style={{ borderRadius: r.value }}
						/>
						<div>
							<p className="text-title-sm">rounded-{r.token}</p>
							<p className="text-mono-sm text-muted-foreground mt-0.5">{r.value}</p>
							<p className="text-body-sm text-muted-foreground mt-1">{r.use}</p>
						</div>
					</div>
				))}
			</div>
		</Section>
	)
}

// ---------------------------------------------------------------------------
// 7. Elevation
// ---------------------------------------------------------------------------

const shadows = [
	{ token: 'sm', value: '0 1px 4px rgb(0 0 0 / 0.03)', use: 'Resting state — barely lifted' },
	{ token: 'default', value: '0 2px 8px rgb(0 0 0 / 0.04)', use: 'Hover state on cards' },
	{ token: 'md', value: '0 4px 12px rgb(0 0 0 / 0.05)', use: 'Popovers, dropdowns' },
	{ token: 'lg', value: '0 8px 24px rgb(0 0 0 / 0.05)', use: 'Modals, sheets' },
	{ token: 'xl', value: '0 16px 40px rgb(0 0 0 / 0.05)', use: 'Top-level surfaces, command bar' },
]

function ElevationSection() {
	return (
		<Section
			id="elevation"
			eyebrow="07"
			title="Elevation"
			subtitle="Soft, low-opacity shadows. Light should feel diffuse, not directional. Borders carry more visual weight than shadows in this system — shadow is for state and depth, not chrome."
		>
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 p-4 md:p-6 bg-muted/40 rounded-lg">
				{shadows.map((s) => (
					<div key={s.token} className="space-y-3">
						<div
							className="aspect-square bg-card rounded-md"
							style={{ boxShadow: s.value }}
						/>
						<div>
							<p className="text-title-sm">shadow-{s.token === 'default' ? '' : s.token}</p>
							<p className="text-body-sm text-muted-foreground mt-1">{s.use}</p>
						</div>
					</div>
				))}
			</div>
		</Section>
	)
}

// ---------------------------------------------------------------------------
// 8. Motion
// ---------------------------------------------------------------------------

const motionDurations = [
	{ token: '75', use: 'Micro — color/opacity nudges' },
	{ token: '150', use: 'Default — buttons, inputs, hover' },
	{ token: '200', use: 'Card hover, tab change' },
	{ token: '300', use: 'Sheet open, modal fade' },
	{ token: '500', use: 'Page transitions, reveal' },
]

const easings = [
	{ name: 'ease-out', use: 'Default — UI feedback that lands quickly' },
	{ name: 'ease-in-out', use: 'Two-way state changes (open/close)' },
	{ name: 'linear', use: 'Marquees, indeterminate progress' },
]

function MotionSection() {
	return (
		<Section
			id="motion"
			eyebrow="08"
			title="Motion"
			subtitle="Motion confirms cause and effect. It should be quick, deliberate, and skippable. Always respect prefers-reduced-motion."
		>
			<div className="grid md:grid-cols-2 gap-4 md:gap-6">
				<Card className="p-6">
					<h3 className="text-heading-4 mb-4">Durations</h3>
					<ul className="divide-y divide-border">
						{motionDurations.map((d) => (
							<li key={d.token} className="flex items-baseline justify-between py-2.5">
								<Code>duration-{d.token}</Code>
								<span className="text-body-sm text-muted-foreground text-right">
									{d.use}
								</span>
							</li>
						))}
					</ul>
				</Card>
				<Card className="p-6">
					<h3 className="text-heading-4 mb-4">Easings</h3>
					<ul className="divide-y divide-border">
						{easings.map((e) => (
							<li key={e.name} className="flex items-baseline justify-between py-2.5">
								<Code>{e.name}</Code>
								<span className="text-body-sm text-muted-foreground text-right">
									{e.use}
								</span>
							</li>
						))}
					</ul>
				</Card>
			</div>

			<Subsection title="Rules">
				<Card className="p-6">
					<ul className="space-y-3">
						<Rule>Default to <Code>transition-colors duration-150</Code>. It's invisible to the eye but felt under the cursor.</Rule>
						<Rule>Hover on cards: scale or shadow, not both. Pick one.</Rule>
						<Rule>Anything longer than 300ms must be skippable or interruptible.</Rule>
						<Rule>Wrap non-essential motion in <Code>motion-safe:</Code> or check <Code>prefers-reduced-motion</Code>.</Rule>
						<Anti>No bounce, no spring, no overshoot in product UI. Save physical motion for the marketing surface.</Anti>
					</ul>
				</Card>
			</Subsection>
		</Section>
	)
}

// ---------------------------------------------------------------------------
// 9. Iconography
// ---------------------------------------------------------------------------

const iconSamples = [
	{ name: 'heart', use: 'Like' },
	{ name: 'comment', use: 'Comment' },
	{ name: 'share-nodes', use: 'Share' },
	{ name: 'gem', use: 'Collect / collectible' },
	{ name: 'image-stack', use: 'Edition' },
	{ name: 'bell', use: 'Notifications' },
	{ name: 'gear', use: 'Settings' },
	{ name: 'user', use: 'Profile' },
	{ name: 'magnifying-glass', use: 'Search' },
	{ name: 'plus', use: 'Create' },
	{ name: 'arrow-up-right-from-square', use: 'External' },
	{ name: 'check', use: 'Confirm' },
]

function IconographySection() {
	return (
		<Section
			id="iconography"
			eyebrow="09"
			title="Iconography"
			subtitle="Font Awesome Pro. Default to the Regular weight. Use Solid only for filled/active states. Never mix weights in the same row."
		>
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
				{iconSamples.map((i) => (
					<Card key={i.name} className="p-4 flex flex-col items-center text-center gap-3">
						<Icon name={i.name} variant="regular" className="text-2xl" />
						<div>
							<p className="text-mono-sm text-muted-foreground normal-case">{i.name}</p>
							<p className="text-body-sm">{i.use}</p>
						</div>
					</Card>
				))}
			</div>

			<Subsection title="Sizing">
				<Card className="p-6">
					<ul className="space-y-3">
						<Rule>Inline with text: no class — inherits the parent <Code>text-*</Code>.</Rule>
						<Rule>Standalone control: <Code>text-base</Code> (16px) or <Code>text-lg</Code> (18px).</Rule>
						<Rule>Section header: <Code>text-xl</Code> to <Code>text-2xl</Code>.</Rule>
						<Rule>Hero / empty state: <Code>text-4xl</Code> or larger.</Rule>
						<Anti>Don't use typography utilities (<Code>text-body-md</Code>) on icons. Those are paired type tokens, not size scales.</Anti>
					</ul>
				</Card>
			</Subsection>
		</Section>
	)
}

// ---------------------------------------------------------------------------
// 10. Writing — patterns & microcopy
// ---------------------------------------------------------------------------

const microcopy = [
	{ surface: 'Primary action', sample: 'Collect', notes: 'Verb. Sentence case. No icon unless it adds meaning.' },
	{ surface: 'Secondary action', sample: 'Cancel', notes: 'Mirror the primary in length. "Cancel," not "Never mind."' },
	{ surface: 'Destructive action', sample: 'Delete post', notes: 'Verb + object. Confirmation describes the consequence.' },
	{ surface: 'Empty state heading', sample: 'No posts yet', notes: 'Describe the absence. Don\'t apologize.' },
	{ surface: 'Empty state body', sample: 'Create your first.', notes: 'One short sentence. Action follows in a button.' },
	{ surface: 'Success toast', sample: 'Posted.', notes: 'One word when possible. No celebration words.' },
	{ surface: 'Error · network', sample: "Couldn't reach the network.", notes: 'Plain language. Suggest the next action.' },
	{ surface: 'Error · validation', sample: 'Username must be 3–20 characters.', notes: 'State the rule, not "invalid input."' },
	{ surface: 'Loading', sample: '—', notes: 'Skeleton over spinner. No "Please wait."' },
	{ surface: 'Confirmation body', sample: 'This is permanent.', notes: 'State the consequence in one short sentence.' },
]

function WritingSection() {
	return (
		<Section
			id="writing"
			eyebrow="10"
			title="Writing"
			subtitle="Microcopy is product. Treat every label, button, and error message as an interaction worth designing."
		>
			<Subsection title="Surface microcopy">
				<Card className="p-0 overflow-hidden">
					<div className="hidden md:grid grid-cols-12 border-b border-border bg-muted/40 px-5 py-3">
						<div className="col-span-3 text-label-md text-muted-foreground">Surface</div>
						<div className="col-span-4 text-label-md text-muted-foreground">Sample</div>
						<div className="col-span-5 text-label-md text-muted-foreground">Notes</div>
					</div>
					{microcopy.map((m, i) => (
						<div
							key={m.surface}
							className={`grid grid-cols-1 md:grid-cols-12 gap-1.5 md:gap-0 px-4 py-3.5 md:px-5 ${
								i < microcopy.length - 1 ? 'border-b border-border' : ''
							}`}
						>
							<div className="md:col-span-3 text-title-sm">{m.surface}</div>
							<div className="md:col-span-4 text-body-md">{m.sample}</div>
							<div className="md:col-span-5 text-body-sm text-muted-foreground">{m.notes}</div>
						</div>
					))}
				</Card>
			</Subsection>

			<Subsection title="Numbers, dates, currency">
				<Card className="p-6">
					<ul className="space-y-3">
						<Rule>Numerals always. <Code>12 collectors</Code>, not "twelve collectors."</Rule>
						<Rule>Relative time for fresh content (<Code>2h ago</Code>), absolute for archived (<Code>Mar 4, 2026</Code>).</Rule>
						<Rule>Currency symbol before the value, no space: <Code>$5.00</Code>, <Code>0.5 SOL</Code>.</Rule>
						<Rule>Truncate addresses: <Code>5J7s…8xQp</Code> with an em-ellipsis.</Rule>
						<Rule>Plural correctly. <Code>1 post</Code>, <Code>2 posts</Code>. Never "1 post(s)."</Rule>
					</ul>
				</Card>
			</Subsection>
		</Section>
	)
}

// ---------------------------------------------------------------------------
// 11. Patterns
// ---------------------------------------------------------------------------

function PatternsSection() {
	return (
		<Section
			id="patterns"
			eyebrow="11"
			title="Patterns"
			subtitle="Recurring solutions. Reach for these before inventing — they encode tone, accessibility, and rhythm decisions already made."
		>
			<Subsection title="Loading states">
				<div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
					<Card className="p-5">
						<p className="text-label-xs text-muted-foreground mb-3">Default</p>
						<div className="space-y-2">
							<div className="h-3 bg-muted animate-pulse rounded" />
							<div className="h-3 bg-muted animate-pulse rounded w-4/5" />
							<div className="h-3 bg-muted animate-pulse rounded w-3/5" />
						</div>
						<p className="text-body-sm text-muted-foreground mt-4">
							Skeleton matches the shape of the content. No spinner.
						</p>
					</Card>
					<Card className="p-5">
						<p className="text-label-xs text-muted-foreground mb-3">In-flight action</p>
						<div className="flex items-center justify-center h-16">
							<Icon name="spinner-third" spin className="text-2xl text-muted-foreground" />
						</div>
						<p className="text-body-sm text-muted-foreground mt-4">
							Spinner only when the user is actively waiting on a single action.
						</p>
					</Card>
					<Card className="p-5">
						<p className="text-label-xs text-muted-foreground mb-3">Background work</p>
						<div className="flex items-center gap-2 h-16">
							<div className="size-2 rounded-full bg-(--caribbean-green-500)" />
							<span className="text-body-sm">Syncing…</span>
						</div>
						<p className="text-body-sm text-muted-foreground mt-4">
							Status pill, never a modal. Don't block the user.
						</p>
					</Card>
				</div>
			</Subsection>

			<Subsection title="Empty states">
				<Card className="p-12 text-center">
					<div className="inline-flex items-center justify-center size-12 rounded-full bg-muted mb-4">
						<Icon name="images" variant="regular" className="text-xl text-muted-foreground" />
					</div>
					<p className="text-heading-3">No posts yet</p>
					<p className="text-body-md text-muted-foreground mt-2 max-w-sm mx-auto">
						Create your first.
					</p>
					<button
						type="button"
						className="mt-5 px-4 py-2 bg-primary text-primary-foreground rounded-sm text-label-lg"
					>
						Create post
					</button>
				</Card>
				<Card className="p-6 mt-4">
					<ul className="space-y-3">
						<Rule>Icon + heading + one-line body + one action. That's the whole template.</Rule>
						<Rule>Heading describes the absence ("No posts yet"), not the user ("You haven't posted yet").</Rule>
						<Rule>Body suggests what to do next, in one sentence.</Rule>
						<Anti>No illustrations of empty boxes, sad ghosts, or tumbleweeds. The absence is the message.</Anti>
					</ul>
				</Card>
			</Subsection>

			<Subsection title="Error states">
				<Card className="p-6 border-(--torch-red-500)/30">
					<div className="flex gap-3">
						<Icon
							name="circle-exclamation"
							variant="regular"
							className="text-(--torch-red-600) dark:text-(--torch-red-400) text-lg shrink-0 mt-0.5"
						/>
						<div>
							<p className="text-title-lg">Couldn't reach the network.</p>
							<p className="text-body-md text-muted-foreground mt-1">
								Check your connection and try again. Your draft is saved.
							</p>
							<button
								type="button"
								className="mt-3 px-3 py-1.5 border border-border rounded-sm text-label-md"
							>
								Try again
							</button>
						</div>
					</div>
				</Card>
				<Card className="p-6 mt-4">
					<ul className="space-y-3">
						<Rule>State what failed in one line. Don't explain why unless it changes the user's next action.</Rule>
						<Rule>Suggest a recovery: retry, refresh, or contact. Always offer the next click.</Rule>
						<Rule>Reassure when relevant ("Your draft is saved"). Silence implies loss.</Rule>
						<Anti>"Oops!" "Something went wrong!" "Please try again later." Useless filler.</Anti>
					</ul>
				</Card>
			</Subsection>
		</Section>
	)
}

// ---------------------------------------------------------------------------
// 12. Mobile (iOS + Android)
// ---------------------------------------------------------------------------

function PlatformBadge({ platform }: { platform: 'iOS' | 'Android' | 'Web' }) {
	const palette =
		platform === 'iOS'
			? 'bg-(--azure-radiance-100) text-(--azure-radiance-700) dark:bg-(--azure-radiance-900) dark:text-(--azure-radiance-200)'
			: platform === 'Android'
				? 'bg-(--caribbean-green-100) text-(--caribbean-green-700) dark:bg-(--caribbean-green-900) dark:text-(--caribbean-green-200)'
				: 'bg-muted text-muted-foreground'
	return (
		<span
			className={`inline-flex items-center px-2 py-0.5 rounded-full text-mono-sm normal-case ${palette}`}
		>
			{platform}
		</span>
	)
}

const platforms = [
	{
		name: 'iOS',
		minor: 'Apple Human Interface Guidelines',
		points: [
			'44pt minimum touch target on any tappable element',
			'Respect Dynamic Type — root scales with user accessibility settings',
			'Use UIBlurEffect sparingly; prefer solid Desperse surfaces',
			'Edge-swipe back gesture, sheet-style modals, action sheets for destructive choices',
			'Bundle Figtree as .ttf via UIAppFonts; San Francisco fallback only on bundle failure',
		],
	},
	{
		name: 'Android',
		minor: 'Material Design (overridden where it conflicts with brand)',
		points: [
			'48dp minimum touch target (slightly larger than iOS)',
			'Honor Configuration.fontScale for accessibility text sizing',
			'Disable Material 3 tonal elevation overlays — we use the tonal ladder instead',
			'Replace Material ripple with the same zinc-800 hover the web uses',
			'Predictive back (Android 13+), bottom sheets standard + modal, edge-to-edge with WindowInsets',
		],
	},
] as const

const touchTargets = [
	{ platform: 'iOS', size: 44, unit: 'pt', use: 'HIG floor for any tappable affordance' },
	{ platform: 'Android', size: 48, unit: 'dp', use: 'Material accessibility minimum' },
	{ platform: 'Web', size: 40, unit: 'px', use: 'Acceptable for secondary actions; primary hits 48px' },
] as const

const navPatterns = [
	{
		surface: 'Bottom tab bar',
		ios: 'UITabBar style. 56pt height + safe-area inset bottom. SF Symbols or custom outline/filled icons. Up to 5 tabs.',
		android: 'BottomNavigationView. 56dp + WindowInsets.navigationBars. Outline → filled on active. Up to 5 destinations.',
	},
	{
		surface: 'Top bar',
		ios: 'UINavigationBar with large title on root, inline title on push. Back button uses chevron-left + previous title.',
		android: 'Material TopAppBar (small variant). 56dp + WindowInsets.statusBars. Up arrow for back, hamburger only when no parent.',
	},
	{
		surface: 'Modals',
		ios: 'pageSheet by default (90% height, drag handle). formSheet for compact forms. fullScreenCover for immersive flows.',
		android: 'ModalBottomSheet for actions; Dialog for confirmations; full-screen Activity for immersive flows.',
	},
	{
		surface: 'Action sheets',
		ios: 'UIAlertController .actionSheet. Cancel separated. Destructive in tone-warning role at the top.',
		android: 'ModalBottomSheet with list rows. No Cancel — tap-outside or back gesture dismisses.',
	},
]

const platformTypography = [
	{ token: 'display-2xl', ios: 'largeTitle 700', android: 'displayLarge' },
	{ token: 'heading-1', ios: 'title1 600', android: 'headlineLarge' },
	{ token: 'heading-2', ios: 'title2 600', android: 'headlineMedium' },
	{ token: 'title-lg', ios: 'title3 600', android: 'titleLarge' },
	{ token: 'body-lg', ios: 'body 400', android: 'bodyLarge' },
	{ token: 'body-md', ios: 'body 400', android: 'bodyMedium' },
	{ token: 'body-sm', ios: 'subheadline 400', android: 'bodySmall' },
	{ token: 'label-lg', ios: 'footnote 600', android: 'labelLarge' },
	{ token: 'label-md', ios: 'caption1 600', android: 'labelMedium' },
	{ token: 'label-xs', ios: 'caption2 600', android: 'labelSmall' },
]

const haptics = [
	{ event: 'Collect / Buy success', ios: 'notificationOccurred(.success)', android: 'CONFIRM (R+30)' },
	{ event: 'Like toggle', ios: 'impactOccurred(.light)', android: 'GESTURE_END / VIRTUAL_KEY' },
	{ event: 'Destructive confirm', ios: 'notificationOccurred(.warning)', android: 'REJECT (R+30) / LONG_PRESS' },
	{ event: 'Pull to refresh trigger', ios: 'impactOccurred(.medium)', android: 'GESTURE_END' },
	{ event: 'Error / failed action', ios: 'notificationOccurred(.error)', android: 'REJECT' },
]

const gestures = [
	{
		name: 'Edge-swipe back',
		platform: 'iOS',
		rule: 'Always available on push navigation. Disabling it (interactivePopGestureRecognizer.isEnabled = false) is the most-noticed broken-feel signal on iOS.',
	},
	{
		name: 'Predictive back',
		platform: 'Android',
		rule: 'Opt in via android:enableOnBackInvokedCallback="true" (Android 13+). Required for the modern look-and-feel; without it the OS-level back animation looks legacy.',
	},
	{
		name: 'Pull to refresh',
		platform: 'Both',
		rule: 'Standard primitive on feed and notification surfaces. Trigger refetch + medium haptic. Don\'t reinvent the spinner.',
	},
	{
		name: 'Long-press',
		platform: 'Both',
		rule: 'Reserved for tooltip-equivalent on touch (~500ms) and contextual actions (post card → share/copy/report sheet). Never the only path to a destructive action.',
	},
]

function MobileSection() {
	return (
		<Section
			id="mobile"
			eyebrow="12"
			title="Mobile"
			subtitle="Native shells (iOS + Android) and the responsive web all share the same token set. Follow each platform's HIG for primitives — navigation, gestures, system controls — and apply Desperse tokens for color, typography, shape, and motion. The design adapts; the brand doesn't bend."
		>
			<Subsection
				title="Platforms at a glance"
				subtitle="Two foundations, one design language. iOS leans on HIG for system primitives; Android adopts Material structure but overrides Material 3 chrome to match the Desperse tonal system."
			>
				<div className="grid md:grid-cols-2 gap-4 md:gap-6">
					{platforms.map((p) => (
						<Card key={p.name} className="p-5 md:p-6">
							<div className="flex items-baseline gap-3 mb-2">
								<p className="text-heading-3">{p.name}</p>
								<PlatformBadge platform={p.name as 'iOS' | 'Android'} />
							</div>
							<p className="text-body-sm text-muted-foreground mb-4">{p.minor}</p>
							<ul className="space-y-2.5">
								{p.points.map((pt) => (
									<li key={pt} className="flex gap-2.5 text-body-md">
										<Icon
											name="circle"
											variant="solid"
											className="text-(--zinc-400) text-[6px] mt-2 shrink-0"
										/>
										<span>{pt}</span>
									</li>
								))}
							</ul>
						</Card>
					))}
				</div>
			</Subsection>

			<Subsection
				title="Touch targets"
				subtitle="Three minimums. Apply the platform's value, not the lowest common denominator. Desktop density (32px icon buttons) is reserved for power-user surfaces — never feeds, never primary actions."
			>
				<Card className="p-6">
					<div className="flex flex-wrap items-end gap-8 mb-6">
						{touchTargets.map((t) => (
							<div key={t.platform} className="flex flex-col items-center gap-3">
								<div
									className="bg-foreground/10 border border-border rounded-md flex items-center justify-center"
									style={{ width: `${t.size}px`, height: `${t.size}px` }}
								>
									<span className="text-mono-sm text-muted-foreground">
										{t.size}
										{t.unit}
									</span>
								</div>
								<PlatformBadge platform={t.platform as 'iOS' | 'Android' | 'Web'} />
							</div>
						))}
					</div>
					<ul className="space-y-2 pt-4 border-t border-border">
						{touchTargets.map((t) => (
							<li key={t.platform} className="flex items-baseline gap-3 text-body-sm">
								<span className="text-mono-sm text-muted-foreground w-16 shrink-0">
									{t.size}
									{t.unit}
								</span>
								<span>{t.use}</span>
							</li>
						))}
					</ul>
				</Card>
			</Subsection>

			<Subsection
				title="Safe areas"
				subtitle="Every fixed-position element respects env(safe-area-inset-*). Notch, Dynamic Island, status bar, and home indicator are baked into the layout — not edge cases."
			>
				<div className="grid md:grid-cols-[auto_1fr] gap-6 items-start">
					{/* Simulated device frame */}
					<div className="mx-auto md:mx-0 w-[220px] aspect-[9/19] rounded-[36px] bg-(--zinc-950) border-4 border-(--zinc-800) p-2 shadow-xl shrink-0">
						<div className="relative w-full h-full rounded-[28px] bg-card overflow-hidden">
							{/* Notch / Dynamic Island */}
							<div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-(--zinc-950) rounded-full" />
							{/* Top inset zone (status bar) */}
							<div
								className="absolute top-0 left-0 right-0 border-b border-dashed border-(--azure-radiance-500)/40 pointer-events-none"
								style={{ height: '14%' }}
							/>
							{/* Top app bar */}
							<div
								className="absolute left-0 right-0 px-3 flex items-center"
								style={{ top: '14%', height: '8%' }}
							>
								<span className="text-label-md text-foreground">Feed</span>
							</div>
							{/* Content */}
							<div
								className="absolute left-0 right-0 px-3 space-y-2"
								style={{ top: '24%', bottom: '20%' }}
							>
								<div className="h-3 bg-muted rounded" />
								<div className="h-3 bg-muted rounded w-4/5" />
								<div className="h-12 bg-muted rounded mt-3" />
								<div className="h-3 bg-muted rounded w-3/5 mt-3" />
							</div>
							{/* Bottom tab bar */}
							<div
								className="absolute left-0 right-0 bottom-0 border-t border-border bg-card flex items-center justify-around"
								style={{ height: '14%' }}
							>
								<Icon name="house" variant="solid" className="text-foreground text-base" />
								<Icon
									name="magnifying-glass"
									variant="regular"
									className="text-muted-foreground text-base"
								/>
								<Icon name="bell" variant="regular" className="text-muted-foreground text-base" />
								<Icon name="user" variant="regular" className="text-muted-foreground text-base" />
							</div>
							{/* Bottom inset zone (home indicator) */}
							<div
								className="absolute bottom-0 left-0 right-0 border-t border-dashed border-(--azure-radiance-500)/40 pointer-events-none"
								style={{ height: '6%' }}
							/>
							<div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-foreground/40 rounded-full" />
						</div>
					</div>

					<Card className="p-5 md:p-6">
						<ul className="space-y-3">
							<Rule>
								Top bars add <Code>env(safe-area-inset-top)</Code> to padding-top. Notch and
								Dynamic Island fall inside the inset, never under the bar.
							</Rule>
							<Rule>
								Bottom tab bars add <Code>env(safe-area-inset-bottom)</Code> to
								padding-bottom. Home indicator gets ~6% of the screen below the tabs.
							</Rule>
							<Rule>
								Full-screen modals apply both insets. Landscape orientation honors{' '}
								<Code>safe-area-inset-left/right</Code> on iPhone landscape.
							</Rule>
							<Rule>
								Sticky CTAs over media respect inset-bottom + 12px breathing room above
								the home indicator.
							</Rule>
							<Anti>
								Never anchor anything tappable inside the inset zone. The OS reserves
								those areas for its own gestures.
							</Anti>
						</ul>
					</Card>
				</div>
			</Subsection>

			<Subsection
				title="Navigation patterns"
				subtitle="Same primitives, platform-appropriate execution. Bottom tabs are the spine on both. Top bar, modals, and action sheets follow each OS's conventions so the UI feels native."
			>
				<Card className="p-0 overflow-hidden">
					<div className="hidden md:grid grid-cols-12 border-b border-border bg-muted/40 px-5 py-3">
						<div className="col-span-3 text-label-md text-muted-foreground">Surface</div>
						<div className="col-span-4 text-label-md text-muted-foreground">iOS</div>
						<div className="col-span-5 text-label-md text-muted-foreground">Android</div>
					</div>
					{navPatterns.map((p, i) => (
						<div
							key={p.surface}
							className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-0 px-4 py-4 md:px-5 ${
								i < navPatterns.length - 1 ? 'border-b border-border' : ''
							}`}
						>
							<div className="md:col-span-3 text-title-sm">{p.surface}</div>
							<div className="md:col-span-4 text-body-sm text-muted-foreground">
								<span className="md:hidden mr-2">
									<PlatformBadge platform="iOS" />
								</span>
								{p.ios}
							</div>
							<div className="md:col-span-5 text-body-sm text-muted-foreground">
								<span className="md:hidden mr-2">
									<PlatformBadge platform="Android" />
								</span>
								{p.android}
							</div>
						</div>
					))}
				</Card>
			</Subsection>

			<Subsection
				title="Typography on mobile"
				subtitle="The 16px mobile root accommodates iOS Dynamic Type and Android fontScale up to 'Accessibility Large' without layout break. Bundle Figtree on both shells; never rely on the system font for brand surfaces."
			>
				<Card className="p-0 overflow-hidden">
					<div className="hidden md:grid grid-cols-12 border-b border-border bg-muted/40 px-5 py-3">
						<div className="col-span-4 text-label-md text-muted-foreground">Token</div>
						<div className="col-span-4 text-label-md text-muted-foreground">iOS UIFont</div>
						<div className="col-span-4 text-label-md text-muted-foreground">
							Android TextAppearance
						</div>
					</div>
					{platformTypography.map((row, i) => (
						<div
							key={row.token}
							className={`grid grid-cols-1 md:grid-cols-12 gap-1.5 md:gap-0 px-4 py-3 md:px-5 ${
								i < platformTypography.length - 1 ? 'border-b border-border' : ''
							}`}
						>
							<div className="md:col-span-4">
								<Code>{row.token}</Code>
							</div>
							<div className="md:col-span-4 text-body-sm">
								<span className="md:hidden mr-2">
									<PlatformBadge platform="iOS" />
								</span>
								{row.ios}
							</div>
							<div className="md:col-span-4 text-body-sm">
								<span className="md:hidden mr-2">
									<PlatformBadge platform="Android" />
								</span>
								{row.android}
							</div>
						</div>
					))}
				</Card>
			</Subsection>

			<Subsection
				title="Haptics"
				subtitle="Haptic feedback is part of the brand on mobile. Used sparingly to confirm — never to entertain. Match the system's vocabulary so the app feels native rather than custom."
			>
				<Card className="p-0 overflow-hidden">
					<div className="hidden md:grid grid-cols-12 border-b border-border bg-muted/40 px-5 py-3">
						<div className="col-span-4 text-label-md text-muted-foreground">Event</div>
						<div className="col-span-4 text-label-md text-muted-foreground">iOS</div>
						<div className="col-span-4 text-label-md text-muted-foreground">Android</div>
					</div>
					{haptics.map((row, i) => (
						<div
							key={row.event}
							className={`grid grid-cols-1 md:grid-cols-12 gap-1.5 md:gap-0 px-4 py-3 md:px-5 ${
								i < haptics.length - 1 ? 'border-b border-border' : ''
							}`}
						>
							<div className="md:col-span-4 text-title-sm">{row.event}</div>
							<div className="md:col-span-4 text-body-sm font-mono">
								<span className="md:hidden mr-2 not-italic">
									<PlatformBadge platform="iOS" />
								</span>
								{row.ios}
							</div>
							<div className="md:col-span-4 text-body-sm font-mono">
								<span className="md:hidden mr-2 not-italic">
									<PlatformBadge platform="Android" />
								</span>
								{row.android}
							</div>
						</div>
					))}
				</Card>
			</Subsection>

			<Subsection
				title="Gestures"
				subtitle="Honor the OS's gesture language. Disabling system gestures is the fastest way to make a native shell feel like a wrapped webview."
			>
				<div className="grid sm:grid-cols-2 gap-4">
					{gestures.map((g) => (
						<Card key={g.name} className="p-5">
							<div className="flex items-baseline gap-3 mb-2">
								<p className="text-title-lg">{g.name}</p>
								<PlatformBadge platform={g.platform === 'Both' ? 'Web' : g.platform as 'iOS' | 'Android'} />
								{g.platform === 'Both' && <span className="text-mono-sm text-muted-foreground">+ iOS / Android</span>}
							</div>
							<p className="text-body-sm text-muted-foreground">{g.rule}</p>
						</Card>
					))}
				</div>
			</Subsection>

			<Subsection
				title="Platform overrides"
				subtitle="A small set of deliberate deviations from each platform's defaults that keep Desperse looking like itself across iOS, Android, and web."
			>
				<Card className="p-6">
					<ul className="space-y-3">
						<Rule>
							<PlatformBadge platform="Android" /> Disable Material 3 tonal elevation
							overlays. Use{' '}
							<Code>Surface(tonalElevation = 0.dp)</Code> and rely on the zinc tonal
							ladder. Material's automatic surface lightening collides with our flat
							layered system.
						</Rule>
						<Rule>
							<PlatformBadge platform="Android" /> Replace the Material ripple with the
							same <Code>zinc-800</Code> hover/press fill the web uses. Cross-platform
							consistency wins over the Material wave animation.
						</Rule>
						<Rule>
							<PlatformBadge platform="iOS" /> Use <Code>UIBlurEffect</Code> only on
							sticky bars when scrim is required for legibility over media. Materials
							are not a brand element; solid <Code>background</Code> beats a blur.
						</Rule>
						<Rule>
							<PlatformBadge platform="iOS" /> Native system controls
							(<Code>UISwitch</Code>, <Code>UISegmentedControl</Code>) follow Apple's
							default radii. Custom controls match the Desperse ladder. Don't rebuild
							the system control if the default works.
						</Rule>
						<Rule>
							Status bar content matches the active theme. Dark mode → light status bar
							content; light mode → dark. Never fix it to one and let it look wrong.
						</Rule>
						<Rule>
							Bundle Figtree as a font asset on both shells. Roboto / San Francisco
							fallbacks only on bundle failure — never as the primary.
						</Rule>
					</ul>
				</Card>
			</Subsection>

			<Subsection title="Rules">
				<div className="grid md:grid-cols-2 gap-4 md:gap-6">
					<Card className="p-6">
						<p className="text-label-xs text-muted-foreground mb-4">Do</p>
						<ul className="space-y-3">
							<Rule>Match the platform's touch-target minimum (44pt iOS / 48dp Android).</Rule>
							<Rule>Respect <Code>env(safe-area-inset-*)</Code> on every fixed surface.</Rule>
							<Rule>Honor Dynamic Type and Configuration.fontScale.</Rule>
							<Rule>Fire haptics on success, error, and destructive confirms — never on hover or scroll.</Rule>
							<Rule>Use the platform's modal language (sheets, bottom sheets, action sheets).</Rule>
							<Rule>Test landscape on iPhone — left/right insets matter on iPhone-X-and-after.</Rule>
						</ul>
					</Card>
					<Card className="p-6">
						<p className="text-label-xs text-muted-foreground mb-4">Don't</p>
						<ul className="space-y-3">
							<Anti>Disable edge-swipe back on iOS. Most-noticed broken-feel signal.</Anti>
							<Anti>Skip predictive back on Android 13+. Modern UX expectation.</Anti>
							<Anti>Use Material ripple. Replace with zinc-800 fill for cross-platform consistency.</Anti>
							<Anti>Block tap-targets behind the home indicator or notch.</Anti>
							<Anti>Lock orientation to portrait without a content reason. Tablets and landscape phones exist.</Anti>
							<Anti>Implement features that only work on desktop. Every capability needs a mobile path.</Anti>
						</ul>
					</Card>
				</div>
			</Subsection>
		</Section>
	)
}

// ---------------------------------------------------------------------------
// Theme switcher
// ---------------------------------------------------------------------------

const themeOptions = [
	{ value: 'light', icon: 'sun-bright', label: 'Light' },
	{ value: 'dark', icon: 'moon', label: 'Dark' },
	{ value: 'system', icon: 'desktop', label: 'System' },
] as const

function ThemeSwitcher() {
	const { theme, setTheme } = useTheme()
	const active = theme ?? 'system'

	return (
		<div
			role="radiogroup"
			aria-label="Theme"
			className="inline-flex items-center gap-0.5 p-0.5 rounded-full border border-border bg-card"
		>
			{themeOptions.map((opt) => {
				const isActive = active === opt.value
				return (
					<button
						key={opt.value}
						type="button"
						role="radio"
						aria-checked={isActive}
						aria-label={opt.label}
						onClick={() => setTheme(opt.value)}
						className={`flex items-center justify-center size-8 rounded-full transition-colors ${
							isActive
								? 'bg-foreground text-background'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						<Icon name={opt.icon} variant="regular" className="text-base" />
					</button>
				)
			})}
		</div>
	)
}

// ---------------------------------------------------------------------------
// Sticky TOC + page shell
// ---------------------------------------------------------------------------

const toc = [
	{ id: 'brand', n: '01', label: 'Brand' },
	{ id: 'voice', n: '02', label: 'Voice & Tone' },
	{ id: 'color', n: '03', label: 'Color' },
	{ id: 'typography', n: '04', label: 'Typography' },
	{ id: 'spacing', n: '05', label: 'Spacing' },
	{ id: 'radii', n: '06', label: 'Radii' },
	{ id: 'elevation', n: '07', label: 'Elevation' },
	{ id: 'motion', n: '08', label: 'Motion' },
	{ id: 'iconography', n: '09', label: 'Iconography' },
	{ id: 'writing', n: '10', label: 'Writing' },
	{ id: 'patterns', n: '11', label: 'Patterns' },
	{ id: 'mobile', n: '12', label: 'Mobile' },
]

function DesignSystemPage() {
	return (
		<div className="px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20 py-6 md:py-10 lg:py-14 mx-auto 2xl:max-w-[1800px]">
			<header className="mb-10 md:mb-14 lg:mb-16">
				<div className="flex items-start justify-between gap-4 mb-3">
					<p className="text-label-xs text-muted-foreground">Reference · v1</p>
					<ThemeSwitcher />
				</div>
				<div>
					<h1 className="text-display-lg max-w-3xl">Desperse Design System</h1>
					<p className="text-body-lg text-muted-foreground mt-4 max-w-2xl">
						The shared vocabulary for everything we ship. Tokens, typography, voice,
						patterns — the rules that keep our surfaces feeling like one product.
					</p>
					<p className="text-body-md text-muted-foreground mt-3 max-w-2xl">
						This page is the source of truth. If a real surface conflicts with what's
						here, the surface is drifting — fix it, don't add an exception.
					</p>
				</div>
			</header>

			{/* Mobile/tablet horizontal TOC — sticky chip strip, scrollable. Hidden at lg+ where the sidebar takes over. */}
			<nav
				aria-label="Section navigation"
				className="lg:hidden sticky top-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-8 bg-background/90 backdrop-blur-md border-b border-border z-20"
			>
				<div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
					{toc.map((t) => (
						<a
							key={t.id}
							href={`#${t.id}`}
							className="flex items-center gap-2 px-3 py-2 rounded-full border border-border text-body-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors whitespace-nowrap shrink-0"
						>
							<span className="text-mono-sm">{t.n}</span>
							<span>{t.label}</span>
						</a>
					))}
				</div>
			</nav>

			<div className="grid lg:grid-cols-[13rem_1fr] xl:grid-cols-[15rem_1fr] gap-10 lg:gap-12 xl:gap-16">
				<nav aria-label="Section navigation" className="hidden lg:block">
					<div className="sticky top-8 space-y-1">
						<p className="text-label-xs text-muted-foreground mb-3">Contents</p>
						{toc.map((t) => (
							<a
								key={t.id}
								href={`#${t.id}`}
								className="flex items-baseline gap-3 py-1.5 text-body-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								<span className="text-mono-sm w-6 shrink-0">{t.n}</span>
								<span>{t.label}</span>
							</a>
						))}
					</div>
				</nav>

				<main className="min-w-0">
					<BrandSection />
					<VoiceSection />
					<ColorSection />
					<TypographySection />
					<SpacingSection />
					<RadiiSection />
					<ElevationSection />
					<MotionSection />
					<IconographySection />
					<WritingSection />
					<PatternsSection />
					<MobileSection />
				</main>
			</div>
		</div>
	)
}
