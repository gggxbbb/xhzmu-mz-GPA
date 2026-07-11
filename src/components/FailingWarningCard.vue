<template>
  <section v-if="courses.length > 0" class="card" style="background: #fff3f3; border-color: #ffcccc; color: #c33;" role="alert" aria-live="polite" aria-labelledby="failing-warning-title">
    <h2 id="failing-warning-title" style="font-size: 1rem; font-weight: bold; margin: 0 0 0.5rem 0;">⚠️ 挂科预警</h2>
    <div style="font-size: 0.85rem;">
      <div v-for="course in courses" :key="course.name">
        {{ course.name }}（{{ course.credit }} 学分）成绩 {{ course.score }} 分
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  courses: Array
})
</script>
