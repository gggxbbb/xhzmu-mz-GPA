import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import TargetAnalysisCard from '../../src/components/TargetAnalysisCard.vue'
import DangerZone from '../../src/components/DangerZone.vue'
import FailingWarningCard from '../../src/components/FailingWarningCard.vue'
import IllegalWarning from '../../src/components/IllegalWarning.vue'

const srcDir = join(process.cwd(), 'src')

function stubMatchMedia() {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }))
}

function vueFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return vueFiles(path)
    return entry.name.endsWith('.vue') ? [path] : []
  })
}

describe('neo signature classes (ticket 02)', () => {
  const styles = readFileSync(join(srcDir, 'assets/styles.css'), 'utf8')

  it('defines the neo signature classes exactly once each', () => {
    for (const cls of ['.neo-card', '.neo-btn', '.neo-input',
      '.neo-card--danger', '.neo-card--accent', '.neo-btn--primary', '.neo-btn--danger']) {
      const occurrences = styles.split(cls + ' ').length - 1
        + styles.split(cls + '{').length - 1
        + styles.split(cls + ',').length - 1
      expect(styles).toContain(cls)
      expect(occurrences).toBeGreaterThan(0)
    }
  })

  it('encapsulates the neubrutalist signature: 3px ink border + hard shadow + press feedback', () => {
    expect(styles).toContain('3px solid var(--ink)')
    expect(styles).toContain('box-shadow: var(--shadow-hard)')
    expect(styles).toMatch(/:active\s*\{[^}]*translate\(2px,\s*2px\)[^}]*var\(--shadow-press\)/s)
  })

  it('drops the legacy ticket-01 token aliases', () => {
    for (const alias of ['--text:', '--muted:', '--border:', '--brand:', '--brand-dark:', '--warning:', '--success:']) {
      expect(styles).not.toContain(alias)
    }
    // --ink-soft 取代 --muted 语义
    expect(styles).toContain('--ink-soft')
  })
})

describe('warning cards use neo modifier classes', () => {
  it('TargetAnalysisCard uses .neo-card--accent without inline styles', () => {
    const wrapper = mount(TargetAnalysisCard, {
      props: { currentGpa: 3.5, requiredAverage: 80, predicted: () => 3.6 }
    })
    expect(wrapper.find('.neo-card.neo-card--accent').exists()).toBe(true)
    expect(wrapper.html()).not.toContain('style=')
    expect(wrapper.html()).not.toContain('#e8f5e9')
    expect(wrapper.html()).not.toContain('color: #333')
  })

  it('DangerZone uses .neo-card--danger without inline styles', () => {
    stubMatchMedia()
    const wrapper = mount(DangerZone, { global: { plugins: [createPinia()] } })
    expect(wrapper.find('.neo-card.neo-card--danger').exists()).toBe(true)
    expect(wrapper.html()).not.toContain('style=')
    expect(wrapper.html()).not.toContain('#fff3f3')
    expect(wrapper.html()).not.toContain('color: #c33')
  })

  it('FailingWarningCard uses .neo-card--danger without inline styles', () => {
    const wrapper = mount(FailingWarningCard, {
      props: { courses: [{ name: '高等数学', credit: 4, score: 45 }] }
    })
    expect(wrapper.find('.neo-card.neo-card--danger').exists()).toBe(true)
    expect(wrapper.html()).not.toContain('style=')
    expect(wrapper.html()).not.toContain('#fff3f3')
  })

  it('IllegalWarning uses .neo-card--danger without inline styles', () => {
    const wrapper = mount(IllegalWarning, { props: { courses: ['高等数学'] } })
    expect(wrapper.find('.neo-card.neo-card--danger').exists()).toBe(true)
    expect(wrapper.html()).not.toContain('style=')
    expect(wrapper.html()).not.toContain('#fff3f3')
  })
})

describe('component templates carry no inline styles', () => {
  const files = vueFiles(join(srcDir, 'components')).concat(vueFiles(join(srcDir, 'views')))

  it('found the component sources', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  for (const file of files) {
    it(`${file.split(/[\\/]/).pop()} has no style= / :style= attributes`, () => {
      const source = readFileSync(file, 'utf8')
      const template = source.match(/<template>([\s\S]*?)<\/template>/)?.[1] ?? ''
      expect(template).not.toMatch(/\sstyle="/)
      expect(template).not.toMatch(/:style="/)
    })
  }
})
