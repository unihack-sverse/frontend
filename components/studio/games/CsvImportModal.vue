<template>
  <div v-if="open" class="backdrop" @click.self="closeModal">
    <div ref="modalEl" class="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="csv-modal-title">
      <div class="modal__h">
        <div>
          <h3 id="csv-modal-title">Import CSV</h3>
          <p>Bulk-create item definitions from pasted rows or a file</p>
        </div>
        <button class="modal__x" type="button" aria-label="Close" @click="closeModal">✕</button>
      </div>
      <div class="modal__b">
        <p class="t-small dim" style="margin-bottom:10px">
          Columns: <span class="t-mono">sku,name,description,kind,price_srv,royalty_bps,interop_tier,schema_id,supply_max</span>.
          Header row optional. Each row is created independently.
        </p>
        <div class="field">
          <label>Paste CSV</label>
          <textarea v-model="csvText" style="min-height:150px;font-family:var(--mono);font-size:.78rem" placeholder="sku,name,kind,price_srv,royalty_bps,interop_tier&#10;vr_boost,Boost Pack,bundle,9.99,500,T2" :disabled="csvBusy"></textarea>
        </div>
        <div class="field">
          <label>…or choose a file</label>
          <input type="file" accept=".csv,text/csv" :disabled="csvBusy" @change="onCsvFile">
        </div>

        <div v-if="csvRows.length" class="t-micro dim" style="margin:16px 0 10px">Preview · {{ csvRows.length }} row{{ csvRows.length === 1 ? '' : 's' }}</div>
        <div v-if="csvRows.length" class="rows csvpreview">
          <div v-for="(row, index) in csvPreviewRows" :key="`${row.sku}-${index}`">
            <span class="t-mono">{{ row.sku || '(missing sku)' }}</span>
            <strong>{{ row.name || '—' }} · {{ formatSrv(row.priceUnits, { suffix: true }) }}</strong>
          </div>
        </div>
        <p v-if="csvRows.length > 8" class="t-small dim" style="margin-top:8px">…and {{ csvRows.length - 8 }} more.</p>

        <div v-if="csvParseError" class="note note--bad" style="margin-top:16px">
          <span class="note__i">⚠️</span>
          <div>{{ csvParseError }}</div>
        </div>

        <template v-if="csvResults">
          <p class="sect">Import result</p>
          <div class="csvsum">
            <span class="chip chip--live">{{ csvResults.created }} created</span>
            <span class="chip" :class="csvResults.failed ? 'chip--bad' : ''">{{ csvResults.failed }} failed</span>
          </div>
          <div v-if="csvResults.failures.length" class="rows csvfail">
            <div v-for="failure in csvResults.failures" :key="failure.index">
              <span>Row {{ failure.index + 1 }}</span>
              <strong class="fk">{{ failure.error }}</strong>
            </div>
          </div>
        </template>
      </div>
      <div class="modal__f">
        <button class="btn btn--ghost" type="button" :disabled="csvBusy" @click="closeModal">
          {{ csvResults ? 'Close' : 'Cancel' }}
        </button>
        <button v-if="!csvResults" class="btn btn--grad" type="button" :disabled="csvBusy || !csvRows.length" @click="runCsvImport">
          {{ csvBusy ? 'Importing…' : `Import ${csvRows.length || ''} row${csvRows.length === 1 ? '' : 's'}` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { messageOf, parseCsvRows, type CsvRow } from '~/utils/studioGame'

const props = defineProps<{
  open: boolean
  gameId: string
  tokenizationLevel: string
}>()

const emit = defineEmits<{
  close: []
  imported: []
}>()

const api = useApi()
const toast = useToast()
const { formatSrv } = useStudioFormat()

const modalEl = ref<HTMLElement | null>(null)
const csvText = ref('')
const csvBusy = ref(false)
const csvParseError = ref('')
const csvResults = ref<{ created: number; failed: number; failures: { index: number; error: string }[] } | null>(null)

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    csvText.value = ''
    csvParseError.value = ''
    csvResults.value = null
  }
})

const csvRows = computed<CsvRow[]>(() => parseCsvRows(csvText.value))
const csvPreviewRows = computed<CsvRow[]>(() => csvRows.value.slice(0, 8))

function closeModal() {
  if (csvBusy.value) return
  emit('close')
}

function onCsvFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { csvText.value = String(reader.result ?? '') }
  reader.onerror = () => { csvParseError.value = 'Could not read that file.' }
  reader.readAsText(file)
}

async function runCsvImport() {
  if (csvBusy.value || !csvRows.value.length) return
  csvBusy.value = true
  csvParseError.value = ''
  csvResults.value = null
  const payload = csvRows.value.map((row) => ({
    sku: row.sku,
    name: row.name,
    description: '',
    kind: row.kind || 'cosmetic',
    priceUnits: row.priceUnits,
    schemaId: row.schemaId || null,
    interopTier: row.interopTier || 'T0',
    tokenizationLevel: props.tokenizationLevel,
    slot: null,
    supplyMax: row.supplyMax ? Number(String(row.supplyMax).replace(/[^\d]/g, '')) || null : null,
    traits: {},
    transferable: true,
    stackable: false,
    royaltyBps: Number(String(row.royaltyBps).replace(/[^\d]/g, '') || '0'),
    art: { url: '', emoji: '' },
    status: 'active',
  }))
  try {
    const result = await api.one<{
      created?: number
      failed?: number
      results?: Array<{ index?: number; ok?: boolean; error?: { message?: string; code?: string } }>
    }>(`/api/v1/games/${props.gameId}/items/bulk`, { method: 'POST', body: { items: payload } })
    const failures = (result?.results ?? [])
      .map((entry, index) => ({ index: entry.index ?? index, ok: entry.ok, error: entry.error?.message ?? entry.error?.code ?? 'failed' }))
      .filter((entry) => !entry.ok)
      .map((entry) => ({ index: entry.index, error: entry.error }))
    csvResults.value = { created: result?.created ?? 0, failed: result?.failed ?? failures.length, failures }
    emit('imported')
    toast.push('CSV import finished', `${csvResults.value.created} created, ${csvResults.value.failed} failed.`, csvResults.value.failed ? '⚠️' : '✓')
  } catch (raw: unknown) {
    csvParseError.value = messageOf(raw, 'The bulk import failed. Check the rows and try again.')
  } finally {
    csvBusy.value = false
  }
}

defineExpose({ modalEl, closeModal })
</script>

<style scoped>
.csvpreview { margin-top: 4px; }
.csvsum { display: flex; gap: 8px; margin-bottom: 12px; }
.csvfail .fk { color: var(--red); font-weight: 500; text-align: right; }
</style>
