import { ref, onMounted, onBeforeUnmount } from 'vue'

// Chart.js 在 canvas 上渲染,无法直接使用 var();
// 运行时从 :root 解析 token,并通过 MutationObserver 监听
// data-theme 翻转(stores/app.js 的 applyTheme 写入)触发重算。
export function useThemeTokens() {
  const themeTick = ref(0)
  let themeObserver

  onMounted(() => {
    themeObserver = new MutationObserver(() => {
      themeTick.value++
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })
  })
  onBeforeUnmount(() => themeObserver?.disconnect())

  function token(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  }

  return { themeTick, token }
}
