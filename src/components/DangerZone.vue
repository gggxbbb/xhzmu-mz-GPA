<template>
  <div class="card" style="background: #fff3f3; border-color: #ffcccc;">
    <div style="font-weight: bold; margin-bottom: 0.8rem; color: #c33;">危险操作</div>
    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
      <button class="btn btn-danger" @click="clearGrades">仅清除成绩</button>
      <button class="btn btn-danger" @click="clearAll">清除所有本地数据</button>
    </div>
  </div>
</template>

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
    localStorage.clear()
    location.reload()
  }
}
</script>
