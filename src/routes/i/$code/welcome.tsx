import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { InviteLandingPage, type InviteReferrerPreviewResult } from '@/components/referrals/InviteLandingPage'
import { getInviteReferrerPreview } from '@/server/functions/referrals'
import { buildOgMeta } from '@/lib/og-meta'

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
      meta: buildOgMeta({
        title,
        description,
        image: ogImage,
        url,
        documentTitle: `${title} | Desperse`,
      }),
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
