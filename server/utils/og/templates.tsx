/** OG image templates for satori rendering */

import type { PostMeta } from "@/server/utils/post-meta"
import type { ProfileMeta } from "@/server/utils/profile-meta"
import { COLORS, TYPE_COLORS, LOGO_PATH, DOT_PATTERN_URI, OG_WIDTH, OG_HEIGHT } from "./constants"

/** Inline Desperse logo as SVG for satori (scaled to given size) */
function DesperseLogoMark({ size = 40, color }: { size?: number; color?: string }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 473 500"
			fill="none"
		>
			<path d={LOGO_PATH} fill={color || COLORS.accentLight} />
		</svg>
	)
}

function Watermark() {
	return (
		<span
			style={{
				fontSize: 18,
				color: COLORS.textMuted,
				fontWeight: 500,
				letterSpacing: "-0.01em",
			}}
		>
			desperse.com
		</span>
	)
}

function TypeBadge({ type }: { type: string }) {
	const label = type === "edition" ? "Edition" : type === "collectible" ? "Collectible" : "Post"
	const tone = TYPE_COLORS[type as keyof typeof TYPE_COLORS] || TYPE_COLORS.post

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				color: tone.text,
				fontSize: 14,
				fontWeight: 700,
				textTransform: "uppercase" as const,
				letterSpacing: "0.08em",
				backgroundColor: `${tone.text}20`,
				padding: "6px 14px",
				borderRadius: 6,
			}}
		>
			{label}
		</div>
	)
}

/** Dot pattern background overlay */
function DotPattern() {
	return (
		<img
			src={DOT_PATTERN_URI}
			width={OG_WIDTH}
			height={OG_HEIGHT}
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				opacity: 0.25,
			}}
		/>
	)
}

/** Bold gradient accent bar — 12px, type-colored or accent gradient */
function AccentBar({ color, colorEnd }: { color: string; colorEnd?: string }) {
	return (
		<div
			style={{
				display: "flex",
				position: "absolute",
				top: 0,
				left: 0,
				right: 0,
				height: 12,
				background: colorEnd
					? `linear-gradient(to right, ${color}, ${colorEnd})`
					: color,
				zIndex: 2,
			}}
		/>
	)
}

// ─── Post OG Template ────────────────────────────────────────

function getTypeTone(type: string) {
	return TYPE_COLORS[type as keyof typeof TYPE_COLORS] || TYPE_COLORS.post
}

export function postTemplate(
	meta: PostMeta,
	imageDataUri: string,
	avatarDataUri?: string | null,
) {
	return postTemplateWithImage(meta, imageDataUri, avatarDataUri)
}

function CreatorRow({
	meta,
	avatarDataUri,
	size = 48,
}: {
	meta: PostMeta
	avatarDataUri?: string | null
	size?: number
}) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 14,
			}}
		>
			{avatarDataUri ? (
				<img
					src={avatarDataUri}
					width={size}
					height={size}
					style={{
						borderRadius: size / 2,
						objectFit: "cover",
						border: `2px solid ${COLORS.accent}44`,
					}}
				/>
			) : (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: size,
						height: size,
						borderRadius: size / 2,
						backgroundColor: COLORS.accent,
						fontSize: size * 0.4,
						fontWeight: 700,
						color: COLORS.text,
					}}
				>
					{(meta.creatorName || meta.creatorSlug)[0].toUpperCase()}
				</div>
			)}
			<div
				style={{
					display: "flex",
					fontSize: 22,
					color: COLORS.text,
					fontWeight: 500,
					overflow: "hidden",
					textOverflow: "ellipsis",
					lineClamp: 1,
				}}
			>
				{meta.creatorName || meta.creatorSlug}
			</div>
		</div>
	)
}

