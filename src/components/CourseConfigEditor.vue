<template>
  <div class="card">
    <div style="font-weight: bold; margin-bottom: 0.8rem;">编辑当前配置</div>
    <input class="input" v-model="draft.name" placeholder="档案名称" style="margin-bottom: 0.6rem;">
    <input class="input" v-model.number="draft.targetGPA" placeholder="目标绩点" style="margin-bottom: 0.6rem;">

    <div v-for="(courses, semester) in draft.classes" :key="semester" style="border: 1px solid var(--border); border-radius: 0.5rem; overflow: hidden; margin-bottom: 0.8rem;">
      <div style="padding: 0.6rem; background: var(--surface); display: flex; justify-content: space-between; align-items: center;">
        <input class="input" :aria-label="`学期名称 ${semester}`" v-model="semesterNames[semester]" style="width: 100px; font-weight: bold; background: transparent; border: none; padding: 0;" @change="renameSemester(semester, semesterNames[semester])">
        <div style="display: flex; gap: 0.3rem;">
          <button class="btn" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;" @click="addCourse(semester)">+ 课</button>
          <button class="btn btn-danger" aria-label="删除学期" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;" @click="removeSemester(semester)">删除学期</button>
        </div>
      </div>
      <div style="padding: 0.6rem;">
        <div v-for="(course, index) in courses" :key="index" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
          <input class="input" v-model="course.name" placeholder="课程名称" style="flex: 2;">
          <input class="input" v-model.number="course.credit" placeholder="学分" style="flex: 1;">
          <button class="btn btn-danger" aria-label="删除课程" style="padding: 0.2rem 0.4rem; font-size: 0.75rem;" @click="removeCourse(semester, index)">✕</button>
        </div>
      </div>
    </div>

    <button class="btn" style="width: 100%; margin-bottom: 0.8rem;" @click="addSemester">+ 新建学期</button>

    <details style="font-size: 0.85rem;">
      <summary>高级：文本模式编辑</summary>
      <textarea class="input" v-model="textMode" rows="6" style="font-family: monospace; margin-top: 0.5rem;"></textarea>
    </details>

    <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
      <button class="btn" style="flex: 1;" @click="reset">重置</button>
      <button class="btn btn-primary" style="flex: 1;" @click="save">保存</button>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch, computed } from 'vue'
import { useProfilesStore } from '../stores/profiles'
import { useAppStore } from '../stores/app'
import { serializeClasses, parseClasses } from '../utils/parsers'

const appStore = useAppStore()
const profilesStore = useProfilesStore()

const currentProfile = computed(() => profilesStore.getProfile(appStore.currentProfileId))
const draft = reactive({ name: '', targetGPA: 2.0, classes: {} })
const semesterNames = reactive({})
const textMode = ref('')

function syncDraft() {
  draft.name = currentProfile.value.name
  draft.targetGPA = currentProfile.value.targetGPA
  draft.classes = JSON.parse(JSON.stringify(currentProfile.value.classes))
  Object.keys(semesterNames).forEach(k => delete semesterNames[k])
  Object.keys(draft.classes).forEach(k => { semesterNames[k] = k })
  textMode.value = serializeClasses(draft.classes)
}

watch(currentProfile, syncDraft, { immediate: true })
watch(() => draft.classes, () => {
  textMode.value = serializeClasses(draft.classes)
}, { deep: true })

function addSemester() {
  const name = prompt('学期名称')
  if (name && !draft.classes[name]) {
    draft.classes[name] = []
    semesterNames[name] = name
  }
}

function removeSemester(name) {
  if (confirm(`删除学期 "${name}" 及其所有课程？`)) {
    delete draft.classes[name]
    delete semesterNames[name]
  }
}

function renameSemester(oldName, newName) {
  if (oldName === newName) return
  if (draft.classes[newName]) {
    alert('学期名称已存在')
    semesterNames[oldName] = oldName
    return
  }
  draft.classes[newName] = draft.classes[oldName]
  delete draft.classes[oldName]
  semesterNames[newName] = newName
  delete semesterNames[oldName]
}

function addCourse(semester) {
  draft.classes[semester].push({ name: '', credit: 0 })
}

function removeCourse(semester, index) {
  draft.classes[semester].splice(index, 1)
}

function reset() {
  syncDraft()
}

function save() {
  const targetGPA = parseFloat(draft.targetGPA)
  if (isNaN(targetGPA) || targetGPA < 0 || targetGPA > 5) {
    alert('目标绩点必须是 0 到 5 之间的数字')
    return
  }

  let classes = draft.classes
  if (textMode.value.trim()) {
    const parsed = parseClasses(textMode.value)
    if (Object.keys(parsed).length > 0) {
      classes = parsed
    }
  }

  const filteredClasses = {}
  for (const semester of Object.keys(classes)) {
    const validCourses = classes[semester].filter(
      c => String(c.name || '').trim() !== '' && parseFloat(c.credit) > 0
    )
    if (validCourses.length > 0) {
      filteredClasses[semester] = validCourses
    }
  }

  if (Object.keys(filteredClasses).length === 0) {
    alert('至少需要保留一门有效的课程（名称和学分均不能为空）')
    return
  }

  profilesStore.updateProfile(currentProfile.value.id, {
    name: draft.name,
    targetGPA,
    classes: JSON.parse(JSON.stringify(filteredClasses))
  })
  syncDraft()
}
</script>
