import { createFileRoute } from '@tanstack/react-router'
import { Grid, Row, Stack } from '@cdecaire/sable/layout'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { DownloadBadge } from '@/components/shared/DownloadBadges'
import { Icon } from '@/components/ui/icon'

export const Route = createFileRoute('/download')({
	component: DownloadPage,
})

function DownloadPage() {
	return (
		<StaticPageLayout>
			<Stack gap={6}>
				<header>
					<Stack gap={2}>
						<p className="text-label-xs text-muted-foreground">
							Get the app
						</p>
						<h1 className="text-display-lg">
							Desperse, everywhere you create.
						</h1>
						<p className="text-body-lg text-muted-foreground max-w-xl">
							Native mobile apps for iOS and Android, plus a Solana dApp
							Store build for Saga and Seeker. Same wallet, same posts, same
							collection.
						</p>
					</Stack>
				</header>

				<section>
					<Grid cols={{ base: 1, md: 2 }} gap={3}>
						<PlatformCard
							platform="ios"
							title="iOS"
							status="Public Beta · TestFlight"
							description="Join the public TestFlight to get the latest iOS build with new features as they ship."
						/>
						<PlatformCard
							platform="solanaDappStore"
							title="Solana Mobile"
							status="Live · Saga & Seeker"
							description="Native build for Saga and Seeker, distributed through the on-chain Solana dApp Store. Open this page on your device to install."
						/>
						<PlatformCard
							platform="androidApk"
							title="Android"
							status="Direct download · APK"
							description="Sideload the APK directly. Google Play release coming after public beta."
							footnote={<AndroidInstallNotes />}
						/>
						<div className="border border-border rounded-xl p-6 bg-card/30">
							<Row gap={2} align="center" className="mb-3">
								<div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
									<Icon name="globe" variant="regular" className="text-base" />
								</div>
								<div>
									<p className="text-title-lg">Web</p>
									<p className="text-caption text-muted-foreground">
										desperse.com
									</p>
								</div>
							</Row>
							<p className="text-body-sm text-muted-foreground">
								No install required. Works in any modern browser, on any
								device.
							</p>
						</div>
					</Grid>
				</section>

				<section className="border-t border-border pt-8">
					<Stack gap={2}>
						<h2 className="text-label-xs text-muted-foreground">Help</h2>
						<p className="text-body-sm text-muted-foreground">
							Trouble installing? Email{' '}
							<a
								href="mailto:support@desperse.com"
								className="underline hover:text-foreground"
							>
								support@desperse.com
							</a>
							.
						</p>
					</Stack>
				</section>
			</Stack>
		</StaticPageLayout>
	)
}

interface PlatformCardProps {
	platform: 'ios' | 'solanaDappStore' | 'androidApk'
	title: string
	status: string
	description: string
	footnote?: React.ReactNode
}

function PlatformCard({ platform, title, status, description, footnote }: PlatformCardProps) {
	return (
		<Stack
			gap={2.5}
			className="border border-border rounded-xl p-6 bg-card/30"
		>
			<Row align="start" justify="between" gap={2}>
				<div>
					<p className="text-title-lg">{title}</p>
					<p className="text-caption text-muted-foreground mt-1">{status}</p>
				</div>
			</Row>
			<p className="text-body-sm text-muted-foreground">{description}</p>
			<div>
				<DownloadBadge platform={platform} size="md" />
			</div>
			{footnote}
		</Stack>
	)
}

function AndroidInstallNotes() {
	return (
		<details className="text-caption text-muted-foreground border-t border-border/60 pt-4">
			<summary className="cursor-pointer text-label-md hover:text-foreground transition-colors">
				How to install the APK
			</summary>
			<ol className="list-decimal pl-5 space-y-1.5 mt-3">
				<li>Tap the download button above to save the APK file.</li>
				<li>
					Open the file from your downloads. Android will prompt you to allow
					installs from this source — accept once.
				</li>
				<li>Tap install, then open Desperse.</li>
			</ol>
			<p className="mt-3">
				The APK is signed by Desperse. If you're concerned, verify the SHA-256
				against the value listed on the download page after release.
			</p>
		</details>
	)
}

