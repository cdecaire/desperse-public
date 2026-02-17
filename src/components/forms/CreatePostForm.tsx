/**
 * CreatePostForm Component
 * Main form for creating posts with media upload, caption, and type-specific options
 */

import { useState, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toastSuccess, toastError, toastInfo } from '@/lib/toast'
import { MediaUpload, type UploadedMedia } from './MediaUpload'
import { MultiMediaUpload, type UploadedMediaItem } from './MultiMediaUpload'
import { isMultiAssetEnabled, isMultiAssetCollectibleEnabled, isMultiAssetEditionEnabled } from '@/config/env'
import { PostTypeSelector, type PostType } from './PostTypeSelector'
import { EditionOptions, type Currency } from './EditionOptions'
import { NftMetadataOptions } from './NftMetadataOptions'
import { CategorySelector } from './CategorySelector'
import { type Category, categoriesToStrings, stringsToCategories } from '@/constants/categories'
import { PostCard } from '@/components/feed/PostCard'
import { PostMedia } from '@/components/feed/PostMedia'
import { MediaCarousel } from '@/components/feed/MediaCarousel'
import { Textarea } from '@/components/ui/textarea'
import { TokenAutocomplete } from '@/components/shared/TokenAutocomplete'
import { Input } from '@/components/ui/input'
import { Tooltip } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import { createPost, getPostEditState } from '@/server/functions/posts'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuth } from '@/hooks/useAuth'
import { parseAppError, formatRateLimitMessage } from '@/lib/errorUtils'
import { useUpdatePost } from '@/hooks/usePostMutations'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
// Note: On-chain metadata updates for Token Metadata removed - now using Metaplex Core

// Type helper for server function calls with optional headers
type ServerFnInput<T> = { data: T; headers?: HeadersInit }
const wrapInput = <T,>(data: T, headers?: HeadersInit): ServerFnInput<T> =>
  headers ? { data, headers } : { data }

// Minimum edition prices (must match server-side validation in posts.ts)
const MIN_PRICE_SOL_LAMPORTS = 100_000_000 // 0.1 SOL
const MIN_PRICE_USDC_UNITS = 15_000_000 // $15 USDC

function isEditionPriceValid(price: number | null, currency: Currency): boolean {
  if (!price) return false
  if (currency === 'SOL') return price >= MIN_PRICE_SOL_LAMPORTS
  if (currency === 'USDC') return price >= MIN_PRICE_USDC_UNITS
  return false
}

interface FormState {
  mediaUrl: string | null
  coverUrl: string | null
  caption: string
  categories: Category[]
  type: PostType
  maxSupply: number | null
  price: number | null
  currency: Currency
  // NFT metadata fields
  nftName: string | null
  nftSymbol: string | null
  nftDescription: string | null
  sellerFeeBasisPoints: number | null
  isMutable: boolean
  // Gated download
  protectDownload: boolean
}

interface CreatePostFormProps {
  mode?: 'create' | 'edit'
  initialPost?: {
    id: string
    type: PostType
    mediaUrl: string
    coverUrl?: string | null
    caption?: string | null
    categories?: (string | Category)[] | null  // Accept both strings (from DB) and Category objects
    price?: number | null
    currency?: Currency | null
    maxSupply?: number | null
    nftName?: string | null
    nftSymbol?: string | null
    nftDescription?: string | null
    sellerFeeBasisPoints?: number | null
    isMutable?: boolean | null
    creatorWallet?: string | null
    // Multi-asset support
    assets?: Array<{
      id: string
      url: string
      mimeType: string | null
      fileSize: number | null
      sortOrder: number
    }>
  }
}

