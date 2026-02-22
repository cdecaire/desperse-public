/**
 * MediaUpload Component
 * Handles media file uploads with drag-and-drop, validation, and preview
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { upload } from '@vercel/blob/client'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { deleteMedia } from '@/server/functions/upload'
import { env } from '@/config/env'
import { useAuth } from '@/hooks/useAuth'

// Supported file types
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm']
const SUPPORTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3']
const SUPPORTED_DOCUMENT_TYPES = ['application/pdf', 'application/zip', 'application/epub+zip']
const SUPPORTED_3D_TYPES = ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream']
const SUPPORTED_MEDIA_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_VIDEO_TYPES,
  ...SUPPORTED_AUDIO_TYPES,
  ...SUPPORTED_DOCUMENT_TYPES,
  ...SUPPORTED_3D_TYPES,
]

// Accept string for file input (includes file extensions for better browser support)
const ACCEPT_STRING = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  '.svg',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp3',
  'application/pdf',
  '.pdf',
  'application/epub+zip',
  '.epub',
  '.glb',
  '.gltf',
  'model/gltf-binary',
  'model/gltf+json',
].join(',')

const ACCEPT_IMAGE_STRING = SUPPORTED_IMAGE_TYPES.join(',')

// Hard-cap upload size to avoid browser crashes from huge base64 conversions.
const MAX_UPLOAD_MB = Math.min(env.MAX_FILE_SIZE_MB, 25)
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

export type MediaType = 'image' | 'video' | 'audio' | 'document' | '3d'

/**
 * Check if file extension suggests a GLB/GLTF file
 */
function isGlbByExtension(fileName: string): boolean {
  if (!fileName) return false
  const ext = fileName.toLowerCase().split('.').pop()
  return ext === 'glb' || ext === 'gltf'
}

/**
 * Check if file extension suggests a PDF, ZIP, or EPUB
 */
function isDocumentByExtension(fileName: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop()
  return ext === 'pdf' || ext === 'zip' || ext === 'epub'
}

export interface UploadedMedia {
  url: string
  mediaType: MediaType
  fileName: string
  mimeType?: string
  fileSize?: number
}

export interface MediaUploadProps {
  /** Called when media is successfully uploaded */
  onUpload: (media: UploadedMedia) => void
  /** Called when media is removed */
  onRemove?: () => void
  /** Called when cover image is uploaded (for audio files) */
  onCoverUpload?: (coverUrl: string) => void
  /** Called when cover image is removed */
  onCoverRemove?: () => void
  /** Initial media URL (for editing) */
  initialMedia?: UploadedMedia | null
  /** Initial cover URL (for audio files) */
  initialCover?: string | null
  /** Whether to require a cover image for audio files */
  requireCoverForAudio?: boolean
  /** Additional class names */
  className?: string
  /** Disabled state */
  disabled?: boolean
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

interface UploadState {
  status: UploadStatus
  progress: number
  error?: string
}

/**
 * Validate file type (with filename for extension-based fallback)
 */
function isValidMediaType(mimeType: string, fileName?: string): boolean {
  // First check by extension for GLB/GLTF files (browsers may report incorrect MIME types)
  if (fileName && isGlbByExtension(fileName)) {
    // Allow GLB/GLTF files regardless of MIME type (they may be reported as application/octet-stream)
    return true
  }
  
  // Check if MIME type is in supported list
  if (SUPPORTED_MEDIA_TYPES.includes(mimeType)) return true
  
  // Fallback: check by extension for PDF/ZIP files that may have generic MIME
  if (fileName && isDocumentByExtension(fileName)) {
    return true
  }
  
  return false
}


/**
 * Validate file size (in bytes)
 */
function isValidFileSize(sizeInBytes: number): boolean {
  return sizeInBytes <= MAX_UPLOAD_BYTES
}

/**
 * Determine media type from MIME type or filename
 */
function getMediaTypeFromFile(mimeType: string, fileName: string): MediaType {
  if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) return 'image'
  if (SUPPORTED_VIDEO_TYPES.includes(mimeType)) return 'video'
  if (SUPPORTED_AUDIO_TYPES.includes(mimeType)) return 'audio'
  if (SUPPORTED_DOCUMENT_TYPES.includes(mimeType) || isDocumentByExtension(fileName)) return 'document'
  if (SUPPORTED_3D_TYPES.includes(mimeType) || isGlbByExtension(fileName)) return '3d'
  return 'image' // fallback
}

