<template>
  <div class="card">
    <div style="font-weight: bold; margin-bottom: 0.8rem;">配置档案</div>
    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
      <div
        v-for="profile in profilesStore.profiles"
        :key="profile.id"
        style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem; border-radius: 0.4rem;"
        :style="{ background: profile.id === appStore.currentProfileId.value ? '#e8f5e9' : 'var(--surface)' }"
      >
        <div>
          <div style="font-weight: 500;">{{ profile.name }}</div>
          <div style="font-size: 0.75rem; color: var(--muted);">目标 {{ profile.targetGPA }} · {{ courseCount(profile) }} 门课</div>
        </div>
        <div v-if="profile.id === appStore.currentProfileId.value" style="font-size: 0.75rem; color: #2e7d32;">使用中</div>
        <button v-else class="btn" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" @click="appStore.setCurrentProfileId(profile.id)">切换</button>
      </div>
    </div>
    <button class="btn btn-primary" style="width: 100%; margin-top: 0.8rem;" @click="addProfile">+ 新建档案</button>
  </div>
</template>

<script setup>
import { useAppStore } from '../stores/app'
import { useProfilesStore } from '../stores/profiles'

const appStore = useAppStore()
const profilesStore = useProfilesStore()

function courseCount(profile) {
  return Object.values(profile.classes).reduce((sum, list) => sum + list.length, 0)
}

function addProfile() {
  const name = prompt('新档案名称')
  if (name) {
    const id = profilesStore.addProfile(name)
    appStore.setCurrentProfileId(id)
  }
}
</script>
