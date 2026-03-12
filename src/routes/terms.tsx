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
        <p className="text-muted-foreground text-sm mb-8">Last updated: March 12, 2026</p>

        <p>
          By accessing or using Desperse ("Desperse," the "App," "we," "us," or "our"), you agree to
          these Terms of Service.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Use of the App</h2>
        <p>
          You may use the App only in compliance with these Terms and all applicable laws, rules, and
          regulations. You may not use the App if your use would violate any law, infringe the rights
          of any person or entity, or expose Desperse to legal or regulatory risk.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Accounts</h2>
        <p>
          When you sign in with Instagram or another social or authentication provider, you authorize
          the App to access certain basic account information as permitted by that provider.
        </p>
        <p>
          You are solely responsible for maintaining the security of your account, wallet connections,
          devices, credentials, and any linked authentication methods, and for all activity occurring
          under your account.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">User Content, Uploads, Minted Assets, Downloads, and Messages</h2>
        <p>
          The App allows users to upload, publish, mint, collect, sell, purchase, download, exchange,
          display, transmit, and otherwise make available digital content, including without limitation
          images, audio, video, text, compressed files, messages, links, and other media ("User
          Content").
        </p>
        <p>
          You retain responsibility for your User Content. Desperse does not verify, authenticate,
          endorse, guarantee, review for accuracy, or confirm ownership, authorship, provenance,
          licensing, legality, or intellectual property rights associated with User Content.
        </p>
        <p>
          You are solely responsible for ensuring that you own or have obtained all rights, permissions,
          consents, and licenses necessary to upload, publish, mint, display, transmit, sell, collect,
          distribute, license, or otherwise make User Content available through the App.
        </p>
        <p>
          Any statement, metadata, designation, description, rights declaration, attribution, provenance
          record, license selection, or representation concerning ownership, authenticity, authorship,
          copyright, licensing, or other rights is made solely by the user who submitted the content and
          not by Desperse.
        </p>
        <p>
          Desperse may preserve, retain, remove, disable access to, hide, delist, restrict, or review
          User Content at any time and for any reason, including for moderation, legal compliance,
          investigation, abuse prevention, safety, operational, or policy reasons.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">User Representations and Warranties</h2>
        <p>
          By uploading, posting, minting, messaging, transmitting, or otherwise making User Content
          available through the App, you represent, warrant, and agree that:
        </p>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>
            you own the User Content or have all rights, licenses, permissions, and authority necessary
            to use it and authorize its use on or through the App
          </li>
          <li>
            your User Content, and your use of the App in connection with it, does not and will not
            infringe, misappropriate, violate, or otherwise conflict with any copyright, trademark,
            patent, trade secret, moral right, privacy right, publicity right, contract right, or other
            right of any third party
          </li>
          <li>
            any metadata, attribution, provenance information, licensing terms, copyright statements,
            creator declarations, and related information you provide is accurate to the best of your
            knowledge and not misleading
          </li>
          <li>
            your User Content does not contain malware, malicious code, wallet drainers, deceptive
            links, or other harmful or unlawful material
          </li>
          <li>
            you will not use the App to impersonate any creator, rights holder, brand, or other person
            or entity
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">Prohibited Content and Conduct</h2>
        <p>
          You may not use the App to upload, publish, mint, transmit, message, distribute, sell, or
          otherwise make available any content or engage in any conduct that:
        </p>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>
            infringes or violates the intellectual property, privacy, publicity, contractual, or other
            rights of any person or entity
          </li>
          <li>
            is fraudulent, deceptive, misleading, defamatory, harassing, threatening, abusive, hateful,
            exploitative, obscene, or unlawful
          </li>
          <li>
            includes unauthorized copies, reposts, scraped content, pirated material, or content you do
            not have the right to use
          </li>
          <li>
            is designed to scam, phish, drain wallets, spread malware, manipulate users, or interfere
            with the security or operation of the App
          </li>
          <li>
            attempts to evade moderation, enforcement, restrictions, access controls, rate limits, or
            account limitations
          </li>
          <li>
            impersonates another person or falsely suggests affiliation, endorsement, authorship, or
            ownership
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">Messaging and User Communications</h2>
        <p>
          The App may allow users to communicate directly through in-app messaging and other
          communication features.
        </p>
        <p>
          Messages and communications are user-generated content. Desperse does not guarantee delivery,
          retention, confidentiality, or successful transmission of any message. Messaging is not
          end-to-end encrypted. Messages may be stored, processed, reviewed, accessed, disclosed, or
          preserved as reasonably necessary to operate the App, investigate misuse, enforce these Terms,
          respond to reports, protect users, comply with legal obligations, or protect the rights,
          property, and safety of Desperse or others.
        </p>
        <p>
          You are solely responsible for the content of your messages and your interactions with other
          users.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Reporting, Review, and Moderation</h2>
        <p>
          Users may report content, accounts, messages, or other activity through available in-app
          tools.
        </p>
        <p>
          Desperse may, but is not obligated to, investigate reports or proactively monitor the App.
          Desperse may take any action it deems appropriate in its sole discretion, including without
          limitation:
        </p>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>reviewing reported content or account activity</li>
          <li>requesting additional information</li>
          <li>hiding, delisting, disabling access to, or removing content</li>
          <li>
            preserving content, reports, and account information for legal, investigative, or safety
            purposes
          </li>
          <li>
            restricting features, limiting visibility, disabling messaging, blocking transactions, or
            imposing account-level restrictions
          </li>
          <li>suspending or terminating accounts</li>
        </ul>
        <p>
          Desperse may retain internal copies of removed, hidden, disabled, or soft-deleted content,
          metadata, reports, and related records for legal, security, operational, evidentiary, or
          enforcement purposes.
        </p>
        <p>
          Desperse has no obligation to restore any content or account after moderation action.
        </p>
        <p className="text-sm text-muted-foreground italic">
          Submitting a false or misleading report may result in account action.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Copyright Policy and Takedown Procedure</h2>
        <p>
          Desperse respects intellectual property rights and responds to notices of alleged copyright
          infringement.
        </p>
        <p>
          If you believe content on the App infringes your copyright, you may send a notice to{" "}
          <a
            href="mailto:support@desperse.app"
            className="text-foreground underline hover:no-underline"
          >
            support@desperse.app
          </a>
          {" "}that includes enough information for us to evaluate the claim, such as:
        </p>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>identification of the copyrighted work claimed to have been infringed</li>
          <li>
            identification of the allegedly infringing content and information reasonably sufficient to
            locate it on the App
          </li>
          <li>your name and contact information</li>
          <li>
            a statement that you have a good faith belief the use is not authorized by the rights
            holder, its agent, or the law
          </li>
          <li>
            a statement that the information in your notice is accurate and that you are the copyright
            owner or authorized to act on the owner's behalf
          </li>
        </ul>
        <p>
          Upon receiving a claim, Desperse may remove, disable, hide, delist, restrict, or preserve
          access to the content while reviewing the matter, and may request additional information from
          any party.
        </p>
        <p>
          Desperse may notify the affected user and may, in its discretion, allow that user to respond
          or submit a counter-notice where appropriate.
        </p>
        <p>
          Desperse is not required to adjudicate disputes between users or determine ultimate ownership,
          authorship, or legal entitlement to content.
        </p>
        <p>
          Removal or restriction of content does not constitute an admission of liability, fault,
          infringement, ownership, validity of a claim, or endorsement by Desperse.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Repeat Infringer Policy</h2>
        <p>
          Desperse reserves the right to suspend, restrict, or terminate accounts of users who are the
          subject of repeated infringement complaints, repeated valid takedown notices, repeated
          unauthorized reposting claims, repeated moderation actions, or other patterns of conduct that
          suggest misuse of the App or disregard for the rights of others.
        </p>
        <p>
          Desperse may determine, in its sole discretion, what constitutes a repeat infringer or repeat
          offender.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Rights Metadata, Provenance, and Platform Tools</h2>
        <p>
          The App may allow users to attach or display metadata, creator declarations, attribution
          details, licensing selections, provenance information, ownership history, transfer history,
          rights statements, verification markers, or similar information.
        </p>
        <p>
          Such information may be derived from user submissions, wallet activity, third-party services,
          blockchain data, indexed metadata, or platform records. Desperse does not guarantee the
          completeness, accuracy, legal sufficiency, or enforceability of any such information.
        </p>
        <p>
          Any rights declaration, provenance display, transfer history, creator verification indicator,
          or ownership-related platform feature is provided for informational purposes only and does not
          constitute legal verification or a warranty by Desperse.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Downloads, Minting, Transactions, and External Risk</h2>
        <p>
          Any decision to view, download, mint, collect, purchase, sell, message, interact with, or rely
          on User Content is at your own risk.
        </p>
        <p>
          Desperse makes no representations or warranties regarding legality, safety, originality,
          authenticity, ownership, provenance, licensing, value, merchantability, fitness for a
          particular purpose, non-infringement, or freedom from malware, malicious code, wallet
          drainers, scams, or harmful components.
        </p>
        <p>
          You are solely responsible for evaluating User Content and taking appropriate precautions
          before interacting with users, wallets, files, links, or digital assets.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Blockchain and Decentralized Storage</h2>
        <p>
          Certain content, token metadata, transaction records, or related materials may be stored on
          public blockchains, decentralized storage networks, or third-party systems outside our
          control. As a result, removing content from the App may not delete it from those systems.
        </p>
        <p>
          Our enforcement actions may include removing, hiding, deindexing, restricting, or disabling
          access to or display of such content through the App, including feeds, profiles, search,
          discovery, minting, collecting, and other features.
        </p>
        <p>
          Blockchain transactions may be irreversible, and we are not responsible for reversing,
          recovering, or undoing blockchain-based actions.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Availability and Service Changes</h2>
        <p>
          The App is provided on an "as is" and "as available" basis. Desperse may modify, suspend,
          disable, remove, or discontinue the App or any feature, workflow, marketplace function,
          messaging tool, moderation tool, metadata field, or related service at any time, with or
          without notice.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Indemnification</h2>
        <p>
          You agree to defend, indemnify, and hold harmless Desperse and its owner, operators,
          affiliates, service providers, contractors, successors, and assigns from and against any
          claims, demands, actions, proceedings, damages, judgments, liabilities, losses, costs, and
          expenses, including reasonable attorneys' fees, arising out of or related to:
        </p>
        <ul className="list-disc pl-6 space-y-1 my-4">
          <li>your User Content</li>
          <li>your use of the App</li>
          <li>your violation of these Terms</li>
          <li>
            your infringement, misappropriation, or violation of any rights of any third party
          </li>
          <li>
            any dispute between you and another user, rights holder, buyer, seller, collector, or other
            third party
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by law, Desperse is not liable for any indirect, incidental,
          special, consequential, exemplary, punitive, or other damages, or for any loss of profits,
          revenue, goodwill, data, digital assets, opportunities, access, accounts, wallets, content, or
          funds, arising from or related to the use of or inability to use the App.
        </p>
        <p>
          This limitation applies whether the claim is based in contract, tort, negligence, strict
          liability, statute, or otherwise, and includes without limitation losses arising from user
          content, copyright disputes, takedowns, moderation actions, account restrictions, scams,
          fraud, harassment, stolen assets, unauthorized access, wallet compromise, malicious files,
          service interruptions, or third-party systems.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Termination</h2>
        <p>
          Desperse may suspend, restrict, or terminate your access to the App at any time, with or
          without notice, for any reason or no reason, including suspected infringement, repeated
          reports, legal risk, abuse, fraud, or violation of these Terms.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the App after updated Terms are
          posted constitutes acceptance of those updated Terms.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">Contact</h2>
        <p>For questions, notices, or copyright claims, contact:</p>
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