/**
 * Generate a unique pathname for blob storage
 */
function generateBlobPath(fileName: string): string {
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const sanitizedName = fileName
    .replace(/[^a-zA-Z0-9.-_]/g, '-')
    .substring(0, 50)
  return `media/${timestamp}-${randomSuffix}-${sanitizedName}`
}

export function MediaUpload({
  onUpload,
  onRemove,
  onCoverUpload,
  onCoverRemove,
  initialMedia = null,
  initialCover = null,
  requireCoverForAudio = true,
  className,
  disabled = false,
}: MediaUploadProps) {
  const { getAccessToken } = useAuth()
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia | null>(initialMedia)
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCover)
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
  })
  const [coverUploadState, setCoverUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
  })
  const [isDragging, setIsDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    }
  }, [previewUrl, coverPreviewUrl])

  // Validate and process file
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    if (!isValidMediaType(file.type, file.name)) {
      return {
        valid: false,
        error: 'Unsupported file type. Please upload an image, video, audio, PDF, ZIP, or 3D model (GLB/GLTF).',
      }
    }

    if (!isValidFileSize(file.size)) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${env.MAX_FILE_SIZE_MB} MB.`,
      }
    }

    // Soft warning for large files
    if (file.size > 50 * 1024 * 1024) {
      console.warn('Large file detected. We recommend files under 50 MB for faster uploads.')
    }

    return { valid: true }
  }, [])

  // Handle file upload using client-side direct upload to Vercel Blob
  const handleUpload = useCallback(async (file: File) => {
    const validation = validateFile(file)
    if (!validation.valid) {
      setUploadState({
        status: 'error',
        progress: 0,
        error: validation.error,
      })
      return
    }

    // Create preview URL
    const preview = URL.createObjectURL(file)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(preview)

    setUploadState({ status: 'uploading', progress: 10 })

    try {
      // Check authentication
      const accessToken = await getAccessToken()
      if (!accessToken) {
        setUploadState({
          status: 'error',
          progress: 0,
          error: 'Please log in to upload files.',
        })
        URL.revokeObjectURL(preview)
        setPreviewUrl(null)
        return
      }

      setUploadState({ status: 'uploading', progress: 20 })

      // Generate a unique pathname
      const pathname = generateBlobPath(file.name)

      // Upload directly to Vercel Blob (bypasses 4.5MB serverless limit)
      const blob = await upload(pathname, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        clientPayload: JSON.stringify({ token: accessToken }),
        onUploadProgress: (progress) => {
          // Progress is 0-100
          const scaledProgress = 20 + Math.round(progress.percentage * 0.7)
          setUploadState({ status: 'uploading', progress: scaledProgress })
        },
      })

      setUploadState({ status: 'uploading', progress: 95 })

      // Determine media type
      const mediaType = getMediaTypeFromFile(file.type, file.name)

      const media: UploadedMedia = {
        url: blob.url,
        mediaType,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      }
      setUploadedMedia(media)
      setUploadState({ status: 'success', progress: 100 })
      onUpload(media)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadState({
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload failed. Please try again.',
      })
      // Clear preview on error
      if (preview) {
        URL.revokeObjectURL(preview)
        setPreviewUrl(null)
      }
    }
  }, [validateFile, onUpload, previewUrl, getAccessToken])

  // Handle cover image upload using client-side direct upload
  const handleCoverUpload = useCallback(async (file: File) => {
    // Validate - must be an image
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      setCoverUploadState({
        status: 'error',
        progress: 0,
        error: 'Cover must be an image (JPEG, PNG, WebP, or GIF).',
      })
      return
    }

    if (!isValidFileSize(file.size)) {
      setCoverUploadState({
        status: 'error',
        progress: 0,
        error: `File too large. Maximum size is ${env.MAX_FILE_SIZE_MB} MB.`,
      })
      return
    }

    // Create preview
    const preview = URL.createObjectURL(file)
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    setCoverPreviewUrl(preview)

    setCoverUploadState({ status: 'uploading', progress: 10 })

    try {
      // Check authentication
      const accessToken = await getAccessToken()
      if (!accessToken) {
        setCoverUploadState({
          status: 'error',
          progress: 0,
          error: 'Please log in to upload files.',
        })
        URL.revokeObjectURL(preview)
        setCoverPreviewUrl(null)
        return
      }

      setCoverUploadState({ status: 'uploading', progress: 20 })

      // Generate a unique pathname for cover
      const pathname = generateBlobPath(`cover-${file.name}`)

      // Upload directly to Vercel Blob
      const blob = await upload(pathname, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        clientPayload: JSON.stringify({ token: accessToken }),
        onUploadProgress: (progress) => {
          const scaledProgress = 20 + Math.round(progress.percentage * 0.7)
          setCoverUploadState({ status: 'uploading', progress: scaledProgress })
        },
      })

      setCoverUploadState({ status: 'uploading', progress: 95 })

      setCoverUrl(blob.url)
      setCoverUploadState({ status: 'success', progress: 100 })
      onCoverUpload?.(blob.url)
    } catch (error) {
      console.error('Cover upload error:', error)
      setCoverUploadState({
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Cover upload failed. Please try again.',
      })
      if (preview) {
        URL.revokeObjectURL(preview)
        setCoverPreviewUrl(null)
      }
    }
  }, [onCoverUpload, coverPreviewUrl, getAccessToken])

  // Handle file removal
  const handleRemove = useCallback(async () => {
    if (uploadedMedia?.url) {
      // Attempt to delete from storage (non-blocking, requires auth)
      const accessToken = await getAccessToken()
      if (accessToken) {
        deleteMedia({ data: { _authorization: accessToken, url: uploadedMedia.url } } as unknown as Parameters<typeof deleteMedia>[0]).catch(console.error)
      }
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setUploadedMedia(null)
    setUploadState({ status: 'idle', progress: 0 })
    onRemove?.()
  }, [uploadedMedia, previewUrl, onRemove, getAccessToken])

  // Handle cover removal
  const handleCoverRemove = useCallback(async () => {
    if (coverUrl) {
      // Attempt to delete from storage (non-blocking, requires auth)
      const accessToken = await getAccessToken()
      if (accessToken) {
        deleteMedia({ data: { _authorization: accessToken, url: coverUrl } } as unknown as Parameters<typeof deleteMedia>[0]).catch(console.error)
      }
    }

    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    setCoverPreviewUrl(null)
    setCoverUrl(null)
    setCoverUploadState({ status: 'idle', progress: 0 })
    onCoverRemove?.()
  }, [coverUrl, coverPreviewUrl, onCoverRemove, getAccessToken])

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleUpload(files[0])
    }
  }, [disabled, handleUpload])

  // File input change handler
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleUpload(files[0])
    }
    // Reset input value so the same file can be selected again
    e.target.value = ''
  }, [handleUpload])

  // Cover input change handler
  const handleCoverChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleCoverUpload(files[0])
    }
    e.target.value = ''
  }, [handleCoverUpload])

  // Determine what to show
  const hasMedia = uploadedMedia || previewUrl
  // Audio, documents (PDF), and 3D models need cover images
  const needsCoverType = uploadedMedia?.mediaType === 'audio' || 
                         uploadedMedia?.mediaType === 'document' || 
                         uploadedMedia?.mediaType === '3d'
  const needsCover = needsCoverType && requireCoverForAudio && !coverUrl && !coverPreviewUrl
  const showCoverSection = needsCoverType && requireCoverForAudio

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Media Upload */}
      {!hasMedia ? (
        <div
          className={cn(
            'relative rounded-xl border-2 border-dashed transition-all duration-200',
            'flex flex-col items-center justify-center min-h-[240px] p-6',
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-zinc-300 dark:border-zinc-700 hover:border-muted-foreground',
            disabled && 'opacity-50 cursor-not-allowed',
            !disabled && 'cursor-pointer'
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          aria-label="Upload media file"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_STRING}
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled}
          />

          {uploadState.status === 'uploading' ? (
            <div className="flex flex-col items-center gap-3">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-muted-foreground">
                Uploading... {uploadState.progress}%
              </p>
              <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <Icon name="cloud-arrow-up" className="text-3xl text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">
                {isDragging ? 'Drop your file here' : 'Drag and drop your media'}
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Images, videos, audio, PDFs, ZIPs, or 3D models (GLB/GLTF) • Max {MAX_UPLOAD_MB} MB
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="relative w-full max-w-full rounded-xl border bg-card overflow-hidden">
          {/* Media Preview */}
          <MediaPreview
            url={previewUrl || uploadedMedia?.url || ''}
            mediaType={uploadedMedia?.mediaType || 'image'}
            fileName={uploadedMedia?.fileName || ''}
            coverUrl={coverPreviewUrl || coverUrl}
          />

          {/* Upload Status Overlay */}
          {uploadState.status === 'uploading' && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-muted-foreground mt-2">
                Uploading... {uploadState.progress}%
              </p>
            </div>
          )}

          {/* Remove Button */}
          {uploadState.status !== 'uploading' && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={handleRemove}
              className="absolute top-3 right-3"
              aria-label="Remove media"
            >
              <Icon name="xmark" className="text-base" />
            </Button>
          )}
        </div>
      )}

      {/* Error Message */}
      {uploadState.status === 'error' && uploadState.error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <Icon name="circle-exclamation" variant="regular" />
          <span>{uploadState.error}</span>
        </div>
      )}

      {/* Cover Image Section (for audio files) */}
      {showCoverSection && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Cover Image {requireCoverForAudio && <span className="text-destructive">*</span>}
          </label>
          
          {!coverUrl && !coverPreviewUrl ? (
            <div
              className={cn(
                'relative rounded-lg border-2 border-dashed transition-all duration-200',
                'flex flex-col items-center justify-center min-h-[120px] p-4',
                'border-zinc-300 dark:border-zinc-700 hover:border-muted-foreground',
                disabled && 'opacity-50 cursor-not-allowed',
                !disabled && 'cursor-pointer'
              )}
              onClick={() => !disabled && coverInputRef.current?.click()}
              role="button"
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => {
                if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  coverInputRef.current?.click()
                }
              }}
              aria-label="Upload cover image"
            >
              <input
                ref={coverInputRef}
                type="file"
                accept={ACCEPT_IMAGE_STRING}
                onChange={handleCoverChange}
                className="hidden"
                disabled={disabled}
              />

              {coverUploadState.status === 'uploading' ? (
                <div className="flex flex-col items-center gap-2">
                  <LoadingSpinner size="md" />
                  <p className="text-xs text-muted-foreground">
                    Uploading... {coverUploadState.progress}%
                  </p>
                </div>
              ) : (
                <>
                  <Icon name="image" variant="regular" className="text-xl text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Add a cover image
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden aspect-square max-w-[200px]">
              <img
                src={coverPreviewUrl || coverUrl || ''}
                alt="Cover"
                className="w-full h-full object-cover"
              />
              
              {coverUploadState.status === 'uploading' && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <LoadingSpinner size="md" />
                </div>
              )}
              
              {coverUploadState.status !== 'uploading' && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={handleCoverRemove}
                  className="absolute top-2 right-2"
                  aria-label="Remove cover image"
                >
                  <Icon name="xmark" className="text-base" />
                </Button>
              )}
            </div>
          )}

          {/* Cover Error */}
          {coverUploadState.status === 'error' && coverUploadState.error && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">
              <Icon name="circle-exclamation" variant="regular" />
              <span>{coverUploadState.error}</span>
            </div>
          )}

          {/* Cover Required Warning */}
          {needsCover && uploadState.status === 'success' && (
            <p className="text-xs text-(--tone-warning)">
              <Icon name="triangle-exclamation" variant="regular" className="mr-1" />
              A cover image is required for this file type
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Media Preview Component
 */
interface MediaPreviewProps {
  url: string
  mediaType: MediaType
  fileName: string
  coverUrl?: string | null
}

function MediaPreview({ url, mediaType, fileName, coverUrl }: MediaPreviewProps) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null)

  if (mediaType === 'image') {
    return (
      <div 
        className="w-full bg-muted/50 overflow-hidden"
        style={aspectRatio ? { aspectRatio: aspectRatio.toString() } : undefined}
      >
        <img
          src={url}
          alt={fileName}
          className="w-full h-full object-cover"
          onLoad={(e) => {
            const img = e.currentTarget
            if (img.naturalWidth && img.naturalHeight && !aspectRatio) {
              setAspectRatio(img.naturalWidth / img.naturalHeight)
            }
          }}
        />
      </div>
    )
  }

  if (mediaType === 'video') {
    return (
      <div className="bg-zinc-950">
        <video
          src={url}
          controls
          className="block w-full max-h-[400px] object-contain"
          preload="metadata"
        >
          <track kind="captions" />
          Your browser does not support video playback.
        </video>
      </div>
    )
  }

  if (mediaType === 'audio') {
    return (
      <div className="p-6 bg-muted/30">
        <div className="flex items-center gap-4">
          {/* Cover image or placeholder */}
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
            {coverUrl ? (
              <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <Icon name="music" variant="regular" className="text-2xl text-muted-foreground" />
            )}
          </div>
          
          {/* Audio info and player */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate mb-2">{fileName}</p>
            <audio
              src={url}
              controls
              className="w-full h-8"
              preload="metadata"
            >
              Your browser does not support audio playback.
            </audio>
          </div>
        </div>
      </div>
    )
  }

  if (mediaType === 'document') {
    const isZip = fileName.toLowerCase().endsWith('.zip')
    const fileTypeLabel = isZip ? 'ZIP' : 'PDF'
    const fileIcon = isZip ? 'fa-file-zipper' : 'fa-file-pdf'
    
    return (
      <div className="p-6 bg-muted/30">
        <div className="flex items-center gap-4">
          {/* Cover image or document icon */}
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
            {coverUrl ? (
              <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <Icon name={fileIcon} variant="regular" className="text-2xl text-muted-foreground" />
            )}
          </div>
          
          {/* Document info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate mb-1">{fileName}</p>
            <p className="text-xs text-muted-foreground mb-2">{fileTypeLabel} Document</p>
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <Icon name="external-link" variant="regular" />
              Open {fileTypeLabel}
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (mediaType === '3d') {
    return (
      <div className="p-6 bg-muted/30">
        <div className="flex items-center gap-4">
          {/* Cover image or 3D icon */}
          <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
            {coverUrl ? (
              <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <Icon name="cube" variant="regular" className="text-2xl text-muted-foreground" />
            )}
          </div>
          
          {/* 3D model info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate mb-1">{fileName}</p>
            <p className="text-xs text-muted-foreground">3D Model (GLB/GLTF)</p>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default MediaUpload

