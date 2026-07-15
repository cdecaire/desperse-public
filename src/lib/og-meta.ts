export interface OgMetaOptions {
  title: string
  description: string
  image: string
  url: string
  type?: 'article' | 'profile' | 'website'
  documentTitle?: string
}

/** Shared Open Graph and X card metadata for public content routes. */
export function buildOgMeta({
  title,
  description,
  image,
  url,
  type = 'website',
  documentTitle = title,
}: OgMetaOptions) {
  return [
    { title: documentTitle },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: image },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:url', content: url },
    { property: 'og:type', content: type },
    { property: 'og:site_name', content: 'Desperse' },
    { name: 'twitter:site', content: '@desperseapp' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: image },
  ]
}