function postTemplateWithImage(meta: PostMeta, imageDataUri: string, avatarDataUri?: string | null) {
	const tone = getTypeTone(meta.type)
	return (
		<div
			style={{
				display: "flex",
				width: OG_WIDTH,
				height: OG_HEIGHT,
				backgroundColor: COLORS.bg,
				fontFamily: "Figtree",
				position: "relative",
			}}
		>
			<DotPattern />

			{/* Bold gradient accent bar */}
			<AccentBar color={tone.text} colorEnd={`${tone.text}40`} />

			{/* Media image — right side */}
			<div
				style={{
					display: "flex",
					position: "absolute",
					right: 0,
					top: 0,
					bottom: 0,
					width: "60%",
				}}
			>
				<img
					src={imageDataUri}
					width={720}
					height={630}
					style={{
						objectFit: "cover",
						width: "100%",
						height: "100%",
					}}
				/>
				{/* Wide dramatic gradient fade */}
				<div
					style={{
						display: "flex",
						position: "absolute",
						left: 0,
						top: 0,
						bottom: 0,
						width: 360,
						background: `linear-gradient(to right, ${COLORS.bg}, ${COLORS.bg}00)`,
					}}
				/>
			</div>

			{/* Accent glow zone — bottom-left depth */}
			<div
				style={{
					display: "flex",
					position: "absolute",
					left: 0,
					bottom: 0,
					width: "50%",
					height: 200,
					background: `linear-gradient(to top, ${tone.text}0a, ${COLORS.bg}00)`,
					zIndex: 1,
				}}
			/>

			{/* Left panel — text content */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
					padding: "52px 56px",
					width: "50%",
					position: "relative",
					zIndex: 1,
				}}
			>
				{/* Top: type badge (only for editions/collectibles) */}
				{meta.type !== "post" ? <TypeBadge type={meta.type} /> : null}

				{/* Middle: avatar + title + description */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 18,
					}}
				>
					<CreatorRow meta={meta} avatarDataUri={avatarDataUri} size={48} />
					<div
						style={{
							fontSize: 48,
							fontWeight: 700,
							color: COLORS.text,
							lineHeight: 1.1,
							letterSpacing: "-0.03em",
							overflow: "hidden",
							textOverflow: "ellipsis",
							lineClamp: 2,
						}}
					>
						{meta.shortTitle}
					</div>
					{meta.description ? (
					<div
						style={{
							fontSize: 18,
							color: COLORS.textMuted,
							lineHeight: 1.5,
							overflow: "hidden",
							textOverflow: "ellipsis",
							lineClamp: 2,
						}}
					>
						{meta.description}
					</div>
				) : null}
				</div>

				{/* Bottom: watermark */}
				<Watermark />
			</div>
		</div>
	)
}

// ─── Profile OG Template ─────────────────────────────────────

