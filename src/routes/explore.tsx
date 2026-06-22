/**
 * Explore Page
 * Discover suggested creators and trending posts
 * Public page - auth required for actions only
 */

import { createFileRoute } from '@tanstack/react-router'
import { Col, Columns } from '@cdecaire/sable/layout'
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
        {/* Search spans the full width above the grid */}
        <div className="px-4 md:px-2 lg:px-0 mb-4">
          <SearchBar />
        </div>

        {/*
          Responsive feed + rail. Mobile (span 12 each, DOM order): creators
          strip, then the feed — matching the prior single-column order. Desktop:
          the feed takes columns 1–8 and the creators rail sits at columns 9–12.
        */}
        <Columns count={12} gap={3}>
          <Col span={{ base: 12, lg: 4 }} start={{ lg: 9 }}>
            <SuggestedCreators />
          </Col>
          <Col span={{ base: 12, lg: 8 }} start={{ lg: 1 }}>
            {/* Divider only matters in the stacked mobile layout */}
            <div className="border-t border-border/50 mx-4 md:mx-2 mb-2 lg:hidden" />
            <TrendingPosts />
          </Col>
        </Columns>
      </div>
    </>
  )
}
