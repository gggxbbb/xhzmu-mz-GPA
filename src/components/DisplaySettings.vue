<template>
  <div class="card">
    <div style="font-weight: bold; margin-bottom: 0.8rem;">显示设置</div>
    <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
      <span>结果显示至小数点后 5 位</span>
      <input type="checkbox" v-model="appStore.showVeryLongGPA">
    </label>
    <label style="display: flex; justify-content: space-between; align-items: center;">
      <span>深色模式</span>
      <select class="input" v-model="appStore.theme" style="width: auto;">
        <option value="auto">跟随系统</option>
        <option value="light">浅色</option>
        <option value="dark">深色</option>
      </select>
    </label>
  </div>
</template>

<script setup>
import { watch } from 'vue'
import { useAppStore } from '../stores/app'
import { useAnalytics } from '../composables/useAnalytics'

const appStore = useAppStore()
const { trackThemeChanged } = useAnalytics()

watch(() => appStore.theme, (theme) => {
  trackThemeChanged(theme)
})
</script>
