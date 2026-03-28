// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './blur.css'
import './style.css'
import './var.css'
import './vp-code-group.css'
import './custom-block.css'
import './blockquote.css'
import './rainbow.css'
import Linkcard from "./components/Linkcard.vue"
// giscus
import giscusTalk from 'vitepress-plugin-comment-with-giscus';
import { useData, useRoute } from 'vitepress';
// 图片放大
import mediumZoom from 'medium-zoom';
import { onMounted, watch, nextTick, onBeforeUnmount } from 'vue';
import { useRoute } from 'vitepress';
// 时间线
import "vitepress-markdown-timeline/dist/theme/index.css";

let NProgress: any = null
let nprogressCss: HTMLStyleElement | null = null

if (typeof window !== 'undefined') {
  NProgress = (await import('nprogress-v2/dist/index.js')).NProgress
  nprogressCss = document.createElement('style')
  nprogressCss.textContent = await (await fetch('nprogress-v2/dist/index.css')).text()
  document.head.appendChild(nprogressCss)
}

import {NolebaseEnhancedReadabilitiesMenu,NolebaseEnhancedReadabilitiesScreenMenu,} from '@nolebase/vitepress-plugin-enhanced-readabilities/client'

import '@nolebase/vitepress-plugin-enhanced-readabilities/client/style.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
       // 为较宽的屏幕的导航栏添加阅读增强菜单
      'nav-bar-content-after': () => h(NolebaseEnhancedReadabilitiesMenu), 
       // 为较窄的屏幕（通常是小于 iPad Mini）添加阅读增强菜单
      'nav-screen-content-after': () => h(NolebaseEnhancedReadabilitiesScreenMenu), 
     })
  },
  enhanceApp({ app , router }) {
    // 注册全局组件
    app.component('Linkcard', Linkcard); // 链接卡片
    
    if (NProgress) {
      NProgress.configure({ showSpinner: false })
      router.onBeforeRouteChange = () => {
        NProgress.start() // 开始进度条
      }
      router.onAfterRouteChange = () => {
         NProgress.done() // 停止进度条
       }
    }
  },

  setup() {
    const route = useRoute();
    // 图片放大
    const initZoom = () => {
      // mediumZoom('[data-zoomable]', { background: 'var(--vp-c-bg)' }); // 默认
      mediumZoom('.main img', { background: 'var(--vp-c-bg)' }); // 不显式添加{data-zoomable}的情况下为所有图像启用此功能
    };
    onMounted(() => {
      initZoom();
    });
    watch(
      () => route.path,
      () => nextTick(() => initZoom())
    );

    // giscus配置
    const { frontmatter } = useData();
    giscusTalk({
      repo: 'XTY64XTY12345/Wiki', //仓库
      repoId: 'R_kgDOMWWaig', //仓库ID
      category: 'Announcements', // 讨论分类
      categoryId: 'DIC_kwDOMWWais4CkG7I', //讨论分类ID
      mapping: 'pathname',
      inputPosition: 'bottom',
      }, 
      {
        frontmatter, route
      },
      //默认值为true，表示已启用，此参数可以忽略；
      //如果为false，则表示未启用
      //您可以使用“comment:true”序言在页面上单独启用它
      true
    );
    
    onBeforeUnmount(() => {
      if (nprogressCss && nprogressCss.parentNode) {
        nprogressCss.parentNode.removeChild(nprogressCss)
      }
    });
 }
}
