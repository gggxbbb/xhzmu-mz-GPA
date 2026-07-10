<template>
  <div v-if="courses.length > 0" class="card" style="background: #fff3f3; border-color: #ffcccc; color: #c33;" role="alert" aria-live="polite">
    <div style="font-weight: bold; margin-bottom: 0.5rem;">⚠️ 挂科预警</div>
    <div style="font-size: 0.85rem;">
      <div v-for="course in courses" :key="course.name">
        {{ course.name }}（{{ course.credit }} 学分）成绩 {{ course.score }} 分
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  courses: Array
})
</script>
