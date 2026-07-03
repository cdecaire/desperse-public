/**
 * GET /feed.xml
 * Public RSS 2.0 feed of recent posts
 * For feed readers, automation tools, and social bots
 */

import { defineEventHandler, setResponseHeader } from 'h3'
import { getTrendingPostsDirect } from '@/server/utils/explore'

function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;')
}

export default defineEventHandler(async (event) => {
	setResponseHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')
	setResponseHeader(event, 'Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60')

	const baseUrl = 'https://desperse.app'

	try {
		const result = await getTrendingPostsDirect(undefined, 0, 15)
		const posts = result.success ? result.posts : []

		const items = posts.map((p: any) => {
			const title = escapeXml(p.caption || 'Untitled')
			const creator = p.user?.displayName || p.user?.usernameSlug || 'Unknown'
			const creatorSlug = p.user?.usernameSlug || ''
			const link = `${baseUrl}/post/${p.id}`
			const pubDate = p.createdAt ? new Date(p.createdAt).toUTCString() : ''
			const likes = Number(p.likeCount) || 0
			const collects = (Number(p.collectCount) || 0) + (Number(p.purchaseCount) || 0)

			const mediaHtml = p.coverUrl || p.mediaUrl
				? `<img src="${escapeXml(p.coverUrl || p.mediaUrl)}" alt="${title}" /><br/>`
				: ''

			const description = escapeXml(
				`${mediaHtml}By @${creatorSlug} — ${p.type || 'post'}` +
				(likes > 0 ? ` · ${likes} like${likes !== 1 ? 's' : ''}` : '') +
				(collects > 0 ? ` · ${collects} collect${collects !== 1 ? 's' : ''}` : '')
			)

			return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <dc:creator>${escapeXml(creator)}</dc:creator>
      <description>${description}</description>
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ''}
    </item>`
		})

		const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Desperse — Recent Posts</title>
    <link>${baseUrl}/explore</link>
    <description>Recent artwork and editions from creators on Desperse</description>
    <language>en</language>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items.join('\n')}
  </channel>
</rss>`

		return xml
	} catch (error) {
		console.error('[feed.xml] Error:', error)
		return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Desperse</title>
    <link>${baseUrl}</link>
    <description>Feed temporarily unavailable</description>
  </channel>
</rss>`
	}
})
