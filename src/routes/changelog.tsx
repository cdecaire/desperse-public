import { createFileRoute } from '@tanstack/react-router'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'
import { Icon } from '@/components/ui/icon'

export const Route = createFileRoute('/changelog')({
  component: ChangelogPage,
})

function ChangelogPage() {
  return (
    <StaticPageLayout>
      <article className="max-w-none [&>p]:text-body-lg [&>p]:mb-4 [&>ul]:mb-4 [&>ul]:pl-6 [&>ul]:list-disc [&>ul]:space-y-1 [&_li]:text-body-lg">
        <h1 className="text-heading-1 mb-2">Changelog</h1>
        <p className="text-body-sm! text-muted-foreground mb-8">Last updated: April 30, 2026</p>

        <p>
          This page highlights recent updates and improvements to Desperse. We're constantly working
          to make the platform better for creators and collectors.
        </p>

        <h2 className="text-heading-2 mt-12 mb-3 flex items-center gap-2">
          <Icon name="sparkles" className="text-muted-foreground" />
          Latest Updates (April 2026)
        </h2>

        <h3 className="text-heading-3 mt-8 mb-2">Account Blocking</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>
            <strong>Block Anyone</strong>: Block accounts directly from a post's overflow menu or from
            their profile. Blocks are mutual — once you block someone, neither of you sees the other's
            posts, profile, comments, mentions, or messages
          </li>
          <li>
            <strong>Blocked Accounts Settings</strong>: A new <em>Settings → Blocked Accounts</em>{' '}
            page lists everyone you've blocked, with one-tap unblock
          </li>
          <li>
            <strong>Quiet by Design</strong>: Blocks are never disclosed to the other person, and no
            notifications are sent in either direction
          </li>
        </ul>

        <h2 className="text-heading-2 mt-12 mb-3 flex items-center gap-2">
          <Icon name="sparkles" className="text-muted-foreground" />
          March 2026
        </h2>

        <h3 className="text-heading-3 mt-8 mb-2">Creator Rights & Provenance</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>
            <strong>Per-Post Licensing</strong>: Choose from Creative Commons presets (CC BY, CC BY-SA,
            CC BY-NC, CC0, and more), All Rights Reserved, or enter a custom license for each post
          </li>
          <li>
            <strong>On-Chain Rights</strong>: Copyright holder, license, and rights statement are stamped
            directly into NFT metadata when collectors mint your work
          </li>
          <li>
            <strong>Default Copyright Settings</strong>: Set your preferred license, rights holder, and
            statement once in Settings — they auto-fill on every new post
          </li>
          <li>
            <strong>Provenance Display</strong>: License and rights holder shown on post detail pages,
            with full rights statement available on hover
          </li>
        </ul>

        <h3 className="text-heading-3 mt-8 mb-2">Content Moderation & Safety</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>
            <strong>Updated Terms of Service</strong>: Stronger copyright protection and clearer
            moderation policies for creators
          </li>
        </ul>

        <h3 className="text-heading-3 mt-8 mb-2">Redesigned Landing Page</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>
            <strong>New Landing Experience</strong>: Animated sections with creator previews
            that showcase what Desperse is all about
          </li>
        </ul>

        <h3 className="text-heading-3 mt-8 mb-2">Post Detail Upgrades</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>
            <strong>Collectors List</strong>: See who has collected a post directly on the post detail page
          </li>
          <li>
            <strong>Comment Sheet</strong>: Mobile-friendly comment panel for easier conversations
          </li>
        </ul>

        <h3 className="text-heading-3 mt-8 mb-2">Feed & Interaction Polish</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>
            <strong>Smarter Search</strong>: Keyboard navigation and improved accessibility in the search dropdown
          </li>
          <li>
            <strong>Cleaner Collect Flow</strong>: Collect button hides after you've already collected,
            and inline comment forms feel more natural
          </li>
          <li>
            <strong>Responsive Images</strong>: Media carousel now serves optimized image sizes for
            faster loading on all devices
          </li>
          <li>
            <strong>Performance</strong>: Countdown timers pause when scrolled off-screen,
            and purchase polling uses smarter backoff to reduce network requests
          </li>
        </ul>

        <h2 className="text-heading-2 mt-12 mb-3 flex items-center gap-2">
          <Icon name="sparkles" className="text-muted-foreground" />
          February 2026
        </h2>

        <h3 className="text-heading-3 mt-8 mb-2">Tip Your Favorite Creators</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>
            <strong>Tipping</strong>: Send SKR tips directly to creators from their profile -
            a new way to support the artists you love
          </li>
          <li>
            <strong>Tip History</strong>: Tips show up in your wallet activity feed and on creator profiles
            so you can track your support
          </li>
        </ul>

        <h3 className="text-heading-3 mt-8 mb-2">Multi-Wallet Support</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>
            <strong>Multiple Wallets</strong>: Connect and manage multiple Solana wallets from your
            account - see balances, NFTs, and activity per wallet
          </li>
          <li>
            <strong>Per-Wallet Views</strong>: Filter NFTs and transaction history by individual wallet
          </li>
        </ul>

        <h3 className="text-heading-3 mt-8 mb-2">Push Notifications</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>
            <strong>Real-Time Alerts</strong>: Get push notifications for new followers, likes, comments,
            collects, purchases, and messages - even when the app is closed
          </li>
        </ul>

        <h3 className="text-heading-3 mt-8 mb-2">Android App (Beta)</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>
            <strong>Native Android</strong>: Desperse is coming to Android with a native app experience -
            sign in directly with Phantom, Solflare, or any Solana wallet to browse, collect, and
            create on the go
          </li>
        </ul>

        <h2 className="text-heading-2 mt-12 mb-3 flex items-center gap-2">
          <Icon name="comments" className="text-muted-foreground" />
          January 2026
        </h2>

        <h3 className="text-heading-3 mt-8 mb-2">Direct Messaging</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
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

        <h3 className="text-heading-3 mt-8 mb-2">Timed Editions</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>
            <strong>Limited-Time Sales</strong>: Set a time window for edition sales - create urgency
            and exclusivity for your drops
          </li>
        </ul>

        <h3 className="text-heading-3 mt-8 mb-2">Social Connections</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
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

        <h3 className="text-heading-3 mt-8 mb-2">Enhanced Content Creation</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>
            <strong>Multi-Asset Posts</strong>: Upload multiple images and videos in a single post with a carousel view - perfect for showcasing collections, tutorials, or story sequences
          </li>
        </ul>

        <h2 className="text-heading-2 mt-12 mb-3 flex items-center gap-2">
          <Icon name="palette" className="text-muted-foreground" />
          Design & Experience (December 2025)
        </h2>

        <h3 className="text-heading-3 mt-8 mb-2">Fresh New Look</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>Complete visual refresh with a modern color palette</li>
          <li>Improved mobile navigation and touch interactions</li>
          <li>Better loading states so you know what's happening</li>
          <li>Dark mode polish for comfortable viewing</li>
        </ul>

        <h3 className="text-heading-3 mt-8 mb-2">Creator Tools</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>Personalize your experience with user preferences</li>
          <li>Enhanced profile customization options</li>
          <li>Better form experiences for creating and editing</li>
        </ul>

        <h2 className="text-heading-2 mt-12 mb-3 flex items-center gap-2">
          <Icon name="lock" className="text-muted-foreground" />
          Premium Content Features
        </h2>

        <h3 className="text-heading-3 mt-8 mb-2">Protect Your Digital Assets</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>Lock PDFs and other files behind NFT ownership</li>
          <li>Secure download system for premium content</li>
          <li>Support for multiple file types (PDFs, 3D models, and more)</li>
          <li>Flexible pricing for different content tiers</li>
        </ul>

        <h2 className="text-heading-2 mt-12 mb-3 flex items-center gap-2">
          <Icon name="comments" className="text-muted-foreground" />
          Community Building
        </h2>

        <h3 className="text-heading-3 mt-8 mb-2">Connect & Engage</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>Comment on posts and build discussions</li>
          <li>Like content to show appreciation</li>
          <li>Real-time notifications for interactions</li>
          <li>Follow creator updates and new releases</li>
        </ul>

        <h2 className="text-heading-2 mt-12 mb-3 flex items-center gap-2">
          <Icon name="rocket" className="text-muted-foreground" />
          Platform Stability
        </h2>

        <h3 className="text-heading-3 mt-8 mb-2">Reliable & Secure</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>Enhanced security with regular audits</li>
          <li>Improved payment processing with USDC</li>
          <li>Better mobile experience across devices</li>
          <li>Faster loading and smoother interactions</li>
        </ul>

        <h2 className="text-heading-2 mt-12 mb-3 flex items-center gap-2">
          <Icon name="image" className="text-muted-foreground" />
          NFT Creation & Management
        </h2>

        <h3 className="text-heading-3 mt-8 mb-2">Easy Minting</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>Create edition-based NFTs with custom metadata</li>
          <li>Set supply limits and pricing</li>
          <li>Professional metadata management</li>
        </ul>

        <h2 className="text-heading-2 mt-12 mb-3 flex items-center gap-2">
          <Icon name="mobile-screen-button" className="text-muted-foreground" />
          Mobile-First Experience
        </h2>

        <h3 className="text-heading-3 mt-8 mb-2">Works Great Everywhere</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>Progressive Web App (PWA) for app-like experience</li>
          <li>Optimized mobile interfaces</li>
          <li>Touch-friendly interactions</li>
          <li>Offline-capable features</li>
        </ul>

        <h2 className="text-heading-2 mt-12 mb-3 flex items-center gap-2">
          <Icon name="star" className="text-muted-foreground" />
          Getting Started
        </h2>

        <h3 className="text-heading-3 mt-8 mb-2">Welcome to Desperse</h3>
        <ul className="list-disc pl-6 space-y-1 mb-4">
          <li>Simple wallet connection</li>
          <li>Guided profile setup</li>
          <li>Explore trending content</li>
          <li>Start creating or collecting immediately</li>
        </ul>

        <h2 className="text-heading-2 mt-12 mb-3">Stay Updated</h2>
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