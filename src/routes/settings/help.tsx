import { createFileRoute, Link } from '@tanstack/react-router'
import { AuthGuard } from '@/components/shared/AuthGuard'
import SettingsNav from '@/components/settings/SettingsNav'
import { Icon } from '@/components/ui/icon'

export const Route = createFileRoute('/settings/help')({
  component: HelpPage,
})

function HelpPage() {
  return (
    <AuthGuard>
      <div className="flex flex-col md:flex-row items-start flex-1 min-h-screen">
        <aside className="hidden md:flex md:w-64 border-r border-border/80 bg-background self-stretch">
          <div className="sticky top-16 w-full">
            <SettingsNav variant="desktop" />
          </div>
        </aside>

        <div className="flex-1 w-full">
          {/* Mobile: Back button header with PWA safe-area support */}
          <header
            className="md:hidden fixed top-0 left-0 right-0 z-40 w-full border-b bg-background"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <div className="grid grid-cols-3 items-center h-14 px-4">
              <div className="flex items-center">
                <Link
                  to="/settings"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground"
                  aria-label="Back to settings"
                >
                  <Icon name="arrow-left" />
                </Link>
              </div>
              <div className="flex justify-center min-w-0 flex-1">
                <h1 className="text-base font-semibold whitespace-nowrap truncate">Help</h1>
              </div>
              <div aria-hidden="true" />
            </div>
          </header>

          <section className="max-w-4xl space-y-6 px-4 md:px-6 lg:px-8 pt-settings-header">
            <div className="pt-4">
              <div className="space-y-2 mb-6">
                <h1 className="hidden md:block text-xl font-bold">Help</h1>
                <p className="text-sm text-muted-foreground">
                  Find answers, support, and important information.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Support */}
                <div className="rounded-xl border border-border/60 bg-card p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">Support</p>
                    <Icon name="life-ring" variant="regular" className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get help with bugs, account issues, or general questions.
                  </p>
                  <div className="mt-auto space-y-2">
                    <a
                      href="mailto:support@desperse.app"
                      className="flex items-center gap-2 text-sm hover:text-foreground transition-colors"
                    >
                      <span>support@desperse.app</span>
                      <Icon name="envelope" variant="regular" className="text-xs" />
                    </a>
                    <a
                      href="https://x.com/DesperseApp"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm hover:text-foreground transition-colors"
                    >
                      <span>@DesperseApp</span>
                      <Icon name="x-twitter" variant="brands" className="text-xs" />
                    </a>
                  </div>
                </div>

                {/* Fees & Pricing */}
                <div className="rounded-xl border border-border/60 bg-card p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">Fees & Pricing</p>
                    <Icon name="tag" variant="regular" className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Understand platform fees, minting costs, and how pricing works for Collectibles and Editions.
                  </p>
                  <div className="mt-auto">
                    <Link
                      to="/fees"
                      className="flex items-center gap-2 text-sm hover:text-foreground transition-colors"
                    >
                      <span>View fees</span>
                      <Icon name="arrow-right" variant="regular" className="text-xs" />
                    </Link>
                  </div>
                </div>

                {/* About Desperse */}
                <div className="rounded-xl border border-border/60 bg-card p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">About Desperse</p>
                    <Icon name="circle-info" variant="regular" className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Learn what Desperse is, who it's for, and how it works.
                  </p>
                  <div className="mt-auto">
                    <Link
                      to="/about"
                      className="flex items-center gap-2 text-sm hover:text-foreground transition-colors"
                    >
                      <span>Visit about page</span>
                      <Icon name="arrow-right" variant="regular" className="text-xs" />
                    </Link>
                  </div>
                </div>

                {/* Changelog */}
                <div className="rounded-xl border border-border/60 bg-card p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">Changelog</p>
                    <Icon name="list-ul" variant="regular" className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    See what's new and what we've been working on.
                  </p>
                  <div className="mt-auto">
                    <Link
                      to="/changelog"
                      className="flex items-center gap-2 text-sm hover:text-foreground transition-colors"
                    >
                      <span>View changelog</span>
                      <Icon name="arrow-right" variant="regular" className="text-xs" />
                    </Link>
                  </div>
                </div>

                {/* Legal */}
                <div className="rounded-xl border border-border/60 bg-card p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">Legal</p>
                    <Icon name="shield" variant="regular" className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Review our terms and privacy policy.
                  </p>
                  <div className="mt-auto space-y-2">
                    <Link
                      to="/terms"
                      className="flex items-center gap-2 text-sm hover:text-foreground transition-colors"
                    >
                      <span>Terms of Service</span>
                      <Icon name="arrow-right" variant="regular" className="text-xs" />
                    </Link>
                    <Link
                      to="/privacy"
                      className="flex items-center gap-2 text-sm hover:text-foreground transition-colors"
                    >
                      <span>Privacy Policy</span>
                      <Icon name="arrow-right" variant="regular" className="text-xs" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AuthGuard>
  )
}
