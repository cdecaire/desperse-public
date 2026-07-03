/**
 * /category/$categorySlug — retired route.
 * Category browsing now lives on /explore as a filter (?category=), so this
 * redirects there and carries the slug so existing links keep working. Invalid
 * slugs are dropped by /explore's validateSearch (falls back to the feed).
 */

import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/category/$categorySlug')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/explore',
      search: { category: params.categorySlug },
      replace: true,
    })
  },
})
