<template>
  <div v-if="currentProfile" class="profile-page">
    <section class="profile-group" aria-label="档案管理">
      <ProfileSwitcher />
      <CourseConfigEditor />
    </section>
    <section class="profile-group" aria-label="显示设置">
      <DisplaySettings />
    </section>
    <section class="profile-group" aria-label="导入导出">
      <ImportExportCard />
    </section>
    <section class="profile-group" aria-label="危险区">
      <DangerZone />
    </section>
    <div class="footer-link">
      <a href="https://github.com/gggxbbb/xhzmu-mz-GPA" target="_blank">GitHub</a>
    </div>
  </div>
  <div v-else class="neo-card loading-state">加载中...</div>
</template>

<style scoped>
.profile-group {
  margin-bottom: 0.5rem;
}

.footer-link {
  text-align: center;
  margin-top: 1rem;
}

.footer-link a {
  font-size: var(--text-xs);
  color: var(--ink-soft);
}

.loading-state {
  text-align: center;
}
</style>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app'
import { useProfilesStore } from '../stores/profiles'
import ProfileSwitcher from '../components/ProfileSwitcher.vue'
import CourseConfigEditor from '../components/CourseConfigEditor.vue'
import ImportExportCard from '../components/ImportExportCard.vue'
import DisplaySettings from '../components/DisplaySettings.vue'
import DangerZone from '../components/DangerZone.vue'

const appStore = useAppStore()
const profilesStore = useProfilesStore()

const currentProfile = computed(() => profilesStore.getProfile(appStore.currentProfileId))
</script>
