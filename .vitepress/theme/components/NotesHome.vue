<script setup lang="ts">
import { useData, withBase } from 'vitepress'
import { data as posts } from '../../../note/posts.data'

function formatDate(ts: number): string {
  const d = new Date(ts)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const { site } = useData()
</script>

<template>
  <div class="blog-page">
    <header class="blog-hero">
      <h1>{{ site.title }}</h1>
      <p>{{ site.description }}</p>
    </header>

    <section class="blog-list" aria-label="post list">
      <div v-if="posts.length === 0" class="blog-item">
        <div>
          <strong>还没有文章</strong>
          <div style="margin-top: 6px; color: var(--c-muted); font-family: var(--vp-font-family-base);">
            在 <code>note/</code> 下新增任意 <code>.md</code> 文件后再构建即可。
          </div>
        </div>
      </div>

      <article v-for="p in posts" :key="p.url" class="blog-item">
        <div>
          <a :href="withBase(p.url)">
            <strong>{{ p.title }}</strong>
          </a>
          <div
            v-if="p.summary"
            style="margin-top: 6px; color: var(--c-muted); font-family: var(--vp-font-family-base); font-size: 14px;"
          >
            {{ p.summary }}
          </div>
        </div>

        <div class="blog-meta">
          <a class="blog-badge" :href="withBase('/categories') + '#' + encodeURIComponent(String(p.category))">
            <strong>#</strong>{{ p.category }}
          </a>
          <span v-if="p.lastUpdated">{{ formatDate(p.lastUpdated) }}</span>
        </div>
      </article>
    </section>
  </div>
</template>
