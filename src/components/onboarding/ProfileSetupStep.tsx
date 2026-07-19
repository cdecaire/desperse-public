import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Icon } from '@/components/ui/icon'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { deriveOnboardingState, getMissingProfileFields, type MissingProfileField, type OnboardingProfileUser } from '@/lib/onboarding'
import type { ProfileDraft } from '@/components/onboarding/OnboardingPreview'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useProfileUpdate, useAvatarUpload } from '@/hooks/useProfileQuery'
import { uploadAvatarFile } from '@/lib/avatar-upload'
import { checkHandleAvailability } from '@/server/functions/auth'

export function isValidUrl(value: string): boolean {
  if (!value.trim()) return true
  try {
    new URL(normalizeUrl(value))
    return true
  } catch {
    return false
  }
}

export function normalizeUrl(value: string): string {
  const normalized = value.trim()
  if (!normalized) return ''

  return normalized.match(/^https?:\/\//i) ? normalized : `https://${normalized}`
}

const USERNAME_MAX = 24
const USERNAME_MIN = 3

/**
 * Derive a username slug from arbitrary display text, matching the server's
 * update-profile slug contract: lowercase [a-z0-9_.], max 24. (Note this is a
 * narrower set than the signup-time normalizeSlug, which also emits hyphens —
 * the PATCH validator rejects hyphens, so we never generate them here.)
 */
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, USERNAME_MAX)
}

/** Filter raw keystrokes in the username field to the allowed slug charset. */
export function filterUsernameInput(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, USERNAME_MAX)
}

type UsernameStatus = 'idle' | 'too-short' | 'checking' | 'available' | 'taken' | 'error'

// Sample identity used only by the dev preview route so the flow is walkable
// with no account writes and no blob uploads. Inline SVG — never hits network.
const SAMPLE_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a855f7"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><rect width="128" height="128" fill="url(#g)"/></svg>',
  )

interface ProfileSetupStepProps {
  onSuccess?: () => void
  /** Reports current field values so the shell can live-preview the profile. */
  onDraftChange?: (draft: ProfileDraft) => void
  /**
   * Dev-preview mode: seed sample data, keep read-only availability checks, but
   * stub every write (no avatar upload, no profile PATCH). Never true in prod UI.
   */
  preview?: boolean
}

export function shouldAdvanceProfileSetup(user: OnboardingProfileUser): boolean {
  return !deriveOnboardingState(user, {
    isAuthenticated: true,
    isAuthInitializing: false,
    isLoading: false,
  }).isProfileIncomplete
}

const MISSING_FIELD_LABELS: Record<MissingProfileField, string> = {
  displayName: 'a display name',
  avatarUrl: 'a photo',
}

function describeMissingFields(user: OnboardingProfileUser): string {
  const labels = getMissingProfileFields(user).map((field) => MISSING_FIELD_LABELS[field])
  return labels.join(' and ')
}

/**
 * Probe numeric suffixes 2–20 for a taken auto-generated slug, in concurrent
 * batches of 5, returning the lowest available candidate (or null if all taken).
 * The base is truncated so `base + suffix` never exceeds the 24-char limit.
 */
async function probeAvailableSuffix(base: string): Promise<string | null> {
  for (let start = 2; start <= 20; start += 5) {
    const batch: Promise<string | null>[] = []
    for (let n = start; n < start + 5 && n <= 20; n++) {
      const suffix = String(n)
      const candidate = `${base.slice(0, USERNAME_MAX - suffix.length)}${suffix}`
      batch.push(
        checkHandleAvailability({ data: { handle: candidate } } as never)
          .then((r) => (r?.success && r.available ? candidate : null))
          .catch(() => null),
      )
    }
    const results = await Promise.all(batch)
    const firstFree = results.find((c) => c !== null)
    if (firstFree) return firstFree
  }
  return null
}

