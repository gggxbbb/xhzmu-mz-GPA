<template>
  <dialog
    ref="dialogRef"
    class="share-code-dialog"
    role="dialog"
    aria-modal="true"
    aria-labelledby="share-code-title"
    @cancel.prevent="onClose"
    @click="onBackdropClick"
  >
    <article class="card" v-if="open">
      <header>
        <h2 id="share-code-title" class="dialog-title">生成分享码</h2>
      </header>

      <div class="dialog-body">
        <p class="dialog-description">
          点击生成按钮，将当前数据转为 6 位分享码。
        </p>

        <div v-if="code" class="code-display" role="status" aria-live="polite">
          <span class="code">{{ code }}</span>
          <span class="code-hint">有效期 7 天</span>
        </div>

        <div v-if="error" class="error-message" role="alert">
          {{ error }}
        </div>
      </div>

      <footer class="dialog-footer">
        <button class="btn" @click="onClose" :disabled="loading">关闭</button>
        <button
          class="btn btn-primary"
          @click="onGenerate"
          :disabled="loading"
          :aria-busy="loading"
        >
          <span v-if="loading">生成中…</span>
          <span v-else>生成分享码</span>
        </button>
      </footer>
    </article>
  </dialog>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { createShareCode } from '../services/supabase/shareCodes.js'
import { useAnalytics } from '../composables/useAnalytics.js'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  payload: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

const { trackShareCodeGenerated } = useAnalytics()

const dialogRef = ref(null)
const code = ref('')
const loading = ref(false)
const error = ref('')

watch(() => props.open, (isOpen) => {
  const dialog = dialogRef.value
  if (!dialog) {
    // On initial render the dialog ref may not be bound yet; defer opening.
    if (isOpen) nextTick(() => dialogRef.value?.showModal())
    return
  }

  if (isOpen) {
    code.value = ''
    error.value = ''
    if (!dialog.open) {
      dialog.showModal()
    }
  } else {
    if (dialog.open) {
      dialog.close()
    }
  }
}, { immediate: true, flush: 'post' })

function onClose() {
  emit('close')
}

function onBackdropClick(event) {
  if (event.target === dialogRef.value) {
    onClose()
  }
}

async function onGenerate() {
  code.value = ''
  error.value = ''
  loading.value = true

  try {
    const result = await createShareCode(props.payload)
    code.value = result
    trackShareCodeGenerated()
  } catch (err) {
    error.value = err?.message || '生成分享码失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.share-code-dialog {
  border: none;
  background: transparent;
  padding: 0;
  max-width: min(90vw, 420px);
  width: 100%;
  margin: auto;
}

.share-code-dialog::backdrop {
  background: rgba(0, 0, 0, 0.45);
}

.dialog-title {
  font-size: 1rem;
  font-weight: bold;
  margin: 0;
}

.dialog-description {
  margin: 0 0 0.75rem 0;
  color: var(--muted, #666666);
  font-size: 0.9rem;
}

.dialog-body {
  margin-top: 0.75rem;
}

.dialog-footer {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.code-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem;
  background: var(--surface, #f5f5f5);
  border: 1px dashed var(--border, #dddddd);
  border-radius: var(--radius, 0.75rem);
  margin-bottom: 0.75rem;
}

.code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 1.75rem;
  font-weight: bold;
  letter-spacing: 0.15em;
  color: var(--text, #1a1a1a);
}

.code-hint {
  font-size: 0.75rem;
  color: var(--muted, #666666);
}

.error-message {
  padding: 0.6rem;
  border-radius: var(--radius, 0.75rem);
  background: var(--danger-bg, #ffebee);
  color: var(--danger, #c62828);
  font-size: 0.85rem;
}
</style>
