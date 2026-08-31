import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TargetAnalysisCard from '../src/components/TargetAnalysisCard.vue'

describe('TargetAnalysisCard', () => {
  it('renders without crashing when currentGpa is undefined', () => {
    const wrapper = mount(TargetAnalysisCard, {
      props: { currentGpa: undefined, requiredAverage: undefined, predicted: undefined }
    })
    expect(wrapper.text()).toContain('0.00')
  })

  it('renders requiredAverage fallback when it is not finite', () => {
    const wrapper = mount(TargetAnalysisCard, {
      props: { currentGpa: 3.5, requiredAverage: NaN, predicted: () => 3.6 }
    })
    expect(wrapper.text()).toContain('-')
  })

  it('renders predicted values using the provided predictor', () => {
    const wrapper = mount(TargetAnalysisCard, {
      props: { currentGpa: 3.5, requiredAverage: 80, predicted: score => 3.5 + score / 1000 }
    })
    expect(wrapper.text()).toContain('3.59')
  })
  it('shows the unreachable message when requiredAverage is null with credits remaining', () => {
    const wrapper = mount(TargetAnalysisCard, {
      props: { currentGpa: 1.0, requiredAverage: null, remainingCredits: 20, predicted: () => 3.6 }
    })
    expect(wrapper.text()).toContain('目标不可达')
  })

  it('shows all-entered message when requiredAverage is null with no credits remaining', () => {
    const wrapper = mount(TargetAnalysisCard, {
      props: { currentGpa: 3.5, requiredAverage: null, remainingCredits: 0, predicted: () => 3.6 }
    })
    expect(wrapper.text()).toContain('所有课程已录入')
  })
})
