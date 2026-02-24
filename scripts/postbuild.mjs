import { promises as fs, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')

function normalizeSiteUrl(url) {
  const u = String(url || '').trim()
  if (!u) return ''
  return u.endsWith('/') ? u : `${u}/`
}

function loadBlacklist() {
  const ignorePath = path.join(rootDir, '.blogignore')
  if (!existsSync(ignorePath)) return []

  const content = readFileSync(ignorePath, 'utf-8')
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
}

function htmlToMdPath(htmlPath) {
  // Convert HTML paths back to Markdown paths for matching
  if (htmlPath.endsWith('.html')) {
    return htmlPath.slice(0, -5) + '.md'
  }
  if (htmlPath.endsWith('/index.html')) {
    const dir = htmlPath.slice(0, -'/index.html'.length)
    return dir + '/index.md'
  }
  return htmlPath
}

function isBlacklisted(relativePath, blacklist) {
  if (blacklist.length === 0) return false

  // Convert HTML path to Markdown path for matching
  const mdPath = htmlToMdPath(relativePath)

  for (const pattern of blacklist) {
    if (pattern.endsWith('/')) {
      // Directory match
      if (relativePath.startsWith(pattern) || mdPath.startsWith(pattern)) return true
    } else if (pattern.includes('*')) {
      // Wildcard match
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
      const regex = new RegExp(`^${regexPattern}$`)
      if (regex.test(mdPath) || regex.test(relativePath)) return true
    } else if (pattern.includes('/')) {
      // Path match
      if (pattern.endsWith('/*.md')) {
        const dir = pattern.slice(0, -5)
        if (relativePath.startsWith(dir) && relativePath.endsWith('.html')) return true
      } else {
        if (mdPath === pattern) return true
      }
    } else {
      // Filename match
      const patternBase = pattern
      const htmlBase = pattern.replace(/\.md$/, '.html')
      if (path.basename(relativePath) === patternBase || path.basename(relativePath) === htmlBase) return true
    }
  }
  return false
}

async function removeBlacklistedFiles() {
  const blacklist = loadBlacklist()
  if (blacklist.length === 0) return

  const removedFiles = []

  async function walk(dir, basePath = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      const relativePath = path.join(basePath, entry.name).replace(/\\/g, '/')

      if (entry.isDirectory()) {
        await walk(full, relativePath)
      } else if (entry.isFile()) {
        if (isBlacklisted(relativePath, blacklist)) {
          await fs.unlink(full)
          removedFiles.push(relativePath)
          console.log(`[blacklist] Removed: ${relativePath}`)
        }
      }
    }
  }

  await walk(distDir)
  console.log(`[blacklist] Total removed: ${removedFiles.length} files`)
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const out = []
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      out.push(...(await walk(full)))
    } else {
      out.push(full)
    }
  }
  return out
}

function fileToRoute(filePath) {
  const rel = path.relative(distDir, filePath).split(path.sep).join('/')
  if (!rel.endsWith('.html')) return null
  if (rel === '404.html') return null

  if (rel === 'index.html') return '/'

  if (rel.endsWith('/index.html')) {
    const dir = rel.slice(0, -'/index.html'.length)
    return `/${dir}/`
  }

  return `/${rel.slice(0, -'.html'.length)}`
}

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function main() {
  console.log('[postbuild] Starting post-build processing...')

  // Remove blacklisted files
  await removeBlacklistedFiles()

  const siteUrl = normalizeSiteUrl(process.env.SITE_URL)
  if (!siteUrl) {
    await fs.writeFile(
      path.join(distDir, 'robots.txt'),
      ['User-agent: *', 'Allow: /', ''].join('\n'),
      'utf8'
    )
    return
  }

  const files = await walk(distDir)
  const routes = files
    .map(fileToRoute)
    .filter(Boolean)
    .filter((r) => !String(r).startsWith('/assets/'))

  const uniqueRoutes = Array.from(new Set(routes)).sort((a, b) => a.localeCompare(b))
  const urls = uniqueRoutes.map((r) => new URL(String(r).replace(/^\//, ''), siteUrl).toString())

  const sitemap =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${xmlEscape(u)}</loc></url>`).join('\n') +
    '\n</urlset>\n'

  await fs.writeFile(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8')

  const robots = ['User-agent: *', 'Allow: /', '', `Sitemap: ${siteUrl}sitemap.xml`, ''].join('\n')
  await fs.writeFile(path.join(distDir, 'robots.txt'), robots, 'utf8')

  console.log('[postbuild] Post-build processing complete')
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
