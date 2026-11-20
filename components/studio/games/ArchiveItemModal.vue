<template>
  <div v-if="target" class="backdrop" @click.self="closeModal">
    <div ref="modalEl" class="modal" role="dialog" aria-modal="true" aria-labelledby="archive-modal-title">
      <div class="modal__h">
        <div>
          <h3 id="archive-modal-title">Archive {{ target.name }}?</h3>
          <p>{{ target.sku }}</p>
        </div>
        <button class="modal__x" type="button" aria-label="Close" @click="closeModal">✕</button>
      </div>
      <div class="modal__b">
        <div class="note note--warn">
          <span class="note__i">📦</span>
          <div><b>Existing owners keep their items.</b> Archiving stops all new sales of this
            definition immediately, but every item already minted stays exactly as it is — owned,
            tradeable, and untouched.</div>
        </div>
        <div v-if="archiveError" class="note note--bad" style="margin-top:14px">
          <span class="note__i">⚠️</span>
          <div>{{ archiveError }}</div>
        </div>
      </div>
      <div class="modal__f">
        <button class="btn btn--ghost" type="button" :disabled="archivePending" @click="closeModal">Cancel</button>
        <button class="btn btn--ghost btn--danger" type="button" :disabled="archivePending" @click="confirmArchive">
          {{ archivePending ? 'Archiving…' : 'Archive item' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { messageOf } from '~/utils/studioGame'

const props = defineProps<{
  target: { id: string; name: string; sku: string } | null
}>()

const emit = defineEmits<{
  close: []
  archived: []
}>()

const api = useApi()
const toast = useToast()

const modalEl = ref<HTMLElement | null>(null)
const archivePending = ref(false)
const archiveError = ref('')

watch(() => props.target, (next) => {
  if (next) {
    modalEl.value = null
    archiveError.value = ''
  }
})

function closeModal() {
  if (archivePending.value) return
  emit('close')
}

async function confirmArchive() {
  const item = props.target
  if (!item || archivePending.value) return
  archivePending.value = true
  archiveError.value = ''
  try {
    await api.one(`/api/v1/items/${item.id}/archive`, { method: 'POST' })
    emit('archived')
    toast.push('Item archived', `${item.name} stops selling; owners keep what they have.`, '📦')
  } catch (raw: unknown) {
    archiveError.value = messageOf(raw, 'Could not archive that item.')
  } finally {
    archivePending.value = false
  }
}

defineExpose({ modalEl, closeModal })
</script>
