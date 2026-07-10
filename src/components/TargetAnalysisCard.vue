<template>
  <div class="card" style="background: #e8f5e9; border-color: #c8e6c9;">
    <div style="font-weight: bold; margin-bottom: 0.5rem;">📈 目标达成分析</div>
    <div style="font-size: 0.85rem; color: #333; line-height: 1.6;">
      <div>• 按当前成绩，最终 GPA 预计 <strong>{{ currentGPA.toFixed(2) }}</strong></div>
      <div v-if="requiredAverage != null">
        • 守住目标所需剩余课程平均分：<strong>{{ requiredAverage.toFixed(1) }}</strong>
      </div>
      <div v-else>• 所有课程已录入</div>
      <div>• 剩余课程平均 85 分时，最终 GPA 可达 <strong>{{ predicted85.toFixed(2) }}</strong></div>
      <div>• 剩余课程平均 90 分时，最终 GPA 可达 <strong>{{ predicted90.toFixed(2) }}</strong></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentGPA: Number,
  requiredAverage: Number,
  predicted: Function
})

const predicted85 = computed(() => props.predicted(85))
const predicted90 = computed(() => props.predicted(90))
</script>
