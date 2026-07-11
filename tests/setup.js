const store = new Map()

// jsdom does not implement HTMLDialogElement methods; polyfill them so dialog
// components can be tested with showModal/close.
if (globalThis.HTMLDialogElement) {
  if (typeof globalThis.HTMLDialogElement.prototype.showModal !== 'function') {
    globalThis.HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '')
    }
  }
  if (typeof globalThis.HTMLDialogElement.prototype.close !== 'function') {
    globalThis.HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open')
    }
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key) => {
      const value = store.get(key)
      return value === undefined ? null : value
    },
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    get length() {
      return store.size
    }
  },
  writable: true,
  configurable: true
})
