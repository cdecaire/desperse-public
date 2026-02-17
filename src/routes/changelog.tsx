import { createFileRoute } from '@tanstack/react-router'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'

export const Route = createFileRoute('/changelog')({
  component: ChangelogPage,
})

function ChangelogPage() {
  return (
    <StaticPageLayout>
      <article className="prose prose-zinc dark:prose-invert prose-p:my-4 max-w-none">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Changelog</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: February 16, 2026</p>

        <p>
          This page highlights recent updates and improvements to Desperse. We're constantly working
          to make the platform better for creators and collectors.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-sparkles text-muted-foreground" aria-hidden="true" />
          Latest Updates (February 2026)
        </h2>

        <h3 className="text-lg font-semibold mt-6 mb-3">Tip Your Favorite Creators</h3>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>
            <strong>Tipping</strong>: Send SKR tips directly to creators from their profile -
            a new way to support the artists you love
          </li>
          <li>
            <strong>Tip History</strong>: Tips show up in your wallet activity feed and on creator profiles
            so you can track your support
          </li>
        </ul>

        <h3 className="text-lg font-semibold mt-6 mb-3">Multi-Wallet Support</h3>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>
            <strong>Multiple Wallets</strong>: Connect and manage multiple Solana wallets from your
            account - see balances, NFTs, and activity per wallet
          </li>
          <li>
            <strong>Per-Wallet Views</strong>: Filter NFTs and transaction history by individual wallet
          </li>
        </ul>

        <h3 className="text-lg font-semibold mt-6 mb-3">Push Notifications</h3>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>
            <strong>Real-Time Alerts</strong>: Get push notifications for new followers, likes, comments,
            collects, purchases, and messages - even when the app is closed
          </li>
        </ul>

        <h3 className="text-lg font-semibold mt-6 mb-3">Android App (Beta)</h3>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>
            <strong>Native Android</strong>: Desperse is coming to Android with a native app experience -
            sign in directly with Phantom, Solflare, or any Solana wallet to browse, collect, and
            create on the go
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-comments text-muted-foreground" aria-hidden="true" />
          January 2026
        </h2>

        <h3 className="text-lg font-semibold mt-6 mb-3">Direct Messaging</h3>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>
            <strong>DMs</strong>: Message creators and collectors directly - start conversations with
            people whose work you collect or who collect yours
          </li>
          <li>
            <strong>Messaging Preferences</strong>: Control who can message you based on collection
            history, purchases, or mutual interactions
          </li>
          <li>
            <strong>Real-Time Chat</strong>: Messages delivered instantly with read receipts
          </li>
        </ul>

        <h3 className="text-lg font-semibold mt-6 mb-3">Timed Editions</h3>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>
            <strong>Limited-Time Sales</strong>: Set a time window for edition sales - create urgency
            and exclusivity for your drops
          </li>
        </ul>

        <h3 className="text-lg font-semibold mt-6 mb-3">Social Connections</h3>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>
            <strong>@Mentions</strong>: Tag creators and collectors in posts and comments - perfect for
            collaborations and shoutouts
          </li>
          <li>
            <strong>Smart Search</strong>: Find content instantly with hashtag and category search
          </li>
          <li>
            <strong>Pull to Refresh</strong>: Smooth mobile experience with pull-to-refresh on feeds
          </li>
          <li>
            <strong>Notification Controls</strong>: Choose what notifications matter most to you
          </li>
          <li>
            <strong>Collector Showcase</strong>: See who's collecting your work on profile pages
          </li>
        </ul>

        <h3 className="text-lg font-semibold mt-6 mb-3">Enhanced Content Creation</h3>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>
            <strong>Multi-Asset Posts</strong>: Upload multiple images and videos in a single post with a carousel view - perfect for showcasing collections, tutorials, or story sequences
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-palette text-muted-foreground" aria-hidden="true" />
          Design & Experience (December 2025)
        </h2>

        <h3 className="text-lg font-semibold mt-6 mb-3">Fresh New Look</h3>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>Complete visual refresh with a modern color palette</li>
          <li>Improved mobile navigation and touch interactions</li>
          <li>Better loading states so you know what's happening</li>
          <li>Dark mode polish for comfortable viewing</li>
        </ul>

        <h3 className="text-lg font-semibold mt-6 mb-3">Creator Tools</h3>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>Personalize your experience with user preferences</li>
          <li>Enhanced profile customization options</li>
          <li>Better form experiences for creating and editing</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-lock text-muted-foreground" aria-hidden="true" />
          Premium Content Features
        </h2>

        <h3 className="text-lg font-semibold mt-6 mb-3">Protect Your Digital Assets</h3>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>Lock PDFs and other files behind NFT ownership</li>
          <li>Secure download system for premium content</li>
          <li>Support for multiple file types (PDFs, 3D models, and more)</li>
          <li>Flexible pricing for different content tiers</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-comments text-muted-foreground" aria-hidden="true" />
          Community Building
        </h2>

        <h3 className="text-lg font-semibold mt-6 mb-3">Connect & Engage</h3>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>Comment on posts and build discussions</li>
          <li>Like content to show appreciation</li>
          <li>Real-time notifications for interactions</li>
          <li>Follow creator updates and new releases</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-rocket text-muted-foreground" aria-hidden="true" />
          Platform Stability
        </h2>

        <h3 className="text-lg font-semibold mt-6 mb-3">Reliable & Secure</h3>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>Enhanced security with regular audits</li>
          <li>Improved payment processing with USDC</li>
          <li>Better mobile experience across devices</li>
          <li>Faster loading and smoother interactions</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-image text-muted-foreground" aria-hidden="true" />
          NFT Creation & Management
        </h2>

        <h3 className="text-lg font-semibold mt-6 mb-3">Easy Minting</h3>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>Create edition-based NFTs with custom metadata</li>
          <li>Set supply limits and pricing</li>
          <li>Professional metadata management</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-mobile-screen-button text-muted-foreground" aria-hidden="true" />
          Mobile-First Experience
        </h2>

        <h3 className="text-lg font-semibold mt-6 mb-3">Works Great Everywhere</h3>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>Progressive Web App (PWA) for app-like experience</li>
          <li>Optimized mobile interfaces</li>
          <li>Touch-friendly interactions</li>
          <li>Offline-capable features</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-star text-muted-foreground" aria-hidden="true" />
          Getting Started
        </h2>

        <h3 className="text-lg font-semibold mt-6 mb-3">Welcome to Desperse</h3>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>Simple wallet connection</li>
          <li>Guided profile setup</li>
          <li>Explore trending content</li>
          <li>Start creating or collecting immediately</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">Stay Updated</h2>
        <p>
          We're constantly improving Desperse. Check back here regularly to see what's new, or follow
          us on{' '}
          <a
            href="https://x.com/DesperseApp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline hover:no-underline"
          >
            X (Twitter)
          </a>{' '}
          for the latest updates.
        </p>
      </article>
    </StaticPageLayout>
  )
}