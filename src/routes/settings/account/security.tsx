import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/PageHeader'

export const Route = createFileRoute('/settings/account/security')({
  component: SecurityPage,
})

function SecurityPage() {
  return (
    <div className="space-y-4 pt-4">
      <PageHeader
        title="Security"
        description="Manage two-factor authentication, session controls, and recovery in the future."
      />

      <div className="rounded-2xl border border-border/70 bg-card p-4 md:p-6">
        <p className="text-sm text-muted-foreground">Security settings coming soon.</p>
      </div>
    </div>
  )
}

