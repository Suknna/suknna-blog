<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'

function isPost(relativePath: string | undefined): boolean {
  if (!relativePath) return false
  if (!relativePath.endsWith('.md')) return false
  if (relativePath === 'index.md') return false
  if (relativePath === 'categories.md') return false
  return true
}

function toTimestamp(v: number | string | undefined): number {
  if (!v) return 0
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return 0
    return v < 1e12 ? v * 1000 : v
  }
  const n = Number(v)
  if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n
  const d = new Date(v)
  return Number.isFinite(d.getTime()) ? d.getTime() : 0
}

function formatDate(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const { page, frontmatter } = useData()

const show = computed(() => isPost(page.value.relativePath))

const category = computed(() => (frontmatter.value && (frontmatter.value as any).category) || 'misc')

const publishedTs = computed(() => toTimestamp((frontmatter.value as any)?.date))

const updatedTs = computed(() => {
  const fmUpdated = toTimestamp((frontmatter.value as any)?.updated)
  if (fmUpdated) return fmUpdated
  return toTimestamp(page.value.lastUpdated)
})

const published = computed(() => formatDate(publishedTs.value))

const showUpdated = computed(() => {
  if (!publishedTs.value || !updatedTs.value) return false
  return updatedTs.value > publishedTs.value
})

const updated = computed(() => (showUpdated.value ? formatDate(updatedTs.value) : ''))

const categoryLink = computed(() =>
  withBase('/categories') + '#' + encodeURIComponent(String(category.value))
)
</script>

<template>
  <div v-if="show" class="post-meta">
    <span>
      分类：
      <a :href="categoryLink">#{{ category }}</a>
    </span>
    <span v-if="published">发布于：{{ published }}</span>
    <span v-if="updated">更新于：{{ updated }}</span>
  </div>
</template>