export function ProfileSetupStep({ onSuccess, onDraftChange, preview = false }: ProfileSetupStepProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { user: currentUser } = useCurrentUser()

  const profileUpdate = useProfileUpdate()
  const avatarUpload = useAvatarUpload(currentUser?.id)

  const [displayName, setDisplayName] = useState(preview ? 'Sample Creator' : '')
  const [username, setUsername] = useState('')
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [bio, setBio] = useState(preview ? 'Just here to spot-check the onboarding UI.' : '')
  const [avatarUrl, setAvatarUrl] = useState(preview ? SAMPLE_AVATAR : '')
  const [errors, setErrors] = useState<{ displayName?: string }>({})
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false)

  // Refs for the availability race guards — the async closures must read the
  // *current* field value, not the value captured when the check was scheduled.
  const usernameRef = useRef(username)
  usernameRef.current = username
  const manuallyEditedRef = useRef(usernameManuallyEdited)
  manuallyEditedRef.current = usernameManuallyEdited
  const checkSeq = useRef(0)

  useEffect(() => {
    // In preview we keep the seeded sample data and never read the real account.
    if (preview) return
    if (currentUser) {
      setDisplayName(currentUser.displayName || '')
      setBio(currentUser.bio || '')
      setAvatarUrl(currentUser.avatarUrl || '')
      // Seed the username with the account's current slug so returning users
      // and the "unchanged ⇒ omit on save" path have a baseline. Auto-gen below
      // still tracks the display name until the user edits the field by hand.
      setUsername((prev) => (manuallyEditedRef.current ? prev : currentUser.usernameSlug || ''))
    }
  }, [currentUser])

  // Auto-generate the slug from the display name until the user edits it by hand.
  // Empty names leave the seeded slug alone so we never blank out a valid handle.
  useEffect(() => {
    if (usernameManuallyEdited) return
    const generated = slugifyName(displayName)
    if (generated) setUsername(generated)
  }, [displayName, usernameManuallyEdited])

  // Debounced availability check (350ms), with own-slug fast path, suffix
  // auto-probing for auto-generated collisions, and stale-result guards.
  useEffect(() => {
    const candidate = username.toLowerCase()

    if (candidate.length === 0) {
      setUsernameStatus('idle')
      return
    }
    if (candidate.length < USERNAME_MIN) {
      setUsernameStatus('too-short')
      return
    }
    // Fast path: the account's own current slug is always "available".
    if (currentUser?.usernameSlug && candidate === currentUser.usernameSlug.toLowerCase()) {
      setUsernameStatus('available')
      return
    }

    setUsernameStatus('checking')
    const seq = ++checkSeq.current
    const timer = setTimeout(async () => {
      try {
        const result = await checkHandleAvailability({ data: { handle: candidate } } as never)
        if (seq !== checkSeq.current) return // superseded by a newer keystroke
        if (!result?.success) {
          // Network/parse failure — treat as unchecked; the PATCH is authoritative.
          setUsernameStatus('error')
          return
        }
        if (result.available) {
          setUsernameStatus('available')
          return
        }
        // Taken. Auto-generated slugs get suffix-probed; manual edits do not.
        if (!manuallyEditedRef.current) {
          const chosen = await probeAvailableSuffix(candidate)
          if (seq !== checkSeq.current) return
          // Race guard: only apply the suffix if the user hasn't typed since.
          if (chosen && usernameRef.current.toLowerCase() === candidate && !manuallyEditedRef.current) {
            setUsername(chosen)
            setUsernameStatus('available')
          } else if (!chosen) {
            setUsernameStatus('taken')
          }
        } else {
          setUsernameStatus('taken')
        }
      } catch {
        if (seq === checkSeq.current) setUsernameStatus('error')
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [username, currentUser?.usernameSlug])

  useEffect(() => {
    onDraftChange?.({ displayName, bio, link: '', avatarUrl, usernameSlug: username })
  }, [displayName, bio, avatarUrl, username, onDraftChange])

  const handleAvatarFileSelect = async (file?: File | null) => {
    if (!file) return
    if (preview) {
      // Local object URL only — no blob upload in preview.
      setAvatarUrl(URL.createObjectURL(file))
      toast.success('Avatar updated (preview)')
      return
    }
    if (!currentUser) {
      toast.error('Still loading your account — try again in a moment.')
      return
    }
    try {
      const url = await uploadAvatarFile(file, (input) => avatarUpload.mutateAsync(input))
      setAvatarUrl(url)
      toast.success('Avatar updated')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload avatar'
      toast.error(message)
    }
  }

  const handleRemoveAvatar = async () => {
    if (preview) {
      setAvatarUrl('')
      return
    }
    if (!currentUser) return
    setIsRemovingAvatar(true)
    setAvatarUrl('')
    queryClient.setQueryData(['profile', currentUser.usernameSlug], (prev: any) => {
      if (!prev?.user) return prev
      return { ...prev, user: { ...prev.user, avatarUrl: '' } }
    })
    try {
      await profileUpdate.mutateAsync({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: null,
      })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['profile', currentUser.usernameSlug] })
      toast.success('Avatar removed')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove avatar'
      toast.error(message)
      if (currentUser.avatarUrl) setAvatarUrl(currentUser.avatarUrl)
    } finally {
      setIsRemovingAvatar(false)
    }
  }

  const usernameError =
    usernameStatus === 'too-short'
      ? `Username must be at least ${USERNAME_MIN} characters.`
      : usernameStatus === 'taken'
        ? 'That username is already taken. Try another.'
        : undefined

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser && !preview) return

    const newErrors: { displayName?: string } = {}
    if (!displayName.trim()) {
      newErrors.displayName = 'Display name is required'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    if (usernameStatus === 'taken' || usernameStatus === 'too-short' || usernameStatus === 'checking') {
      return
    }
    setErrors({})

    if (preview) {
      // No PATCH — just advance so the flow is walkable end-to-end.
      toast.success('Profile saved (preview)')
      onSuccess?.()
      return
    }

    if (!currentUser) return // non-preview writes require a loaded account

    try {
      const nextSlug = username.toLowerCase()
      // Omit the slug when unchanged so the server skips uniqueness validation
      // (and doesn't burn the once-per-window username-change allowance).
      const slugChanged = Boolean(nextSlug) && nextSlug !== (currentUser.usernameSlug ?? '').toLowerCase()

      const { user: updatedUser } = await profileUpdate.mutateAsync({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        ...(slugChanged ? { slug: nextSlug } : {}),
      })

      if (shouldAdvanceProfileSetup(updatedUser)) {
        toast.success('Profile saved')
        onSuccess?.()
      } else {
        toast.success(`Profile saved. Add ${describeMissingFields(updatedUser)} to finish setup.`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile'
      // Surface a taken-username collision inline so the field explains itself.
      if (/username/i.test(message) && /taken|reserved/i.test(message)) {
        setUsernameStatus('taken')
      }
      toast.error(message)
    }
  }

  const isSaving = profileUpdate.isPending || avatarUpload.isPending || isRemovingAvatar
  const usernameReady = usernameStatus === 'available' || usernameStatus === 'error'
  const canSubmit =
    Boolean(displayName.trim()) &&
    Boolean(avatarUrl) &&
    username.trim().length >= USERNAME_MIN &&
    usernameReady &&
    !isSaving

  return (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar */}
          <div className="flex flex-col gap-3">
            <Label>Avatar</Label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-background flex items-center justify-center shrink-0 border border-border">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar preview" className="w-full h-full object-cover" />
                ) : (
                  <Icon name="circle-user-circle-plus" variant="regular" className="text-2xl text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  disabled={avatarUpload.isPending || isRemovingAvatar || (!currentUser && !preview)}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarUpload.isPending && <LoadingSpinner size="sm" className="mr-2" />}
                  {avatarUrl ? 'Change photo' : 'Choose photo'}
                </Button>
                {avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    disabled={avatarUpload.isPending || isRemovingAvatar}
                    onClick={handleRemoveAvatar}
                    aria-label="Remove photo"
                  >
                    {isRemovingAvatar ? <LoadingSpinner size="sm" /> : <Icon name="xmark" className="text-sm" />}
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleAvatarFileSelect(e.target.files?.[0])}
                />
              </div>
            </div>
          </div>

          {/* Display name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <div className="relative">
              <Input
                id="displayName"
                value={displayName}
                maxLength={50}
                onChange={(e) => {
                  setDisplayName(e.target.value)
                  if (errors.displayName) setErrors((prev) => ({ ...prev, displayName: undefined }))
                }}
                placeholder="Display name"
                className="pr-14"
                aria-invalid={errors.displayName ? 'true' : 'false'}
              />
              {displayName.length >= 30 ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-caption text-muted-foreground pointer-events-none">
                  {displayName.length} / 50
                </div>
              ) : null}
            </div>
            {errors.displayName && (
              <p className="text-caption text-destructive">{errors.displayName}</p>
            )}
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mono-sm text-muted-foreground">@</span>
              <Input
                id="username"
                value={username}
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => {
                  if (!usernameManuallyEdited) setUsernameManuallyEdited(true)
                  setUsername(filterUsernameInput(e.target.value))
                }}
                placeholder="username"
                className="pl-7 pr-16 font-mono"
                aria-invalid={usernameError ? 'true' : 'false'}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                {username.length >= USERNAME_MAX - 4 ? (
                  <span className="text-caption text-muted-foreground">{username.length} / {USERNAME_MAX}</span>
                ) : null}
                {usernameStatus === 'checking' ? (
                  <LoadingSpinner size="sm" />
                ) : usernameStatus === 'available' ? (
                  <Icon name="circle-check" variant="solid" className="text-sm text-(--tone-standard)" />
                ) : null}
              </div>
            </div>
            {usernameError ? (
              <p className="text-caption text-destructive">{usernameError}</p>
            ) : (
              <p className="text-caption text-muted-foreground">Lowercase letters, numbers, periods, and underscores.</p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio <span className="text-muted-foreground">(optional)</span></Label>
            <div className="relative">
              <Textarea
                id="bio"
                value={bio}
                maxLength={280}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the world about you"
                rows={4}
                className="min-h-[100px] pb-7"
              />
              {bio.length >= 240 ? (
                <div className="absolute bottom-2 right-3 text-caption text-muted-foreground pointer-events-none">
                  {bio.length} / 280
                </div>
              ) : null}
            </div>
          </div>

          <Button type="submit" size="cta" className="mt-1 w-full" disabled={!canSubmit}>
            {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            Continue
            {!isSaving ? <Icon name="arrow-right" variant="regular" className="ml-2 text-sm" /> : null}
          </Button>
        </form>
  )
}

export default ProfileSetupStep