export function profileTemplate(
	meta: ProfileMeta,
	avatarDataUri: string | null,
	headerDataUri?: string | null,
) {
	const initials = (meta.displayName || meta.slug)
		.split(/\s+/)
		.map((w) => w[0])
		.slice(0, 2)
		.join("")
		.toUpperCase()

	const avatarSize = 160

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				width: OG_WIDTH,
				height: OG_HEIGHT,
				backgroundColor: COLORS.bg,
				fontFamily: "Figtree",
				gap: 24,
				position: "relative",
			}}
		>
			<DotPattern />

			{/* Header background image */}
			{headerDataUri ? (
				<div
					style={{
						display: "flex",
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						height: 340,
					}}
				>
					<img
						src={headerDataUri}
						width={OG_WIDTH}
						height={340}
						style={{
							objectFit: "cover",
							width: "100%",
							height: "100%",
						}}
					/>
					{/* Gradient fade into background */}
					<div
						style={{
							display: "flex",
							position: "absolute",
							left: 0,
							right: 0,
							bottom: 0,
							height: 220,
							background: `linear-gradient(to bottom, ${COLORS.bg}00, ${COLORS.bg})`,
						}}
					/>
					{/* Subtle darken for readability */}
					<div
						style={{
							display: "flex",
							position: "absolute",
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							backgroundColor: "rgba(9, 9, 11, 0.2)",
						}}
					/>
				</div>
			) : (
				<>
					{/* Bold gradient accent bar */}
					<AccentBar color={COLORS.accent} colorEnd={COLORS.accentLight} />
					{/* Accent glow behind content */}
					<div
						style={{
							display: "flex",
							position: "absolute",
							left: 0,
							right: 0,
							top: 0,
							height: 300,
							background: `linear-gradient(to bottom, ${COLORS.accent}0c, ${COLORS.bg}00)`,
						}}
					/>
				</>
			)}

			{/* Content — z-index above header bg */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					position: "relative",
					zIndex: 1,
					gap: 24,
					width: "100%",
					height: "100%",
					paddingTop: headerDataUri ? 40 : 0,
				}}
			>
				{/* Avatar with accent ring */}
				{avatarDataUri ? (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							width: avatarSize + 8,
							height: avatarSize + 8,
							borderRadius: (avatarSize + 8) / 2,
							background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentLight})`,
						}}
					>
						<img
							src={avatarDataUri}
							width={avatarSize}
							height={avatarSize}
							style={{
								borderRadius: avatarSize / 2,
								objectFit: "cover",
								border: `3px solid ${COLORS.bg}`,
							}}
						/>
					</div>
				) : (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							width: avatarSize,
							height: avatarSize,
							borderRadius: avatarSize / 2,
							backgroundColor: COLORS.accent,
							fontSize: 56,
							fontWeight: 700,
							color: COLORS.text,
						}}
					>
						{initials}
					</div>
				)}

				{/* Name */}
				<div
					style={{
						display: "flex",
						fontSize: 52,
						fontWeight: 700,
						color: COLORS.text,
						letterSpacing: "-0.03em",
						maxWidth: "90%",
						overflow: "hidden",
						textOverflow: "ellipsis",
						lineClamp: 1,
					}}
				>
					{meta.displayName}
				</div>

				{/* Username */}
				<div
					style={{
						display: "flex",
						fontSize: 24,
						color: COLORS.textMuted,
						marginTop: -16,
					}}
				>
					@{meta.slug}
				</div>

				{/* Bio */}
				{meta.bio ? (
					<div
						style={{
							display: "flex",
							fontSize: 20,
							color: COLORS.textMuted,
							textAlign: "center",
							maxWidth: 700,
							lineHeight: 1.5,
							overflow: "hidden",
							textOverflow: "ellipsis",
							lineClamp: 2,
						}}
					>
						{meta.bio}
					</div>
				) : null}
			</div>

			{/* Watermark at bottom */}
			<div
				style={{
					display: "flex",
					position: "absolute",
					bottom: 32,
					zIndex: 1,
				}}
			>
				<Watermark />
			</div>
		</div>
	)
}

// ─── Default OG Template ─────────────────────────────────────
// Mirrors the landing page hero: dot pattern, stacked tagline, left-aligned

export function defaultTemplate() {
	return (
		<div
			style={{
				display: "flex",
				width: OG_WIDTH,
				height: OG_HEIGHT,
				backgroundColor: COLORS.bg,
				fontFamily: "Figtree",
				position: "relative",
			}}
		>
			<DotPattern />

			{/* Logo + brand name — top left */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 10,
					position: "absolute",
					top: 48,
					left: 80,
					zIndex: 1,
				}}
			>
				<DesperseLogoMark size={32} />
				<span
					style={{
						fontSize: 28,
						fontWeight: 800,
						color: COLORS.text,
						letterSpacing: "-0.02em",
						marginTop: 4,
					}}
				>
					Desperse
				</span>
			</div>

			{/* URL — bottom right */}
			<div
				style={{
					display: "flex",
					position: "absolute",
					bottom: 48,
					right: 80,
					zIndex: 1,
				}}
			>
				<Watermark />
			</div>

			{/* Content — left-aligned like the landing hero */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					padding: "0 80px",
					position: "relative",
					zIndex: 1,
					width: "100%",
					height: "100%",
				}}
			>

				{/* Stacked tagline — CREATE. COLLECT. OWN. */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
					}}
				>
					<div
						style={{
							fontSize: 128,
							fontWeight: 900,
							color: COLORS.text,
							lineHeight: 0.9,
							letterSpacing: "-0.04em",
						}}
					>
						CREATE.
					</div>
					<div
						style={{
							fontSize: 128,
							fontWeight: 900,
							color: COLORS.text,
							lineHeight: 0.9,
							letterSpacing: "-0.04em",
						}}
					>
						COLLECT.
					</div>
					<div
						style={{
							fontSize: 128,
							fontWeight: 900,
							color: COLORS.textMuted,
							lineHeight: 0.9,
							letterSpacing: "-0.04em",
						}}
					>
						OWN.
					</div>
				</div>
			</div>
		</div>
	)
}
