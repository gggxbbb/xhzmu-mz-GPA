<template>
  <div
    v-if="courses.length > 0"
    class="card"
    style="background: var(--danger-soft); border-color: var(--danger-border); color: var(--danger-strong);"
    role="alert"
    aria-live="polite"
  >
    <div style="font-size: 0.85rem;">
      ⚠️ 以下课程成绩小于 10 分，计算结果可能不准确：{{ courses.join('、') }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  courses: Array
})
</script>
