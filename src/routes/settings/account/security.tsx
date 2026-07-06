import { createFileRoute } from '@tanstack/react-router'
import {
  Fieldset,
  FieldsetContent,
  FieldsetDescription,
  FieldsetLegend,
} from '@cdecaire/sable'
import { Stack } from '@cdecaire/sable/layout'
import { PageHeader } from '@/components/shared/PageHeader'

export const Route = createFileRoute('/settings/account/security')({
  component: SecurityPage,
})

function SecurityPage() {
  return (
    <Stack gap={2} className="pt-4">
      <PageHeader
        title="Security"
        description="Manage two-factor authentication, session controls, and recovery in the future."
      />

      <Fieldset>
        <FieldsetLegend>Account protection</FieldsetLegend>
        <FieldsetDescription>
          Session controls and recovery tools will live here.
        </FieldsetDescription>
        <FieldsetContent>
          <p className="text-body-sm text-muted-foreground">Security settings coming soon.</p>
        </FieldsetContent>
      </Fieldset>
    </Stack>
  )
}
