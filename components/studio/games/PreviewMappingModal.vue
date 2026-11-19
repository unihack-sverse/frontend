<template>
  <div v-if="entry" class="backdrop" @click.self="closeModal">
    <div ref="modalEl" class="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="preview-modal-title">
      <div class="modal__h">
        <div>
          <h3 id="preview-modal-title">Preview mapping</h3>
          <p>Test a sample item against your envelope before saving</p>
        </div>
        <button class="modal__x" type="button" aria-label="Close" @click="closeModal">✕</button>
      </div>
      <div class="modal__b">
        <div class="env">
          <div class="env__b">
            <h5>Incoming · source game</h5>
            <div v-for="row in previewIncoming" :key="row.key"><span>{{ row.key }}</span><strong>{{ row.value }}</strong></div>
          </div>
          <div class="env__a" aria-hidden="true">→</div>
          <div class="env__b out">
            <h5>Your band</h5>
            <div v-for="row in previewMapped" :key="row.key"><span>{{ row.key }}</span><strong>{{ row.value }}</strong></div>
          </div>
        </div>
        <div class="note" style="margin-top:18px">
          <span class="note__i">✓</span>
          <div>Maps inside your {{ previewEntryPowerLabel }} band. The item keeps its identity and its
            deeds, and your curve stays intact.</div>
        </div>
        <div class="note note--bad" style="margin-top:12px">
          <span class="note__i">✕</span>
          <div><b>Example rejection:</b> a value with no mapping inside your
            {{ previewEntryPowerLabel }} range fails with
            <span class="t-mono">422 normalization_out_of_band</span>. The player is told exactly which
            check failed and is charged nothing.</div>
        </div>
      </div>
      <div class="modal__f">
        <button class="btn btn--ghost" type="button" @click="closeModal">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { powerRangeLabel, type EnvelopeAcceptEntry } from '~/utils/studioGame'

interface SchemaField {
  name: string
  type: string
  max?: number
}

const props = defineProps<{
  entry: EnvelopeAcceptEntry | null
  activeSchemas: Array<{ schemaId: string; fields?: SchemaField[] }>
}>()

const emit = defineEmits<{
  close: []
}>()

const modalEl = ref<HTMLElement | null>(null)
const previewEntryPowerLabel = computed(() => powerRangeLabel(props.entry))

function closeModal() {
  emit('close')
}

const previewIncoming = computed<{ key: string; value: string }[]>(() => {
  const entry = props.entry
  if (!entry) return []
  const fields = props.activeSchemas.find((schema) => schema.schemaId === entry.schemaId)?.fields ?? []
  const rows = fields.slice(0, 3).map((field, index) => ({
    key: field.name,
    value: field.type === 'int' ? String((field.max ?? 5) + index) : 'legendary',
  }))
  if (!rows.length) {
    return [
      { key: 'power_tier', value: '5' },
      { key: 'rarity', value: 'legendary' },
      { key: 'raw damage', value: '910' },
    ]
  }
  return rows
})

const previewMapped = computed<{ key: string; value: string }[]>(() => {
  const entry = props.entry
  if (!entry) return []
  const range = (entry.powerTierRange ?? [1, 5]) as number[]
  const ceiling = range[1] ?? 5
  const incoming = previewIncoming.value
  return incoming.map((row, index) => {
    if (index === 0) return { key: row.key, value: String(ceiling) }
    if (index === 1) return { key: 'rarity', value: row.value }
    return { key: 'damage', value: String(ceiling * 16 || 80) }
  })
})

defineExpose({ modalEl, closeModal })
</script>
