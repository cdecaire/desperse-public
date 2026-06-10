import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Icon } from '@/components/ui/icon'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useProfileUpdate, useAvatarUpload } from '@/hooks/useProfileQuery'

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

export function ProfileSetupStep() {
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

  const handleAvatarFileSelect = async (file?: File | null) => {
    if (!file || !currentUser) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Avatar must be 2MB or smaller.')
      return
    }
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = (reader.result as string)?.split(',')[1]
      if (!base64) {
        toast.error('Failed to read file.')
        return
      }
      try {
        const url = await avatarUpload.mutateAsync({
          fileData: base64,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        })
        setAvatarUrl(url)
        toast.success('Avatar updated')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload avatar'
        toast.error(message)
      }
    }
    reader.readAsDataURL(file)
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

      await profileUpdate.mutateAsync({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        link: normalizedLink || null,
      })
      toast.success('Profile saved')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile'
      toast.error(message)
    }
  }

  const isSaving = profileUpdate.isPending || avatarUpload.isPending || isRemovingAvatar

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set up your public profile</CardTitle>
        <CardDescription>
          Add the minimum identity details people need before they follow or collect from you.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                  variant="default"
                  disabled={avatarUpload.isPending || isRemovingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarUpload.isPending && <LoadingSpinner size="sm" className="mr-2" />}
                  {avatarUrl ? 'Change photo' : 'Upload photo'}
                </Button>
                {avatarUrl && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-9 w-9 p-0"
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
              <p className="text-xs text-destructive">{errors.displayName}</p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <div className="relative">
              <Textarea
                id="bio"
                value={bio}
                maxLength={160}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the world about you"
                rows={4}
                className="min-h-[100px] pb-7"
              />
              <div className="absolute bottom-2 right-3 text-caption text-muted-foreground pointer-events-none">
                {bio.length} / 160
              </div>
            </div>
          </div>

          {/* Link */}
          <div className="space-y-2">
            <Label htmlFor="link">Website or social link</Label>
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
              aria-invalid={errors.link ? 'true' : 'false'}
            />
            {errors.link && (
              <p className="text-xs text-destructive">{errors.link}</p>
            )}
          </div>

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
