/**
 * PostTypeSelector Component
 * Radio card selector for post types (Standard, Collectible, Edition)
 */

import { useEffect, useState } from 'react'
import { POST_TYPE_LIST, type PostType } from '@/constants/postTypes'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

interface PostTypeSelectorProps {
  value: PostType
  onChange: (type: PostType) => void
  disabled?: boolean
  firstPostMode?: boolean
}

const ADVANCED_POST_TYPES_STORAGE_KEY = 'desperse:create-post:advanced-post-types-visible'

export function PostTypeSelector({ value, onChange, disabled, firstPostMode = false }: PostTypeSelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(value !== 'post')

  useEffect(() => {
    if (value !== 'post') {
      setShowAdvanced(true)
      return
    }

    if (typeof window !== 'undefined') {
      const savedPreference = window.sessionStorage.getItem(ADVANCED_POST_TYPES_STORAGE_KEY)
      if (savedPreference !== null) {
        setShowAdvanced(savedPreference === 'true')
      }
    }
  }, [value])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(ADVANCED_POST_TYPES_STORAGE_KEY, String(showAdvanced))
    }
  }, [showAdvanced])

  const standardType = POST_TYPE_LIST.find((type) => type.id === 'post')
  const advancedTypes = POST_TYPE_LIST.filter((type) => type.id !== 'post')

  if (!standardType) {
    return null
  }

  const renderCard = (type: (typeof POST_TYPE_LIST)[number], extraClasses?: string) => {
    const isSelected = value === type.id

    return (
      <button
        key={type.id}
        type="button"
        role="radio"
        aria-checked={isSelected}
        aria-label={type.label}
        onClick={() => !disabled && onChange(type.id)}
        disabled={disabled}
        className={cn(
          'relative flex flex-col items-start p-4 rounded-xl border transition-all text-left',
          'hover:border-foreground/20',
          isSelected ? 'bg-card shadow-md' : 'border-border bg-card shadow-sm',
          disabled && 'opacity-50 cursor-not-allowed',
          extraClasses,
        )}
        style={isSelected ? { borderColor: type.tone } : undefined}
      >
        <div
          className={cn(
            'absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center',
            isSelected ? 'border-transparent' : 'border-muted-foreground/30',
          )}
          style={isSelected ? { borderColor: type.tone } : undefined}
        >
          {isSelected && (
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: type.tone }}
            />
          )}
        </div>

        <div className="mb-3">
          <Icon
            name={type.icon}
            variant={type.iconStyle}
            className={cn('text-lg', type.badgeClass)}
          />
        </div>

        <div className="font-medium text-sm">{type.label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{type.description}</div>
      </button>
    )
  }

  const canHideAdvanced = value === 'post'
  const helperTitle = firstPostMode ? 'Keep your first post simple' : 'Need collectible or edition?'
  const helperDescription = firstPostMode
    ? 'Collectible and Edition are still available when you want them, but Standard is the fastest path to publish.'
    : 'Standard stays front and center. Open advanced options when you want collectible or edition-specific publishing.'

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Post Type</label>
      <div className="space-y-3">
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">{helperTitle}</p>
              <p className="text-xs text-muted-foreground">{helperDescription}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdvanced((current) => !current)}
              disabled={disabled || (showAdvanced && !canHideAdvanced)}
              aria-expanded={showAdvanced}
              aria-controls="advanced-post-types"
            >
              {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
            </Button>
          </div>
        </div>

        <div role="radiogroup" aria-label="Post type" className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {renderCard(standardType, 'sm:col-span-3')}
          </div>

          {showAdvanced && (
            <div id="advanced-post-types" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {advancedTypes.map((type) => renderCard(type, 'bg-background'))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export type { PostType }

export default PostTypeSelector
