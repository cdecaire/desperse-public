import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Icon } from '@/components/ui/icon'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
  useProfileUser,
  useProfileUpdate,
  useAvatarUpload,
  useHeaderBgUpload,
} from '@/hooks/useProfileQuery'
import { format } from 'date-fns'

export const Route = createFileRoute('/settings/account/profile-info')({
  component: ProfileInfoPage,
})

function ProfileInfoPage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const {
    user: currentUser,
    isLoading: isCurrentUserLoading,
    isInitializing: isCurrentUserInitializing,
  } = useCurrentUser()

  const {
    data: profileData,
    isLoading,
    isPending,
    error,
  } = useProfileUser(currentUser?.usernameSlug || '')

  const profileUpdate = useProfileUpdate()
  const avatarUpload = useAvatarUpload(currentUser?.id)
  const headerBgUpload = useHeaderBgUpload(currentUser?.id)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [headerBgUrl, setHeaderBgUrl] = useState('')
  const [link, setLink] = useState('')
  const [twitterUsername, setTwitterUsername] = useState('')
  const [instagramUsername, setInstagramUsername] = useState('')
  const [username, setUsername] = useState('')
  const [initialValues, setInitialValues] = useState<{
    displayName: string
    bio: string
    avatarUrl: string
    headerBgUrl: string
    link: string
    twitterUsername: string
    instagramUsername: string
    username: string
  } | null>(null)
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false)
  const [isRemovingHeaderBg, setIsRemovingHeaderBg] = useState(false)
  const headerBgInputRef = useRef<HTMLInputElement | null>(null)
  const [nextChangeAt, setNextChangeAt] = useState<Date | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    if (profileData?.user) {
      setDisplayName(profileData.user.displayName || '')
      setBio(profileData.user.bio || '')
      setAvatarUrl(profileData.user.avatarUrl || '')
      setHeaderBgUrl(profileData.user.headerBgUrl || '')
      setLink(profileData.user.link || '')
      setTwitterUsername(profileData.user.twitterUsername || '')
      setInstagramUsername(profileData.user.instagramUsername || '')
      setUsername(profileData.user.slug)
      setInitialValues({
        displayName: profileData.user.displayName || '',
        bio: profileData.user.bio || '',
        avatarUrl: profileData.user.avatarUrl || '',
        headerBgUrl: profileData.user.headerBgUrl || '',
        link: profileData.user.link || '',
        twitterUsername: profileData.user.twitterUsername || '',
        instagramUsername: profileData.user.instagramUsername || '',
        username: profileData.user.slug,
      })
    }
    if (profileData?.nextUsernameChangeAt) {
      setNextChangeAt(new Date(profileData.nextUsernameChangeAt))
    }
  }, [profileData])

  // Don't use isCurrentUserFetching - it's true during background refetches and would show skeleton unnecessarily
  // Use isPending to catch the case where query is enabled but hasn't fetched yet
  const isProfileLoading = isLoading || isPending || isCurrentUserLoading || isCurrentUserInitializing

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
        const status = (err as { status?: number }).status
        const message = err instanceof Error ? err.message : 'Failed to upload avatar'
        if (status === 400) {
          toast.error(message)
        } else {
          toast.error('Failed to upload avatar')
        }
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
      return {
        ...prev,
        user: { ...prev.user, avatarUrl: '' },
      }
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
      if (profileData?.user?.avatarUrl) {
        setAvatarUrl(profileData.user.avatarUrl)
        queryClient.setQueryData(['profile', currentUser.usernameSlug], (prev: any) => {
          if (!prev?.user) return prev
          return {
            ...prev,
            user: { ...prev.user, avatarUrl: profileData.user.avatarUrl },
          }
        })
      }
      const message = err instanceof Error ? err.message : 'Failed to remove avatar'
      toast.error(message)
    } finally {
      setIsRemovingAvatar(false)
    }
  }

  const handleHeaderBgFileSelect = async (file?: File | null) => {
    if (!file || !currentUser) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Header image must be 5MB or smaller.')
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
        const url = await headerBgUpload.mutateAsync({
          fileData: base64,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        })
        setHeaderBgUrl(url)
        toast.success('Header image updated')
      } catch (err) {
        const status = (err as { status?: number }).status
        const message = err instanceof Error ? err.message : 'Failed to upload header image'
        if (status === 400) {
          toast.error(message)
        } else {
          toast.error('Failed to upload header image')
        }
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveHeaderBg = async () => {
    if (!currentUser) return
    setIsRemovingHeaderBg(true)
    setHeaderBgUrl('')
    queryClient.setQueryData(['profile', currentUser.usernameSlug], (prev: any) => {
      if (!prev?.user) return prev
      return {
        ...prev,
        user: { ...prev.user, headerBgUrl: '' },
      }
    })
    try {
      await profileUpdate.mutateAsync({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        headerBgUrl: null,
      })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['profile', currentUser.usernameSlug] })
      toast.success('Header image removed')
    } catch (err) {
      if (profileData?.user?.headerBgUrl) {
        setHeaderBgUrl(profileData.user.headerBgUrl)
        queryClient.setQueryData(['profile', currentUser.usernameSlug], (prev: any) => {
          if (!prev?.user) return prev
          return {
            ...prev,
            user: { ...prev.user, headerBgUrl: profileData.user.headerBgUrl },
          }
        })
      }
      const message = err instanceof Error ? err.message : 'Failed to remove header image'
      toast.error(message)
    } finally {
      setIsRemovingHeaderBg(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return
    setStatusMessage(null)
    try {
      const payload: {
        userId: string
        displayName?: string
        bio?: string
        avatarUrl?: string
        headerBgUrl?: string
        link?: string | null
        twitterUsername?: string | null
        instagramUsername?: string | null
        slug?: string
      } = {
        userId: currentUser.id,
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        headerBgUrl: headerBgUrl.trim() || undefined,
        link: link.trim() || null,
        twitterUsername: twitterUsername.trim() || null,
        instagramUsername: instagramUsername.trim() || null,
      }
      
      // Only include slug if it changed and username is not locked
      if (!isUsernameLocked && initialValues && username !== initialValues.username) {
        payload.slug = username.trim()
      }
      
      await profileUpdate.mutateAsync(payload)
      toast.success('Profile updated')
      setInitialValues((prev) =>
        prev
          ? {
              ...prev,
              displayName,
              bio,
              avatarUrl,
              headerBgUrl,
              link,
              twitterUsername,
              instagramUsername,
              username,
            }
          : null,
      )
      setStatusMessage(null)
    } catch (err) {
      const status = (err as { status?: number }).status
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      if (status === 429 || status === 400) {
        setStatusMessage(message)
      } else {
        setStatusMessage('Failed to update profile')
      }
    }
  }

  const isSavingProfile = profileUpdate.isPending
  const isUsernameLocked = nextChangeAt ? nextChangeAt.getTime() > Date.now() : false
  const isDirty =
    initialValues !== null &&
    (displayName !== initialValues.displayName ||
      bio !== initialValues.bio ||
      avatarUrl !== initialValues.avatarUrl ||
      headerBgUrl !== initialValues.headerBgUrl ||
      link !== initialValues.link ||
      twitterUsername !== initialValues.twitterUsername ||
      instagramUsername !== initialValues.instagramUsername ||
      (!isUsernameLocked && username !== initialValues.username))
  const nextChangeLabel = nextChangeAt ? format(nextChangeAt, 'MMM d, yyyy, h:mm a') : null

  if (isProfileLoading) {
    return <ProfileInfoSkeleton />
  }

  if (error || !profileData?.user || !currentUser) {
    return (
      <div className="py-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center space-y-3">
            <p className="text-lg font-semibold">Unable to load profile</p>
            <p className="text-muted-foreground">Please try again later.</p>
            <Link to="/">
              <Button variant="outline">Go to feed</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-4 pb-12">
        <div className="space-y-2 mb-6">
          <h1 className="hidden md:block text-xl font-bold">Profile Info</h1>
        <p className="text-sm text-muted-foreground">
          Update your public profile and username. Changes apply to your public profile at
          /profile/{profileData.user.slug}.
        </p>
      </div>

      <div className="space-y-6">
        {/* Header Background Image */}
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label>Header Background Image</Label>
            <div className="relative h-48 md:h-64 rounded-[var(--radius-md)] overflow-hidden bg-gradient-to-br from-muted via-muted/80 to-muted/60 border border-border">
              {headerBgUrl ? (
                <img
                  src={headerBgUrl}
                  alt="Header background"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon name="image" variant="regular" className="text-4xl text-muted-foreground" />
                </div>
              )}
              {/* Mobile: always visible buttons at top right */}
              <div className="absolute top-3 right-3 flex items-center gap-2 md:hidden">
                <Button
                  type="button"
                  variant="default"
                  disabled={headerBgUpload.isPending || isRemovingHeaderBg}
                  onClick={() => headerBgInputRef.current?.click()}
                >
                  {headerBgUpload.isPending && <LoadingSpinner size="sm" className="mr-2" />}
                  {headerBgUrl ? 'Change image' : 'Upload image'}
                </Button>
                {headerBgUrl && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-9 w-9 p-0"
                    disabled={headerBgUpload.isPending || isRemovingHeaderBg}
                    onClick={handleRemoveHeaderBg}
                    aria-label="Remove header image"
                  >
                    {isRemovingHeaderBg ? <LoadingSpinner size="sm" /> : <Icon name="xmark" />}
                  </Button>
                )}
              </div>
              {/* Desktop: hover overlay */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors hidden md:flex items-center justify-center opacity-0 hover:opacity-100">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="default"
                    disabled={headerBgUpload.isPending || isRemovingHeaderBg}
                    onClick={() => headerBgInputRef.current?.click()}
                  >
                    {headerBgUpload.isPending && <LoadingSpinner size="sm" className="mr-2" />}
                    {headerBgUrl ? 'Change image' : 'Upload image'}
                  </Button>
                  {headerBgUrl && (
                    <Button
                      type="button"
                      variant="destructive"
                      className="h-9 w-9 p-0"
                      disabled={headerBgUpload.isPending || isRemovingHeaderBg}
                      onClick={handleRemoveHeaderBg}
                      aria-label="Remove header image"
                    >
                      {isRemovingHeaderBg ? <LoadingSpinner size="sm" /> : <Icon name="xmark" />}
                    </Button>
                  )}
                </div>
              </div>
              <input
                ref={headerBgInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleHeaderBgFileSelect(e.target.files?.[0])}
              />
            </div>
            <p className="text-xs text-muted-foreground">Recommended: 1200x400px. Max 5MB.</p>
          </div>
        </div>

        {/* Avatar */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between gap-4 rounded-[var(--radius-lg)] bg-white dark:bg-input/30 border border-input px-5 md:px-6 lg:px-8 py-4 md:py-5">
            <div className="flex items-center gap-4 md:gap-5 min-w-0">
              <div className="w-16 h-16 md:w-18 md:h-18 rounded-full overflow-hidden bg-background flex items-center justify-center shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar preview" className="w-full h-full object-cover" />
                ) : (
                  <Icon name="circle-user-circle-plus" variant="regular" className="text-2xl text-muted-foreground" />
                )}
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-lg font-bold leading-tight truncate">
                  {profileData.user.displayName || profileData.user.slug}
                </p>
                <p className="text-sm text-muted-foreground leading-tight truncate">@{profileData.user.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="default"
                disabled={avatarUpload.isPending || isRemovingAvatar}
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarUpload.isPending && <LoadingSpinner size="sm" className="mr-2" />}
                {avatarUrl ? 'Change photo' : 'Upload photo'}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-9 w-9 p-0"
                disabled={avatarUpload.isPending || isRemovingAvatar || !avatarUrl}
                onClick={handleRemoveAvatar}
                aria-label="Remove photo"
              >
                {isRemovingAvatar ? <LoadingSpinner size="sm" /> : <Icon name="xmark" />}
              </Button>
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

        <form className="space-y-5" onSubmit={handleProfileSubmit}>
          <div className="space-y-2">
            <Label>Display name</Label>
            <div className="relative">
              <Input
                value={displayName}
                maxLength={50}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                className="pr-14"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                {displayName.length} / 50
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Bio</Label>
            <div className="relative">
              <Textarea
                value={bio}
                maxLength={280}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the world about you"
                rows={6}
                className="min-h-[140px] pb-7"
              />
              <div className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none">
                {bio.length} / 280
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Website</Label>
            <Input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://example.com"
              maxLength={2048}
            />
            <p className="text-xs text-muted-foreground">
              Your portfolio or personal website
            </p>
          </div>

          <div className="space-y-2">
            <Label>X (Twitter)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">@</span>
              <Input
                value={twitterUsername}
                onChange={(e) => setTwitterUsername(e.target.value.replace(/^@/, ''))}
                placeholder="username"
                maxLength={15}
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Your X username (without the @)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Instagram</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">@</span>
              <Input
                value={instagramUsername}
                onChange={(e) => setInstagramUsername(e.target.value.replace(/^@/, ''))}
                placeholder="username"
                maxLength={30}
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Your Instagram username (without the @)
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Username</Label>
              {isUsernameLocked && nextChangeLabel ? (
                <span className="text-xs text-[var(--tone-warning)]">
                  Next change available: {nextChangeLabel}
                </span>
              ) : null}
            </div>
            <div className="relative">
              <Input
                value={username}
                maxLength={24}
                onChange={(e) => {
                  setStatusMessage(null)
                  setUsername(e.target.value.toLowerCase())
                }}
                placeholder="username"
                disabled={profileUpdate.isPending || isUsernameLocked}
                className="pr-14"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                {username.length} / 24
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Lowercase a-z, 0-9, _ and . only</p>
            {statusMessage ? (
              <p className="text-xs text-[var(--tone-warning)]">{statusMessage}</p>
            ) : null}
          </div>

          {isDirty && (
            <div className="flex justify-end">
              <Button type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Save changes
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

function ProfileInfoSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24 w-full rounded-[var(--radius-lg)]" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-32 ml-auto" />
      </div>
      <Skeleton className="h-48 w-full rounded-[var(--radius-md)]" />
    </div>
  )
}

