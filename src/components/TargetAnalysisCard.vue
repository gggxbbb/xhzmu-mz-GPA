<template>
  <section class="card" style="background: #e8f5e9; border-color: #c8e6c9;" aria-labelledby="target-analysis-title">
    <h2 id="target-analysis-title" style="font-size: 1rem; font-weight: bold; margin: 0 0 0.5rem 0;">📈 目标达成分析</h2>
    <div style="font-size: 0.85rem; color: #333; line-height: 1.6;">
      <div>• 按当前成绩，最终 GPA 预计 <strong>{{ Number.isFinite(currentGpa) ? currentGpa.toFixed(2) : '0.00' }}</strong></div>
      <div v-if="requiredAverage != null">
        • 守住目标所需剩余课程平均分：<strong>{{ Number.isFinite(requiredAverage) ? requiredAverage.toFixed(1) : '-' }}</strong>
      </div>
      <div v-else>• 所有课程已录入</div>
      <div>• 剩余课程平均 85 分时，最终 GPA 可达 <strong>{{ Number.isFinite(predicted85) ? predicted85.toFixed(2) : '0.00' }}</strong></div>
      <div>• 剩余课程平均 90 分时，最终 GPA 可达 <strong>{{ Number.isFinite(predicted90) ? predicted90.toFixed(2) : '0.00' }}</strong></div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentGpa: { type: Number, default: 0 },
  requiredAverage: { type: Number, default: null },
  predicted: { type: Function, default: () => 0 }
})

const predicted85 = computed(() => props.predicted(85))
const predicted90 = computed(() => props.predicted(90))
</script>
