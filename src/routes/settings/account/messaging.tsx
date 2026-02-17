import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useDmPreferences } from '@/hooks/useDmPreferences'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export const Route = createFileRoute('/settings/account/messaging')({
  component: MessagingSettingsPage,
})

function MessagingSettingsPage() {
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const {
    preferences,
    isLoading: isPrefsLoading,
    setDmEnabled,
    setAllowBuyers,
    setAllowCollectors,
    setAllowTippers,
    setCollectorMinCount,
    setTipMinAmount,
  } = useDmPreferences()

  const isLoading = isUserLoading || isPrefsLoading

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <h1 className="hidden md:block text-xl font-bold">Messaging</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Manage who can reach out to you directly.
        </p>
      </div>

      {/* DM Settings Card */}
      <div className="rounded-lg bg-white dark:bg-input/30 border border-input px-5 md:px-6 lg:px-8 py-4 md:py-5">
        {/* Master Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <i className="fa-regular fa-message w-5 text-center text-muted-foreground" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Direct Messages</span>
              <span className="text-xs text-muted-foreground">
                Allow eligible users to start new chats
              </span>
            </div>
          </div>
          {isLoading ? (
            <LoadingSpinner className="w-5 h-5" />
          ) : !user ? (
            <span className="text-xs text-muted-foreground">Sign in required</span>
          ) : (
            <Switch
              checked={preferences.dmEnabled}
              onCheckedChange={setDmEnabled}
              aria-label="Toggle direct messages"
            />
          )}
        </div>

        {/* Eligibility Requirements - visible only when DMs are enabled */}
        {preferences.dmEnabled && user && !isLoading && (
          <div className="mt-5">
            <p className="text-xs font-medium tracking-wide text-muted-foreground mb-4">
              Eligibility Requirements
            </p>

            <div className="space-y-4">
              <MessagingToggle
                id="allow-buyers"
                label="Edition Buyers"
                icon="fa-bag-shopping"
                checked={preferences.allowBuyers}
                onCheckedChange={setAllowBuyers}
              >
                <span className="text-xs text-muted-foreground">
                  Own any of your editions
                </span>
              </MessagingToggle>

              <MessagingToggle
                id="allow-collectors"
                label="Collectors"
                icon="fa-gem"
                checked={preferences.allowCollectors}
                onCheckedChange={setAllowCollectors}
              >
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  At least
                  <DebouncedNumberInput
                    value={preferences.collectorMinCount}
                    onChange={setCollectorMinCount}
                    min={1}
                    max={100}
                    step={1}
                    disabled={!preferences.allowCollectors}
                  />
                  collectibles
                </span>
              </MessagingToggle>

              <MessagingToggle
                id="allow-tippers"
                label="Tippers"
                icon="fa-coins"
                checked={preferences.allowTippers}
                onCheckedChange={setAllowTippers}
              >
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  At least
                  <DebouncedNumberInput
                    value={preferences.tipMinAmount}
                    onChange={setTipMinAmount}
                    step={1}
                    disabled={!preferences.allowTippers}
                  />
                  SKR tipped
                </span>
              </MessagingToggle>
            </div>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="rounded-lg bg-muted/50 border border-input px-5 md:px-6 lg:px-8 py-4">
        <div className="flex gap-3">
          <i className="fa-regular fa-circle-info w-5 text-center text-muted-foreground mt-0.5 shrink-0" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">
            To prevent spam, only your supporters can message you. Once someone starts a conversation,
            they can continue messaging even if they no longer meet the criteria.
          </span>
        </div>
      </div>
    </div>
  )
}

type MessagingToggleProps = {
  id: string
  label: string
  icon: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  children: React.ReactNode
}

function MessagingToggle({
  id,
  label,
  icon,
  checked,
  onCheckedChange,
  children,
}: MessagingToggleProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-3">
        <i className={`fa-regular ${icon} w-5 text-center text-muted-foreground/70`} aria-hidden="true" />
        <div className="flex flex-col gap-0.5">
          <Label htmlFor={id} className="text-sm font-semibold cursor-pointer">
            {label}
          </Label>
          {children}
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={`Allow ${label.toLowerCase()} to message you`}
      />
    </div>
  )
}

/**
 * Compact inline debounced number input.
 * Commits the value on blur or after a 800ms debounce.
 */
function DebouncedNumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}) {
  const [localValue, setLocalValue] = useState(String(value))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local value when server value changes (e.g. after mutation settles)
  useEffect(() => {
    setLocalValue(String(value))
  }, [value])

  const commit = useCallback(
    (raw: string) => {
      const parsed = Number.parseFloat(raw)
      if (Number.isNaN(parsed) || parsed <= 0) return
      let result = parsed
      if (min !== undefined) result = Math.max(min, result)
      if (max !== undefined) result = Math.min(max, result)
      if (result !== value) {
        onChange(result)
      }
      setLocalValue(String(result))
    },
    [min, max, value, onChange],
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => commit(e.target.value), 800)
  }

  const handleBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    commit(localValue)
  }

  return (
    <Input
      type="number"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className="w-14 h-6 text-xs text-center px-1.5 inline-flex"
    />
  )
}
