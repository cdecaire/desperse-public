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
				fontSize: 28,
				color: "#ffffff",
				fontWeight: 500,
				letterSpacing: "-0.01em",
			}}
		>
			desperse.com
		</span>
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
	return postTemplateAlt(meta, imageDataUri, avatarDataUri)
}

function postTemplateAlt(
	meta: PostMeta,
	imageDataUri: string,
	avatarDataUri?: string | null,
) {
	const tone = getTypeTone(meta.type)
	return (
		<div
			style={{
				display: "flex",
				width: OG_WIDTH,
				height: OG_HEIGHT,
				fontFamily: "Figtree",
				position: "relative",
			}}
		>
			{/* Full-bleed image */}
			<img
				src={imageDataUri}
				width={OG_WIDTH}
				height={OG_HEIGHT}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%",
					objectFit: "cover",
				}}
			/>

			{/* Dark overlay */}
			<div
				style={{
					display: "flex",
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					backgroundColor: "rgba(9, 9, 11, 0.55)",
				}}
			/>

			{/* Accent bar */}
			<AccentBar color={tone.text} colorEnd={`${tone.text}40`} />

			{/* Logo + brand — top left */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 16,
					position: "absolute",
					top: 40,
					left: 48,
					zIndex: 1,
				}}
			>
				<DesperseLogoMark size={52} color="#ffffff" />
				<span
					style={{
						fontSize: 44,
						fontWeight: 800,
						color: "#ffffff",
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
					right: 48,
					zIndex: 1,
				}}
			>
				<span
					style={{
						fontSize: 28,
						color: "#ffffff",
						fontWeight: 500,
						letterSpacing: "-0.01em",
					}}
				>
					desperse.com
				</span>
			</div>

			{/* Content — bottom left */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "flex-end",
					padding: "0 48px 48px 48px",
					width: "100%",
					height: "100%",
					position: "relative",
					zIndex: 1,
					gap: 20,
				}}
			>
				{/* Creator row */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 18,
					}}
				>
					{avatarDataUri ? (
						<img
							src={avatarDataUri}
							width={72}
							height={72}
							style={{
								borderRadius: 36,
								objectFit: "cover",
								border: "3px solid rgba(255, 255, 255, 0.4)",
							}}
						/>
					) : (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								width: 72,
								height: 72,
								borderRadius: 36,
								backgroundColor: COLORS.accent,
								fontSize: 28,
								fontWeight: 700,
								color: "#ffffff",
							}}
						>
							{(meta.creatorName || meta.creatorSlug)[0].toUpperCase()}
						</div>
					)}
					<span
						style={{
							fontSize: 32,
							color: "#ffffff",
							fontWeight: 500,
						}}
					>
						{meta.creatorName || meta.creatorSlug}
					</span>
				</div>

				{/* Title */}
				<div
					style={{
						fontSize: 72,
						fontWeight: 700,
						color: "#ffffff",
						lineHeight: 1.1,
						letterSpacing: "-0.03em",
						overflow: "hidden",
						textOverflow: "ellipsis",
						lineClamp: 2,
						maxWidth: "80%",
					}}
				>
					{meta.shortTitle}
				</div>
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
				width: OG_WIDTH,
				height: OG_HEIGHT,
				backgroundColor: COLORS.bg,
				fontFamily: "Figtree",
				position: "relative",
			}}
		>
			<DotPattern />

			{/* Accent bar */}
			<AccentBar color={COLORS.accent} colorEnd={COLORS.accentLight} />

			{/* Header background image — right side */}
			{headerDataUri ? (
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
						src={headerDataUri}
						width={720}
						height={630}
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
							top: 0,
							bottom: 0,
							width: 360,
							background: `linear-gradient(to right, ${COLORS.bg}, ${COLORS.bg}00)`,
						}}
					/>
				</div>
			) : null}

			{/* Accent glow — bottom-left */}
			<div
				style={{
					display: "flex",
					position: "absolute",
					left: 0,
					bottom: 0,
					width: "50%",
					height: 200,
					background: `linear-gradient(to top, ${COLORS.accent}0a, ${COLORS.bg}00)`,
					zIndex: 1,
				}}
			/>

			{/* Left panel — content */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
					padding: "52px 56px",
					width: headerDataUri ? "50%" : "100%",
					position: "relative",
					zIndex: 1,
				}}
			>
				{/* Top spacer */}
				<div style={{ display: "flex" }} />

				{/* Middle: avatar + name + handle + bio */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 24,
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
									border: `4px solid ${COLORS.bg}`,
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
								fontSize: 64,
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
							fontSize: 72,
							fontWeight: 700,
							color: COLORS.text,
							letterSpacing: "-0.03em",
							lineHeight: 1.1,
							overflow: "hidden",
							textOverflow: "ellipsis",
							lineClamp: 2,
						}}
					>
						{meta.displayName}
					</div>

					{/* Username */}
					<div
						style={{
							display: "flex",
							fontSize: 36,
							color: COLORS.textMuted,
							marginTop: -8,
						}}
					>
						@{meta.slug}
					</div>

					{/* Bio */}
					{meta.bio ? (
						<div
							style={{
								display: "flex",
								fontSize: 28,
								color: COLORS.textMuted,
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

				{/* Bottom: watermark */}
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
					gap: 16,
					position: "absolute",
					top: 40,
					left: 48,
					zIndex: 1,
				}}
			>
				<DesperseLogoMark size={52} color="#ffffff" />
				<span
					style={{
						fontSize: 44,
						fontWeight: 800,
						color: COLORS.text,
						letterSpacing: "-0.02em",
						marginTop: 4,
					}}
				>
					Desperse
				</span>
			</div>

			{/* Bottom bar: tagline left, URL right */}
			<div
				style={{
					display: "flex",
					alignItems: "flex-end",
					justifyContent: "space-between",
					position: "absolute",
					bottom: 48,
					left: 48,
					right: 48,
					zIndex: 1,
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

				<Watermark />
			</div>
		</div>
	)
}
