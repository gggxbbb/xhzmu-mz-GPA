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
      classes: DEFAULT_CLASSES
    }
  }

  function addProfile(name, targetGPA, classes) {
    const profile = {
      id: createId(),
      name: name || '新档案',
      targetGPA: isNaN(parseFloat(targetGPA)) ? DEFAULT_TARGET_GPA : parseFloat(targetGPA),
      classes: classes || {}
    }
    profiles.value.push(profile)
    return profile.id
  }

  function updateProfile(id, patch) {
    const p = profiles.value.find(x => x.id === id)
    if (!p) return
    if (patch.name != null) p.name = patch.name
    if (patch.targetGPA != null) p.targetGPA = parseFloat(patch.targetGPA)
    if (patch.classes != null) p.classes = patch.classes
  }

  function removeProfile(id) {
    profiles.value = profiles.value.filter(p => p.id !== id)
  }

  function setDefault() {
    profiles.value = [createDefaultProfile()]
  }

  function load(data) {
    if (Array.isArray(data) && data.length > 0) {
      profiles.value = data
    } else {
      setDefault()
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
    removeProfile,
    setDefault,
    load,
    dump
  }
})
