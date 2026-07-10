<template>
  <div class="card">
    <div style="font-weight: bold; margin-bottom: 0.8rem;">成绩分布</div>
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps({
  grades: Object
})

const distribution = computed(() => {
  const buckets = { '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, '<60': 0 }
  for (const score of Object.values(props.grades)) {
    if (score >= 90) buckets['90-100']++
    else if (score >= 80) buckets['80-89']++
    else if (score >= 70) buckets['70-79']++
    else if (score >= 60) buckets['60-69']++
    else buckets['<60']++
  }
  return buckets
})

const chartData = computed(() => ({
  labels: Object.keys(distribution.value),
  datasets: [{
    label: '课程数',
    data: Object.values(distribution.value),
    backgroundColor: ['#4caf50', '#66ccff', '#ff9800', '#ff5722', '#f44336'],
    borderRadius: 4
  }]
}))

const chartOptions = {
  responsive: true,
  scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
}
</script>
