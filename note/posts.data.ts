import { execSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { createContentLoader } from 'vitepress'

export type PostItem = {
  url: string
  title: string
  category: string
  summary: string
  lastUpdated: number
}

let blacklistPatterns: string[] = []

function loadBlacklist(): void {
  try {
    const ignorePath = path.join(process.cwd(), '.blogignore')
    const content = readFileSync(ignorePath, 'utf-8')
    blacklistPatterns = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
  } catch {
    blacklistPatterns = []
  }
}

function isBlacklisted(relativeMd: string): boolean {
  if (blacklistPatterns.length === 0) return false

  for (const pattern of blacklistPatterns) {
    if (pattern.endsWith('/')) {
      // 目录匹配：draft/ -> draft/some-file.md
      if (relativeMd.startsWith(pattern)) return true
    } else if (pattern.includes('*')) {
      // 通配符匹配：temp-*.md -> temp-test.md
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
      const regex = new RegExp(`^${regexPattern}$`)
      if (regex.test(relativeMd)) return true
    } else if (pattern.includes('/')) {
      // 路径匹配：note/private/*.md -> note/private/secret.md
      if (pattern.endsWith('*.md')) {
        const dir = pattern.slice(0, -5) // 去掉 *.md
        const filename = path.basename(relativeMd)
        if (relativeMd.startsWith(dir) && relativeMd.endsWith('.md')) return true
      } else {
        // 精确路径匹配
        if (relativeMd === pattern) return true
      }
    } else {
      // 精确文件名匹配
      if (path.basename(relativeMd) === pattern) return true
    }
  }
  return false
}

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

function urlToRelativeMd(url: string): string {
  if (url === '/') return 'index.md'
  const clean = url.replace(/^\//, '')
  if (clean.endsWith('/')) return `${clean}index.md`
  return `${clean}.md`
}

function isReservedPage(relativeMd: string): boolean {
  return relativeMd === 'index.md' || relativeMd === 'categories.md'
}

function gitLastUpdatedSeconds(filePath: string): number | null {
  try {
    const out = execSync(`git log -1 --format=%ct -- "${filePath}"`, {
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .toString('utf8')
      .trim()
    const n = Number(out)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

function fileMTimeMs(filePath: string): number {
  try {
    return statSync(filePath).mtimeMs
  } catch {
    return 0
  }
}

loadBlacklist()

export default createContentLoader('**/*.md', {
  excerpt: false,
  transform(data) {
    const out: PostItem[] = []
    for (const item of data) {
      const relativeMd = urlToRelativeMd(item.url)
      if (isReservedPage(relativeMd)) continue
      if (isBlacklisted(relativeMd)) continue

      const fm = item.frontmatter || {}
      const category = String(fm.category || categoryFromPath(relativeMd))
      const title = String(fm.title || titleFromFile(relativeMd))
      const summary = String(fm.summary || fm.description || '')

      const absPath = path.join(process.cwd(), 'note', relativeMd)
      const gitSeconds = gitLastUpdatedSeconds(absPath)
      const lastUpdated = gitSeconds ? gitSeconds * 1000 : fileMTimeMs(absPath)

      out.push({
        url: item.url,
        title,
        category,
        summary,
        lastUpdated
      })
    }

    return out.sort((a, b) => b.lastUpdated - a.lastUpdated)
  }
})
