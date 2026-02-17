import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings/account/security')({
  component: SecurityPage,
})

function SecurityPage() {
  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <h1 className="hidden md:block text-xl font-bold">Security</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Manage two-factor authentication, session controls, and recovery in the future.
        </p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-4 md:p-6">
        <p className="text-sm text-muted-foreground">Security settings coming soon.</p>
      </div>
    </div>
  )
}

