/**
 * PostTypeSelector Component
 * Radio-card selector for post types (Standard, Collectible, Edition).
 *
 * Migration shim (Phase 2 — Sable adoption): rebuilt on @cdecaire/sable's
 * <ChoiceboxGroup>/<Choicebox> (Base UI RadioGroup + Radio — roving focus,
 * arrow-key nav, ARIA radiogroup/radio wiring, form integration come for free).
 * The per-type tone is still carried by the icon (type.badgeClass); the checked
 * card uses Sable's standard primary/accent treatment. Layout is now Choicebox's
 * vertical radio-card list (was a 3-col grid of icon cards). The first-post
 * "keep it simple" collapse logic is preserved.
 */

import { useEffect, useId, useState } from 'react'
import { POST_TYPE_LIST, type PostType } from '@/constants/postTypes'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Choicebox, ChoiceboxGroup } from '@cdecaire/sable'
import { cn } from '@/lib/utils'

interface PostTypeSelectorProps {
  value: PostType
  onChange: (type: PostType) => void
  disabled?: boolean
  firstPostMode?: boolean
}

export function PostTypeSelector({ value, onChange, disabled, firstPostMode = false }: PostTypeSelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(!firstPostMode || value !== 'post')
  const advancedOptionsId = useId()
  const groupLabelId = useId()

  useEffect(() => {
    if (value !== 'post') {
      setShowAdvanced(true)
    }
  }, [value])

  const standardType = POST_TYPE_LIST.find((type) => type.id === 'post')
  const advancedTypes = POST_TYPE_LIST.filter((type) => type.id !== 'post')

  if (!standardType) {
    return null
  }

  const renderCard = (type: (typeof POST_TYPE_LIST)[number]) => {
    // Icon + label as the card title. Sable's Choicebox `title` is ReactNode at
    // runtime, but its type collides with the native HTML `title` attr (string)
    // from ComponentProps<Radio.Root> — Sable should Omit "title". Cast until
    // that's fixed upstream; the element renders correctly.
    const titleNode = (
      <span className="flex items-center gap-2">
        <Icon name={type.icon} variant={type.iconStyle} className={cn('text-lg', type.badgeClass)} />
        {type.label}
      </span>
    ) as unknown as string

    return (
      <Choicebox
        key={type.id}
        value={type.id}
        disabled={disabled}
        title={titleNode}
        description={type.description}
      />
    )
  }

  const canHideAdvanced = value === 'post'
  const showAdvancedCards = !firstPostMode || showAdvanced

  return (
    <div className="space-y-2">
      <p id={groupLabelId} className="text-label-lg">Post Type</p>

      {firstPostMode && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-label-lg">Keep your first post simple</p>
              <p className="text-body-sm text-muted-foreground">
                Collectible and Edition are still available when you want them, but Standard is the fastest path to publish.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdvanced((current) => !current)}
              disabled={disabled || (showAdvanced && !canHideAdvanced)}
              aria-expanded={showAdvanced}
              aria-controls={advancedOptionsId}
            >
              {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
            </Button>
          </div>
        </div>
      )}

      <ChoiceboxGroup
        value={value}
        onValueChange={(next) => {
          if (next) onChange(next as PostType)
        }}
        aria-labelledby={groupLabelId}
        className="gap-3"
      >
        {renderCard(standardType)}
        {showAdvancedCards && (
          <div id={advancedOptionsId} className="contents">
            {advancedTypes.map(renderCard)}
          </div>
        )}
      </ChoiceboxGroup>
    </div>
  )
}

export type { PostType }

export default PostTypeSelector
