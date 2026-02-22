/**
 * PostTypeSelector Component
 * Radio card selector for post types (Standard, Collectible, Edition)
 */

import { POST_TYPE_LIST, type PostType } from '@/constants/postTypes'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

interface PostTypeSelectorProps {
  value: PostType
  onChange: (type: PostType) => void
  disabled?: boolean
}

export function PostTypeSelector({ value, onChange, disabled }: PostTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Post Type</label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {POST_TYPE_LIST.map((type) => {
          const isSelected = value === type.id
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => !disabled && onChange(type.id)}
              disabled={disabled}
              className={cn(
                'relative flex flex-col items-start p-4 rounded-xl border transition-all text-left',
                'hover:border-foreground/20',
                isSelected ? 'bg-card shadow-md dark:bg-card' : 'border-border bg-card shadow-sm dark:bg-card',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              style={isSelected ? { borderColor: type.tone } : undefined}
            >
              {/* Radio indicator */}
              <div
                className={cn(
                  'absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center',
                  isSelected ? 'border-transparent' : 'border-muted-foreground/30'
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
              
              {/* Icon */}
              <div className="mb-3">
                <Icon
                  name={type.icon}
                  variant={type.iconStyle}
                  className={cn('text-lg', type.badgeClass)}
                />
              </div>
              
              {/* Label & Description */}
              <div className="font-medium text-sm">{type.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{type.description}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export type { PostType }

export default PostTypeSelector

