import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ShareCodeDialog from '../../src/components/ShareCodeDialog.vue'
import { createShareCode } from '../../src/services/supabase/shareCodes.js'

vi.mock('../../src/services/supabase/shareCodes.js', () => ({
  createShareCode: vi.fn()
}))

describe('ShareCodeDialog', () => {
  beforeEach(() => {
    createShareCode.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  function mountDialog(props = {}) {
    return mount(ShareCodeDialog, {
      props: {
        open: false,
        payload: { courses: [] },
        ...props
      },
      attachTo: document.body
    })
  }

  it('calls createShareCode and displays the generated code', async () => {
    createShareCode.mockResolvedValue('A1B2C3')
    const wrapper = mountDialog({ open: true })
    await flushPromises()

    const generateButton = wrapper.find('button.btn-primary')
    expect(generateButton.exists()).toBe(true)

    await generateButton.trigger('click')
    expect(createShareCode).toHaveBeenCalledWith({ courses: [] })

    await flushPromises()
    expect(wrapper.text()).toContain('A1B2C3')
    expect(wrapper.text()).toContain('有效期 7 天')
  })

  it('displays an error message when createShareCode fails', async () => {
    createShareCode.mockRejectedValue(new Error('Network error'))
    const wrapper = mountDialog({ open: true })
    await flushPromises()

    await wrapper.find('button.btn-primary').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Network error')
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
