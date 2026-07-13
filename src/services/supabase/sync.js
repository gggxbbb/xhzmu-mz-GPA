import { supabase } from './client.js'
import { getCurrentUserId } from './auth.js'
import { extractGrade, toTimestamp } from '../../engine/stateMerge.js'

function toProfileRow(userId, profile) {
  return {
    user_id: userId,
    local_id: profile.id,
    name: profile.name,
    target_gpa: profile.targetGPA,
    classes: profile.classes ?? {},
    updated_at:
      profile.updatedAt != null
        ? new Date(profile.updatedAt).toISOString()
        : new Date().toISOString()
  }
}

function fromProfileRow(row) {
  return {
    id: row.local_id,
    name: row.name,
    targetGPA: row.target_gpa,
    classes: row.classes ?? {},
    updatedAt: toTimestamp(row.updated_at)
  }
}

function toGradeRows(userId, gradesByProfile) {
  const rows = []
  for (const [profileLocalId, courses] of Object.entries(gradesByProfile)) {
    for (const [courseName, value] of Object.entries(courses)) {
      const grade = extractGrade(value)
      if (!grade) continue
      rows.push({
        user_id: userId,
        profile_local_id: profileLocalId,
        course_name: courseName,
        score: grade.score,
        updated_at:
          grade.updatedAt != null
            ? new Date(grade.updatedAt).toISOString()
            : new Date().toISOString()
      })
    }
  }
  return rows
}

function fromGradeRows(rows) {
  const grades = {}
  for (const row of rows) {
    if (!grades[row.profile_local_id]) {
      grades[row.profile_local_id] = {}
    }
    grades[row.profile_local_id][row.course_name] = {
      score: row.score,
      updatedAt: toTimestamp(row.updated_at)
    }
  }
  return grades
}

export async function pushState({ profiles = [], grades = {} } = {}) {
  if (!supabase) {
    return { error: new Error('Supabase client is not initialized') }
  }

  const userId = getCurrentUserId()
  if (!userId) {
    return { error: new Error('User not authenticated') }
  }

  const profileRows = profiles.map((profile) => toProfileRow(userId, profile))
  if (profileRows.length > 0) {
    const { error } = await supabase
      .from('profiles')
      .upsert(profileRows, { onConflict: 'user_id,local_id' })

    if (error) {
      return { error }
    }
  }

  const gradeRows = toGradeRows(userId, grades)
  if (gradeRows.length > 0) {
    const { error } = await supabase
      .from('grades')
      .upsert(gradeRows, { onConflict: 'user_id,profile_local_id,course_name' })

    if (error) {
      return { error }
    }
  }

  return { error: null }
}

export async function pullState() {
  if (!supabase) {
    return {
      profiles: [],
      grades: {},
      error: new Error('Supabase client is not initialized')
    }
  }

  const userId = getCurrentUserId()
  if (!userId) {
    return {
      profiles: [],
      grades: {},
      error: new Error('User not authenticated')
    }
  }

  const { data: profileRows, error: profilesError } = await supabase
    .from('profiles')
    .select('local_id, name, target_gpa, classes, updated_at')
    .eq('user_id', userId)

  if (profilesError) {
    return { profiles: [], grades: {}, error: profilesError }
  }

  const { data: gradeRows, error: gradesError } = await supabase
    .from('grades')
    .select('profile_local_id, course_name, score, updated_at')
    .eq('user_id', userId)

  if (gradesError) {
    return { profiles: [], grades: {}, error: gradesError }
  }

  return {
    profiles: (profileRows ?? []).map(fromProfileRow),
    grades: fromGradeRows(gradeRows ?? []),
    error: null
  }
}
