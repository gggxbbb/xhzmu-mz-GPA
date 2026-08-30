import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '../../src/stores/app'

function stubMatchMedia(matches) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }))
}

beforeEach(() => {
  setActivePinia(createPinia())
  delete document.documentElement.dataset.theme
})

describe('theme application', () => {
  it('applies the resolved theme to the document root', () => {
    stubMatchMedia(false)
    const store = useAppStore()

    expect(document.documentElement.dataset.theme).toBe('light')

    store.setTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')

    store.setTheme('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('follows the system preference in auto mode', () => {
    stubMatchMedia(true)
    const store = useAppStore()

    expect(store.theme).toBe('auto')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('re-resolves when a persisted theme is loaded after startup', () => {
    stubMatchMedia(false)
    const store = useAppStore()
    expect(document.documentElement.dataset.theme).toBe('light')

    store.load({ theme: 'dark' })
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('updates the theme-color meta to match the effective theme', () => {
    stubMatchMedia(false)
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    meta.setAttribute('content', '#FFF6E5')
    document.head.appendChild(meta)

    const store = useAppStore()
    expect(meta.getAttribute('content')).toBe('#FFF6E5')

    store.setTheme('dark')
    expect(meta.getAttribute('content')).toBe('#1A1A1A')

    meta.remove()
  })
})
