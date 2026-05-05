<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { getItemNotices } from '../notices'

interface Props {
  item: string
}

const props = defineProps<Props>()
const { lang } = useData()

const notices = computed(() => getItemNotices(lang.value, props.item))
</script>

<template>
  <div v-if="notices.length" class="project-notices">
    <div
      v-for="(n, idx) in notices"
      :key="idx"
      class="custom-block"
      :class="n.type === 'info' ? 'tip' : n.type"
    >
      <p class="custom-block-title">{{ n.title }}</p>
      <p v-for="(line, li) in n.lines" :key="li" v-html="line"></p>
    </div>
  </div>
</template>

<style>
.project-notices {
  margin: 16px 0;
}

.project-notices .custom-block + .custom-block {
  margin-top: 10px;
}
</style>
