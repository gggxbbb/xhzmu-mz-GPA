import { describe, it, expect } from 'vitest'
import { parseClasses, serializeClasses, DEFAULT_CLASSES } from '../src/utils/parsers'

describe('parseClasses', () => {
  it('parses semester and courses', () => {
    const input = `大二上\n病理学 5\n医学微生物学与免疫学 6`
    const result = parseClasses(input)
    expect(result).toEqual({
      "大二上": [
        { name: "病理学", credit: 5 },
        { name: "医学微生物学与免疫学", credit: 6 }
      ]
    })
  })

  it('returns empty object for empty input', () => {
    expect(parseClasses('')).toEqual({})
    expect(parseClasses(null)).toEqual({})
  })

  it('skips course lines before a semester header', () => {
    const input = `病理学 5\n大二上\n医学微生物学与免疫学 6`
    const result = parseClasses(input)
    expect(result).toEqual({
      "大二上": [
        { name: "医学微生物学与免疫学", credit: 6 }
      ]
    })
  })
})

describe('serializeClasses', () => {
  it('serializes classes to text', () => {
    const text = serializeClasses(DEFAULT_CLASSES)
    expect(text).toContain('大二上')
    expect(text).toContain('病理学 5')
  })
})

describe('parse/serialize round-trip', () => {
  it('parses serialized text back to the same classes', () => {
    const text = serializeClasses(DEFAULT_CLASSES)
    expect(parseClasses(text)).toEqual(DEFAULT_CLASSES)
  })
})
