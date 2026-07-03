/**
 * /search — retired route.
 * Search now lives on /explore as a filter (?q=), so this redirects there and
 * carries the query so existing links and bookmarks keep working.
 */

import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

const searchParamsSchema = z.object({
  q: z.string().optional(),
  tab: z.string().optional(),
})

export const Route = createFileRoute('/search')({
  validateSearch: searchParamsSchema,
  beforeLoad: ({ search }) => {
    const q = search.q?.trim()
    throw redirect({
      to: '/explore',
      search: q ? { q } : {},
      replace: true,
    })
  },
})
