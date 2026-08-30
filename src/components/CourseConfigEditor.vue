<template>
  <div class="neo-card">
    <div class="editor-title">编辑当前配置</div>
    <input class="neo-input editor-field" aria-label="档案名称" v-model="draft.name" placeholder="档案名称">
    <input class="neo-input editor-field" aria-label="目标绩点" v-model.number="draft.targetGPA" placeholder="目标绩点">

    <div v-for="(courses, semester) in draft.classes" :key="semester" class="semester-block">
      <div class="semester-block-header">
        <input class="neo-input semester-name-input" :aria-label="`学期名称 ${semester}`" v-model="semesterNames[semester]" @change="renameSemester(semester, semesterNames[semester])">
        <div class="semester-block-actions">
          <button class="neo-btn btn-small" @click="addCourse(semester)">+ 课</button>
          <button class="neo-btn neo-btn--danger btn-small" aria-label="删除学期" @click="removeSemester(semester)">删除学期</button>
        </div>
      </div>
      <div class="semester-block-body">
        <div v-for="(course, index) in courses" :key="index" class="course-edit-row">
          <input class="neo-input course-name-input" :aria-label="`课程名称 ${index + 1}`" v-model="course.name" placeholder="课程名称">
          <input class="neo-input course-credit-input" :aria-label="`课程学分 ${index + 1}`" v-model.number="course.credit" placeholder="学分">
          <button class="neo-btn neo-btn--danger btn-small" aria-label="删除课程" @click="removeCourse(semester, index)">✕</button>
        </div>
      </div>
    </div>

    <button class="neo-btn add-semester-btn" @click="addSemester">+ 新建学期</button>

    <details class="text-mode">
      <summary>高级：文本模式编辑</summary>
      <textarea class="neo-input text-mode-area" aria-label="文本模式编辑" v-model="textMode" rows="6"></textarea>
    </details>

    <div class="editor-actions">
      <button class="neo-btn" @click="reset">重置</button>
      <button class="neo-btn neo-btn--primary" @click="save">保存</button>
    </div>
  </div>
</template>

<style scoped>
.editor-title {
  font-weight: var(--weight-heading);
  margin-bottom: 0.8rem;
}

.editor-field {
  margin-bottom: 0.6rem;
}

.semester-block {
  border: 2px solid var(--ink);
  border-radius: 0.5rem;
  overflow: hidden;
  margin-bottom: 0.8rem;
}

.semester-block-header {
  padding: 0.6rem;
  background: var(--surface);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.semester-name-input {
  width: 100px;
  min-height: 36px;
  font-weight: var(--weight-heading);
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}

.semester-block-actions {
  display: flex;
  gap: 0.3rem;
}

.btn-small {
  padding: 0.2rem 0.4rem;
  font-size: var(--text-xs);
  min-height: 36px;
}

.semester-block-body {
  padding: 0.6rem;
}

.course-edit-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.course-name-input {
  flex: 2;
}

.course-credit-input {
  flex: 1;
}

.add-semester-btn {
  width: 100%;
  margin-bottom: 0.8rem;
}

.text-mode {
  font-size: var(--text-sm);
}

.text-mode-area {
  font-family: monospace;
  margin-top: 0.5rem;
}

.editor-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.editor-actions .neo-btn {
  flex: 1;
}
</style>

<script setup>
import { reactive, ref, watch, computed } from 'vue'
import { useProfilesStore } from '../stores/profiles'
import { useAppStore } from '../stores/app'
import { serializeClasses, parseClasses } from '../utils/parsers'
import { sortClasses } from '../utils/semesterSort'

const appStore = useAppStore()
const profilesStore = useProfilesStore()

const currentProfile = computed(() => profilesStore.getProfile(appStore.currentProfileId))
const draft = reactive({ name: '', targetGPA: 2.0, classes: {} })
const semesterNames = reactive({})
const textMode = ref('')

function syncDraft() {
  draft.name = currentProfile.value.name
  draft.targetGPA = currentProfile.value.targetGPA
  draft.classes = sortClasses(JSON.parse(JSON.stringify(currentProfile.value.classes)))
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
    classes: sortClasses(filteredClasses)
  })
  syncDraft()
}
</script>
