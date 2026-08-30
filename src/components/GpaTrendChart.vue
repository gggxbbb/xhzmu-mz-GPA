<template>
  <section class="neo-card" aria-labelledby="gpa-trend-title">
    <h2 id="gpa-trend-title" class="chart-title">学期 GPA 趋势</h2>
    <Bar
      :data="chartData"
      :options="chartOptions"
      role="img"
      aria-label="学期 GPA 趋势柱状图"
    />
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Bar } from 'vue-chartjs'
import { ChartJS } from '../plugins/chart.js'

const GPA_MAX = 5

const props = defineProps({
  semesterGpas: Object
})

// Chart.js 在 canvas 上渲染,无法直接使用 var();
// 运行时从 :root 解析 token,并通过 MutationObserver 监听
// data-theme 翻转(stores/app.js 的 applyTheme 写入)触发重算。
const themeTick = ref(0)
let themeObserver
onMounted(() => {
  themeObserver = new MutationObserver(() => {
    themeTick.value++
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  })
})
onBeforeUnmount(() => themeObserver?.disconnect())

function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

const chartData = computed(() => {
  themeTick.value
  return {
    labels: Object.keys(props.semesterGpas),
    datasets: [{
      label: '学期 GPA',
      data: Object.values(props.semesterGpas),
      backgroundColor: token('--accent'),
      borderRadius: 0
    }]
  }
})

const chartOptions = computed(() => {
  themeTick.value
  const axis = {
    ticks: { color: token('--ink') },
    grid: { color: token('--ink-soft') }
  }
  return {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: axis,
      y: { ...axis, min: 0, max: GPA_MAX }
    }
  }
})
</script>
<style scoped>
.chart-title {
  font-size: var(--text-base);
  font-weight: var(--weight-heading);
  margin: 0 0 0.8rem 0;
}
</style>
