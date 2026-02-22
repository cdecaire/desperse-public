import { createFileRoute } from '@tanstack/react-router'
import { useTheme } from '@/components/providers/ThemeProvider'
import { usePreferences, type ExplorerOption } from '@/hooks/usePreferences'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Icon } from '@/components/ui/icon'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export const Route = createFileRoute('/settings/account/app')({
  component: AppSettingsPage,
})

const explorerLabels: Record<ExplorerOption, { name: string; description: string }> = {
  orb: { name: 'Orb', description: 'Simple, clean explorer' },
  solscan: { name: 'Solscan', description: 'General purpose explorer' },
  'solana-explorer': { name: 'Solana Explorer', description: 'Official explorer' },
  solanafm: { name: 'SolanaFM', description: 'Developer-friendly explorer' },
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
    <div className="space-y-4 pt-4">
        <div className="space-y-2">
          <h1 className="hidden md:block text-xl font-bold">App Settings</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Configure your theme and blockchain explorer preferences.
        </p>
      </div>

      {/* Theme Setting */}
      <div className="rounded-[var(--radius-lg)] bg-white dark:bg-input/30 border border-input px-5 md:px-6 lg:px-8 py-4 md:py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon
              name={activeTheme === 'light' ? 'sun-bright' : 'moon'}
              variant="regular"
              className="w-5 text-center text-muted-foreground"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Theme</span>
              <span className="text-xs text-muted-foreground">
                {isSystemTheme
                  ? `System (${activeTheme === 'light' ? 'Light' : 'Dark'})`
                  : activeTheme === 'light'
                    ? 'Light mode'
                    : 'Dark mode'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <Label
                htmlFor="system-theme"
                className="text-sm font-medium cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Use system theme
              </Label>
              <Checkbox
                id="system-theme"
                checked={isSystemTheme}
                onCheckedChange={handleSystemThemeChange}
                aria-label="Use system theme"
              />
            </div>
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
          </div>
        </div>
      </div>

      {/* Explorer Preference */}
      <div className="rounded-[var(--radius-lg)] bg-white dark:bg-input/30 border border-input px-5 md:px-6 lg:px-8 py-4 md:py-5">
        <div className="flex items-center gap-3 mb-4">
          <Icon name="arrow-up-right-from-square" variant="regular" className="w-5 text-center text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Blockchain Explorer</span>
            <span className="text-xs text-muted-foreground">
              Choose which explorer to use for transaction links
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <LoadingSpinner />
          </div>
        ) : !user ? (
          <p className="text-sm text-muted-foreground py-2">
            Sign in to set explorer preference
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(explorerLabels) as ExplorerOption[]).map((key) => (
              <button
                key={key}
                onClick={() => setExplorer(key)}
                className={`flex flex-col items-start p-3 rounded-lg border transition-colors ${
                  preferences.explorer === key
                    ? 'border-primary bg-primary/5'
                    : 'border-input hover:border-primary/50'
                }`}
              >
                <span className="text-sm font-medium">{explorerLabels[key].name}</span>
                <span className="text-xs text-muted-foreground">{explorerLabels[key].description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
