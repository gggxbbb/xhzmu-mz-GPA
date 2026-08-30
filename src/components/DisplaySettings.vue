<template>
  <div class="neo-card">
    <div class="settings-title">显示设置</div>
    <label class="settings-row settings-row--gap">
      <span>结果显示至小数点后 5 位</span>
      <input type="checkbox" v-model="appStore.showVeryLongGPA">
    </label>
    <label class="settings-row">
      <span>深色模式</span>
      <select class="neo-input theme-select" v-model="appStore.theme">
        <option value="auto">跟随系统</option>
        <option value="light">浅色</option>
        <option value="dark">深色</option>
      </select>
    </label>
  </div>
</template>

<style scoped>
.settings-title {
  font-weight: var(--weight-heading);
  margin-bottom: 0.8rem;
}

.settings-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings-row--gap {
  margin-bottom: 0.6rem;
}

.theme-select {
  width: auto;
}
</style>

<script setup>
import { useAppStore } from '../stores/app'

const appStore = useAppStore()
</script>