export function CreatePostForm({ mode = 'create', initialPost }: CreatePostFormProps = {}) {
  // Ensure Buffer is available for Privy/Solana SDKs
  if (typeof window !== 'undefined' && !(window as any).Buffer) {
    (window as any).Buffer = Buffer
  }
  
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useCurrentUser()
  const { getAuthHeaders } = useAuth()
  const isEditMode = mode === 'edit'
  const updatePostMutation = useUpdatePost()
  
  // Load edit state for field locking
  const { data: editState, isFetching: isFetchingEditState } = useQuery({
    queryKey: ['postEditState', initialPost?.id],
    queryFn: async () => {
      if (!initialPost?.id) return null
      const result = await getPostEditState(wrapInput({ postId: initialPost.id }) as never)
      return result.success ? result : null
    },
    enabled: isEditMode && !!initialPost?.id,
    placeholderData: (previousData) => previousData, // Keep previous data during refetch to prevent UI flash
  })

  // Use ref to stabilize hasConfirmedPurchases during refetch to prevent UI flash
  const hasConfirmedPurchasesRef = useRef<boolean>(false)
  useEffect(() => {
    if (editState) {
      // Always update ref when we have data
      hasConfirmedPurchasesRef.current = editState.hasConfirmedPurchases ?? false
    }
  }, [editState])

  // Open minted details by default when editing a minted post
  useEffect(() => {
    if (editState?.isMinted) {
      setIsMintedDetailsOpen(true)
    }
  }, [editState?.isMinted])

  // Track when mutation succeeds to prevent flash during query invalidation
  useEffect(() => {
    if (updatePostMutation.isSuccess && isEditMode) {
      setJustSaved(true)
      // Clear the flag after a short delay to allow query to refetch
      const timer = setTimeout(() => {
        setJustSaved(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [updatePostMutation.isSuccess, isEditMode])

  // Initialize form state
  const getInitialFormState = (): FormState => {
    if (isEditMode && initialPost) {
      return {
        mediaUrl: initialPost.mediaUrl,
        coverUrl: initialPost.coverUrl || null,
        caption: initialPost.caption || '',
        categories: Array.isArray(initialPost.categories) && initialPost.categories.length > 0
          ? stringsToCategories(initialPost.categories as string[])
          : [],
        type: initialPost.type,
        maxSupply: initialPost.maxSupply || null,
        price: initialPost.price || null,
        currency: (initialPost.currency as Currency) || 'SOL',
        nftName: initialPost.nftName || null,
        nftSymbol: initialPost.nftSymbol || null,
        nftDescription: initialPost.nftDescription || null,
        sellerFeeBasisPoints: initialPost.sellerFeeBasisPoints || null,
        isMutable: initialPost.isMutable ?? true,
        protectDownload: true, // Default to protected in edit mode (can't change existing)
      }
    }
    return {
      mediaUrl: null,
      coverUrl: null,
      caption: '',
      categories: [],
      type: 'post',
      maxSupply: null,
      price: null,
      currency: 'SOL',
      nftName: null,
      nftSymbol: null,
      nftDescription: null,
      sellerFeeBasisPoints: 0, // Default to 0% royalties (collectibles are free)
      isMutable: true,
      protectDownload: false, // Posts and collectibles are always free - downloads always available
    }
  }

  // Form state
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia | null>(null)
  const [uploadedMediaInfo, setUploadedMediaInfo] = useState<{ mimeType: string; fileSize: number } | null>(null)
  const [formState, setFormState] = useState<FormState>(getInitialFormState)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isMintedDetailsOpen, setIsMintedDetailsOpen] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  // Multi-asset state (Phase 1: standard posts, Phase 2: collectibles, Phase 3: editions)
  const [multiAssetItems, setMultiAssetItems] = useState<UploadedMediaItem[]>([])
  const multiAssetEnabled = isMultiAssetEnabled()
  const multiAssetCollectibleEnabled = isMultiAssetCollectibleEnabled()
  const multiAssetEditionEnabled = isMultiAssetEditionEnabled()

  // Initialize media preview for edit mode
  useEffect(() => {
    if (isEditMode && initialPost && !uploadedMedia) {
      // Detect media type from URL extension
      const url = initialPost.mediaUrl.toLowerCase()
      let mediaType: 'image' | 'video' | 'audio' | 'document' | '3d' = 'image'
      if (url.includes('.mp4') || url.includes('.webm') || url.includes('.mov')) {
        mediaType = 'video'
      } else if (url.includes('.mp3') || url.includes('.wav') || url.includes('.ogg')) {
        mediaType = 'audio'
      } else if (url.includes('.pdf') || url.includes('.zip') || url.includes('.epub')) {
        mediaType = 'document'
      } else if (url.includes('.glb') || url.includes('.gltf')) {
        mediaType = '3d'
      }
      setUploadedMedia({
        url: initialPost.mediaUrl,
        mediaType: mediaType,
        fileName: initialPost.mediaUrl.split('/').pop() || 'media',
      })
    }
  }, [isEditMode, initialPost, uploadedMedia])

  // Determine field locking based on post type and edit state
  // Use ref value during refetch, submission, or immediately after save to prevent flash
  // Ref is always kept in sync with latest data
  const isUpdatingPost = isEditMode && updatePostMutation.isPending
  const hasConfirmedPurchases = (isFetchingEditState || isUpdatingPost || justSaved)
    ? hasConfirmedPurchasesRef.current 
    : (editState?.hasConfirmedPurchases ?? hasConfirmedPurchasesRef.current)
  const isMinted = editState?.isMinted ?? false
  const mintedIsMutable = editState?.mintedIsMutable ?? true
  const areNftFieldsLocked = editState?.areNftFieldsLocked ?? false
  const mintedMetadataJson = editState?.mintedMetadataJson as Record<string, unknown> | null
  
  // NFT metadata fields (name, symbol, description, royalties) are editable if:
  // - Not in edit mode (creating new), OR
  // - In edit mode AND (not minted OR minted as mutable)
  // Note: These can be edited even after purchases if the NFT is mutable
  // For collectibles: locked after any mint since we don't support Bubblegum updates
  const isNftType = formState.type === 'edition' || formState.type === 'collectible'
  const areNftFieldsEditable = isEditMode 
    ? (isNftType && !areNftFieldsLocked && (formState.type === 'edition' || !isMinted))
    : isNftType
  
  // isMutable can only be changed pre-mint (before any NFT is created)
  const isMutabilityEditable = isEditMode
    ? (isNftType && !isMinted)
    : isNftType
  
  // Pricing fields (price, currency, maxSupply) are locked after any confirmed purchase (edition-only)
  const arePricingFieldsEditable = isEditMode
    ? (formState.type === 'edition' && !hasConfirmedPurchases)
    : (formState.type === 'edition')

  // Check if any form fields have changed (for edit mode)
  const hasChanges = (): boolean => {
    if (!isEditMode || !initialPost) return true // Always allow submit in create mode
    
    // Check caption
    if (formState.caption !== (initialPost.caption || '')) return true
    
    // Check coverUrl
    if (formState.coverUrl !== (initialPost.coverUrl || null)) return true
    
    // Check categories - compare as strings
    const initialCategories = Array.isArray(initialPost.categories) && initialPost.categories.length > 0
      ? stringsToCategories(initialPost.categories as string[])
      : []
    const initialCategoryKeys = categoriesToStrings(initialCategories).sort().join(',')
    const currentCategoryKeys = categoriesToStrings(formState.categories).sort().join(',')
    if (initialCategoryKeys !== currentCategoryKeys) return true
    
    // Check pricing fields (edition only, if editable)
    if (arePricingFieldsEditable) {
      if (formState.price !== (initialPost.price || null)) return true
      if (formState.currency !== (initialPost.currency || 'SOL')) return true
      if (formState.maxSupply !== (initialPost.maxSupply || null)) return true
    }
    
    // Check NFT metadata fields (if editable)
    if (areNftFieldsEditable) {
      if (formState.nftName !== (initialPost.nftName || null)) return true
      if (formState.nftSymbol !== (initialPost.nftSymbol || null)) return true
      if (formState.nftDescription !== (initialPost.nftDescription || null)) return true
      if (formState.sellerFeeBasisPoints !== (initialPost.sellerFeeBasisPoints || null)) return true
    }
    
    // Check mutability (if editable)
    if (isMutabilityEditable) {
      if (formState.isMutable !== (initialPost.isMutable ?? true)) return true
    }
    
    return false
  }

  // Create/Update mutation handler
  const handleSubmitMutation = async () => {
    if (!formState.mediaUrl || !user?.id) {
      throw new Error('Missing required data')
    }
    
    setFormError(null)

    if (isEditMode && initialPost) {
      // Save all editable fields to database
      // Note: On-chain metadata updates are not supported (now using Core)
      // For collectibles, NFT fields are locked after minting (no Bubblegum update support)
      await updatePostMutation.mutateAsync({
        postId: initialPost.id,
        caption: formState.caption || null,
        categories: formState.categories.length > 0 ? formState.categories : null,
        ...(areNftFieldsEditable && {
          nftName: formState.nftName || null,
          nftSymbol: formState.nftSymbol || null,
          nftDescription: formState.nftDescription || null,
          sellerFeeBasisPoints: formState.sellerFeeBasisPoints ?? 0,
        }),
        // isMutable can only be changed pre-mint
        ...(isMutabilityEditable && {
          isMutable: formState.isMutable,
        }),
        // Edition-only: pricing fields
        ...(arePricingFieldsEditable && {
          price: formState.price || null,
          currency: formState.currency || null,
          maxSupply: formState.maxSupply || null,
        }),
      })
      
      // Navigate to post detail after update
      navigate({ to: '/post/$postId', params: { postId: initialPost.id } })
    } else {
      // Create post - pass auth token in payload for server verification
      const authHeaders = await getAuthHeaders()
      const authorization = authHeaders.Authorization || ''
      const isNftPost = formState.type === 'edition' || formState.type === 'collectible'

      // Prepare assets array for multi-asset posts (Phase 1: standard posts, Phase 2: collectibles, Phase 3: editions)
      const assetsForCreate = multiAssetItems.length > 0 &&
        (formState.type === 'post' || formState.type === 'collectible' || formState.type === 'edition')
        ? multiAssetItems.map((item, index) => ({
            url: item.url,
            mediaType: item.mediaType,
            fileName: item.fileName,
            mimeType: item.mimeType,
            fileSize: item.fileSize,
            sortOrder: item.sortOrder ?? index,
          }))
        : null

      const result = await createPost(
        wrapInput({
          _authorization: authorization,
          mediaUrl: formState.mediaUrl,
          coverUrl: formState.coverUrl,
          caption: formState.caption || null,
          categories: formState.categories.length > 0 ? categoriesToStrings(formState.categories) : null,
          type: formState.type,
          // Multi-asset support (Phase 1: standard posts only)
          assets: assetsForCreate,
          // Edition-only: commerce & supply
          maxSupply: formState.type === 'edition' ? formState.maxSupply : null,
          price: formState.type === 'edition' ? formState.price : null,
          currency: formState.type === 'edition' ? formState.currency : null,
          // Both editions and collectibles: NFT metadata
          nftName: isNftPost ? formState.nftName : null,
          nftSymbol: isNftPost ? formState.nftSymbol : null,
          nftDescription: isNftPost ? formState.nftDescription : null,
          sellerFeeBasisPoints: isNftPost ? (formState.sellerFeeBasisPoints ?? 0) : null,
          isMutable: isNftPost ? formState.isMutable : true,
          // Protect download only applies to downloadable document types (PDF, ZIP) for editions
          // Check both single-asset (uploadedMedia) and multi-asset (multiAssetItems) modes
          protectDownload: formState.type === 'edition' && (
            uploadedMedia?.mediaType === 'document' ||
            multiAssetItems.some(item => item.mediaType === 'document')
          ) ? formState.protectDownload : false,
          mediaMimeType: uploadedMediaInfo?.mimeType || null,
          mediaFileSize: uploadedMediaInfo?.fileSize || null,
        }) as never
      )

      if (!result.success) {
        throw new Error(result.error || 'Failed to create post')
      }
      
      // Invalidate feed queries to show new post
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      toastSuccess('Post created successfully!')
      
      // Navigate to feed
      navigate({ to: '/' })
    }
  }

  const createMutation = useMutation({
    mutationFn: handleSubmitMutation,
    onError: (error) => {
      const parsed = parseAppError(error)
      setFormError(parsed.message)
      
      if (parsed.isRateLimit) {
        const rateLimitMsg = formatRateLimitMessage(parsed.minutesUntilReset)
        toastInfo(rateLimitMsg)
      } else {
        toastError(parsed.message)
      }
    },
  })
  
  // Handle media upload
  const handleMediaUpload = (media: UploadedMedia) => {
    setUploadedMedia(media)
    setFormState(prev => ({ ...prev, mediaUrl: media.url }))
    if (media.mimeType && media.fileSize) {
      setUploadedMediaInfo({ mimeType: media.mimeType, fileSize: media.fileSize })
    }
  }
  
  const handleMediaRemove = () => {
    setUploadedMedia(null)
    setUploadedMediaInfo(null)
    setFormState(prev => ({ ...prev, mediaUrl: null, coverUrl: null }))
  }
  
  const handleCoverUpload = (url: string) => {
    setFormState(prev => ({ ...prev, coverUrl: url }))
  }
  
  const handleCoverRemove = () => {
    setFormState(prev => ({ ...prev, coverUrl: null }))
  }

  // Multi-asset change handler (Phase 1)
  const handleMultiAssetChange = (items: UploadedMediaItem[]) => {
    setMultiAssetItems(items)
    // Set mediaUrl to first asset for backward compatibility
    if (items.length > 0) {
      const firstItem = items[0]
      setFormState(prev => ({ ...prev, mediaUrl: firstItem.url }))
      setUploadedMedia({
        url: firstItem.url,
        mediaType: firstItem.mediaType,
        fileName: firstItem.fileName,
        mimeType: firstItem.mimeType,
        fileSize: firstItem.fileSize,
      })
      if (firstItem.mimeType && firstItem.fileSize) {
        setUploadedMediaInfo({ mimeType: firstItem.mimeType, fileSize: firstItem.fileSize })
      }
    } else {
      setFormState(prev => ({ ...prev, mediaUrl: null }))
      setUploadedMedia(null)
      setUploadedMediaInfo(null)
    }
  }
  
  // Validation
  const canSubmit = () => {
    if (!formState.mediaUrl) return false
    if (formState.type === 'edition') {
      // Validate required edition fields (both create and edit)
      if (!formState.nftName || formState.nftName.trim() === '') return false
      // Validate minimum price
      if (!isEditionPriceValid(formState.price, formState.currency)) return false
    }
    // For edits, additional validation happens server-side
    return true
  }
  
  const canPreview = () => {
    return !!formState.mediaUrl && !!user
  }
  
  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit()) return
    createMutation.mutate()
  }
  
  const isSubmitting = createMutation.isPending || updatePostMutation.isPending

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Media Upload */}
        <div>
          {/* Show external label only for edit mode and legacy MediaUpload (MultiMediaUpload has its own label) */}
          {(isEditMode || !(
            (multiAssetEnabled && formState.type === 'post') ||
            (multiAssetCollectibleEnabled && formState.type === 'collectible') ||
            (multiAssetEditionEnabled && formState.type === 'edition')
          )) && (
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium">Media</label>
              {isEditMode && (
                <span className="text-xs text-muted-foreground">
                  (cannot be changed)
                </span>
              )}
            </div>
          )}
          {isEditMode ? (
            <div className="relative overflow-hidden bg-card border border-border rounded-xl shadow-md">
              {/* Multi-asset carousel for edit mode */}
              {initialPost?.assets && initialPost.assets.length > 1 ? (
                <div className="aspect-square">
                  <MediaCarousel
                    assets={initialPost.assets.map((asset) => ({
                      id: asset.id,
                      url: asset.url,
                      mimeType: asset.mimeType || 'image/jpeg',
                      fileSize: asset.fileSize,
                      sortOrder: asset.sortOrder,
                    }))}
                    alt="Post media"
                    preview
                  />
                </div>
              ) : uploadedMedia && (
                <PostMedia
                  mediaUrl={uploadedMedia.url}
                  coverUrl={formState.coverUrl || null}
                  mediaType={uploadedMedia.mediaType}
                  alt="Post media"
                  aspectRatio="auto"
                  postType={formState.type}
                  hasAccess={true}
                />
              )}
            </div>
          ) : (multiAssetEnabled && formState.type === 'post') ||
               (multiAssetCollectibleEnabled && formState.type === 'collectible') ||
               (multiAssetEditionEnabled && formState.type === 'edition') ? (
            // Multi-asset upload for standard posts (Phase 1), collectibles (Phase 2), and editions (Phase 3)
            <MultiMediaUpload
              onChange={handleMultiAssetChange}
              initialItems={multiAssetItems}
              disabled={isSubmitting}
            />
          ) : (
            <MediaUpload
              onUpload={handleMediaUpload}
              onRemove={handleMediaRemove}
              onCoverUpload={handleCoverUpload}
              onCoverRemove={handleCoverRemove}
              initialMedia={uploadedMedia}
              initialCover={formState.coverUrl}
              requireCoverForAudio={true}
              disabled={isSubmitting}
            />
          )}
        </div>

        {/* Post Type Selector - Right after media, hidden in edit mode */}
        {!isEditMode && (
          <PostTypeSelector
            value={formState.type}
            onChange={(type) => setFormState(prev => ({
              ...prev,
              type,
              // Posts and collectibles are always free - downloads always available
              // Editions default to protected (can be toggled)
              protectDownload: type === 'edition' ? (prev.type === 'edition' ? prev.protectDownload : true) : false,
            }))}
            disabled={isSubmitting}
          />
        )}

        {/* Content Card - Caption, Categories, and NFT fields */}
        <div className="space-y-4 p-4 bg-card border border-border rounded-xl shadow-md dark:bg-card">
          {/* Caption */}
          <div>
            <label htmlFor="caption" className="text-sm font-medium mb-2 block">
              Caption
            </label>
            <div className="relative">
              <TokenAutocomplete
                value={formState.caption}
                onChange={(value) => setFormState(prev => ({ ...prev, caption: value }))}
                placeholder="Write a caption..."
                maxLength={2000}
                disabled={isSubmitting}
                className="min-h-[100px] resize-none pb-7"
              />
              <div className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none">
                {formState.caption.length} / 2000
              </div>
            </div>
          </div>

          {/* Categories - hidden after minting (on-chain traits) */}
          {!(isEditMode && isMinted) && (
            <CategorySelector
              value={formState.categories}
              onChange={(categories) => setFormState(prev => ({ ...prev, categories }))}
              disabled={isSubmitting}
            />
          )}

          {/* NFT Name - only shown for edition/collectible types, hidden after minting */}
          {(formState.type === 'collectible' || formState.type === 'edition') && !(isEditMode && areNftFieldsLocked) && (
            <div className="pt-2 border-t border-border">
              <label className="text-sm font-medium mb-2 block">
                NFT Name {formState.type === 'edition' && <span className="text-destructive">*</span>}
              </label>
              <div className="relative">
                <Input
                  type="text"
                  maxLength={32}
                  value={formState.nftName || ''}
                  onChange={(e) => setFormState(prev => ({ ...prev, nftName: e.target.value.trim() || null }))}
                  placeholder={formState.type === 'collectible' ? 'Optional - auto-generated if empty' : 'Enter NFT name'}
                  disabled={isSubmitting}
                  required={formState.type === 'edition'}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  {(formState.nftName || '').length} / 32
                </div>
              </div>
              {formState.type === 'collectible' && !formState.nftName && (
                <p className="text-xs text-muted-foreground mt-2">
                  Will use auto-generated name if left empty
                </p>
              )}
            </div>
          )}

          {/* NFT Description - only shown for edition/collectible types, hidden after minting */}
          {(formState.type === 'collectible' || formState.type === 'edition') && !(isEditMode && areNftFieldsLocked) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Tooltip content="NFT description shown in wallets and marketplaces. Defaults to caption if not set.">
                  <label className="text-sm font-medium cursor-help border-b border-dotted border-muted-foreground/40">
                    NFT Description
                  </label>
                </Tooltip>
                {formState.caption && !isSubmitting && formState.nftDescription !== formState.caption && (
                  <button
                    type="button"
                    onClick={() => setFormState(prev => ({ ...prev, nftDescription: prev.caption }))}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Use caption
                  </button>
                )}
              </div>
              <div className="relative">
                <Textarea
                  value={formState.nftDescription || ''}
                  onChange={(e) => setFormState(prev => ({ ...prev, nftDescription: e.target.value || null }))}
                  placeholder={formState.caption || 'Enter NFT description'}
                  maxLength={5000}
                  disabled={isSubmitting}
                  className="min-h-[100px] resize-none"
                />
                <div className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none">
                  {(formState.nftDescription || '').length} / 5000
                </div>
              </div>
              {!formState.nftDescription && formState.caption && (
                <p className="text-xs text-muted-foreground mt-2">
                  Will use caption if left empty
                </p>
              )}
            </div>
          )}
        </div>


        {/* Minted Details (read-only snapshot of on-chain data) */}
        {isEditMode && isMinted && mintedMetadataJson && (
          <div className="p-4 bg-card border border-border rounded-xl shadow-md dark:bg-card">
            <button
              type="button"
              onClick={() => setIsMintedDetailsOpen(!isMintedDetailsOpen)}
              className="flex items-center justify-between w-full text-sm text-foreground transition-colors hover:text-foreground/80"
            >
              <span>Minted on-chain details</span>
              <i className={cn(
                'fa-regular transition-transform',
                isMintedDetailsOpen ? 'fa-chevron-up' : 'fa-chevron-down'
              )} />
            </button>

            {isMintedDetailsOpen && (
              <div className="grid gap-3 text-sm mt-3 pt-3 border-t border-border">
                {typeof mintedMetadataJson.name === 'string' && mintedMetadataJson.name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{mintedMetadataJson.name}</span>
                  </div>
                )}
                {typeof mintedMetadataJson.symbol === 'string' && mintedMetadataJson.symbol && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Symbol:</span>
                    <span className="font-medium">{mintedMetadataJson.symbol}</span>
                  </div>
                )}
                {typeof mintedMetadataJson.description === 'string' && mintedMetadataJson.description && (
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Description:</span>
                    <span className="font-medium text-foreground/90 whitespace-pre-wrap">{mintedMetadataJson.description}</span>
                  </div>
                )}
                {/* Categories from attributes - only show if there are Category attributes */}
                {(() => {
                  const categoryAttrs = Array.isArray(mintedMetadataJson.attributes)
                    ? (mintedMetadataJson.attributes as Array<{ trait_type?: string; value?: string }>)
                        .filter(attr => attr.trait_type === 'Category')
                    : []
                  return categoryAttrs.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Categories:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {categoryAttrs.map((attr, i) => (
                          <span key={i} className="px-2 py-0.5 bg-muted rounded-full text-xs font-medium">
                            {attr.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}
                {/* Royalties from seller_fee_basis_points - only show if > 0 */}
                {typeof mintedMetadataJson.seller_fee_basis_points === 'number' && mintedMetadataJson.seller_fee_basis_points > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Royalties:</span>
                    <span className="font-medium">{(mintedMetadataJson.seller_fee_basis_points / 100).toFixed(2)}%</span>
                  </div>
                )}
                {/* Edition pricing info */}
                {formState.type === 'edition' && initialPost?.price !== null && initialPost?.price !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price:</span>
                    <span className="font-medium">
                      {initialPost.currency === 'SOL'
                        ? `${(initialPost.price / 1_000_000_000).toFixed(4)} SOL`
                        : `${(initialPost.price / 1_000_000).toFixed(2)} USDC`
                      }
                    </span>
                  </div>
                )}
                {formState.type === 'edition' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Supply:</span>
                    <span className="font-medium">
                      {initialPost?.maxSupply ? initialPost.maxSupply : 'Unlimited'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mutable:</span>
                  <span className="font-medium">{mintedIsMutable ? 'Yes' : 'No (locked)'}</span>
                </div>
                {/* Update Authority Delegate - the creator's wallet with display name */}
                {initialPost?.creatorWallet && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Update Authority:</span>
                    <span className="font-medium">
                      {/* Show creator name from metadata if available */}
                      {(() => {
                        const creatorAttr = Array.isArray(mintedMetadataJson.attributes)
                          ? (mintedMetadataJson.attributes as Array<{ trait_type?: string; value?: string }>)
                              .find(attr => attr.trait_type === 'Creator')
                          : null
                        const creatorName = creatorAttr?.value
                        const wallet = initialPost.creatorWallet
                        const truncatedWallet = `${wallet.slice(0, 4)}...${wallet.slice(-4)}`
                        return creatorName
                          ? <>{creatorName} <span className="text-muted-foreground font-mono text-xs">({truncatedWallet})</span></>
                          : <span className="font-mono text-xs">{truncatedWallet}</span>
                      })()}
                    </span>
                  </div>
                )}
                {editState?.mintedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Minted:</span>
                    <span className="font-medium">{new Date(editState.mintedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Edition-only: Commerce & Supply Options (includes protected download) - hidden after minting */}
        {formState.type === 'edition' && !(isEditMode && isMinted) && (
          <EditionOptions
            price={formState.price}
            currency={formState.currency}
            maxSupply={formState.maxSupply}
            protectDownload={formState.protectDownload}
            onPriceChange={(value) => setFormState(prev => ({ ...prev, price: value }))}
            onCurrencyChange={(currency) => setFormState(prev => ({ ...prev, currency }))}
            onMaxSupplyChange={(value) => setFormState(prev => ({ ...prev, maxSupply: value }))}
            // Only show protect download toggle for downloadable document types (PDF, ZIP)
            // Check both single-asset (uploadedMedia) and multi-asset (multiAssetItems) modes
            onProtectDownloadChange={
              uploadedMedia?.mediaType === 'document' ||
              multiAssetItems.some(item => item.mediaType === 'document')
                ? (value) => setFormState(prev => ({ ...prev, protectDownload: value }))
                : undefined
            }
            disabled={isSubmitting}
            pricingDisabled={!arePricingFieldsEditable}
          />
        )}

        {/* Additional Details - Shown for both Collectibles and Editions, hidden after minting */}
        {(formState.type === 'collectible' || formState.type === 'edition') && !(isEditMode && areNftFieldsLocked) && (
          <NftMetadataOptions
            nftSymbol={formState.nftSymbol}
            sellerFeeBasisPoints={formState.sellerFeeBasisPoints}
            isMutable={formState.isMutable}
            onNftSymbolChange={(value) => setFormState(prev => ({ ...prev, nftSymbol: value }))}
            onSellerFeeBasisPointsChange={(value) => setFormState(prev => ({ ...prev, sellerFeeBasisPoints: value }))}
            onIsMutableChange={(value) => setFormState(prev => ({ ...prev, isMutable: value }))}
            disabled={isSubmitting}
            metadataDisabled={false}
            mutabilityDisabled={false}
            mode={formState.type as 'collectible' | 'edition'}
          />
        )}
        
        {/* Error message (rate limit, etc.) */}
        {formError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <i className="fa-regular fa-circle-exclamation mt-0.5" />
            <span>{formError}</span>
          </div>
        )}
        
        {/* Action buttons */}
        <div className="space-y-3">
          {/* Preview button */}
          {canPreview() && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPreviewOpen(true)}
              disabled={isSubmitting}
              className="w-full"
            >
              Preview
            </Button>
          )}
          
          {/* Submit button - only show in create mode or edit mode when there are changes */}
          {(!isEditMode || hasChanges()) && (
            <Button
              type="submit"
              disabled={!canSubmit() || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {isEditMode ? 'Saving...' : 'Publishing...'}
                </>
              ) : (
                isEditMode ? 'Save' : 'Publish'
              )}
            </Button>
          )}
        </div>
      </form>
      
      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden border-0 dark:border" showCloseButton={false}>
          <DialogHeader className="px-4 py-4 flex items-center justify-center relative min-h-12">
            <DialogTitle className="text-center">Post Preview</DialogTitle>
            <DialogPrimitive.Close className="absolute top-1/2 -translate-y-1/2 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogHeader>
          
          {formState.mediaUrl && user && (
            <div className="border-t border-border">
              <PostCard
                post={{
                  id: 'preview',
                  type: formState.type,
                  mediaUrl: formState.mediaUrl,
                  coverUrl: formState.coverUrl,
                  caption: formState.caption || null,
                  price: formState.price,
                  currency: formState.currency,
                  maxSupply: formState.maxSupply,
                  currentSupply: 0,
                  collectCount: 0,
                  createdAt: new Date(),
                }}
                user={{
                  id: user.id,
                  displayName: user.displayName,
                  usernameSlug: user.usernameSlug,
                  avatarUrl: user.avatarUrl,
                }}
                showActions={false}
                noBorder
                isPreview={true}
                maxMediaAspectRatio={1.0}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CreatePostForm

