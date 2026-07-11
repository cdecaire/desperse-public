import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Field,
  Fieldset,
  FieldsetContent,
  FieldsetDescription,
  FieldsetFooter,
  FieldsetLegend,
  Form,
} from '@cdecaire/sable'
import { Col, Columns, Row, Stack } from '@cdecaire/sable/layout'
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
import { PageHeader } from '@/components/shared/PageHeader'
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
    if (!file) return
    if (!currentUser) {
      toast.error('Still loading your account — try again in a moment.')
      return
    }
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
        <Stack gap={1.5} className="text-center">
          <p className="text-title-lg">Unable to load profile</p>
          <p className="text-muted-foreground">Please try again later.</p>
          <Link to="/">
            <Button variant="outline">Go to feed</Button>
          </Link>
        </Stack>
      </div>
    )
  }

  return (
    <div className="pt-4 pb-12">
      <PageHeader
        title="Profile Info"
        description={<>Update your public profile and username. Changes apply to your public profile at /profile/{profileData.user.slug}.</>}
      />

      <Stack gap={3}>
        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-title-lg">Header Background Image</h2>
            <p className="text-body-sm text-muted-foreground">Recommended: 1200x400px. Max 5MB.</p>
          </div>
          <div className="relative h-48 md:h-64 w-full rounded-[var(--radius-md)] overflow-hidden bg-gradient-to-br from-muted via-muted/80 to-muted/60 border border-border/80">
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
            <div className="absolute top-3 right-3 flex items-center gap-2 md:!hidden">
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
                  size="icon"
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
              <Row gap={1} align="center">
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
                    size="icon"
                    disabled={headerBgUpload.isPending || isRemovingHeaderBg}
                    onClick={handleRemoveHeaderBg}
                    aria-label="Remove header image"
                  >
                    {isRemovingHeaderBg ? <LoadingSpinner size="sm" /> : <Icon name="xmark" />}
                  </Button>
                )}
              </Row>
            </div>
            <input
              ref={headerBgInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleHeaderBgFileSelect(e.target.files?.[0])}
            />
          </div>
        </section>

        <Fieldset>
          <FieldsetLegend>Avatar</FieldsetLegend>
          <FieldsetDescription>
            This image appears beside your posts, comments, and profile.
          </FieldsetDescription>
          <FieldsetContent>
            <Row align="center" justify="between" gap={2}>
              <Row align="center" gap={2} className="md:gap-5 min-w-0">
                <div className="w-16 h-16 md:w-18 md:h-18 rounded-full overflow-hidden bg-background flex items-center justify-center shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    <Icon name="circle-user-circle-plus" variant="regular" className="text-2xl text-muted-foreground" />
                  )}
                </div>
                <Stack gap={0.25} className="min-w-0">
                  <p className="text-title-lg leading-tight truncate">
                    {profileData.user.displayName || profileData.user.slug}
                  </p>
                  <p className="text-body-sm text-muted-foreground leading-tight truncate">@{profileData.user.slug}</p>
                </Stack>
              </Row>
              <Row align="center" gap={1} className="shrink-0">
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
                  size="icon"
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
              </Row>
            </Row>
          </FieldsetContent>
        </Fieldset>

        <Form className="gap-0" onSubmit={handleProfileSubmit}>
          <Fieldset>
            <FieldsetLegend>Public profile</FieldsetLegend>
            <FieldsetDescription>
              Update your display name, bio, links, and username.
            </FieldsetDescription>
            <FieldsetContent>
              <Stack gap={2.5}>
                <Stack gap={1}>
                  <Label>Display name</Label>
                  <div className="relative">
                    <Input
                      value={displayName}
                      maxLength={50}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Display name"
                      className="pr-14"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-caption text-muted-foreground pointer-events-none">
                      {displayName.length} / 50
                    </div>
                  </div>
                </Stack>

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
                    <div className="absolute bottom-2 right-3 text-caption text-muted-foreground pointer-events-none">
                      {bio.length} / 280
                    </div>
                  </div>
                </div>

                <Field label="Website" description="Your portfolio or personal website">
                  <Input
                    type="url"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://example.com"
                    maxLength={2048}
                  />
                </Field>

                <Columns count={12} gap={2.5}>
                  <Col span={{ base: 12, md: 6 }}>
                    <Stack gap={1}>
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
                      <p className="text-caption text-muted-foreground">
                        Your X username (without the @)
                      </p>
                    </Stack>
                  </Col>

                  <Col span={{ base: 12, md: 6 }}>
                    <Stack gap={1}>
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
                      <p className="text-caption text-muted-foreground">
                        Your Instagram username (without the @)
                      </p>
                    </Stack>
                  </Col>
                </Columns>

                <Stack gap={1}>
                  <Row align="center" gap={1}>
                    <Label>Username</Label>
                    {isUsernameLocked && nextChangeLabel ? (
                      <span className="text-xs text-[var(--tone-warning)]">
                        Next change available: {nextChangeLabel}
                      </span>
                    ) : null}
                  </Row>
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
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-caption text-muted-foreground pointer-events-none">
                      {username.length} / 24
                    </div>
                  </div>
                  <p className="text-caption text-muted-foreground">Lowercase a-z, 0-9, _ and . only</p>
                  {statusMessage ? (
                    <p className="text-xs text-[var(--tone-warning)]">{statusMessage}</p>
                  ) : null}
                </Stack>
              </Stack>
            </FieldsetContent>

            {isDirty && (
              <FieldsetFooter>
                <Button type="submit" disabled={isSavingProfile}>
                  {isSavingProfile ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                  Save changes
                </Button>
              </FieldsetFooter>
            )}
          </Fieldset>
        </Form>
      </Stack>
    </div>
  )
}

function ProfileInfoSkeleton() {
  return (
    <Stack gap={3}>
      <Stack gap={1.5}>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72" />
      </Stack>
      <Stack gap={2}>
        <Skeleton className="h-24 w-full rounded-[var(--radius-lg)]" />
      </Stack>
      <Stack gap={1.5}>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-32 ml-auto" />
      </Stack>
      <Skeleton className="h-48 w-full rounded-[var(--radius-md)]" />
    </Stack>
  )
}
