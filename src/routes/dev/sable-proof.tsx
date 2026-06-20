/**
 * Dev route — @cdecaire/sable visual verification (Phase 2). Route: /dev/sable-proof
 *
 * Unauthenticated showcase so the Sable Button swap can be eyeballed without
 * logging in. The landing page uses its OWN custom marketing buttons, so the
 * migration isn't visible there — this route renders the actual migrated Button.
 *
 * Tells that this is really Sable (not the old shadcn Button):
 *   - HOVER: smooth color transition (motion-interactive recipe).
 *   - PRESS & HOLD: the button scales down to 0.97 (motion-press) — the old
 *     button had no press feedback.
 * Throwaway route — delete when done verifying.
 */
import { PageHeader } from '@cdecaire/sable'
import { Region, Row, Stack } from '@cdecaire/sable/layout'
import { createFileRoute } from '@tanstack/react-router'
// The app's shimmed Button (now backed by @cdecaire/sable's Button under the hood).
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/dev/sable-proof')({
	component: SableProof,
})

function SableProof() {
	return (
		<div className="min-h-screen bg-background p-10 text-foreground">
			<Region max="56rem" inset={false}>
				<Stack gap={4}>
					<PageHeader
						title="Sable Button — visual check"
						description={
							<>
								These use the app's <code>@/components/ui/button</code>, now
								rendering @cdecaire/sable's Button.{' '}
								<strong>Press &amp; hold</strong> one — it scales down (Sable's{' '}
								<code>motion-press</code>). <strong>Hover</strong> — smooth color
								transition. The old button did neither.
							</>
						}
					/>

					<Stack gap={1.5}>
						<h2 className="text-label-xs text-muted-foreground">Legacy shadcn API (variant / size)</h2>
						<Row gap={1.5} align="center" wrap>
							<Button variant="default">Default</Button>
							<Button variant="secondary">Secondary</Button>
							<Button variant="outline">Outline</Button>
							<Button variant="ghost">Ghost</Button>
							<Button variant="destructive">Destructive</Button>
							<Button variant="link">Link</Button>
						</Row>
						<Row gap={1.5} align="center" wrap>
							<Button size="default">Default size</Button>
							<Button size="cta">CTA</Button>
							<Button size="default" disabled>Disabled</Button>
						</Row>
					</Stack>

					<Stack gap={1.5}>
						<h2 className="text-label-xs text-muted-foreground">asChild → render (renders an anchor, button-styled)</h2>
						<Row gap={1.5} align="center" wrap>
							<Button asChild variant="outline">
								<a href="#proof">As link (asChild)</a>
							</Button>
						</Row>
					</Stack>
				</Stack>
			</Region>
		</div>
	)
}
