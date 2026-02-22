/**
 * GradientAvatar Component
 * Avatar with optional gradient ring using brand colors
 * Purple Heart -> Blue Gem -> Caribbean Green
 */

import { Link } from '@tanstack/react-router'
import { Icon } from '@/components/ui/icon'

interface GradientAvatarProps {
  src?: string | null
  alt: string
  href?: string
  size?: 'sm' | 'md' | 'lg'
  showGradient?: boolean
  className?: string
  onClick?: () => void
}

const sizeClasses = {
  sm: {
    outer: 'w-14 h-14',
    inner: 'w-[52px] h-[52px]',
    ring: '1.5px',
  },
  md: {
    outer: 'w-[72px] h-[72px]',
    inner: 'w-[68px] h-[68px]',
    ring: '1.5px',
  },
  lg: {
    outer: 'w-20 h-20',
    inner: 'w-[76px] h-[76px]',
    ring: '2px',
  },
}

export function GradientAvatar({
  src,
  alt,
  href,
  size = 'md',
  showGradient = true,
  className = '',
  onClick,
}: GradientAvatarProps) {
  const sizes = sizeClasses[size]

  const content = (
    <div
      className={`relative flex items-center justify-center ${sizes.outer} ${className}`}
      style={{
        background: showGradient
          ? 'linear-gradient(135deg, var(--purple-heart-500), var(--blue-gem-500), var(--caribbean-green-400))'
          : 'transparent',
        borderRadius: '50%',
        padding: showGradient ? sizes.ring : '0',
      }}
    >
      {/* Inner white/background ring */}
      <div
        className={`${sizes.inner} rounded-full flex items-center justify-center`}
        style={{
          background: 'var(--background)',
          padding: showGradient ? '1.5px' : '0',
        }}
      >
        {/* Avatar image */}
        <div className={`w-full h-full rounded-full overflow-hidden bg-muted flex items-center justify-center`}>
          {src ? (
            <img
              src={src}
              alt={alt}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <Icon name="user" className="text-muted-foreground text-lg" />
          )}
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link
        to={href}
        className="block hover:opacity-90 transition-opacity"
        aria-label={alt}
        onClick={onClick}
      >
        {content}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button
        type="button"
        className="block hover:opacity-90 transition-opacity"
        aria-label={alt}
        onClick={onClick}
      >
        {content}
      </button>
    )
  }

  return content
}

export default GradientAvatar
