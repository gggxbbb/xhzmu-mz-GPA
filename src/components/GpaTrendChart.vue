<template>
  <section class="card" aria-labelledby="gpa-trend-title">
    <h2 id="gpa-trend-title" style="font-size: 1rem; font-weight: bold; margin: 0 0 0.8rem 0;">学期 GPA 趋势</h2>
    <Bar
      :data="chartData"
      :options="chartOptions"
      role="img"
      aria-label="学期 GPA 趋势柱状图"
    />
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { ChartJS } from '../plugins/chart.js'

const GPA_MAX = 5

const props = defineProps({
  semesterGPAs: Object
})

const chartData = computed(() => ({
  labels: Object.keys(props.semesterGPAs),
  datasets: [{
    label: '学期 GPA',
    data: Object.values(props.semesterGPAs),
    backgroundColor: '#66ccff',
    borderRadius: 4
  }]
}))

const chartOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    y: { min: 0, max: GPA_MAX }
  }
}
</script>
