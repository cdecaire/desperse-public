/**
 * MultiMediaUpload Component
 * Handles multiple media file uploads with drag-and-drop reordering
 * Phase 1: Standard posts multi-asset support
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { upload } from '@vercel/blob/client'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { deleteMedia } from '@/server/functions/upload'
import { env } from '@/config/env'
import { useAuth } from '@/hooks/useAuth'

// Max assets per post (from plan)
const MAX_ASSETS = 10
// Only 1 downloadable file allowed per post
const MAX_DOWNLOADS = 1

// Supported file types (images, videos for carousel + documents/audio/3d)
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm']
const SUPPORTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3']
const SUPPORTED_DOCUMENT_TYPES = ['application/pdf', 'application/zip', 'application/epub+zip']
const SUPPORTED_3D_TYPES = ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream']

// Types that count as "downloadable" (non-previewable in carousel)
const DOWNLOAD_TYPES: MediaType[] = ['document', 'audio', '3d']
const SUPPORTED_MEDIA_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_VIDEO_TYPES,
  ...SUPPORTED_AUDIO_TYPES,
  ...SUPPORTED_DOCUMENT_TYPES,
  ...SUPPORTED_3D_TYPES,
]

const ACCEPT_STRING = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'application/pdf',
  '.pdf',
  'application/zip',
  '.zip',
  'application/epub+zip',
  '.epub',
  '.glb',
  '.gltf',
  'model/gltf-binary',
  'model/gltf+json',
].join(',')

const MAX_UPLOAD_MB = Math.min(env.MAX_FILE_SIZE_MB, 25)
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

export type MediaType = 'image' | 'video' | 'audio' | 'document' | '3d'

export interface UploadedMediaItem {
  id: string // Unique ID for tracking
  url: string
  mediaType: MediaType
  fileName: string
  mimeType?: string
  fileSize?: number
  sortOrder: number
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

interface MediaItemState {
  id: string
  file?: File
  previewUrl?: string
  uploadedUrl?: string
  mediaType: MediaType
  fileName: string
  mimeType?: string
  fileSize?: number
  status: UploadStatus
  progress: number
  error?: string
  sortOrder: number
}

export interface MultiMediaUploadProps {
  /** Called when media items change (after upload, reorder, or removal) */
  onChange: (items: UploadedMediaItem[]) => void
  /** Initial media items (for editing) */
  initialItems?: UploadedMediaItem[]
  /** Additional class names */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Label text (default: "Media") */
  label?: string
  /** Whether to show the label (default: true) */
  showLabel?: boolean
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
}

/**
 * Check if file extension suggests a GLB/GLTF file
 */
function isGlbByExtension(fileName: string): boolean {
  if (!fileName) return false
  const ext = fileName.toLowerCase().split('.').pop()
  return ext === 'glb' || ext === 'gltf'
}

/**
 * Check if file extension suggests a document file
 */
function isDocumentByExtension(fileName: string): boolean {
  if (!fileName) return false
  const ext = fileName.toLowerCase().split('.').pop()
  return ext === 'pdf' || ext === 'zip' || ext === 'epub'
}

function isValidMediaType(mimeType: string, fileName?: string): boolean {
  // Check by extension first for GLB/GLTF files (browsers report wrong MIME)
  if (fileName && isGlbByExtension(fileName)) return true
  // Check MIME type
  if (SUPPORTED_MEDIA_TYPES.includes(mimeType)) return true
  // Fallback for documents
  if (fileName && isDocumentByExtension(fileName)) return true
  return false
}

function isValidFileSize(sizeInBytes: number): boolean {
  return sizeInBytes <= MAX_UPLOAD_BYTES
}

function getMediaTypeFromMime(mimeType: string, fileName?: string): MediaType {
  if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) return 'image'
  if (SUPPORTED_VIDEO_TYPES.includes(mimeType)) return 'video'
  if (SUPPORTED_AUDIO_TYPES.includes(mimeType)) return 'audio'
  if (SUPPORTED_DOCUMENT_TYPES.includes(mimeType) || (fileName && isDocumentByExtension(fileName))) return 'document'
  if (SUPPORTED_3D_TYPES.includes(mimeType) || (fileName && isGlbByExtension(fileName))) return '3d'
  return 'image' // fallback
}

