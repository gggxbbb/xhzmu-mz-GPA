const store = new Map()

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key) => {
      const value = store.get(key)
      return value === undefined ? null : value
    },
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  },
  writable: true,
  configurable: true
})
