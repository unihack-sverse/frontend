<template>
  <div v-if="open" class="backdrop" @click.self="closeModal">
    <div ref="modalEl" class="modal" role="dialog" aria-modal="true" aria-labelledby="accept-modal-title">
      <div class="modal__h">
        <div>
          <h3 id="accept-modal-title">Accept a schema</h3>
          <p>Declare a schema your game will import and the band it maps into</p>
        </div>
        <button class="modal__x" type="button" aria-label="Close" @click="closeModal">✕</button>
      </div>
      <div class="modal__b">
        <div class="field">
          <label>Schema</label>
          <AppSelect
            v-model="acceptDraft.schemaId"
            :options="activeSchemas.map((schema) => ({ value: schema.schemaId, label: schema.schemaId }))"
            aria-label="Schema"
            block
          />
        </div>
        <div class="f2">
          <div class="field">
            <label>Max tier</label>
            <AppSelect
              v-model="acceptDraft.tierMax"
              :options="tiers.map((tier) => ({ value: tier, label: tier }))"
              aria-label="Tier max"
              block
            />
          </div>
          <div class="field">
            <label>Clamp policy</label>
            <AppSelect
              v-model="acceptDraft.clampPolicy"
              :options="[{ value: 'clamp', label: 'Clamp to tier max' }, { value: 'skip', label: 'Skip the item' }]"
              aria-label="Clamp policy"
              block
            />
          </div>
        </div>
        <div class="f2">
          <div class="field">
            <label>Power floor</label>
            <input v-model="acceptDraft.powerMin" type="text" inputmode="numeric">
          </div>
          <div class="field">
            <label>Power ceiling</label>
            <input v-model="acceptDraft.powerMax" type="text" inputmode="numeric">
          </div>
        </div>
        <div v-if="acceptError" class="note note--bad">
          <span class="note__i">⚠️</span>
          <div>{{ acceptError }}</div>
        </div>
      </div>
      <div class="modal__f">
        <button class="btn btn--ghost" type="button" @click="closeModal">Cancel</button>
        <button class="btn btn--grad" type="button" @click="confirmAccept">Add schema</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EnvelopeAcceptEntry } from '~/utils/studioGame'

const props = defineProps<{
  open: boolean
  activeSchemas: Array<{ schemaId: string }>
  tiers: string[]
  existingSchemaIds: string[]
  defaultTierMax: string
  defaultClampPolicy: 'reject' | 'clamp'
}>()

const emit = defineEmits<{
  close: []
  add: [entry: EnvelopeAcceptEntry]
}>()

const modalEl = ref<HTMLElement | null>(null)
const acceptError = ref('')
const acceptDraft = reactive({
  schemaId: '',
  tierMax: 'T2',
  clampPolicy: 'reject' as 'reject' | 'clamp',
  powerMin: '1',
  powerMax: '5',
})

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    acceptDraft.schemaId = ''
    acceptDraft.tierMax = props.defaultTierMax || 'T2'
    acceptDraft.clampPolicy = props.defaultClampPolicy
    acceptDraft.powerMin = '1'
    acceptDraft.powerMax = '5'
    acceptError.value = ''
  }
})

function closeModal() {
  emit('close')
}

function confirmAccept() {
  if (!acceptDraft.schemaId) { acceptError.value = 'Select a schema to accept.'; return }
  if (props.existingSchemaIds.includes(acceptDraft.schemaId)) {
    acceptError.value = 'That schema is already accepted.'
    return
  }
  emit('add', {
    schemaId: acceptDraft.schemaId,
    tierMax: acceptDraft.tierMax,
    powerTierRange: [Number(acceptDraft.powerMin) || 1, Number(acceptDraft.powerMax) || 1],
    mapping: {},
    clampPolicy: acceptDraft.clampPolicy,
  })
}

defineExpose({ modalEl, closeModal })
</script>
