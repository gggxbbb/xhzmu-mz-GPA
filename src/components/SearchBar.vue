<template>
  <label style="display: block; margin-bottom: 1rem;">
    <span class="visually-hidden">搜索课程</span>
    <input
      type="text"
      class="input"
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
