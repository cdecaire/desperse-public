/**
 * PostTypeSelector Component
 * Radio-card selector for post types (Standard, Collectible, Edition).
 *
 * Built on @cdecaire/sable's <ChoiceboxGroup>/<Choicebox> (Base UI RadioGroup +
 * Radio). As of Sable 0.5.0 the Choicebox natively supports the two things this
 * selector needs: an `icon` (switches to the icon-top-left / indicator-top-right
 * card layout) and a `tone` (carries a semantic colour across the selected
 * border, radio, and icon badge) — so the per-type colour and card shape come
 * from the design system, no className/--primary overrides needed.
 */

import { useEffect, useId, useState } from 'react'
import { POST_TYPE_LIST, type PostType } from '@/constants/postTypes'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Choicebox, ChoiceboxGroup, type ChoiceboxTone } from '@cdecaire/sable'
import { cn } from '@/lib/utils'

interface PostTypeSelectorProps {
  value: PostType
  onChange: (type: PostType) => void
  disabled?: boolean
  firstPostMode?: boolean
}

// Post type → Sable Choicebox tone (carries the selected-state colour identity).
const TONE_BY_TYPE: Record<PostType, ChoiceboxTone> = {
  post: 'standard',
  collectible: 'collectible',
  edition: 'edition',
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

  const renderCard = (type: (typeof POST_TYPE_LIST)[number], extraClasses?: string) => (
    <Choicebox
      key={type.id}
      value={type.id}
      disabled={disabled}
      tone={TONE_BY_TYPE[type.id]}
      icon={<Icon name={type.icon} variant={type.iconStyle} />}
      title={type.label}
      description={type.description}
      className={extraClasses}
    />
  )

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
        className={cn('gap-3', firstPostMode ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}
      >
        {renderCard(standardType, firstPostMode ? 'sm:col-span-2' : undefined)}
        {showAdvancedCards && (
          <div id={advancedOptionsId} className="contents">
            {advancedTypes.map((type) => renderCard(type))}
          </div>
        )}
      </ChoiceboxGroup>
    </div>
  )
}

export type { PostType }

export default PostTypeSelector
