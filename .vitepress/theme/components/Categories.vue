<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { data as posts } from '../../../note/posts.data'
import type { PostItem } from '../../../note/posts.data'

function formatDate(ts: number): string {
  const d = new Date(ts)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const groups = computed(() => {
  const map = new Map<string, PostItem[]>()
  for (const p of posts as PostItem[]) {
    const arr = map.get(p.category) || []
    arr.push(p)
    map.set(p.category, arr)
  }

  return Array.from(map.entries())
    .map(([category, items]) => ({ category, items }))
    .sort((a, b) => a.category.localeCompare(b.category))
})

const { theme } = useData()
</script>

<template>
  <div class="blog-page">
    <header class="blog-hero">
      <h1>分类</h1>
      <p v-if="theme.categoryHint">{{ theme.categoryHint }}</p>
    </header>

    <section class="blog-list" aria-label="category list">
      <div v-if="groups.length === 0" class="blog-item">
        <div>
          <strong>还没有文章</strong>
        </div>
      </div>

      <section
        v-for="g in groups"
        :key="g.category"
        class="blog-group"
        :id="encodeURIComponent(String(g.category))"
      >
        <h2>
          <span class="blog-badge"><strong>#</strong>{{ g.category }}</span>
        </h2>
        <div>
          <div v-for="p in g.items" :key="p.url" class="blog-item" style="padding: 10px 0;">
            <div>
              <a :href="withBase(p.url)"><strong>{{ p.title }}</strong></a>
            </div>
            <div class="blog-meta">
              <span v-if="p.lastUpdated">{{ formatDate(p.lastUpdated) }}</span>
            </div>
          </div>
        </div>
      </section>
    </section>
  </div>
</template>
