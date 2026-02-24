import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import NotesHome from './components/NotesHome.vue'
import Categories from './components/Categories.vue'
import PostMeta from './components/PostMeta.vue'
import Footer from './components/Footer.vue'
import './styles.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp(ctx) {
    DefaultTheme.enhanceApp?.(ctx)
    ctx.app.component('NotesHome', NotesHome)
    ctx.app.component('Categories', Categories)
    ctx.app.component('PostMeta', PostMeta)
    ctx.app.component('Footer', Footer)
  }
}
