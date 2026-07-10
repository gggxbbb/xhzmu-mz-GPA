<template>
  <div>
    <ProfileSwitcher />
    <CourseConfigEditor />
    <ImportExportCard />
    <DisplaySettings />
    <DangerZone />
    <div style="text-align: center; margin-top: 1rem;">
      <a href="https://github.com/gggxbbb/xhzmu-mz-GPA" target="_blank" style="font-size: 0.8rem; color: var(--muted);">GitHub</a>
    </div>
  </div>
</template>

<script setup>
import ProfileSwitcher from '../components/ProfileSwitcher.vue'
import CourseConfigEditor from '../components/CourseConfigEditor.vue'
import ImportExportCard from '../components/ImportExportCard.vue'
import DisplaySettings from '../components/DisplaySettings.vue'
import DangerZone from '../components/DangerZone.vue'
</script>
