import { useEffect, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Icon } from '@/components/ui/icon'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Card, CardContent } from '@/components/ui/card'
import { MediaUpload, type UploadedMedia } from '@/components/forms/MediaUpload'
import type { PostDraft } from '@/components/onboarding/OnboardingPreview'
import { useAuth } from '@/hooks/useAuth'
import { createPost } from '@/server/functions/posts'

interface FirstPostStepProps {
  onPublished: (post?: { id: string }) => void
  onSkip: () => void
  onBack?: () => void
  /** Reports the in-progress image/caption so the shell can live-preview it. */
  onDraftChange?: (draft: PostDraft | null) => void
}

export function FirstPostStep({ onPublished, onSkip, onBack, onDraftChange }: FirstPostStepProps) {
  const { getAuthHeaders } = useAuth()

  const [media, setMedia] = useState<UploadedMedia | null>(null)
  const [caption, setCaption] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)

  useEffect(() => {
    onDraftChange?.(media ? { mediaUrl: media.url, caption } : null)
  }, [media, caption, onDraftChange])

  const handlePublish = async () => {
    if (!media) {
      toast.error('Add an image to publish.')
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
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="space-y-2">
          <Label>Image</Label>
          <MediaUpload
            acceptedTypes={['image']}
            onUpload={setMedia}
            onRemove={() => setMedia(null)}
            disabled={isPublishing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="firstPostCaption">Caption <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea
            id="firstPostCaption"
            value={caption}
            maxLength={2000}
            onChange={(e) => setCaption(e.target.value)}
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
              No thanks, let me browse the work
            </Button>
            <Button type="button" size="cta" onClick={handlePublish} disabled={isPublishing || !media}>
              {isPublishing ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Publish
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default FirstPostStep
