<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import PostMeta from './components/PostMeta.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #doc-before>
      <PostMeta />
    </template>
    <template #layout-bottom>
      <Footer />
    </template>
  </Layout>
</template>
