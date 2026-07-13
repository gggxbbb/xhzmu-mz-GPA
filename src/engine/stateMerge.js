export function toTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

export function extractGrade(value) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value) && typeof value.score === 'number') {
    return { score: value.score, updatedAt: value.updatedAt }
  }
  if (typeof value === 'number') {
    return { score: value, updatedAt: Date.now() }
  }
  return null
}

export function mergeProfiles(localProfiles, remoteProfiles, { syncMode = false } = {}) {
  const localMap = new Map(localProfiles.map((p) => [p.id, p]))
  const remoteMap = new Map(remoteProfiles.map((p) => [p.id, p]))
  const mergedIds = new Set([...localMap.keys(), ...remoteMap.keys()])
  const merged = []

  for (const id of mergedIds) {
    const local = localMap.get(id)
    const remote = remoteMap.get(id)

    if (!local) {
      // In sync mode we do not re-add profiles that were deleted locally.
      if (!syncMode && remote) {
        merged.push(remote)
      }
      continue
    }

    if (!remote) {
      merged.push(local)
      continue
    }

    if (toTimestamp(remote.updatedAt) >= toTimestamp(local.updatedAt)) {
      merged.push(remote)
    } else {
      merged.push(local)
    }
  }

  return merged
}

export function mergeGrades(localGrades, remoteGrades, mergedProfiles, { syncMode = false } = {}) {
  const merged = {}

  for (const profile of mergedProfiles) {
    const localCourses = localGrades[profile.id] ?? {}
    const remoteCourses = remoteGrades[profile.id] ?? {}
    const courseNames = new Set([
      ...Object.keys(localCourses),
      ...Object.keys(remoteCourses)
    ])
    const mergedCourses = {}

    for (const courseName of courseNames) {
      const localGrade = extractGrade(localCourses[courseName])
      const remoteGrade = extractGrade(remoteCourses[courseName])

      if (!localGrade) {
        // In sync mode we do not re-add grades that were deleted locally.
        if (!syncMode && remoteGrade) {
          mergedCourses[courseName] = remoteGrade
        }
        continue
      }

      if (!remoteGrade) {
        mergedCourses[courseName] = localGrade
        continue
      }

      const localTs = toTimestamp(localGrade.updatedAt)
      const remoteTs = toTimestamp(remoteGrade.updatedAt)

      if (remoteTs >= localTs) {
        mergedCourses[courseName] = remoteGrade
      } else {
        mergedCourses[courseName] = localGrade
      }
    }

    merged[profile.id] = mergedCourses
  }

  return merged
}
