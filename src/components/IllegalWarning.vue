<template>
  <div
    v-if="courses.length > 0"
    class="neo-card neo-card--danger"
    role="alert"
    aria-live="polite"
  >
    <div class="warning-body">
      ⚠️ 以下课程成绩小于 10 分，疑似误输入；按校规将以 0 绩点计入：{{ courses.join('、') }}
    </div>
  </div>
</template>
<style scoped>
.warning-body {
  font-size: var(--text-sm);
}
</style>

<script setup>
defineProps({
  courses: Array
})
</script>
