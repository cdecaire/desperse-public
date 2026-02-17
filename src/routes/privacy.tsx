import { createFileRoute } from '@tanstack/react-router'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <StaticPageLayout>
      <article className="prose prose-zinc dark:prose-invert prose-p:my-4 max-w-none">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: January 3, 2026</p>

        <p>
          This Privacy Policy explains how we collect, use, and protect information when you use
          Desperse ("the App").
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Information We Collect</h2>
        <p>
          When you sign in using Instagram or other social providers, we may receive basic account
          information provided by those services, such as:
        </p>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>Account ID</li>
          <li>Username</li>
          <li>Profile information made available by the provider</li>
        </ul>
        <p>We do not collect passwords or private messages from social providers.</p>

        <h3 className="text-lg font-semibold mt-6 mb-3">Messaging Data</h3>
        <p>
          If you use the in-app messaging feature, we collect and store the following information:
        </p>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>Message content you send or receive</li>
          <li>Sender and recipient user IDs</li>
          <li>Message timestamps</li>
          <li>Read receipt metadata (for example, when a conversation was last read)</li>
        </ul>
        <p>Messages are text-only in the current version of the App.</p>

        <h2 className="text-xl font-semibold mt-8 mb-4">How We Use Information</h2>
        <p>We use this information solely to:</p>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>Authenticate you into the App</li>
          <li>Associate your social accounts with your user account</li>
          <li>Provide core application functionality</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">Data Storage and Security</h2>
        <p>
          We store only the minimum data necessary to operate the App. Reasonable technical and
          organizational measures are used to protect your information.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Data Sharing</h2>
        <p>
          We do not sell, rent, or share your personal information with third parties, except:
        </p>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>As required to operate the App</li>
          <li>As required by law</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">Data Deletion</h2>
        <p>You may request deletion of your data by contacting us at:</p>
        <p>
          <a
            href="mailto:support@desperse.app"
            className="text-foreground underline hover:no-underline"
          >
            support@desperse.app
          </a>
        </p>
        <p>
          Upon request, we will delete your associated data within a reasonable timeframe unless
          retention is required by law.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Third-Party Services</h2>
        <p>
          Our App uses Instagram APIs and other third-party services, and is subject to their
          respective terms and policies.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Contact</h2>
        <p>If you have questions about this Privacy Policy, contact:</p>
        <p>
          <a
            href="mailto:support@desperse.app"
            className="text-foreground underline hover:no-underline"
          >
            support@desperse.app
          </a>
        </p>
      </article>
    </StaticPageLayout>
  )
}
