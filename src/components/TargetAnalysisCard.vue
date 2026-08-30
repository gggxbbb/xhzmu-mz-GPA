<template>
  <section class="neo-card neo-card--accent" aria-labelledby="target-analysis-title">
    <h2 id="target-analysis-title" class="analysis-title">📈 目标达成分析</h2>
    <div class="analysis-body">
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
<style scoped>
.analysis-title {
  font-size: var(--text-base);
  font-weight: var(--weight-heading);
  margin: 0 0 0.5rem 0;
}

.analysis-body {
  font-size: var(--text-sm);
  color: var(--ink);
  line-height: 1.6;
}
</style>
