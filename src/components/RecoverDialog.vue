<template>
  <dialog
    ref="dialogRef"
    class="recover-dialog"
    role="dialog"
    aria-modal="true"
    aria-labelledby="recover-title"
    @cancel.prevent="onClose"
    @click="onBackdropClick"
  >
    <article class="card" v-if="open">
      <header>
        <h2 id="recover-title" class="dialog-title">恢复数据</h2>
      </header>

      <div class="dialog-body">
        <p class="dialog-description">
          输入 6 位分享码，即可恢复对应数据。
        </p>

        <input
          ref="codeInput"
          v-model="code"
          type="text"
          class="input"
          maxlength="6"
          placeholder="请输入分享码"
          aria-label="分享码"
          :disabled="loading"
          @keyup.enter="onRecover"
        />

        <div v-if="error" class="error-message" role="alert">
          {{ error }}
        </div>
      </div>

      <footer class="dialog-footer">
        <button class="btn" @click="onClose" :disabled="loading">关闭</button>
        <button
          class="btn btn-primary"
          @click="onRecover"
          :disabled="loading || !isCodeValid"
          :aria-busy="loading"
        >
          <span v-if="loading">恢复中…</span>
          <span v-else>恢复数据</span>
        </button>
      </footer>
    </article>
  </dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { getShareCodePayload } from '../services/supabase/shareCodes.js'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'recovered'])

const dialogRef = ref(null)
const code = ref('')
const loading = ref(false)
const error = ref('')
const codeInput = ref(null)

const isCodeValid = computed(() => code.value.length === 6)

watch(() => props.open, (isOpen) => {
  const dialog = dialogRef.value
  if (!dialog) return

  if (isOpen) {
    code.value = ''
    error.value = ''
    if (!dialog.open) {
      dialog.showModal()
    }
    nextTick(() => codeInput.value?.focus())
  } else {
    if (dialog.open) {
      dialog.close()
    }
  }
})

function onClose() {
  emit('close')
}

function onBackdropClick(event) {
  if (event.target === dialogRef.value) {
    onClose()
  }
}

async function onRecover() {
  if (!isCodeValid.value) return

  error.value = ''
  loading.value = true

  try {
    const payload = await getShareCodePayload(code.value.trim())
    emit('recovered', payload)
  } catch (err) {
    error.value = err?.message || '恢复失败，请检查分享码是否正确'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.recover-dialog {
  border: none;
  background: transparent;
  padding: 0;
  max-width: min(90vw, 420px);
  width: 100%;
  margin: auto;
}

.recover-dialog::backdrop {
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

.error-message {
  margin-top: 0.75rem;
  padding: 0.6rem;
  border-radius: var(--radius, 0.75rem);
  background: var(--danger-bg, #ffebee);
  color: var(--danger, #c62828);
  font-size: 0.85rem;
}
</style>
