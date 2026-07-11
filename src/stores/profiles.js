import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DEFAULT_CLASSES, DEFAULT_PROFILE_NAME, DEFAULT_TARGET_GPA } from '../utils/parsers'

function createId() {
  return 'p_' + Math.random().toString(36).slice(2, 9)
}

export const useProfilesStore = defineStore('profiles', () => {
  const profiles = ref([])

  function getProfile(id) {
    return profiles.value.find(p => p.id === id) || profiles.value[0] || null
  }

  function createDefaultProfile() {
    return {
      id: 'default',
      name: DEFAULT_PROFILE_NAME,
      targetGPA: DEFAULT_TARGET_GPA,
      classes: DEFAULT_CLASSES,
      updatedAt: Date.now()
    }
  }

  function addProfile(name, targetGPA, classes) {
    const profile = {
      id: createId(),
      name: name || '新档案',
      targetGPA: isNaN(parseFloat(targetGPA)) ? DEFAULT_TARGET_GPA : parseFloat(targetGPA),
      classes: classes || {},
      updatedAt: Date.now()
    }
    profiles.value.push(profile)
    return profile.id
  }

  function updateProfile(id, patch) {
    const p = profiles.value.find(x => x.id === id)
    if (!p) return
    if (patch.name != null) p.name = patch.name
    if (patch.targetGPA != null) {
      const parsed = parseFloat(patch.targetGPA)
      if (!isNaN(parsed)) p.targetGPA = parsed
    }
    if (patch.classes != null) p.classes = patch.classes
    p.updatedAt = Date.now()
  }

  function touchProfile(id) {
    const p = profiles.value.find(x => x.id === id)
    if (p) {
      p.updatedAt = Date.now()
    }
  }

  function removeProfile(id) {
    profiles.value = profiles.value.filter(p => p.id !== id)
    return id
  }

  function resetToDefault() {
    profiles.value = [createDefaultProfile()]
  }

  function load(data) {
    if (Array.isArray(data) && data.length > 0) {
      profiles.value = data.map((p) => ({
        ...p,
        updatedAt: p.updatedAt ?? Date.now()
      }))
    } else {
      resetToDefault()
    }
  }

  function dump() {
    return profiles.value
  }

  return {
    profiles,
    getProfile,
    addProfile,
    updateProfile,
    touchProfile,
    removeProfile,
    resetToDefault,
    load,
    dump
  }
})
