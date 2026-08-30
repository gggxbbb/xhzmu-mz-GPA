<template>
  <label class="search-bar">
    <span class="visually-hidden">搜索课程</span>
    <input
      type="text"
      class="neo-input"
      placeholder="搜索课程..."
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </label>
</template>

<script setup>
defineProps(['modelValue'])
defineEmits(['update:modelValue'])
</script>
<style scoped>
.search-bar {
  display: block;
  margin-bottom: 1rem;
}
</style>
