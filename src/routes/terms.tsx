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
        <p className="text-muted-foreground text-sm mb-8">Last updated: March 7, 2026</p>

        <p>
          By accessing or using Desperse ("Desperse," "we," "us," or "our"), including our website,
          applications, and related services (collectively, the "Service"), you agree to these Terms
          of Service ("Terms").
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Use of the Service</h2>
        <p>
          You agree to use the Service only in compliance with these Terms, our policies, and all
          applicable laws, rules, and regulations. You are solely responsible for your use of the
          Service and for any content, assets, messages, metadata, links, files, or other materials
          you upload, post, publish, mint, sell, share, transmit, or otherwise make available
          through the Service.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Accounts</h2>
        <p>
          When you sign in with Instagram, wallet providers, or other third-party providers, you
          authorize Desperse to access certain account information as permitted by those services.
        </p>
        <p>
          You are responsible for maintaining the security of your account, wallet connections,
          devices, credentials, and any activity that occurs under your account. We may suspend,
          restrict, or terminate your account at any time in accordance with these Terms.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">User Content</h2>
        <p>
          The Service allows users to upload, publish, mint, sell, collect, download, message, and
          otherwise make available digital content, including but not limited to images, audio,
          video, text, compressed files, metadata, links, and other media ("User Content"),
          including direct messages and other communications.
        </p>
        <p>
          Desperse does not verify, review, endorse, or confirm the ownership, authorship,
          authenticity, legality, accuracy, licensing, or intellectual property rights associated
          with User Content. Users are solely responsible for ensuring that they have all necessary
          rights, permissions, and licenses to make User Content available through the Service.
        </p>
        <p>
          Any representation of ownership, authenticity, originality, collectibility, utility, or
          rights associated with User Content is made solely by the user who uploaded or minted such
          content and not by Desperse. You acknowledge that User Content may be offensive,
          inaccurate, misleading, infringing, harmful, unlawful, or otherwise objectionable, and
          that Desperse is not responsible for User Content made available by users or third parties.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Messaging</h2>
        <p>By using messaging features, you acknowledge and agree that:</p>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>Messages are user-generated content subject to all provisions of these Terms</li>
          <li>Desperse does not guarantee message delivery, retention, or confidentiality</li>
          <li>Messaging is not end-to-end encrypted</li>
          <li>
            Messages may be stored, processed, and accessed as necessary to operate the Service,
            enforce these Terms, prevent abuse, comply with legal obligations, or respond to reports
          </li>
        </ul>
        <p>
          You are solely responsible for the content of messages you send and for your interactions
          with other users. Desperse is not liable for any harm, loss, or dispute arising from
          user-to-user communications.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Prohibited Content and Conduct</h2>
        <p>
          You may not use the Service to upload, post, mint, share, transmit, message, promote,
          sell, or otherwise make available any content, or engage in any conduct, that:
        </p>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>is unlawful or violates any applicable law, regulation, or third-party right</li>
          <li>
            infringes, misappropriates, or violates any copyright, trademark, privacy, publicity,
            or other proprietary right
          </li>
          <li>
            contains or promotes pornography, sexually explicit content, sexual exploitation, or
            non-consensual intimate imagery
          </li>
          <li>
            contains, depicts, promotes, or facilitates child sexual abuse material or any
            sexualized content involving minors
          </li>
          <li>
            depicts, promotes, glorifies, threatens, or incites violence, gore, terrorism, hatred,
            harassment, bullying, stalking, doxxing, or discrimination
          </li>
          <li>
            contains hate speech, racist content, slurs, extremist content, or content targeting a
            person or group based on protected characteristics
          </li>
          <li>
            contains fraud, scams, impersonation, phishing, malware, wallet drainers, malicious
            code, deceptive links, or other harmful material
          </li>
          <li>
            is spam, deceptive, manipulative, or intended to artificially inflate engagement,
            distribution, or transactions
          </li>
          <li>
            scrapes, crawls, reverse engineers, probes, or attempts to gain unauthorized access to
            the Service or related systems
          </li>
          <li>
            interferes with the integrity, safety, performance, or operation of the Service
          </li>
          <li>
            violates any applicable third-party platform, wallet, blockchain, or service provider
            rules or policies
          </li>
          <li>otherwise violates these Terms, our policies, or applicable law</li>
        </ul>
        <p>
          We may determine, in our sole discretion, whether any content or conduct violates these
          Terms or creates legal, safety, reputational, or operational risk.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Moderation, Enforcement, and Termination</h2>
        <p>
          We may, at any time and in our sole discretion, with or without notice, review, monitor,
          investigate, remove, disable access to, hide, deindex, label, restrict, refuse, or limit
          any content, account, username, profile, message, asset, listing, transaction-related
          display, or activity on the Service for any reason, including suspected violations of
          these Terms, complaints from users or third parties, legal compliance, fraud prevention,
          safety concerns, intellectual property claims, or risk to us, the Service, or any person.
        </p>
        <p>Without limiting the foregoing, we may:</p>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>remove or hide content from feeds, profiles, search, discovery, or other surfaces</li>
          <li>mark content as sensitive or unsafe</li>
          <li>
            restrict visibility, engagement, messaging, minting, collecting, transfers, downloads,
            monetization, or access to features
          </li>
          <li>suspend, restrict, or terminate accounts</li>
          <li>
            report content or conduct to law enforcement, regulators, rights holders, service
            providers, or other third parties where we believe it is necessary or appropriate
          </li>
        </ul>
        <p>
          We may take action whenever we believe content, conduct, or an account may expose us, our
          users, or third parties to harm, liability, or risk. We are not obligated to host,
          display, maintain, or permit any content, account, or feature on the Service.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Reporting and Safety</h2>
        <p>
          Users may report content, accounts, or conduct that may violate these Terms or applicable
          law. We may investigate reports and take any action we deem appropriate. We are not
          obligated to act on every report or to disclose the outcome of any review or
          investigation.
        </p>
        <p>
          We may preserve and disclose information, content, and account records where we believe
          doing so is necessary to comply with law, enforce these Terms, prevent harm, protect
          users, or protect the Service.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Downloads, Minting, Transactions, and Interactions at Your Own Risk</h2>
        <p>
          Any decision to view, download, mint, purchase, collect, transfer, message, or otherwise
          interact with User Content or other users through the Service is made at your own risk.
        </p>
        <p>
          Desperse makes no representations or warranties regarding the legality, originality,
          ownership, authenticity, quality, safety, value, or intellectual property rights of User
          Content. We are not responsible for User Content, including content that is unlawful,
          infringing, offensive, harmful, misleading, or otherwise objectionable.
        </p>
        <p>
          Desperse does not warrant that files, links, metadata, media, or content made available
          through the Service are free of viruses, malware, malicious code, wallet drainers, or
          other harmful components. You are solely responsible for taking appropriate precautions
          before downloading, connecting a wallet, signing transactions, or using any content
          obtained through the Service.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Blockchain and Decentralized Storage</h2>
        <p>
          Certain content, token metadata, transaction records, or related materials may be stored
          on public blockchains, decentralized storage networks, or third-party systems outside our
          control. As a result, removing content from the Service may not delete it from those
          systems.
        </p>
        <p>
          Our enforcement actions may include removing, hiding, deindexing, restricting, or
          disabling access to or display of such content through the Service, including feeds,
          profiles, search, discovery, minting, collecting, and other features.
        </p>
        <p>
          Blockchain transactions may be irreversible, and we are not responsible for reversing,
          recovering, or undoing blockchain-based actions.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">User Representations and Indemnification</h2>
        <p>
          By uploading, posting, minting, messaging, selling, or otherwise making User Content
          available through the Service, you represent and warrant that:
        </p>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>
            you own the content or have all necessary rights, permissions, licenses, and authority
            to use, display, distribute, mint, sell, transfer, and make it available
          </li>
          <li>
            your content and conduct do not violate these Terms, applicable law, or the rights of
            any third party
          </li>
          <li>
            your content does not contain malware, malicious code, deceptive links, or unlawful
            material
          </li>
          <li>your content is not fraudulent, misleading, exploitative, or harmful</li>
        </ul>
        <p>
          You agree to indemnify and hold harmless Desperse and its affiliates, operators, service
          providers, and personnel from any claims, damages, losses, liabilities, costs, and
          expenses arising out of or related to your content, your conduct, your use of the Service,
          your violation of these Terms, or your violation of any third-party rights.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Copyright and Intellectual Property Complaints</h2>
        <p>
          Desperse responds to valid copyright and other intellectual property complaints and may
          remove, disable access to, or restrict visibility of allegedly infringing or unauthorized
          content. Removal, restriction, or investigation of content does not imply admission of
          fault, endorsement, verification, or liability by Desperse.
        </p>
        <p>
          We reserve the right to suspend, restrict, or terminate accounts of users who repeatedly
          or seriously violate intellectual property rights or other provisions of these Terms.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Availability</h2>
        <p>
          The Service is provided on an "as is" and "as available" basis without warranties of any
          kind. We may modify, suspend, restrict, or discontinue any part of the Service at any time
          without liability.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, Desperse is not liable for any indirect,
          incidental, special, consequential, exemplary, or punitive damages, or for any loss of
          data, loss of profits, loss of goodwill, loss of digital assets, loss of funds, security
          breaches, device or software damage, or other losses arising from or related to your use
          of the Service, your reliance on User Content, your interactions with other users, or any
          blockchain or third-party service used in connection with the Service.
        </p>
        <p>
          Desperse is not liable for any damages arising from User Content, including content that
          is uploaded, posted, minted, sold, transferred, messaged, or downloaded through the
          Service, even if such content is unlawful, infringing, offensive, harmful, or otherwise
          objectionable.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Changes</h2>
        <p>
          We may update these Terms from time to time. If we do, we will update the "Last updated"
          date above. Continued use of the Service after updated Terms become effective constitutes
          acceptance of those updated Terms.
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

