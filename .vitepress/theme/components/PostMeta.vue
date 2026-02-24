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
  if (typeof v === 'number') return v
  const n = Number(v)
  if (Number.isFinite(n)) return n
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

const updated = computed(() => formatDate(toTimestamp(page.value.lastUpdated)))

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
    <span v-if="updated">最后编辑：{{ updated }}</span>
  </div>
</template>
