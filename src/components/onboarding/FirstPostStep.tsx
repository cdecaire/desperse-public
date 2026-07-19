import { useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Icon } from '@/components/ui/icon'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { MediaUpload, type UploadedMedia } from '@/components/forms/MediaUpload'
import { useAuth } from '@/hooks/useAuth'
import { createPost } from '@/server/functions/posts'

interface FirstPostStepProps {
  onPublished: (post?: { id: string }) => void
  onSkip: () => void
  onBack?: () => void
  /** Media picked so far — owned by the flow so back-nav never loses it. */
  media: UploadedMedia | null
  onMediaChange: (media: UploadedMedia | null) => void
  caption: string
  onCaptionChange: (caption: string) => void
  /** Dev-preview mode: static sample media, stubbed publish (no createPost). */
  preview?: boolean
}

export function FirstPostStep({
  onPublished,
  onSkip,
  onBack,
  media,
  onMediaChange,
  caption,
  onCaptionChange,
  preview = false,
}: FirstPostStepProps) {
  const { getAuthHeaders } = useAuth()
  const [isPublishing, setIsPublishing] = useState(false)

  const handlePublish = async () => {
    if (!media) {
      toast.error('Add an image to publish.')
      return
    }
    if (preview) {
      toast.success('Published (preview)')
      onPublished({ id: 'preview' })
      return
    }
    setIsPublishing(true)
    try {
      const authHeaders = await getAuthHeaders()
      const postResult = await createPost({
        data: {
          mediaUrl: media.url,
          type: 'collectible',
          caption: caption.trim() || undefined,
          _authorization: authHeaders.Authorization,
        },
      } as never)
      if (!postResult.success) {
        throw new Error(postResult.error || 'Failed to publish post')
      }

      toast.success('Your first collectible is live')
      onPublished(postResult.post ? { id: postResult.post.id } : undefined)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish post')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
      <div className="space-y-5">
        <MediaUpload
          acceptedTypes={['image']}
          initialMedia={media}
          onUpload={onMediaChange}
          onRemove={() => onMediaChange(null)}
          disabled={isPublishing}
        />

        <div className="space-y-2">
          <Label htmlFor="firstPostCaption">Caption <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea
            id="firstPostCaption"
            value={caption}
            maxLength={2000}
            onChange={(e) => onCaptionChange(e.target.value)}
            placeholder="Say something about this piece"
            rows={3}
            disabled={isPublishing}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              className="justify-start px-0 text-body-sm text-muted-foreground hover:bg-transparent"
              onClick={onBack}
              disabled={isPublishing}
            >
              <Icon name="arrow-left" variant="regular" className="mr-1.5 text-xs" />
              Back
            </Button>
          ) : (
            <span aria-hidden />
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="ghost"
              className="justify-start px-0 text-body-sm text-muted-foreground hover:bg-transparent sm:px-3"
              onClick={onSkip}
              disabled={isPublishing}
            >
              I'll share something later
            </Button>
            <Button type="button" size="cta" onClick={handlePublish} disabled={isPublishing || !media}>
              {isPublishing ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              {isPublishing ? 'Publishing…' : 'Publish collectible'}
            </Button>
          </div>
        </div>
      </div>
  )
}

export default FirstPostStep
