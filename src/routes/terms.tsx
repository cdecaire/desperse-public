import { createFileRoute } from '@tanstack/react-router'
import { StaticPageLayout } from '@/components/layout/StaticPageLayout'

export const Route = createFileRoute('/terms')({
  component: TermsPage,
})

function TermsPage() {
  return (
    <StaticPageLayout>
      <article className="prose prose-zinc dark:prose-invert prose-p:my-4 max-w-none">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: January 3, 2026</p>

        <p>
          By accessing or using Desperse ("the App"), you agree to these Terms of Service.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Use of the App</h2>
        <p>
          You agree to use the App only for lawful purposes and in compliance with all applicable
          laws and platform policies.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Accounts</h2>
        <p>
          When you sign in with Instagram or other social providers, you authorize the App to access
          basic account information as permitted by those services.
        </p>
        <p>
          You are responsible for maintaining the security of your account and for all activity that
          occurs under your account.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">User Content, Uploads, Minted Assets, and Messages</h2>
        <p>
          The App allows users to upload, publish, mint, sell, download, and exchange digital
          content, including but not limited to images, audio files, video files, compressed
          files, text, messages, and other media ("User Content").
        </p>
        <p>This includes direct messages and other communications sent through the App.</p>
        <p>
          Desperse does not verify, review, or confirm ownership, authorship, licensing, accuracy,
          or intellectual property rights associated with User Content. Users are solely responsible
          for ensuring that they have all necessary rights, permissions, and licenses to upload,
          mint, distribute, sell, message, or otherwise make User Content available through the
          App.
        </p>
        <p>
          Any representation of ownership, authenticity, or rights associated with User Content is
          made solely by the user who created or submitted such content and not by Desperse.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Messaging and User Communications</h2>
        <p>
          The App may allow users to communicate directly with one another through in-app messaging
          features.
        </p>
        <p>By using messaging features, you acknowledge and agree that:</p>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>Messages are user-generated content</li>
          <li>Desperse does not guarantee message delivery, retention, or confidentiality</li>
          <li>Messaging is not end-to-end encrypted</li>
          <li>
            Messages may be stored, processed, and accessed as necessary to operate the App, enforce
            these Terms, prevent abuse, comply with legal obligations, or respond to user reports
          </li>
        </ul>
        <p>
          You are solely responsible for the content of messages you send and for your interactions
          with other users.
        </p>
        <p>
          Desperse does not endorse, verify, or assume responsibility for communications between
          users and is not liable for any harm, loss, or dispute arising from user-to-user messaging.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Acceptable Use and Conduct (Messaging)</h2>
        <p>You may not use messaging features to:</p>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>Harass, threaten, abuse, defraud, or impersonate others</li>
          <li>Send unlawful, infringing, misleading, or harmful content</li>
          <li>Attempt to bypass access controls, rate limits, or eligibility requirements</li>
          <li>Send spam or unsolicited commercial messages</li>
        </ul>
        <p>
          Desperse reserves the right to restrict, block, remove, or review messaging access, and to
          suspend or terminate accounts that violate these Terms.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Blocking, Reporting, and Moderation</h2>
        <p>
          Users may block or report other users or conversations using available in-app tools.
        </p>
        <p>
          Desperse may review reported content and take action at its discretion, including removing
          content, restricting messaging access, or suspending accounts.
        </p>
        <p>
          Desperse is not obligated to monitor messages proactively and does not guarantee that all
          abusive or unlawful conduct will be identified or addressed.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Downloads, Minting, Transactions, and Messages at Your Own Risk</h2>
        <p>
          Any decision to download, mint, purchase, message, or otherwise interact with User Content
          through the App is made at your own risk.
        </p>
        <p>
          Desperse makes no representations or warranties regarding the legality, safety, accuracy,
          ownership, or intellectual property rights of User Content, including content transmitted
          via messaging.
        </p>
        <p>
          Desperse does not warrant that files, links, or content shared through the App are free of
          viruses, malware, malicious code, wallet drainers, or other harmful components. You are
          solely responsible for taking appropriate precautions before interacting with User Content
          or communications from other users.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">User Representations and Indemnification</h2>
        <p>
          By uploading, minting, messaging, or otherwise making User Content available through the
          App, you represent and warrant that:
        </p>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>
            You own the content or have all necessary rights, licenses, and permissions to use,
            distribute, mint, sell, or transmit it
          </li>
          <li>Your content does not infringe or violate the rights of any third party</li>
        </ul>
        <p>
          You agree to indemnify and hold harmless Desperse from any claims, damages, losses,
          liabilities, or expenses arising out of or related to User Content or communications you
          submit or transmit through the App.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Copyright Infringement and Takedown Process</h2>
        <p>
          Desperse responds to valid copyright infringement complaints and may remove or disable
          access to allegedly infringing User Content.
        </p>
        <p>
          Removal of content does not imply admission of fault, endorsement, or verification by
          Desperse. Desperse reserves the right to remove content and suspend or terminate accounts
          of users who repeatedly upload infringing or unauthorized content.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Prohibited Use</h2>
        <p>You may not:</p>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>Abuse, reverse engineer, or attempt to disrupt the App</li>
          <li>Use the App in violation of Instagram's, Meta's, or other platform policies</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">Availability</h2>
        <p>
          The App is provided "as is" without warranties of any kind. We may modify or discontinue
          the App or any feature, including messaging, at any time.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, Desperse is not liable for any damages resulting
          from use of the App, including damages arising from messaging, downloading, accessing, or
          using User Content made available by other users.
        </p>
        <p>
          This includes, without limitation, loss of data, loss of digital assets, loss of funds,
          security breaches, harassment, fraud, or device or software damage.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Termination</h2>
        <p>
          We may suspend or terminate access to the App at any time for violations of these terms.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Changes</h2>
        <p>
          We may update these Terms from time to time. Continued use of the App constitutes
          acceptance of the updated terms.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Contact</h2>
        <p>For questions about these Terms, contact:</p>
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

