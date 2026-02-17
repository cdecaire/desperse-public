/**
 * BetaFeedbackModal Component
 * Lightweight feedback form: rating, message, screenshot - all optional
 */

import { useState, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { uploadMedia } from '@/server/functions/upload'
import { useAuth } from '@/hooks/useAuth'
import { useCreateBetaFeedback } from '@/hooks/useFeedback'

interface BetaFeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_UPLOAD_MB = 10
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
const MAX_MESSAGE_LENGTH = 1000

/**
 * Convert file to base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Star Rating Component
 */
function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number | null
  onChange: (rating: number | null) => void
  disabled?: boolean
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)

  const displayValue = hoverValue ?? value ?? 0

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          className={cn(
            'p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          onClick={() => onChange(value === star ? null : star)}
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(null)}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          <i
            className={cn(
              'text-2xl transition-colors',
              star <= displayValue
                ? 'fa-solid fa-star text-yellow-400'
                : 'fa-regular fa-star text-muted-foreground'
            )}
          />
        </button>
      ))}
      {value && (
        <button
          type="button"
          disabled={disabled}
          className="ml-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onChange(null)}
        >
          Clear
        </button>
      )}
    </div>
  )
}

export function BetaFeedbackModal({ open, onOpenChange }: BetaFeedbackModalProps) {
  const { getAccessToken } = useAuth()
  const createFeedback = useCreateBetaFeedback()

  const [rating, setRating] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if form has any content
  const trimmedMessage = message.trim()
  const hasContent = rating !== null || trimmedMessage.length > 0 || imageUrl !== null
  const canSubmit = hasContent && !isUploading && !createFeedback.isPending

  // Reset form
  const resetForm = useCallback(() => {
    setRating(null)
    setMessage('')
    setImageUrl(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setImagePreview(null)
    setUploadError(null)
  }, [imagePreview])

  // Handle file selection
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Reset input
      e.target.value = ''

      // Validate type
      if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
        setUploadError('Please upload an image (JPEG, PNG, WebP, or GIF)')
        return
      }

      // Validate size
      if (file.size > MAX_UPLOAD_BYTES) {
        setUploadError(`Image too large. Maximum size is ${MAX_UPLOAD_MB} MB`)
        return
      }

      setUploadError(null)
      setIsUploading(true)

      // Create preview
      const preview = URL.createObjectURL(file)
      if (imagePreview) URL.revokeObjectURL(imagePreview)
      setImagePreview(preview)

      try {
        const accessToken = await getAccessToken()
        if (!accessToken) {
          setUploadError('Please log in to upload images')
          setIsUploading(false)
          return
        }

        const fileData = await fileToBase64(file)

        const result = await uploadMedia({
          data: {
            _authorization: accessToken,
            fileData,
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size,
          },
        } as never)

        if (result.success) {
          setImageUrl(result.url)
        } else {
          setUploadError(result.error || 'Upload failed')
          URL.revokeObjectURL(preview)
          setImagePreview(null)
        }
      } catch (error) {
        console.error('Upload error:', error)
        setUploadError('Upload failed. Please try again.')
        URL.revokeObjectURL(preview)
        setImagePreview(null)
      } finally {
        setIsUploading(false)
      }
    },
    [getAccessToken, imagePreview]
  )

  // Remove image
  const handleRemoveImage = useCallback(() => {
    setImageUrl(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setImagePreview(null)
    setUploadError(null)
  }, [imagePreview])

  // Handle submit
  const handleSubmit = async () => {
    if (!canSubmit) return

    try {
      await createFeedback.mutateAsync({
        rating,
        message: trimmedMessage || null,
        imageUrl,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        appVersion: null, // Could add build version here
      })

      resetForm()
      onOpenChange(false)
    } catch (error) {
      // Error handled by mutation
      console.error('Submit error:', error)
    }
  }

  // Handle cancel
  const handleCancel = () => {
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Beta feedback</DialogTitle>
          <DialogDescription>
            Anything helps. Bugs, ideas, screenshots.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Star Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium">How's it going?</label>
            <StarRating
              value={rating}
              onChange={setRating}
              disabled={createFeedback.isPending}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label htmlFor="feedback-message" className="text-sm font-medium">
              Message
            </label>
            <div className="relative">
              <Textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What happened? What were you trying to do?"
                maxLength={MAX_MESSAGE_LENGTH}
                rows={4}
                className="resize-none pb-7"
                disabled={createFeedback.isPending}
              />
              <div className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none">
                {message.length} / {MAX_MESSAGE_LENGTH}
              </div>
            </div>
          </div>

          {/* Screenshot Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Screenshot</label>

            {!imagePreview && !imageUrl ? (
              <div
                className={cn(
                  'relative rounded-lg border-2 border-dashed transition-all duration-200',
                  'flex flex-col items-center justify-center min-h-[100px] p-4',
                  'border-zinc-300 dark:border-zinc-700 hover:border-muted-foreground',
                  'cursor-pointer',
                  (isUploading || createFeedback.isPending) && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() =>
                  !isUploading &&
                  !createFeedback.isPending &&
                  fileInputRef.current?.click()
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={SUPPORTED_IMAGE_TYPES.join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isUploading || createFeedback.isPending}
                />

                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <LoadingSpinner size="md" />
                    <p className="text-xs text-muted-foreground">Uploading...</p>
                  </div>
                ) : (
                  <>
                    <i className="fa-regular fa-camera text-xl text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Add a screenshot (optional)
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden border bg-muted/30">
                <img
                  src={imagePreview || imageUrl || ''}
                  alt="Screenshot preview"
                  className="w-full max-h-[200px] object-contain"
                />

                {isUploading && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <LoadingSpinner size="md" />
                  </div>
                )}

                {!isUploading && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2"
                    disabled={createFeedback.isPending}
                  >
                    <i className="fa-solid fa-xmark" />
                  </Button>
                )}
              </div>
            )}

            {uploadError && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <i className="fa-regular fa-circle-exclamation" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={createFeedback.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {createFeedback.isPending ? 'Sending...' : 'Send feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BetaFeedbackModal
