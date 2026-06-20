import { createFileRoute } from '@tanstack/react-router'
import { useTheme } from '@/components/providers/ThemeProvider'
import { usePreferences, type ExplorerOption } from '@/hooks/usePreferences'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Icon } from '@/components/ui/icon'
import { Choicebox, ChoiceboxGroup } from '@cdecaire/sable'
import { Row, Stack } from '@cdecaire/sable/layout'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { PageHeader } from '@/components/shared/PageHeader'

export const Route = createFileRoute('/settings/account/app')({
  component: AppSettingsPage,
})

const explorerLabels: Record<ExplorerOption, { name: string; description: string }> = {
  orb: { name: 'Orb', description: 'Simple, clean explorer' },
  solscan: { name: 'Solscan', description: 'General purpose explorer' },
  'solana-explorer': { name: 'Solana Explorer', description: 'Official explorer' },
  metaplex: { name: 'Metaplex', description: 'Metaplex Core asset explorer' },
}

function AppSettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const {
    preferences,
    isLoading: isPrefsLoading,
    setExplorer,
  } = usePreferences()

  const isSystemTheme = theme === 'system' || theme === undefined
  const activeTheme = isSystemTheme ? (resolvedTheme || 'dark') : theme

  const handleThemeToggle = () => {
    if (!isSystemTheme) {
      setTheme(theme === 'dark' ? 'light' : 'dark')
    }
  }

  const handleSystemThemeChange = (checked: boolean) => {
    if (checked) {
      setTheme('system')
    } else {
      setTheme(activeTheme === 'light' ? 'light' : 'dark')
    }
  }

  const isLoading = isUserLoading || isPrefsLoading

  return (
    <Stack gap={2} className="pt-4">
        <PageHeader
          title="App Settings"
          description="Configure your theme and blockchain explorer preferences."
        />

      {/* Theme Setting */}
      <div className="rounded-[var(--radius-lg)] bg-white dark:bg-input/30 border border-input px-5 md:px-6 lg:px-8 py-4 md:py-5">
        <Row align="center" justify="between">
          <Row align="center" gap={1.5}>
            <Icon
              name={activeTheme === 'light' ? 'sun-bright' : 'moon'}
              variant="regular"
              className="w-5 text-center text-muted-foreground"
            />
            <Stack gap={0}>
              <span className="text-label-lg">Theme</span>
              <span className="text-caption text-muted-foreground">
                {isSystemTheme
                  ? `System (${activeTheme === 'light' ? 'Light' : 'Dark'})`
                  : activeTheme === 'light'
                    ? 'Light mode'
                    : 'Dark mode'}
              </span>
            </Stack>
          </Row>
          <Row align="center" gap={1.5}>
            <Row align="center" gap={1.5}>
              <Label
                htmlFor="system-theme"
                className="text-label-lg cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Use system theme
              </Label>
              <Checkbox
                id="system-theme"
                checked={isSystemTheme}
                onCheckedChange={handleSystemThemeChange}
                aria-label="Use system theme"
              />
            </Row>
            <Switch
              checked={activeTheme === 'dark'}
              onCheckedChange={handleThemeToggle}
              disabled={isSystemTheme}
              aria-label={
                isSystemTheme
                  ? 'Theme toggle (disabled - system theme active)'
                  : `Switch to ${activeTheme === 'dark' ? 'light' : 'dark'} theme`
              }
            />
          </Row>
        </Row>
      </div>

      {/* Explorer Preference */}
      <div className="rounded-[var(--radius-lg)] bg-white dark:bg-input/30 border border-input px-5 md:px-6 lg:px-8 py-4 md:py-5">
        <Row align="center" gap={1.5} className="mb-4">
          <Icon name="arrow-up-right-from-square" variant="regular" className="w-5 text-center text-muted-foreground" />
          <Stack gap={0}>
            <span className="text-label-lg">Blockchain Explorer</span>
            <span className="text-caption text-muted-foreground">
              Choose which explorer to use for transaction links
            </span>
          </Stack>
        </Row>

        {isLoading ? (
          <Row justify="center" className="py-4">
            <LoadingSpinner />
          </Row>
        ) : !user ? (
          <p className="text-body-sm text-muted-foreground py-2">
            Sign in to set explorer preference
          </p>
        ) : (
          <ChoiceboxGroup
            value={preferences.explorer}
            onValueChange={(value) => setExplorer(value as ExplorerOption)}
            className="grid-cols-2"
          >
            {(Object.keys(explorerLabels) as ExplorerOption[]).map((key) => (
              <Choicebox
                key={key}
                value={key}
                title={explorerLabels[key].name}
                description={explorerLabels[key].description}
              />
            ))}
          </ChoiceboxGroup>
        )}
      </div>

    </Stack>
  )
}
