/**
 * ArtistShowcase Component
 * Full-bleed spotlight on one high-signal creator — identity + bio + stats
 * beside a peek at their recent work. Self-hides when no creator qualifies.
 */

import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getLandingProfilePreview } from '@/server/functions/explore'
import { PostMedia } from '@/components/feed/PostMedia'
import { UserAvatar } from '@/components/shared/UserAvatar'
import { detectMediaType } from '@/lib/media'

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-title-lg">{value}</p>
      <p className="text-label-xs text-muted-foreground">{label}</p>
    </div>
  )
}

export function ArtistShowcase() {
  const { data } = useQuery({
    queryKey: ['home-artist-showcase'],
    queryFn: async () => {
      const result = await getLandingProfilePreview({} as never)
      return result
    },
    staleTime: 1000 * 60 * 10,
  })

  const creator = data?.creator
  if (!creator) return null

  const works = (data?.posts ?? []).slice(0, 3)

  return (
    <section className="px-6 md:px-10">
      <div>
        <h2 className="text-heading-2 mb-6">Featured Artist</h2>
        <div className="grid gap-8 lg:gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-center">
          {/* Identity */}
          <div>
            <div className="flex items-center gap-4">
              <UserAvatar
                src={creator.avatarUrl}
                alt={creator.displayName || creator.usernameSlug}
                size="lg"
                className="w-16 h-16"
              />
              <div className="min-w-0">
                <h3 className="text-heading-3 truncate">
                  {creator.displayName || `@${creator.usernameSlug}`}
                </h3>
                <p className="text-body-md text-muted-foreground truncate">
                  @{creator.usernameSlug}
                </p>
              </div>
            </div>

            {creator.bio && (
              <p className="mt-5 text-body-md text-muted-foreground max-w-md line-clamp-3">
                {creator.bio}
              </p>
            )}

            <div className="mt-6 flex gap-8">
              <StatItem value={creator.postCount} label="Posts" />
              <StatItem value={creator.mintCount} label="Mints" />
              <StatItem value={creator.followerCount} label="Followers" />
            </div>

            <Link
              to="/profile/$slug"
              params={{ slug: creator.usernameSlug }}
              className="mt-8 inline-flex px-6 py-3 bg-primary text-primary-foreground text-label-lg rounded-full hover:scale-105 active:scale-[0.98] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
            >
              View profile
            </Link>
          </div>

          {/* Work peek */}
          {works.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {works.map((post) => (
                <Link
                  key={post.id}
                  to="/post/$postId"
                  params={{ postId: post.id }}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
                >
                  <div className="w-full h-full overflow-hidden [&_img]:object-cover [&_img]:w-full [&_img]:h-full">
                    <div className="w-full h-full transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                      <PostMedia
                        mediaUrl={post.mediaUrl}
                        coverUrl={post.coverUrl}
                        mediaType={detectMediaType(post.mediaUrl)}
                        alt={post.caption || 'Artwork'}
                        aspectRatio="square"
                        preview
                        className="rounded-none! border-0! bg-transparent!"
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