function generateBlobPath(fileName: string): string {
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const sanitizedName = fileName
    .replace(/[^a-zA-Z0-9.-_]/g, '-')
    .substring(0, 50)
  return `media/${timestamp}-${randomSuffix}-${sanitizedName}`
}

/**
 * Helper to format file size
 */
function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Helper to get file type label
 */
function getFileTypeLabel(mediaType: MediaType, fileName: string): string {
  if (mediaType === 'document') {
    const ext = fileName.toLowerCase().split('.').pop()
    if (ext === 'pdf') return 'PDF Document'
    if (ext === 'zip') return 'ZIP Archive'
    if (ext === 'epub') return 'EPUB Book'
    return 'Document'
  }
  if (mediaType === 'audio') return 'Audio File'
  if (mediaType === '3d') return '3D Model'
  return ''
}

/**
 * Helper to get file icon
 */
function getFileIcon(mediaType: MediaType, fileName: string): string {
  if (mediaType === 'document') {
    const ext = fileName.toLowerCase().split('.').pop()
    if (ext === 'pdf') return 'fa-file-pdf'
    if (ext === 'zip') return 'fa-file-zipper'
    if (ext === 'epub') return 'fa-book'
    return 'fa-file'
  }
  if (mediaType === 'audio') return 'fa-music'
  if (mediaType === '3d') return 'fa-cube'
  return 'fa-file'
}

/**
 * Media Item Card Component - handles image/video preview in grid
 */
interface MediaItemCardProps {
  item: MediaItemState
  index: number
  totalItems: number
  draggedItemId: string | null
  dragOverIndex: number | null
  onDragStart: (e: React.DragEvent, itemId: string) => void
  onDragOverItem: (e: React.DragEvent, index: number) => void
  onDropOnItem: (e: React.DragEvent, index: number) => void
  onDragEnd: () => void
  onRemove: (itemId: string) => void
}

