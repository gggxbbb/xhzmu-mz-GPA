<template>
  <div class="card">
    <div style="font-weight: bold; margin-bottom: 0.8rem;">学期 GPA 趋势</div>
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

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
  scales: {
    y: { min: 0, max: 5 }
  }
}
</script>
