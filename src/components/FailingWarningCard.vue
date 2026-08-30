<template>
  <section v-if="courses.length > 0" class="neo-card neo-card--danger" role="alert" aria-live="polite" aria-labelledby="failing-warning-title">
    <h2 id="failing-warning-title" class="warning-title">⚠️ 挂科预警</h2>
    <div class="warning-body">
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
<style scoped>
.warning-title {
  font-size: var(--text-base);
  font-weight: var(--weight-heading);
  margin: 0 0 0.5rem 0;
}

.warning-body {
  font-size: var(--text-sm);
}
</style>
