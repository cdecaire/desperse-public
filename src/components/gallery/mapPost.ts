/**
 * Map an explore-feed server post (getTrendingPosts / getNewPosts /
 * getMintingNowPosts response) into the PostCardData shape consumed by
 * GalleryCard and PostCard.
 */

import type { PostCardData } from '@/components/feed/PostCard'

// Server responses cross the createServerFn boundary loosely typed; this is
// the single place the gallery surfaces normalize them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toGalleryPost(p: any): PostCardData {
  return {
    id: p.id,
    type: p.type,
    mediaUrl: p.mediaUrl,
    coverUrl: p.coverUrl,
    caption: p.caption,
    price: p.price,
    currency: p.currency,
    maxSupply: p.maxSupply,
    currentSupply: p.currentSupply ?? 0,
    collectCount: p.collectCount ?? 0,
    createdAt: p.createdAt,
    user: p.user,
    metadataUrl: p.metadataUrl,
    masterMint: p.masterMint,
    collectibleAssetId: p.collectibleAssetId,
    assetId: p.assetId,
    isHidden: p.isHidden,
    userNftMint: p.userNftMint,
    sellerFeeBasisPoints: p.sellerFeeBasisPoints,
    assets: p.assets,
    mintWindowStart: p.mintWindowStart,
    mintWindowEnd: p.mintWindowEnd,
  }
}
