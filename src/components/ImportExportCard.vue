<template>
  <div class="card">
    <div style="font-weight: bold; margin-bottom: 0.8rem;">数据备份</div>
    <div style="display: flex; gap: 0.5rem;">
      <button class="btn" style="flex: 1;" @click="importData">导入 JSON</button>
      <button class="btn btn-primary" style="flex: 1;" @click="exportData">导出备份</button>
    </div>
    <input ref="fileInput" type="file" accept=".json" style="display: none;" @change="onFileSelected">
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAppStore } from '../stores/app'
import { useProfilesStore } from '../stores/profiles'
import { useGradesStore } from '../stores/grades'
import { parseClasses } from '../utils/parsers'

const appStore = useAppStore()
const profilesStore = useProfilesStore()
const gradesStore = useGradesStore()

const fileInput = ref(null)

function exportData() {
  const profile = profilesStore.getProfile(appStore.currentProfileId)
  const data = {
    version: 2,
    profile,
    grades: gradesStore.getGrades(profile.id)
  }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `GPA-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function importData() {
  fileInput.value.click()
}

function onFileSelected(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result)
      if (data.version === 2) {
        const profile = data.profile
        if (!profile || typeof profile.id !== 'string' || !profile.id ||
            typeof profile.name !== 'string' ||
            typeof profile.targetGPA !== 'number' ||
            !profile.classes || typeof profile.classes !== 'object' || Array.isArray(profile.classes)) {
          alert('导入失败：档案格式不正确')
          return
        }
        if (data.grades != null && (typeof data.grades !== 'object' || Array.isArray(data.grades))) {
          alert('导入失败：成绩格式不正确')
          return
        }

        const existing = profilesStore.profiles.some(p => p.id === profile.id)
        if (existing) {
          profilesStore.updateProfile(profile.id, profile)
          gradesStore.load({ ...gradesStore.gradesByProfile, [profile.id]: data.grades || {} })
          appStore.setCurrentProfileId(profile.id)
        } else {
          const newId = profilesStore.addProfile(profile.name, profile.targetGPA, profile.classes)
          gradesStore.load({ ...gradesStore.gradesByProfile, [newId]: data.grades || {} })
          appStore.setCurrentProfileId(newId)
          alert('原档案 ID 不存在，已导入为新档案')
        }
      } else {
        // Legacy format fallback
        if (!data.classes || typeof data.scores !== 'object' || Array.isArray(data.scores)) {
          alert('导入失败：旧版格式数据不完整')
          return
        }
        const id = profilesStore.addProfile(data.className || '导入配置', data.targetGPA, parseClasses(data.classes))
        gradesStore.load({ ...gradesStore.gradesByProfile, [id]: data.scores })
        appStore.setCurrentProfileId(id)
      }
    } catch (e) {
      alert('导入失败：' + e.message)
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}
</script>
