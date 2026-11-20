<template>
  <section v-show="visible" class="pane on">
    <div class="note" style="margin-bottom:22px">
      <span class="note__i">⚖️</span>
      <div><b>This is where you keep control of your own balance.</b> You never import raw stats from
        another game — you declare which schemas you accept and the band you map them into. A mapping
        that would land outside your band <b>fails the import</b>; it is never clamped silently.</div>
    </div>

    <div class="card card--pad">
      <div class="shead" style="margin-bottom:6px">
        <div>
          <p class="t-h3">Accepted schemas</p>
          <p class="t-small dim">Items matching these can be imported into {{ gameTitle }}</p>
        </div>
        <button class="btn btn--ghost btn--sm" type="button" @click="emit('openAccept')">＋ Accept a schema</button>
      </div>

      <div v-if="envelopeForm.accepts.length" class="envlist">
        <div class="envrow envorow">
          <span class="t-micro dim">Schema</span>
          <span class="t-micro dim">Max tier</span>
          <span class="t-micro dim">Power range</span>
          <span class="t-micro dim">Mapping</span>
          <span></span>
        </div>
        <div v-for="(entry, index) in envelopeForm.accepts" :key="entry.schemaId + index" class="envrow">
          <span class="t-mono scel">{{ entry.schemaId }}</span>
          <AppSelect
            v-model="entry.tierMax"
            :options="tiers.map((tier) => ({ value: tier, label: tier }))"
            :disabled="savingEnvelope"
            aria-label="Tier max"
            size="sm"
          />
          <span class="t-mono dim">{{ powerRangeLabel(entry) }}</span>
          <span class="t-small dim">
            <template v-for="(line, lineIndex) in mappingSummary(entry)" :key="lineIndex">
              <br v-if="lineIndex > 0">{{ line }}
            </template>
          </span>
          <div class="rowacts">
            <button class="btn btn--ghost btn--sm" type="button" @click="emit('openPreview', entry)">Preview</button>
            <button class="btn btn--ghost btn--sm btn--danger" type="button" aria-label="Remove accepted schema" @click="emit('removeAccept', index)">✕</button>
          </div>
        </div>
      </div>
      <p v-else class="t-small dim" style="margin-top:16px">
        No schemas accepted yet. Your game imports nothing until you accept at least one.
      </p>
    </div>

    <div class="grid g2" style="margin-top:18px">
      <div class="card card--pad">
        <p class="sect" style="margin-top:0">Clamp policy</p>
        <div class="picks">
          <label class="pick" :class="{ on: envelopeForm.clampPolicy === 'reject' }">
            <span class="pick__r"></span>
            <input type="radio" class="pick__cb" value="reject" :checked="envelopeForm.clampPolicy === 'reject'" :disabled="savingEnvelope" @change="envelopeForm.clampPolicy = 'reject'">
            <span>
              <span class="pick__t">Reject out-of-band <span class="chip chip--t2">RECOMMENDED</span></span>
              <span class="pick__d">An import that would exceed your band fails outright. The player is
                told why. Nothing enters your economy unexamined.</span>
            </span>
          </label>
          <label class="pick" :class="{ on: envelopeForm.clampPolicy === 'clamp' }">
            <span class="pick__r"></span>
            <input type="radio" class="pick__cb" value="clamp" :checked="envelopeForm.clampPolicy === 'clamp'" :disabled="savingEnvelope" @change="envelopeForm.clampPolicy = 'clamp'">
            <span>
              <span class="pick__t">Clamp to band</span>
              <span class="pick__d">Silently pins the value to your ceiling. Convenient, but a balance
                disaster becomes invisible.</span>
            </span>
          </label>
        </div>
      </div>

      <div class="card card--pad">
        <p class="sect" style="margin-top:0">Import fee</p>
        <div class="f2">
          <div class="field" :class="{ bad: fieldError('feeUnits') }">
            <label>Fee (SRV)</label>
            <input v-model="envelopeForm.feeSrv" type="text" inputmode="decimal" placeholder="0.00" :disabled="savingEnvelope" @input="emit('clearField', 'feeUnits')">
            <p v-if="fieldError('feeUnits')" class="field__err">{{ fieldError('feeUnits') }}</p>
          </div>
          <div class="field" :class="{ bad: fieldError('hostSharePct') }">
            <label>Your share</label>
            <input v-model="envelopeForm.hostSharePct" type="text" inputmode="numeric" placeholder="50" :disabled="savingEnvelope" @input="emit('clearField', 'hostSharePct')">
            <p v-if="fieldError('hostSharePct')" class="field__err">{{ fieldError('hostSharePct') }}</p>
          </div>
        </div>
        <p class="t-small dim">The player pays; you keep your share, the protocol takes the rest.
          Accepting imports is revenue-positive — that is deliberate, so hosting other studios' items
          is worth doing.</p>

        <p class="sect">License requirement</p>
        <AppSelect
          v-model="envelopeForm.licenseRequirement"
          :options="[{ value: 'display_only', label: 'Display only' }, { value: 'derivative', label: 'Derivative allowed' }, { value: 'commercial', label: 'Commercial' }]"
          :disabled="savingEnvelope"
          aria-label="License requirement"
          block
        />
        <p class="t-small dim" style="margin-top:8px">Checked programmatically before anything renders.
          Rendering another studio's art without this is a copyright act.</p>
      </div>
    </div>

    <div v-if="envelopeError" class="note note--bad" style="margin-top:16px">
      <span class="note__i">⚠️</span>
      <div>{{ envelopeError }}</div>
    </div>

    <div class="envfoot">
      <button class="btn btn--grad" type="button" :disabled="savingEnvelope" @click="emit('save')">
        {{ savingEnvelope ? 'Saving…' : 'Save envelope' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { mappingSummary, powerRangeLabel, type EnvelopeAcceptEntry } from '~/utils/studioGame'

defineProps<{
  visible: boolean
  gameTitle: string
  envelopeForm: {
    acceptsTierMax: string
    accepts: EnvelopeAcceptEntry[]
    licenseRequirement: string
    feeSrv: string
    hostSharePct: string
    clampPolicy: 'reject' | 'clamp'
  }
  tiers: string[]
  savingEnvelope: boolean
  envelopeError: string
  fieldError: (field: string) => string
}>()

const emit = defineEmits<{
  openAccept: []
  openPreview: [entry: EnvelopeAcceptEntry]
  removeAccept: [index: number]
  save: []
  clearField: [field: string]
}>()
</script>

<style scoped>
.shead { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
.rowacts { display: flex; gap: 8px; justify-content: flex-end; }
.envlist { margin-top: 16px; }
.envrow { display: grid; grid-template-columns: 1.4fr 0.7fr 0.9fr 1.4fr auto; gap: 10px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border); }
.envrow:last-child { border-bottom: none; }
.envorow { border-bottom: 1px solid var(--border-2) !important; }
.envrow select { padding: 7px 10px; border-radius: 8px; background: var(--surface); border: 1px solid var(--border); color: var(--text); font-size: 0.8rem; }
.envrow select:focus { outline: none; border-color: var(--pink); }
.scel { word-break: break-all; }

.picks { display: grid; gap: 10px; }
.pick { position: relative; }
.pick__cb { position: absolute; opacity: 0; width: 0; height: 0; }

.envfoot { margin-top: 18px; display: flex; justify-content: flex-end; }

@media (max-width: 900px) {
  .envrow { grid-template-columns: 1fr; gap: 6px; }
  .envorow { display: none; }
  .rowacts { justify-content: flex-start; }
}
@media (max-width: 768px) {
  .shead { flex-direction: column; align-items: flex-start; }
}
</style>
