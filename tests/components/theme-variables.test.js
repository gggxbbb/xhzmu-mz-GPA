import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import TargetAnalysisCard from '../../src/components/TargetAnalysisCard.vue'
import DangerZone from '../../src/components/DangerZone.vue'
import FailingWarningCard from '../../src/components/FailingWarningCard.vue'
import IllegalWarning from '../../src/components/IllegalWarning.vue'

function stubMatchMedia() {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }))
}

function cardStyle(wrapper) {
  return wrapper.find('.card').attributes('style') || ''
}

describe('theme-aware card colors', () => {
  it('TargetAnalysisCard uses accent theme variables instead of hardcoded light colors', () => {
    const wrapper = mount(TargetAnalysisCard, {
      props: { currentGpa: 3.5, requiredAverage: 80, predicted: () => 3.6 }
    })
    const style = cardStyle(wrapper)
    expect(style).toContain('var(--accent-soft)')
    expect(style).toContain('var(--accent-border)')
    expect(wrapper.html()).not.toContain('#e8f5e9')
    expect(wrapper.html()).not.toContain('color: #333')
  })

  it('DangerZone uses danger theme variables instead of hardcoded light colors', () => {
    stubMatchMedia()
    const wrapper = mount(DangerZone, { global: { plugins: [createPinia()] } })
    expect(cardStyle(wrapper)).toContain('var(--danger-soft)')
    expect(cardStyle(wrapper)).toContain('var(--danger-border)')
    expect(wrapper.html()).not.toContain('#fff3f3')
    expect(wrapper.html()).not.toContain('color: #c33')
  })

  it('FailingWarningCard uses danger theme variables instead of hardcoded light colors', () => {
    const wrapper = mount(FailingWarningCard, {
      props: { courses: [{ name: '高等数学', credit: 4, score: 45 }] }
    })
    expect(cardStyle(wrapper)).toContain('var(--danger-soft)')
    expect(cardStyle(wrapper)).toContain('var(--danger-strong)')
    expect(wrapper.html()).not.toContain('#fff3f3')
  })

  it('IllegalWarning uses danger theme variables instead of hardcoded light colors', () => {
    const wrapper = mount(IllegalWarning, { props: { courses: ['高等数学'] } })
    expect(cardStyle(wrapper)).toContain('var(--danger-soft)')
    expect(cardStyle(wrapper)).toContain('var(--danger-strong)')
    expect(wrapper.html()).not.toContain('#fff3f3')
  })
})
