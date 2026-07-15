import { createFileRoute } from '@tanstack/react-router'
import { useTheme } from '@/components/providers/ThemeProvider'
import { useSableDesignTheme } from '@/hooks/useSableDesignTheme'
import { usePreferences, type ExplorerOption } from '@/hooks/usePreferences'
import type { SableDesignTheme } from '@/lib/sable-theme'
import { isDesignThemeOption } from '@/lib/user-preferences'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Icon } from '@/components/ui/icon'
import {
  Choicebox,
  ChoiceboxGroup,
  Fieldset,
  FieldsetContent,
  FieldsetDescription,
  FieldsetLegend,
  ThemeSwitcher,
} from '@cdecaire/sable'
import { Row, Stack } from '@cdecaire/sable/layout'
import { ContentLoadingSkeleton } from '@/components/shared/ContentLoadingSkeleton'
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

type ThemePreference = 'light' | 'dark' | 'system'
type ThemePreviewMode = 'light' | 'dark'
type AppThemeSelectorTheme = {
  id: string
  label: string
  modes: readonly ThemePreviewMode[]
  defaultMode: ThemePreviewMode
}

function normalizeThemePreference(theme: string | undefined): ThemePreference {
  return theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system'
}

function getThemeDescription({
  canUseSableDesignTheme,
  activeSableThemeLabel,
  colorPreference,
  activeTheme,
}: {
  canUseSableDesignTheme: boolean
  activeSableThemeLabel: string
  colorPreference: ThemePreference
  activeTheme: 'light' | 'dark'
}) {
  const colorLabel =
    colorPreference === 'system'
      ? `System (${activeTheme === 'light' ? 'Light' : 'Dark'})`
      : activeTheme === 'light'
        ? 'Light'
        : 'Dark'

  return canUseSableDesignTheme ? `${activeSableThemeLabel} - ${colorLabel}` : colorLabel
}

function themeModeLabel(theme: AppThemeSelectorTheme) {
  return theme.modes.length > 1
    ? `${theme.modes.join(' / ')} modes`
    : `${theme.modes[0]} mode`
}

function AppThemeSelector({
  value,
  onValueChange,
  themes,
  mode,
}: {
  value: SableDesignTheme
  onValueChange: (themeId: SableDesignTheme) => void
  themes: readonly AppThemeSelectorTheme[]
  mode: ThemePreviewMode
}) {
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {themes.map((themeManifest) => {
        const checked = themeManifest.id === value
        const previewMode = mode ?? themeManifest.defaultMode

        return (
          <button
            key={themeManifest.id}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onValueChange(themeManifest.id as SableDesignTheme)}
            className={cn(
              'group flex min-h-36 w-full flex-col gap-3 rounded-lg border border-input bg-card p-4 text-left motion-interactive motion-press',
              'hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
              checked && 'border-primary bg-muted',
            )}
          >
            <span
              data-sable-theme={themeManifest.id}
              aria-hidden="true"
              className={cn(
                'grid h-14 w-full grid-cols-4 overflow-hidden rounded-md border border-border bg-background',
                previewMode === 'dark' && 'dark',
              )}
            >
              <span className="bg-background" />
              <span className="border-l border-border bg-card" />
              <span className="border-l border-border bg-primary" />
              <span className="border-l border-border bg-accent" />
            </span>
            <span className="flex min-w-0 items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-title-sm">{themeManifest.label}</span>
                <span className="mt-1 block text-caption text-muted-foreground">
                  {themeManifest.id === 'desperse' ? 'Default' : themeModeLabel(themeManifest)}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground motion-interactive',
                  checked ? 'opacity-100' : 'opacity-0',
                )}
              >
                <Icon name="check" className="text-[11px]" />
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function AppSettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const {
    isAvailable: canUseSableDesignTheme,
    themeId: sableThemeId,
    themes: sableThemes,
    setThemeId: setSableThemeId,
  } = useSableDesignTheme()
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const {
    preferences,
    isLoading: isPrefsLoading,
    setDesignTheme,
    setExplorer,
  } = usePreferences()

  const colorPreference = normalizeThemePreference(theme)
  const resolvedColorMode = resolvedTheme === 'light' ? 'light' : 'dark'
  const activeTheme = colorPreference === 'system' ? resolvedColorMode : colorPreference
  const activeSableTheme = sableThemes.find((candidate) => candidate.id === sableThemeId)
  const themeDescription = getThemeDescription({
    canUseSableDesignTheme,
    activeSableThemeLabel: activeSableTheme?.label ?? 'Desperse',
    colorPreference,
    activeTheme,
  })

  const isLoading = isUserLoading || isPrefsLoading

  const handleSableThemeChange = (nextThemeId: SableDesignTheme) => {
    setSableThemeId(nextThemeId)
    if (user && isDesignThemeOption(nextThemeId)) {
      setDesignTheme(nextThemeId)
    }
  }

  return (
    <Stack gap={2} className="pt-4">
        <PageHeader
          title="App Settings"
          description="Configure your theme and blockchain explorer preferences."
        />

      <Fieldset>
        <FieldsetLegend>Appearance</FieldsetLegend>
        <FieldsetDescription>{themeDescription}</FieldsetDescription>
        <FieldsetContent>
          <Row align="center" justify="between" className="gap-4 max-sm:flex-col max-sm:items-start">
            <Row align="center" gap={1.5}>
              <Icon
                name={activeTheme === 'light' ? 'sun-bright' : 'moon'}
                variant="regular"
                className="w-5 text-center text-muted-foreground"
              />
              <span className="text-label-lg">Color mode</span>
            </Row>
            <ThemeSwitcher
              value={colorPreference}
              onValueChange={(value) => setTheme(value)}
              label="Color mode"
            />
          </Row>

          {canUseSableDesignTheme ? (
            <Stack gap={1.5} className="border-t border-border/60 pt-4">
              <span className="text-label-lg">Theme</span>
              <AppThemeSelector
                value={sableThemeId}
                onValueChange={handleSableThemeChange}
                themes={sableThemes}
                mode={activeTheme}
              />
            </Stack>
          ) : null}
        </FieldsetContent>
      </Fieldset>

      <Fieldset>
        <FieldsetLegend>Blockchain Explorer</FieldsetLegend>
        <FieldsetDescription>
          Choose which explorer to use for transaction links.
        </FieldsetDescription>
        <FieldsetContent>
          <Row align="center" gap={1.5}>
            <Icon name="arrow-up-right-from-square" variant="regular" className="w-5 text-center text-muted-foreground" />
            <span className="text-label-lg">Default explorer</span>
          </Row>

        {isLoading ? (
          <ContentLoadingSkeleton label="Loading app preferences" rows={2} variant="compact" />
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
        </FieldsetContent>
      </Fieldset>

    </Stack>
  )
}
