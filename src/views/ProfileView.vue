<template>
  <div v-if="currentProfile">
    <ProfileSwitcher />
    <CourseConfigEditor />
    <ImportExportCard />
    <div class="card">
      <div style="font-weight: bold; margin-bottom: 0.8rem;">云同步与分享</div>
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <button
          class="btn btn-primary"
          :disabled="syncing"
          :aria-busy="syncing"
          @click="syncNow"
        >
          <span v-if="syncing">同步中…</span>
          <span v-else>立即同步</span>
        </button>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn" style="flex: 1;" @click="showShare = true">
            生成分享码
          </button>
          <button class="btn" style="flex: 1;" @click="showRecover = true">
            通过分享码恢复
          </button>
        </div>
      </div>
      <div v-if="syncError" class="sync-error" role="alert">
        {{ syncError }}
      </div>
    </div>
    <DisplaySettings />
    <DangerZone />
    <div style="text-align: center; margin-top: 1rem;">
      <a href="https://github.com/gggxbbb/xhzmu-mz-GPA" target="_blank" style="font-size: 0.8rem; color: var(--muted);">GitHub</a>
    </div>

    <ShareCodeDialog
      :open="showShare"
      :payload="sharePayload"
      @close="showShare = false"
    />
    <RecoverDialog
      :open="showRecover"
      @close="showRecover = false"
      @recovered="handleRecovered"
    />
  </div>
  <div v-else class="card" style="text-align: center;">加载中...</div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useAppStore } from '../stores/app'
import { useProfilesStore } from '../stores/profiles'
import { useGradesStore } from '../stores/grades'
import { syncNow, status, lastError } from '../engine/syncEngine.js'
import { useAnalytics } from '../composables/useAnalytics'
import ProfileSwitcher from '../components/ProfileSwitcher.vue'
import CourseConfigEditor from '../components/CourseConfigEditor.vue'
import ImportExportCard from '../components/ImportExportCard.vue'
import DisplaySettings from '../components/DisplaySettings.vue'
import DangerZone from '../components/DangerZone.vue'
import ShareCodeDialog from '../components/ShareCodeDialog.vue'
import RecoverDialog from '../components/RecoverDialog.vue'

const appStore = useAppStore()
const profilesStore = useProfilesStore()
const gradesStore = useGradesStore()
const { trackShareCodeRecovered } = useAnalytics()

const currentProfileId = computed(() => appStore.currentProfileId)

const showShare = ref(false)
const showRecover = ref(false)

const currentProfile = computed(() => profilesStore.getProfile(appStore.currentProfileId))
const sharePayload = computed(() => ({
  profiles: profilesStore.dump(),
  grades: gradesStore.dump()
}))
const syncing = computed(() => status.value === 'syncing')
const syncError = computed(() => lastError.value?.message || '')

async function handleRecovered(payload) {
  if (!payload) return

  const { mergeProfiles, mergeGrades } = await import('../engine/stateMerge.js')

  let mergedProfiles = profilesStore.profiles
  if (Array.isArray(payload.profiles)) {
    mergedProfiles = mergeProfiles(profilesStore.profiles, payload.profiles)
    profilesStore.load(mergedProfiles)
  }

  let mergedGrades = gradesStore.gradesByProfile
  if (payload.grades && typeof payload.grades === 'object' && !Array.isArray(payload.grades)) {
    mergedGrades = mergeGrades(
      gradesStore.gradesByProfile,
      payload.grades,
      mergedProfiles
    )
    gradesStore.load(mergedGrades)
  }

  const previousId = currentProfileId.value
  if (!mergedProfiles.some((p) => p.id === previousId)) {
    appStore.setCurrentProfileId(mergedProfiles[0]?.id || 'default')
  }

  trackShareCodeRecovered()

  await syncNow()

  showRecover.value = false
}
</script>

<style scoped>
.sync-error {
  margin-top: 0.75rem;
  padding: 0.6rem;
  border-radius: var(--radius, 0.75rem);
  background: var(--danger-bg, #ffebee);
  color: var(--danger, #c62828);
  font-size: 0.85rem;
}
</style>
