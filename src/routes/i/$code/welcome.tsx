import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { InviteLandingPage, type InviteReferrerPreviewResult } from '@/components/referrals/InviteLandingPage'
import { getInviteReferrerPreview } from '@/server/functions/referrals'

const BASE_URL = 'https://desperse.com'

const searchSchema = z.object({
  ref: z.string().optional(),
  invalid: z.union([z.literal('1'), z.literal(1)]).optional(),
})

export const Route = createFileRoute('/i/$code/welcome')({
  component: InviteWelcomeRoute,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ invalid: Boolean(search.invalid) }),
  loader: async ({ params, deps }): Promise<{ preview: InviteReferrerPreviewResult | null }> => {
    // The ?invalid=1 redirect already proved the code resolves to nothing —
    // don't pay for the lookup again just to render a static error card.
    if (deps.invalid) return { preview: null }
    try {
      const result = await (getInviteReferrerPreview as any)({ data: { code: params.code } })
      return { preview: result?.success ? result : null }
    } catch {
      return { preview: null }
    }
  },
  head: ({ loaderData, params }) => {
    const referrer = loaderData?.preview?.referrer
    const name = referrer?.displayName?.trim() || referrer?.slug
    const title = name ? `${name} invited you to Desperse` : 'Join Desperse'
    const description = referrer?.bio?.trim() || 'Publish, discover, and collect creative work on Solana.'
    const ogImage = referrer
      ? `${BASE_URL}/api/og/invite/${encodeURIComponent(params.code)}`
      : `${BASE_URL}/api/og/default`
    const url = `${BASE_URL}/i/${params.code}`

    return {
      meta: [
        { title: `${title} | Desperse` },
        { name: 'description', content: description },
        // Open Graph
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: ogImage },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:url', content: url },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Desperse' },
        // Twitter Card
        { name: 'twitter:site', content: '@desperseapp' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: ogImage },
      ],
    }
  },
})

function InviteWelcomeRoute() {
  const { code } = Route.useParams()
  const { ref, invalid } = Route.useSearch()
  const { preview } = Route.useLoaderData()
  return (
    <InviteLandingPage
      code={code}
      referrerSlug={ref ?? null}
      invalid={Boolean(invalid)}
      initialPreview={preview}
    />
  )
}
