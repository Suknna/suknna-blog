import path from 'node:path'

import { defineConfig, defineConfigWithTheme } from 'vitepress'
import type { DefaultTheme } from 'vitepress'

function titleFromFile(relativePath: string): string {
  const base = path.posix.basename(relativePath, path.posix.extname(relativePath))
  return base
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function categoryFromPath(relativePath: string): string {
  const parts = relativePath.split('/')
  if (parts.length >= 2) return parts[0]
  return 'misc'
}

function isContentPost(relativePath: string): boolean {
  if (relativePath === 'index.md') return false
  if (relativePath === 'categories.md') return false
  return relativePath.endsWith('.md')
}



type ThemeConfig = DefaultTheme.Config & {
  icpNumber?: string
}

export default defineConfigWithTheme<ThemeConfig>({
  lang: process.env.VITEPRESS_LANG ?? 'zh-CN',
  title: process.env.VITEPRESS_TITLE ?? '笔记',
  description: process.env.VITEPRESS_DESCRIPTION ?? '简洁、SEO 友好的静态博客。',

  srcDir: 'note',
  outDir: 'dist',

  cleanUrls: true,
  lastUpdated: true,
  base: process.env.VITEPRESS_BASE ?? '/',

  head: [
    ['meta', { name: 'referrer', content: 'strict-origin-when-cross-origin' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href:
          'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600&family=Source+Serif+4:opsz,wght@8..60,400;600&display=swap'
      }
    ]
  ],

  transformPageData(pageData) {
    const rel = pageData.relativePath
    const frontmatter = { ...(pageData.frontmatter || {}) }

    if (!frontmatter.title) {
      pageData.title = titleFromFile(rel)
    }

    if (isContentPost(rel)) {
      frontmatter.category = frontmatter.category ?? categoryFromPath(rel)
      frontmatter.ogType = frontmatter.ogType ?? 'article'
      if (!frontmatter.description && frontmatter.summary) {
        frontmatter.description = frontmatter.summary
      }
    } else {
      frontmatter.ogType = frontmatter.ogType ?? 'website'
    }

    pageData.frontmatter = frontmatter
  },

  transformHead({ pageData }) {
    const siteUrl = (process.env.SITE_URL || '').replace(/\/+$/, '')
    const urlPath = (pageData as any).url as string | undefined
    const canonical = siteUrl && urlPath ? `${siteUrl}${urlPath}` : ''

    const title = pageData.title
    const description =
      (pageData.frontmatter && pageData.frontmatter.description) ||
      pageData.description ||
      'Notes.'

    const ogType = (pageData.frontmatter && pageData.frontmatter.ogType) || 'website'

    const head: any[] = [
      ['meta', { name: 'description', content: description }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { property: 'og:type', content: ogType }],
      ['meta', { name: 'twitter:card', content: 'summary' }]
    ]

    if (canonical) head.push(['link', { rel: 'canonical', href: canonical }])
    return head
  },

  themeConfig: {
    icpNumber: process.env.VITEPRESS_ICP_NUMBER ?? '',
    nav: [
      { text: '文章', link: '/' },
      { text: '分类', link: '/categories' }
    ],
    sidebar: [],
    outline: 'deep',
    lastUpdated: {
      text: '最后更新'
    }
  }
})
