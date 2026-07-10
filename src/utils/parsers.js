export function parseClasses(text) {
  if (!text || typeof text !== 'string') return {}
  const lines = text.split('\n')
  const classes = {}
  let currentSemester = ''
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (!line.includes(' ')) {
      currentSemester = line
      classes[currentSemester] = []
    } else {
      const parts = line.split(' ')
      const credit = parseFloat(parts[parts.length - 1])
      const name = parts.slice(0, parts.length - 1).join(' ')
      if (!isNaN(credit) && name && currentSemester) {
        classes[currentSemester].push({ name, credit })
      }
    }
  }
  return classes
}

export function serializeClasses(classes) {
  if (!classes) return ''
  const lines = []
  for (const semester of Object.keys(classes)) {
    lines.push(semester)
    for (const course of classes[semester]) {
      lines.push(`${course.name} ${course.credit}`)
    }
  }
  return lines.join('\n')
}

export const DEFAULT_CLASSES = {
  "大一下": [
    { name: "人体系统解剖学", credit: 6.5 },
    { name: "生物化学与分子生物学", credit: 7.0 }
  ],
  "大二上": [
    { name: "病理学", credit: 5.0 },
    { name: "医学微生物学与免疫学", credit: 6.0 },
    { name: "麻醉生理学", credit: 6.0 }
  ],
  "大二下": [
    { name: "病理生理学", credit: 3.0 },
    { name: "麻醉解剖学", credit: 5.5 },
    { name: "诊断学1", credit: 2.5 }
  ],
  "大三上": [
    { name: "麻醉药理学", credit: 5.0 },
    { name: "诊断学2", credit: 4.5 },
    { name: "外科学1", credit: 3.5 }
  ],
  "大三下": [
    { name: "麻醉设备学", credit: 3.5 },
    { name: "麻醉机能实验学", credit: 7.0 },
    { name: "内科学1", credit: 5.5 },
    { name: "外科学2", credit: 5.5 }
  ],
  "大四上": [
    { name: "危重病医学", credit: 5.5 },
    { name: "内科学2", credit: 5.0 },
    { name: "外科学3", credit: 2.0 },
    { name: "妇产科学", credit: 3.5 },
    { name: "儿科学", credit: 5.0 }
  ],
  "大四下": [
    { name: "临床麻醉学", credit: 6.0 },
    { name: "疼痛诊疗学", credit: 2.0 },
    { name: "神经病学", credit: 1.5 }
  ]
}

export const DEFAULT_PROFILE_NAME = "徐医本麻"
export const DEFAULT_TARGET_GPA = 2.0
