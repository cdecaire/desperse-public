/**
 * Explore Page
 * Discover suggested creators and trending posts
 * Public page - auth required for actions only
 */

import { createFileRoute } from '@tanstack/react-router'
import { SearchBar, SuggestedCreators, TrendingPosts } from '@/components/explore'
import { MobileHeader, MobileHeaderSpacer } from '@/components/layout/MobileHeader'

export const Route = createFileRoute('/explore')({
  component: ExplorePage,
})

function ExplorePage() {
  return (
    <>
      <MobileHeader title="Explore" showBackButton={false} />
      <MobileHeaderSpacer />
      <div className="pt-4 pb-8">
        {/* Search bar */}
        <div className="px-4 md:px-2 mb-4">
          <SearchBar />
        </div>

      {/* Suggested creators section */}
      <SuggestedCreators />

      {/* Divider */}
      <div className="border-t border-border/50 my-4 mx-4 md:mx-2" />

      {/* Trending/Recent posts section */}
      <TrendingPosts />
    </div>
    </>
  )
}
