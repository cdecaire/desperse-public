/** OG image templates for satori rendering */

import type { PostMeta } from "@/server/utils/post-meta"
import type { ProfileMeta } from "@/server/utils/profile-meta"
import { COLORS, TYPE_COLORS, LOGO_PATH, OG_WIDTH, OG_HEIGHT } from "./constants"

/** Inline Desperse logo as SVG for satori (scaled to given size) */
function DesperseLogoMark({ size = 40 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 473 500"
			fill="none"
		>
			<path d={LOGO_PATH} fill={COLORS.accentLight} />
		</svg>
	)
}

function Watermark() {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 10,
			}}
		>
			<DesperseLogoMark size={24} />
			<span
				style={{
					fontSize: 18,
					color: COLORS.textDim,
					fontWeight: 500,
					letterSpacing: "-0.01em",
				}}
			>
				desperse.com
			</span>
		</div>
	)
}

function TypeBadge({ type }: { type: string }) {
	const label =
		type === "edition"
			? "Edition"
			: type === "collectible"
				? "Collectible"
				: "Post"

	const tone = TYPE_COLORS[type as keyof typeof TYPE_COLORS] || TYPE_COLORS.post

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				backgroundColor: tone.bg,
				color: tone.text,
				fontSize: 14,
				fontWeight: 700,
				padding: "4px 12px",
				borderRadius: 6,
				textTransform: "uppercase" as const,
				letterSpacing: "0.05em",
			}}
		>
			{label}
		</div>
	)
}

// ─── Post OG Template ────────────────────────────────────────

function getTypeTone(type: string) {
	return TYPE_COLORS[type as keyof typeof TYPE_COLORS] || TYPE_COLORS.post
}

export function postTemplate(meta: PostMeta, imageDataUri: string | null) {
	if (imageDataUri) {
		return postTemplateWithImage(meta, imageDataUri)
	}
	return postTemplateNoImage(meta)
}

function postTemplateWithImage(meta: PostMeta, imageDataUri: string) {
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
			{/* Type-colored accent line at top */}
			<div
				style={{
					display: "flex",
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					height: 4,
					backgroundColor: tone.text,
					zIndex: 2,
				}}
			/>
			{/* Media image — right side, 55% width */}
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
				{/* Gradient overlay fading into background */}
				<div
					style={{
						display: "flex",
						position: "absolute",
						left: 0,
						top: 0,
						bottom: 0,
						width: 200,
						background: `linear-gradient(to right, ${COLORS.bg}, ${COLORS.bg}00)`,
					}}
				/>
			</div>

			{/* Left panel — text content */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
					padding: "48px 56px",
					width: "50%",
					position: "relative",
					zIndex: 1,
				}}
			>
				{/* Top: logo + type badge */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 16,
					}}
				>
					<DesperseLogoMark size={36} />
					<TypeBadge type={meta.type} />
				</div>

				{/* Middle: title + creator */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 16,
					}}
				>
					<div
						style={{
							fontSize: 36,
							fontWeight: 700,
							color: COLORS.text,
							lineHeight: 1.2,
							letterSpacing: "-0.02em",
							overflow: "hidden",
							textOverflow: "ellipsis",
							lineClamp: 2,
						}}
					>
						{meta.title}
					</div>
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
				</div>

				{/* Bottom: watermark */}
				<Watermark />
			</div>
		</div>
	)
}

function postTemplateNoImage(meta: PostMeta) {
	const tone = getTypeTone(meta.type)
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				width: OG_WIDTH,
				height: OG_HEIGHT,
				backgroundColor: COLORS.bg,
				fontFamily: "Figtree",
				padding: "48px 64px",
				position: "relative",
			}}
		>
			{/* Type-colored accent line at top */}
			<div
				style={{
					display: "flex",
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					height: 4,
					backgroundColor: tone.text,
				}}
			/>
			{/* Top: logo + badge */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 16,
				}}
			>
				<DesperseLogoMark size={36} />
				<TypeBadge type={meta.type} />
			</div>

			{/* Center: title + description */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 20,
				}}
			>
				<div
					style={{
						fontSize: 48,
						fontWeight: 700,
						color: COLORS.text,
						lineHeight: 1.15,
						letterSpacing: "-0.025em",
						overflow: "hidden",
						textOverflow: "ellipsis",
						lineClamp: 2,
					}}
				>
					{meta.title}
				</div>
				<div
					style={{
						fontSize: 22,
						color: COLORS.textMuted,
						lineHeight: 1.5,
						overflow: "hidden",
						textOverflow: "ellipsis",
						lineClamp: 2,
					}}
				>
					{meta.description}
				</div>
			</div>

			{/* Bottom: watermark */}
			<Watermark />
		</div>
	)
}

// ─── Profile OG Template ─────────────────────────────────────

export function profileTemplate(
	meta: ProfileMeta,
	avatarDataUri: string | null,
) {
	const initials = (meta.displayName || meta.slug)
		.split(/\s+/)
		.map((w) => w[0])
		.slice(0, 2)
		.join("")
		.toUpperCase()

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
			}}
		>
			{/* Subtle accent line at top */}
			<div
				style={{
					display: "flex",
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					height: 4,
					background: `linear-gradient(to right, ${COLORS.accent}, ${COLORS.accentLight})`,
				}}
			/>

			{/* Avatar */}
			{avatarDataUri ? (
				<img
					src={avatarDataUri}
					width={140}
					height={140}
					style={{
						borderRadius: 70,
						objectFit: "cover",
						border: `3px solid ${COLORS.border}`,
					}}
				/>
			) : (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: 140,
						height: 140,
						borderRadius: 70,
						backgroundColor: COLORS.accent,
						fontSize: 48,
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
					fontSize: 40,
					fontWeight: 700,
					color: COLORS.text,
					letterSpacing: "-0.02em",
				}}
			>
				{meta.displayName}
			</div>

			{/* Username */}
			<div
				style={{
					display: "flex",
					fontSize: 22,
					color: COLORS.textDim,
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

			{/* Watermark at bottom */}
			<div
				style={{
					display: "flex",
					position: "absolute",
					bottom: 32,
				}}
			>
				<Watermark />
			</div>
		</div>
	)
}

// ─── Default OG Template ─────────────────────────────────────

export function defaultTemplate() {
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
				gap: 28,
			}}
		>
			{/* Accent line at top */}
			<div
				style={{
					display: "flex",
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					height: 4,
					background: `linear-gradient(to right, ${COLORS.accent}, ${COLORS.accentLight})`,
				}}
			/>

			{/* Logo */}
			<DesperseLogoMark size={100} />

			{/* Brand name */}
			<div
				style={{
					fontSize: 56,
					fontWeight: 700,
					color: COLORS.text,
					letterSpacing: "-0.03em",
				}}
			>
				Desperse
			</div>

			{/* Tagline */}
			<div
				style={{
					fontSize: 22,
					color: COLORS.textMuted,
					textAlign: "center",
					maxWidth: 600,
					lineHeight: 1.5,
				}}
			>
				A Web3 creative platform for artists and collectors on Solana
			</div>
		</div>
	)
}
