const STANDARD_SEMESTERS = [
  '大一上',
  '大一下',
  '大二上',
  '大二下',
  '大三上',
  '大三下',
  '大四上',
  '大四下',
  '大五上',
  '大五下'
]

const SEMESTER_INDEX_MAP = new Map(
  STANDARD_SEMESTERS.map((semester, index) => [semester, index])
)

/**
 * Sorts a classes object so standard semesters appear in canonical order,
 * followed by non-standard semesters in their original insertion order.
 *
 * @param {Object} classes - Object mapping semester names to course arrays.
 * @returns {Object} A new sorted object; returns {} for invalid input.
 */
export function sortClasses(classes) {
  if (classes === null || classes === undefined || typeof classes !== 'object' || Array.isArray(classes)) {
    return {}
  }

  const entries = Object.entries(classes).map((entry, originalIndex) => ({
    entry,
    originalIndex
  }))

  entries.sort((a, b) => {
    const indexA = SEMESTER_INDEX_MAP.get(a.entry[0])
    const indexB = SEMESTER_INDEX_MAP.get(b.entry[0])

    const aIsStandard = indexA !== undefined
    const bIsStandard = indexB !== undefined

    if (aIsStandard && bIsStandard) {
      return indexA - indexB
    }
    if (aIsStandard && !bIsStandard) {
      return -1
    }
    if (!aIsStandard && bIsStandard) {
      return 1
    }
    return a.originalIndex - b.originalIndex
  })

  return Object.fromEntries(entries.map(({ entry }) => entry))
}
