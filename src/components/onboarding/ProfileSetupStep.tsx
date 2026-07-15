import { Field } from '@cdecaire/sable'
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
import { Card, CardContent } from '@/components/ui/card'
import type { ProfileDraft } from '@/components/onboarding/OnboardingPreview'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useProfileUpdate, useAvatarUpload } from '@/hooks/useProfileQuery'
import { uploadAvatarFile } from '@/lib/avatar-upload'

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

interface ProfileSetupStepProps {
  onSuccess?: () => void
  /** Reports current field values so the shell can live-preview the profile. */
  onDraftChange?: (draft: ProfileDraft) => void
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

export function ProfileSetupStep({ onSuccess, onDraftChange }: ProfileSetupStepProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { user: currentUser } = useCurrentUser()

  const profileUpdate = useProfileUpdate()
  const avatarUpload = useAvatarUpload(currentUser?.id)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [link, setLink] = useState('')
  const [errors, setErrors] = useState<{
    displayName?: string
    link?: string
  }>({})
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false)

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '')
      setBio(currentUser.bio || '')
      setAvatarUrl(currentUser.avatarUrl || '')
      setLink(currentUser.link || '')
    }
  }, [currentUser])

  useEffect(() => {
    onDraftChange?.({ displayName, bio, link, avatarUrl })
  }, [displayName, bio, link, avatarUrl, onDraftChange])

  const handleAvatarFileSelect = async (file?: File | null) => {
    if (!file) return
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    const newErrors: { displayName?: string; link?: string } = {}
    if (!displayName.trim()) {
      newErrors.displayName = 'Display name is required'
    }
    if (link.trim() && !isValidUrl(link)) {
      newErrors.link = 'Please enter a valid URL'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})

    try {
      const normalizedLink = normalizeUrl(link)

      const { user: updatedUser } = await profileUpdate.mutateAsync({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        link: normalizedLink || null,
      })

      if (shouldAdvanceProfileSetup(updatedUser)) {
        toast.success('Profile saved')
        onSuccess?.()
      } else {
        toast.success(`Profile saved. Add ${describeMissingFields(updatedUser)} to finish setup.`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile'
      toast.error(message)
    }
  }

  const isSaving = profileUpdate.isPending || avatarUpload.isPending || isRemovingAvatar

  return (
    <Card>
      <CardContent className="pt-6">
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
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={avatarUpload.isPending || isRemovingAvatar || !currentUser}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarUpload.isPending && <LoadingSpinner size="sm" className="mr-2" />}
                  {avatarUrl ? 'Change photo' : 'Upload photo'}
                </Button>
                {avatarUrl && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    disabled={avatarUpload.isPending || isRemovingAvatar}
                    onClick={handleRemoveAvatar}
                    aria-label="Remove photo"
                  >
                    {isRemovingAvatar ? <LoadingSpinner size="sm" /> : <Icon name="xmark" />}
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
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-caption text-muted-foreground pointer-events-none">
                {displayName.length} / 50
              </div>
            </div>
            {errors.displayName && (
              <p className="text-caption text-destructive">{errors.displayName}</p>
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
              <div className="absolute bottom-2 right-3 text-caption text-muted-foreground pointer-events-none">
                {bio.length} / 280
              </div>
            </div>
          </div>

          {/* Link */}
          <Field label="Website or social link (optional)" error={errors.link}>
            <Input
              id="link"
              type="text"
              inputMode="url"
              autoComplete="url"
              value={link}
              onChange={(e) => {
                setLink(e.target.value)
                if (errors.link) setErrors((prev) => ({ ...prev, link: undefined }))
              }}
              placeholder="https://example.com"
              maxLength={2048}
            />
          </Field>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Save and continue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default ProfileSetupStep
