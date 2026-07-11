import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import RecoverDialog from '../../src/components/RecoverDialog.vue'
import { getShareCodePayload } from '../../src/services/supabase/shareCodes.js'

vi.mock('../../src/services/supabase/shareCodes.js', () => ({
  getShareCodePayload: vi.fn()
}))

describe('RecoverDialog', () => {
  beforeEach(() => {
    getShareCodePayload.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  function mountDialog(props = {}) {
    return mount(RecoverDialog, {
      props: {
        open: false,
        ...props
      },
      attachTo: document.body
    })
  }

  it('calls getShareCodePayload and emits recovered when code is submitted', async () => {
    const payload = { courses: [{ name: 'Math' }] }
    getShareCodePayload.mockResolvedValue(payload)
    const wrapper = mountDialog({ open: true })
    await flushPromises()

    const input = wrapper.find('input')
    await input.setValue('A1B2C3')

    const recoverButton = wrapper.find('button.btn-primary')
    expect(recoverButton.attributes('disabled')).toBeUndefined()

    await recoverButton.trigger('click')
    expect(getShareCodePayload).toHaveBeenCalledWith('A1B2C3')

    await flushPromises()
    expect(wrapper.emitted('recovered')).toBeTruthy()
    expect(wrapper.emitted('recovered')[0]).toEqual([payload])
  })

  it('disables recover button when code is shorter than 6 characters', async () => {
    const wrapper = mountDialog({ open: true })
    await flushPromises()

    const input = wrapper.find('input')
    await input.setValue('A1B2')

    const recoverButton = wrapper.find('button.btn-primary')
    expect(recoverButton.attributes('disabled')).toBeDefined()
  })

  it('displays an error message when getShareCodePayload fails', async () => {
    getShareCodePayload.mockRejectedValue(new Error('Invalid code'))
    const wrapper = mountDialog({ open: true })
    await flushPromises()

    const input = wrapper.find('input')
    await input.setValue('A1B2C3')

    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Invalid code')
  })

  it('emits close when the close button is clicked', async () => {
    const wrapper = mountDialog({ open: true })
    await flushPromises()

    await wrapper.find('button:not(.btn-primary)').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits close when the dialog cancel event fires', async () => {
    const wrapper = mountDialog({ open: true })
    await flushPromises()

    const dialog = wrapper.find('dialog').element
    dialog.dispatchEvent(new Event('cancel', { bubbles: false }))
    await flushPromises()

    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
