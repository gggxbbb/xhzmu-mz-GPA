<template>
  <div class="neo-card">
    <div class="profiles-title">配置档案</div>
    <div class="profile-list">
      <div
        v-for="profile in profilesStore.profiles"
        :key="profile.id"
        class="profile-item"
        :class="{ 'profile-item--current': profile.id === appStore.currentProfileId }"
      >
        <div>
          <div class="profile-name">{{ profile.name }}</div>
          <div class="profile-meta">目标 {{ profile.targetGPA }} · {{ courseCount(profile) }} 门课</div>
        </div>
        <div v-if="profile.id === appStore.currentProfileId" class="profile-current-tag">使用中</div>
        <button v-else class="neo-btn switch-btn" @click="switchProfile(profile.id)">切换</button>
      </div>
    </div>
    <button class="neo-btn neo-btn--primary add-profile-btn" @click="addProfile">+ 新建档案</button>
  </div>
</template>

<style scoped>
.profiles-title {
  font-weight: var(--weight-heading);
  margin-bottom: 0.8rem;
}

.profile-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.profile-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem;
  border: 2px solid var(--ink);
  border-radius: 0.4rem;
  background: var(--surface);
}

.profile-item--current {
  background: var(--accent-soft);
  border-color: var(--accent-border);
}

.profile-name {
  font-weight: var(--weight-medium);
}

.profile-meta {
  font-size: var(--text-xs);
  color: var(--ink-soft);
}

.profile-current-tag {
  font-size: var(--text-xs);
  color: var(--accent-strong);
  font-weight: var(--weight-heading);
}

.switch-btn {
  padding: 0.3rem 0.6rem;
  font-size: var(--text-xs);
  min-height: 36px;
}

.add-profile-btn {
  width: 100%;
  margin-top: 0.8rem;
}
</style>

<script setup>
import { useAppStore } from '../stores/app'
import { useProfilesStore } from '../stores/profiles'

const appStore = useAppStore()
const profilesStore = useProfilesStore()

function courseCount(profile) {
  return Object.values(profile.classes).reduce((sum, list) => sum + list.length, 0)
}

function switchProfile(id) {
  appStore.setCurrentProfileId(id)
}

function addProfile() {
  const name = prompt('新档案名称')
  if (name) {
    const id = profilesStore.addProfile(name)
    appStore.setCurrentProfileId(id)
  }
}
</script>
