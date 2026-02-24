<template>
  <footer class="blog-footer">
    <div class="blog-footer-content">
      <div class="blog-footer-copyright">
        <span>© {{ currentYear }} 笔记. All rights reserved.</span>
      </div>
      <div v-if="icpNumber" class="blog-footer-icp">
        <a 
          :href="icpQueryUrl" 
          target="_blank" 
          rel="noopener noreferrer"
          class="blog-footer-icp-link"
        >
          {{ icpDisplay }}
        </a>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { theme } = useData<{ icpNumber?: string }>()

const currentYear = computed(() => new Date().getFullYear().toString())

const icpNumber = computed(() => String(theme.value.icpNumber ?? '').trim())

const icpDisplay = computed(() => {
  if (!icpNumber.value) return ''
  return `京ICP备${icpNumber.value}号`
})

const icpQueryUrl = computed(() => {
  return 'https://beian.miit.gov.cn/#/Integrated/index'
})
</script>

<style scoped>
.blog-footer {
  margin-top: 48px;
  padding: 24px 0;
  border-top: 1px solid var(--c-line);
  text-align: center;
  font-family: var(--vp-font-family-base);
  font-size: 14px;
  color: var(--c-muted);
}

.blog-footer-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.blog-footer-icp {
  display: flex;
  align-items: center;
}

.blog-footer-icp-link {
  color: var(--c-muted);
  text-decoration: none;
  transition: color 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.blog-footer-icp-link:hover {
  color: var(--c-accent);
}

.blog-footer-icp-link::before {
  content: '🛡️';
  font-size: 12px;
}

@media (max-width: 640px) {
  .blog-footer {
    margin-top: 32px;
    padding: 20px 0;
  }

  .blog-footer {
    font-size: 13px;
  }
}
</style>
