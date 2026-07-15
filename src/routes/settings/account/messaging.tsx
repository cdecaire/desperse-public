import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useDmPreferences } from '@/hooks/useDmPreferences'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Icon } from '@/components/ui/icon'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/PageHeader'
import { Stack, Row } from '@cdecaire/sable/layout'
import {
  Fieldset,
  FieldsetContent,
  FieldsetDescription,
  FieldsetLegend,
} from '@cdecaire/sable'

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
    <Stack gap={2} className="pt-4">
      <PageHeader
        title="Messaging"
        description="Manage who can reach out to you directly."
      />

      <Fieldset>
        <FieldsetLegend>Direct Messages</FieldsetLegend>
        <FieldsetDescription>
          Allow eligible users to start new chats.
        </FieldsetDescription>
        <FieldsetContent>
        <Row align="center" justify="between">
          <Row gap={1.5} align="center">
            <Icon name="message" variant="regular" className="w-5 text-center text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-label-lg">Message requests</span>
              <span className="text-caption text-muted-foreground">
                Allow eligible users to start new chats
              </span>
            </div>
          </Row>
          {isLoading ? (
            <Skeleton aria-label="Loading messaging preference" className="h-6 w-10 rounded-full" role="status" />
          ) : !user ? (
            <span className="text-caption text-muted-foreground">Sign in required</span>
          ) : (
            <Switch
              checked={preferences.dmEnabled}
              onCheckedChange={setDmEnabled}
              aria-label="Toggle direct messages"
            />
          )}
        </Row>

        {/* Eligibility Requirements - visible only when DMs are enabled */}
        {preferences.dmEnabled && user && !isLoading && (
          <div className="mt-5">
            <p className="text-label-xs text-muted-foreground mb-4">
              Eligibility Requirements
            </p>

            <Stack gap={2}>
              <MessagingToggle
                id="allow-buyers"
                label="Edition Buyers"
                icon="fa-bag-shopping"
                checked={preferences.allowBuyers}
                onCheckedChange={setAllowBuyers}
              >
                <span className="text-caption text-muted-foreground">
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
                <span className="text-caption text-muted-foreground flex items-center gap-1.5 flex-wrap">
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
                <span className="text-caption text-muted-foreground flex items-center gap-1.5 flex-wrap">
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
            </Stack>
          </div>
        )}
        </FieldsetContent>
      </Fieldset>

      {/* Info Note */}
      <div className="rounded-lg bg-muted/50 border border-input px-5 md:px-6 lg:px-8 py-4">
        <Row gap={1.5} align="start">
          <Icon name="circle-info" variant="regular" className="w-5 text-center text-muted-foreground mt-0.5 shrink-0" />
          <span className="text-caption text-muted-foreground">
            To prevent spam, only your supporters can message you. Once someone starts a conversation,
            they can continue messaging even if they no longer meet the criteria.
          </span>
        </Row>
      </div>
    </Stack>
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
    <Row align="center" justify="between" className="py-1">
      <Row gap={1.5} align="center">
        <Icon name={icon} variant="regular" className="w-5 text-center text-muted-foreground/70" />
        <Stack gap={0.25}>
          <Label htmlFor={id} className="text-label-lg cursor-pointer">
            {label}
          </Label>
          {children}
        </Stack>
      </Row>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={`Allow ${label.toLowerCase()} to message you`}
      />
    </Row>
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
