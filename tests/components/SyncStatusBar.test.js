import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SyncStatusBar from '../../src/components/SyncStatusBar.vue'

describe('SyncStatusBar', () => {
  it('renders idle label by default', () => {
    const wrapper = mount(SyncStatusBar)
    expect(wrapper.text()).toContain('已同步')
  })

  it('renders offline label when status is offline', () => {
    const wrapper = mount(SyncStatusBar, {
      props: { status: 'offline' }
    })
    expect(wrapper.text()).toContain('离线模式')
  })

  it('renders syncing label when status is syncing', () => {
    const wrapper = mount(SyncStatusBar, {
      props: { status: 'syncing' }
    })
    expect(wrapper.text()).toContain('同步中…')
  })

  it('renders error label when status is error', () => {
    const wrapper = mount(SyncStatusBar, {
      props: { status: 'error' }
    })
    expect(wrapper.text()).toContain('同步失败')
  })

  it('updates label reactively when status prop changes', async () => {
    const wrapper = mount(SyncStatusBar, {
      props: { status: 'idle' }
    })
    expect(wrapper.text()).toContain('已同步')

    await wrapper.setProps({ status: 'error' })
    expect(wrapper.text()).toContain('同步失败')

    await wrapper.setProps({ status: 'syncing' })
    expect(wrapper.text()).toContain('同步中…')
  })
})