function MediaItemCard({
  item,
  index,
  totalItems,
  draggedItemId,
  dragOverIndex,
  onDragStart,
  onDragOverItem,
  onDropOnItem,
  onDragEnd,
  onRemove,
}: MediaItemCardProps) {
  return (
    <div
      draggable={item.status === 'success'}
      onDragStart={(e) => onDragStart(e, item.id)}
      onDragOver={(e) => onDragOverItem(e, index)}
      onDrop={(e) => onDropOnItem(e, index)}
      onDragEnd={onDragEnd}
      className={cn(
        'relative aspect-square rounded-lg overflow-hidden bg-muted border-2',
        item.status === 'success' && 'cursor-grab',
        draggedItemId === item.id && 'opacity-50',
        dragOverIndex === index && draggedItemId !== item.id && 'border-primary',
        dragOverIndex !== index && 'border-transparent'
      )}
    >
      {/* Preview */}
      {item.mediaType === 'image' ? (
        <img
          src={item.previewUrl || item.uploadedUrl || ''}
          alt={item.fileName}
          className="w-full h-full object-cover"
        />
      ) : (
        <video
          src={item.previewUrl || item.uploadedUrl || ''}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
      )}

      {/* Upload Progress Overlay */}
      {item.status === 'uploading' && (
        <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
          <LoadingSpinner size="md" />
          <p className="text-xs text-muted-foreground mt-1">{item.progress}%</p>
        </div>
      )}

      {/* Error Overlay */}
      {item.status === 'error' && (
        <div className="absolute inset-0 bg-destructive/80 flex flex-col items-center justify-center p-2">
          <i className="fa-regular fa-circle-exclamation text-white text-lg" />
          <p className="text-xs text-white text-center mt-1">{item.error}</p>
        </div>
      )}

      {/* Video indicator */}
      {item.mediaType === 'video' && item.status === 'success' && (
        <div className="absolute bottom-1.5 left-1.5">
          <div className="w-5 h-5 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <i className="fa-solid fa-play text-[8px] text-white" />
          </div>
        </div>
      )}

      {/* Sort order badge - "Cover" for first, number for rest */}
      {item.status === 'success' && (
        <div className="absolute top-1.5 left-1.5">
          {index === 0 ? (
            <div className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <span className="text-[10px] text-white font-medium">Cover</span>
            </div>
          ) : totalItems > 1 ? (
            <div className="w-5 h-5 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <span className="text-[10px] text-white font-medium">{index + 1}</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Remove button */}
      {item.status !== 'uploading' && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={() => onRemove(item.id)}
          className="absolute top-1 right-1 w-6 h-6"
          aria-label="Remove media"
        >
          <i className="fa-solid fa-xmark text-xs" />
        </Button>
      )}
    </div>
  )
}

/**
 * Downloadable File Card - horizontal layout for documents/audio/3d (not in carousel)
 */
interface DownloadableFileCardProps {
  item: MediaItemState
  onRemove: (itemId: string) => void
}

function DownloadableFileCard({ item, onRemove }: DownloadableFileCardProps) {
  return (
    <div className="relative rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center gap-4">
        {/* File icon */}
        <div className="w-14 h-14 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
          <i className={cn('fa-regular text-xl text-muted-foreground', getFileIcon(item.mediaType, item.fileName))} />
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={item.fileName}>
            {item.fileName}
          </p>
          <p className="text-xs text-muted-foreground">
            {getFileTypeLabel(item.mediaType, item.fileName)}
          </p>
          {item.fileSize && (
            <p className="text-xs text-muted-foreground">
              {formatFileSize(item.fileSize)}
            </p>
          )}
        </div>

        {/* Remove button */}
        {item.status !== 'uploading' && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={() => onRemove(item.id)}
            className="flex-shrink-0"
            aria-label="Remove file"
          >
            <i className="fa-solid fa-xmark" />
          </Button>
        )}
      </div>

      {/* Upload Progress Overlay */}
      {item.status === 'uploading' && (
        <div className="absolute inset-0 bg-background/80 rounded-lg flex flex-col items-center justify-center">
          <LoadingSpinner size="md" />
          <p className="text-xs text-muted-foreground mt-1">{item.progress}%</p>
        </div>
      )}

      {/* Error state */}
      {item.status === 'error' && (
        <div className="mt-2 flex items-center gap-2 text-destructive text-xs">
          <i className="fa-regular fa-circle-exclamation" />
          <span>{item.error}</span>
        </div>
      )}
    </div>
  )
}

export function MultiMediaUpload({
  onChange,
  initialItems = [],
  className,
  disabled = false,
  label = 'Media',
  showLabel = true,
}: MultiMediaUploadProps) {
  const { getAccessToken } = useAuth()
  const [items, setItems] = useState<MediaItemState[]>(() =>
    initialItems.map((item, index) => ({
      id: item.id || generateId(),
      uploadedUrl: item.url,
      mediaType: item.mediaType,
      fileName: item.fileName,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      status: 'success' as const,
      progress: 100,
      sortOrder: item.sortOrder ?? index,
    }))
  )
  const [isDragging, setIsDragging] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      items.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent of changes when items change
  const notifyChange = useCallback(
    (newItems: MediaItemState[]) => {
      const uploadedItems: UploadedMediaItem[] = newItems
        .filter((item) => item.status === 'success' && item.uploadedUrl)
        .map((item, index) => ({
          id: item.id,
          url: item.uploadedUrl!,
          mediaType: item.mediaType,
          fileName: item.fileName,
          mimeType: item.mimeType,
          fileSize: item.fileSize,
          sortOrder: index,
        }))
      onChange(uploadedItems)
    },
    [onChange]
  )

  // Handle file upload
  const handleUpload = useCallback(
    async (file: File, itemId: string) => {
      // Validate
      if (!isValidMediaType(file.type, file.name)) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: 'error' as const,
                  error: 'Unsupported file type. Use images, videos, audio, PDFs, ZIPs, or 3D models.',
                }
              : item
          )
        )
        return
      }

      if (!isValidFileSize(file.size)) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: 'error' as const,
                  error: `File too large. Maximum size is ${MAX_UPLOAD_MB} MB.`,
                }
              : item
          )
        )
        return
      }

      // Check auth
      const accessToken = await getAccessToken()
      if (!accessToken) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: 'error' as const,
                  error: 'Please log in to upload files.',
                }
              : item
          )
        )
        return
      }

      // Start upload
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, status: 'uploading' as const, progress: 10 }
            : item
        )
      )

      try {
        const pathname = generateBlobPath(file.name)
        const blob = await upload(pathname, file, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          clientPayload: JSON.stringify({ token: accessToken }),
          onUploadProgress: (progress) => {
            const scaledProgress = 10 + Math.round(progress.percentage * 0.85)
            setItems((prev) =>
              prev.map((item) =>
                item.id === itemId
                  ? { ...item, progress: scaledProgress }
                  : item
              )
            )
          },
        })

        setItems((prev) => {
          const newItems = prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: 'success' as const,
                  progress: 100,
                  uploadedUrl: blob.url,
                }
              : item
          )
          // Notify after successful upload
          setTimeout(() => notifyChange(newItems), 0)
          return newItems
        })
      } catch (error) {
        console.error('Upload error:', error)
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: 'error' as const,
                  progress: 0,
                  error:
                    error instanceof Error
                      ? error.message
                      : 'Upload failed. Please try again.',
                }
              : item
          )
        )
      }
    },
    [getAccessToken, notifyChange]
  )

  // Handle file selection
  const handleFilesSelected = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      const remainingSlots = MAX_ASSETS - items.length
      let filesToAdd = fileArray.slice(0, remainingSlots)

      if (filesToAdd.length < fileArray.length) {
        console.warn(
          `Only adding ${filesToAdd.length} of ${fileArray.length} files (max ${MAX_ASSETS} total)`
        )
      }

      if (filesToAdd.length === 0) return

      // Check download limit - only 1 downloadable file allowed
      const existingDownloads = items.filter(item => DOWNLOAD_TYPES.includes(item.mediaType)).length
      const newDownloads = filesToAdd.filter(file => {
        const mediaType = getMediaTypeFromMime(file.type, file.name)
        return DOWNLOAD_TYPES.includes(mediaType)
      })

      if (existingDownloads + newDownloads.length > MAX_DOWNLOADS) {
        // Filter out extra downloads, keep only up to the limit
        let downloadsToKeep = MAX_DOWNLOADS - existingDownloads
        filesToAdd = filesToAdd.filter(file => {
          const mediaType = getMediaTypeFromMime(file.type, file.name)
          if (DOWNLOAD_TYPES.includes(mediaType)) {
            if (downloadsToKeep > 0) {
              downloadsToKeep--
              return true
            }
            return false
          }
          return true
        })

        if (existingDownloads >= MAX_DOWNLOADS) {
          console.warn('Only 1 downloadable file (PDF, ZIP, audio, 3D) allowed per post')
        }
      }

      if (filesToAdd.length === 0) return

      const newItems: MediaItemState[] = filesToAdd.map((file, index) => {
        const id = generateId()
        const mediaType = getMediaTypeFromMime(file.type, file.name)
        // Only create preview URL for previewable types (images/videos)
        const previewUrl = mediaType === 'image' || mediaType === 'video'
          ? URL.createObjectURL(file)
          : undefined
        return {
          id,
          file,
          previewUrl,
          mediaType,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          status: 'idle' as const,
          progress: 0,
          sortOrder: items.length + index,
        }
      })

      setItems((prev) => [...prev, ...newItems])

      // Start uploads
      newItems.forEach((item) => {
        if (item.file) {
          handleUpload(item.file, item.id)
        }
      })
    },
    [items, handleUpload]
  )

  // Handle file removal
  const handleRemove = useCallback(
    async (itemId: string) => {
      const item = items.find((i) => i.id === itemId)
      if (!item) return

      // Clean up preview URL
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }

      // Delete from storage if uploaded
      if (item.uploadedUrl) {
        const accessToken = await getAccessToken()
        if (accessToken) {
          deleteMedia({
            data: { _authorization: accessToken, url: item.uploadedUrl },
          } as unknown as Parameters<typeof deleteMedia>[0]).catch(
            console.error
          )
        }
      }

      setItems((prev) => {
        const newItems = prev
          .filter((i) => i.id !== itemId)
          .map((item, index) => ({ ...item, sortOrder: index }))
        setTimeout(() => notifyChange(newItems), 0)
        return newItems
      })
    },
    [items, getAccessToken, notifyChange]
  )

  // Drag and drop handlers for file input
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled && items.length < MAX_ASSETS) setIsDragging(true)
    },
    [disabled, items.length]
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled || items.length >= MAX_ASSETS) return

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFilesSelected(files)
      }
    },
    [disabled, items.length, handleFilesSelected]
  )

  // File input change handler
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFilesSelected(files)
      }
      e.target.value = ''
    },
    [handleFilesSelected]
  )

  // Reorder handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, itemId: string) => {
      setDraggedItemId(itemId)
      e.dataTransfer.effectAllowed = 'move'
    },
    []
  )

  const handleDragOverItem = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault()
      e.stopPropagation()
      if (draggedItemId) {
        setDragOverIndex(index)
      }
    },
    [draggedItemId]
  )

  const handleDropOnItem = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault()
      e.stopPropagation()

      if (!draggedItemId) return

      const draggedIndex = items.findIndex((i) => i.id === draggedItemId)
      if (draggedIndex === -1 || draggedIndex === targetIndex) {
        setDraggedItemId(null)
        setDragOverIndex(null)
        return
      }

      setItems((prev) => {
        const newItems = [...prev]
        const [draggedItem] = newItems.splice(draggedIndex, 1)
        newItems.splice(targetIndex, 0, draggedItem)
        const reorderedItems = newItems.map((item, index) => ({
          ...item,
          sortOrder: index,
        }))
        setTimeout(() => notifyChange(reorderedItems), 0)
        return reorderedItems
      })

      setDraggedItemId(null)
      setDragOverIndex(null)
    },
    [draggedItemId, items, notifyChange]
  )

  const handleDragEnd = useCallback(() => {
    setDraggedItemId(null)
    setDragOverIndex(null)
  }, [])

  const canAddMore = items.length < MAX_ASSETS

  // Separate previewable (carousel) items from downloadable items
  const previewableItems = items.filter(item => item.mediaType === 'image' || item.mediaType === 'video')
  const downloadableItems = items.filter(item => DOWNLOAD_TYPES.includes(item.mediaType))

  // Whether to show reorder hint in the label tooltip
  const showReorderHint = previewableItems.length > 1

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label with tooltip */}
      {showLabel && (
        <div className="flex items-center gap-1.5">
          {showReorderHint ? (
            <Tooltip content="Drag images to reorder. First image is the cover.">
              <label className="text-sm font-medium cursor-help border-b border-dotted border-muted-foreground/50">
                {label}
              </label>
            </Tooltip>
          ) : (
            <label className="text-sm font-medium">{label}</label>
          )}
          {items.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {items.length} of {MAX_ASSETS}
            </span>
          )}
        </div>
      )}

      {/* Initial Upload Area - only when no items */}
      {items.length === 0 && canAddMore && (
        <div
          className={cn(
            'relative rounded-xl border-2 border-dashed transition-all duration-200',
            'flex flex-col items-center justify-center p-6 min-h-[200px]',
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
          aria-label="Upload media files"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_STRING}
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled}
            multiple
          />

          <div className="mb-4">
            <i className="fa-solid fa-cloud-arrow-up text-3xl text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-1">
            {isDragging ? 'Drop files here' : 'Drag and drop your media'}
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Images, videos, audio, PDFs, ZIPs, or 3D models • Max {MAX_UPLOAD_MB} MB each
          </p>
        </div>
      )}

      {/* Media Grid with inline Add button */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {/* Previewable items (carousel) */}
          {previewableItems.map((item, index) => (
            <MediaItemCard
              key={item.id}
              item={item}
              index={index}
              totalItems={previewableItems.length}
              draggedItemId={draggedItemId}
              dragOverIndex={dragOverIndex}
              onDragStart={handleDragStart}
              onDragOverItem={handleDragOverItem}
              onDropOnItem={handleDropOnItem}
              onDragEnd={handleDragEnd}
              onRemove={handleRemove}
            />
          ))}

          {/* Inline Add More button as grid item */}
          {canAddMore && (
            <div
              className={cn(
                'relative aspect-square rounded-lg border-2 border-dashed transition-all duration-200',
                'flex flex-col items-center justify-center',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-zinc-300 dark:border-zinc-700 hover:border-muted-foreground hover:bg-muted/50',
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
              aria-label="Add more media"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_STRING}
                onChange={handleFileChange}
                className="hidden"
                disabled={disabled}
                multiple
              />
              <i className="fa-solid fa-plus text-lg text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">Add</span>
            </div>
          )}
        </div>
      )}

      {/* Downloadable File Section - separate from carousel */}
      {downloadableItems.length > 0 && (
        <div className="space-y-2 pt-2">
          <label className="text-sm font-medium text-muted-foreground">
            Downloadable File
          </label>
          {downloadableItems.map((item) => (
            <DownloadableFileCard
              key={item.id}
              item={item}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default MultiMediaUpload
