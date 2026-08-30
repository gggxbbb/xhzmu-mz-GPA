<template>
  <div class="neo-card neo-card--danger">
    <div class="danger-title">危险操作</div>
    <p class="danger-hint">以下操作不可恢复，执行前请先导出备份。</p>
    <div class="danger-actions">
      <button class="neo-btn neo-btn--danger" @click="clearGrades">仅清除成绩</button>
      <button class="neo-btn neo-btn--danger" @click="clearAll">清除所有本地数据</button>
    </div>
  </div>
</template>
<style scoped>
.danger-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--text-lg);
  font-weight: var(--weight-heading);
}

.danger-title::before {
  content: '';
  width: 0.9em;
  height: 0.9em;
  flex-shrink: 0;
  background: var(--danger);
  border: 2px solid var(--danger-strong);
}

.danger-hint {
  margin: 0.5rem 0 0.8rem;
  font-size: var(--text-sm);
}

.danger-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>

<script setup>
import { useAppStore } from '../stores/app'
import { useGradesStore } from '../stores/grades'

const appStore = useAppStore()
const gradesStore = useGradesStore()

function clearGrades() {
  if (confirm('确定清除当前档案的所有成绩吗？此操作不可恢复。')) {
    gradesStore.clearGrades(appStore.currentProfileId)
  }
}

function clearAll() {
  if (confirm('确定清除所有本地数据吗？包括成绩、配置档案和设置。')) {
    const keys = ['gpa_v2', 'classes', 'classesName', 'targetGPA', 'grades', 'showVeryLongGPA']
    for (const key of keys) {
      localStorage.removeItem(key)
    }
    location.reload()
  }
}
</script>
