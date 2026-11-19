<template>
  <div v-if="open" class="backdrop" @click.self="closeModal">
    <div ref="modalEl" class="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="item-modal-title">
      <div class="modal__h">
        <div>
          <h3 id="item-modal-title">{{ itemForm.id ? 'Edit item definition' : 'New item definition' }}</h3>
          <p>{{ itemForm.id ? `${itemForm.sku} · ${gameTitle}` : `Draft a new sellable for ${gameTitle}` }}</p>
        </div>
        <button class="modal__x" type="button" aria-label="Close" @click="closeModal">✕</button>
      </div>
      <div class="modal__b">
        <div class="itemtop">
          <img class="itemart" :src="itemForm.art.url || seedAsset('items/placeholder.png')" alt="Item art preview">
          <div style="flex:1;min-width:0">
            <div class="field" :class="{ bad: fieldError('name') }" style="margin-bottom:10px">
              <label>Name</label>
              <input v-model.trim="itemForm.name" maxlength="80" :disabled="itemSaving" @input="clearField('name')">
              <p v-if="fieldError('name')" class="field__err">{{ fieldError('name') }}</p>
            </div>
            <div class="field" :class="{ bad: fieldError('art') }" style="margin-bottom:10px">
              <label>Art URL</label>
              <input v-model.trim="itemForm.art.url" type="url" placeholder="https://…/item.png" :disabled="itemSaving" @input="clearField('art')">
              <p v-if="fieldError('art')" class="field__err">{{ fieldError('art') }}</p>
            </div>
          </div>
        </div>

        <div class="field" :class="{ bad: fieldError('sku') }">
          <label>SKU <span class="dim">· lowercase, a–z 0–9 _</span></label>
          <input v-model.trim="itemForm.sku" maxlength="40" :disabled="itemSaving || !!itemForm.id" @input="clearField('sku')">
          <p v-if="fieldError('sku')" class="field__err">{{ fieldError('sku') }}</p>
          <p v-else-if="itemForm.id" class="field__hint">The SKU is immutable after creation.</p>
        </div>

        <div class="field" :class="{ bad: fieldError('description') }">
          <label>Description</label>
          <input v-model="itemForm.description" maxlength="400" :disabled="itemSaving" @input="clearField('description')">
          <p v-if="fieldError('description')" class="field__err">{{ fieldError('description') }}</p>
        </div>

        <div class="f3">
          <div class="field" :class="{ bad: fieldError('kind') }">
            <label>Kind</label>
            <AppSelect
              v-model="itemForm.kind"
              :options="kindOptions.map((kind) => ({ value: kind, label: kind }))"
              :disabled="itemSaving"
              aria-label="Item kind"
              block
              @update:model-value="clearField('kind')"
            />
            <p v-if="fieldError('kind')" class="field__err">{{ fieldError('kind') }}</p>
          </div>
          <div class="field" :class="{ bad: fieldError('priceUnits') }">
            <label>Price (SRV)</label>
            <input v-model="itemForm.priceSrv" type="text" inputmode="decimal" placeholder="0.00" :disabled="itemSaving" @input="clearField('priceUnits')">
            <p v-if="fieldError('priceUnits')" class="field__err">{{ fieldError('priceUnits') }}</p>
          </div>
          <div class="field" :class="{ bad: fieldError('royaltyBps') }">
            <label>Royalty (bps)</label>
            <input v-model="itemForm.royaltyBps" type="text" inputmode="numeric" placeholder="0" :disabled="itemSaving" @input="clearField('royaltyBps')">
            <p v-if="fieldError('royaltyBps')" class="field__err">{{ fieldError('royaltyBps') }}</p>
          </div>
        </div>

        <div class="f2">
          <div class="field">
            <label>Trait schema</label>
            <AppSelect
              v-model="itemForm.schemaId"
              :options="[{ value: '', label: '— none —' }, ...activeSchemas.map((schema) => ({ value: schema.schemaId, label: schema.schemaId }))]"
              :disabled="itemSaving"
              aria-label="Trait schema"
              block
            />
          </div>
          <div class="field" :class="{ bad: fieldError('interopTier') }">
            <label>Interop tier</label>
            <AppSelect
              v-model="itemForm.interopTier"
              :options="tiers.map((tier) => ({ value: tier, label: tier }))"
              :disabled="itemSaving"
              aria-label="Interop tier"
              block
              @update:model-value="clearField('interopTier')"
            />
            <p v-if="fieldError('interopTier')" class="field__err">{{ fieldError('interopTier') }}</p>
          </div>
        </div>

        <template v-if="selectedSchema && selectedSchema.fields.length">
          <p class="t-micro dim" style="margin:16px 0 10px">Traits · validated against the schema</p>
          <div class="f3">
            <div v-for="field in selectedSchema.fields" :key="field.name" class="field">
              <label>
                {{ field.name }}
                <span v-if="field.type === 'int' && field.min !== undefined" class="dim">{{ field.min }}–{{ field.max }}</span>
              </label>
              <AppSelect
                v-if="field.type === 'enum' && field.values"
                :model-value="String(itemForm.traits[field.name] ?? '')"
                :options="enumOptions(field.values)"
                :disabled="itemSaving"
                :aria-label="field.name"
                block
                @update:model-value="(value) => { itemForm.traits[field.name] = value }"
              />
              <input
                v-else-if="field.type === 'int'"
                v-model="itemForm.traits[field.name]"
                type="number"
                :min="field.min"
                :max="field.max"
                :disabled="itemSaving"
              >
              <input v-else v-model="itemForm.traits[field.name]" type="text" :disabled="itemSaving">
            </div>
          </div>
        </template>

        <div class="f2">
          <div class="field">
            <label>Supply type</label>
            <AppSelect
              v-model="itemForm.supplyType"
              :options="[{ value: 'limited', label: 'Limited' }, { value: 'unlimited', label: 'Unlimited' }]"
              :disabled="itemSaving"
              aria-label="Supply type"
              block
            />
          </div>
          <div v-if="itemForm.supplyType === 'limited'" class="field" :class="{ bad: !!supplyFloorError || fieldError('supplyMax') }">
            <label>Max supply</label>
            <input v-model="itemForm.supplyMax" type="text" inputmode="numeric" :placeholder="String(mintedCount || '')" :disabled="itemSaving" @input="clearField('supplyMax')">
            <p v-if="supplyFloorError" class="field__err">{{ supplyFloorError }}</p>
            <p v-else-if="fieldError('supplyMax')" class="field__err">{{ fieldError('supplyMax') }}</p>
            <p v-else-if="mintedCount" class="field__hint">Floor is the {{ formatNum(mintedCount) }} already minted.</p>
          </div>
        </div>

        <div v-if="itemError" class="note note--bad" style="margin-top:6px">
          <span class="note__i">⚠️</span>
          <div>{{ itemError }}</div>
        </div>
      </div>
      <div class="modal__f">
        <button class="btn btn--ghost" type="button" :disabled="itemSaving" @click="closeModal">Cancel</button>
        <button
          v-if="itemForm.id"
          class="btn btn--ghost btn--danger"
          type="button"
          :disabled="itemSaving"
          @click="emit('archive', item)"
        >Archive</button>
        <button class="btn btn--grad" type="button" :disabled="itemSaving || !!supplyFloorError" @click="saveItem">
          {{ itemSaving ? 'Saving…' : 'Save item' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { issuesOf, messageOf, srvToUnits, unitsToSrvInput, type FieldIssue } from '~/utils/studioGame'

interface SchemaField {
  name: string
  type: string
  min?: number
  max?: number
  values?: string[]
}

interface SchemaDef {
  schemaId: string
  fields: SchemaField[]
}

const props = defineProps<{
  open: boolean
  item: Record<string, any> | null
  gameId: string
  gameTitle: string
  activeSchemas: SchemaDef[]
  kindOptions: string[]
  tiers: string[]
}>()

const emit = defineEmits<{
  close: []
  saved: [result: Record<string, any>, isEdit: boolean]
  archive: [item: Record<string, any> | null]
}>()

const api = useApi()
const toast = useToast()
const { seedAsset, formatNum } = useStudioFormat()

const modalEl = ref<HTMLElement | null>(null)
const itemSaving = ref(false)
const itemError = ref('')
const itemIssues = ref<FieldIssue[]>([])

const itemForm = reactive({
  id: '',
  sku: '',
  name: '',
  description: '',
  kind: 'cosmetic',
  priceSrv: '',
  royaltyBps: '0',
  schemaId: '',
  interopTier: 'T0',
  art: { url: '', emoji: '' },
  supplyType: 'unlimited' as 'limited' | 'unlimited',
  supplyMax: '',
  traits: {} as Record<string, string>,
  minted: 0,
})

const mintedCount = computed(() => Number(props.item?.supply?.minted ?? itemForm.minted ?? 0))
const selectedSchema = computed(() => props.activeSchemas.find((schema) => schema.schemaId === itemForm.schemaId) ?? null)

const supplyFloorError = computed(() => {
  if (itemForm.supplyType !== 'limited') return ''
  const max = Number(String(itemForm.supplyMax).replace(/[^\d]/g, ''))
  if (!max) return ''
  if (mintedCount.value && max < mintedCount.value) return `Cannot be below ${formatNum(mintedCount.value)} already minted`
  return ''
})

function enumOptions(values: string[]) {
  return values.map((value) => ({ value, label: value }))
}

function fieldError(field: string) {
  return itemIssues.value.find((issue) => issue.field === field)?.issue ?? ''
}

function clearField(field: string) {
  itemIssues.value = itemIssues.value.filter((issue) => issue.field !== field)
}

function resetItemForm() {
  itemForm.id = ''
  itemForm.sku = ''
  itemForm.name = ''
  itemForm.description = ''
  itemForm.kind = 'cosmetic'
  itemForm.priceSrv = ''
  itemForm.royaltyBps = '0'
  itemForm.schemaId = ''
  itemForm.interopTier = 'T0'
  itemForm.art = { url: '', emoji: '' }
  itemForm.supplyType = 'unlimited'
  itemForm.supplyMax = ''
  itemForm.traits = {}
  itemForm.minted = 0
  itemError.value = ''
  itemIssues.value = []
}

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  resetItemForm()
  const item = props.item
  if (item) {
    itemForm.id = item.id
    itemForm.sku = item.sku
    itemForm.name = item.name
    itemForm.description = item.description ?? ''
    itemForm.kind = item.kind ?? 'cosmetic'
    itemForm.priceSrv = unitsToSrvInput(item.priceUnits)
    itemForm.royaltyBps = String(item.royaltyBps ?? 0)
    itemForm.schemaId = item.schemaId ?? ''
    itemForm.interopTier = item.interopTier ?? 'T0'
    itemForm.art = { url: item.art?.url ?? '', emoji: item.art?.emoji ?? '' }
    itemForm.supplyType = item.supply?.type === 'limited' ? 'limited' : 'unlimited'
    itemForm.supplyMax = item.supply?.max != null ? String(item.supply.max) : ''
    itemForm.minted = Number(item.supply?.minted ?? 0)
    itemForm.traits = { ...(item.traits ?? {}) }
  }
})

function closeModal() {
  if (itemSaving.value) return
  emit('close')
}

function buildItemBody(includeSku: boolean) {
  const priceUnits = srvToUnits(itemForm.priceSrv)
  const body: Record<string, unknown> = {
    name: itemForm.name,
    description: itemForm.description,
    kind: itemForm.kind,
    priceUnits: priceUnits ?? '0',
    royaltyBps: Number(String(itemForm.royaltyBps).replace(/[^\d]/g, '') || '0'),
    schemaId: itemForm.schemaId || null,
    interopTier: itemForm.interopTier,
    art: { url: itemForm.art.url, emoji: itemForm.art.emoji },
    traits: { ...itemForm.traits },
    supplyMax: itemForm.supplyType === 'limited' ? Number(String(itemForm.supplyMax).replace(/[^\d]/g, '')) || null : null,
  }
  if (includeSku) body.sku = itemForm.sku
  return body
}

async function saveItem() {
  if (itemSaving.value || supplyFloorError.value) return
  itemError.value = ''
  itemIssues.value = []
  const local: FieldIssue[] = []
  const name = itemForm.name.trim()
  if (!name) local.push({ field: 'name', issue: 'Add a name.' })
  else if (name.length > 80) local.push({ field: 'name', issue: 'Name must be 80 characters or fewer.' })

  const priceSrv = String(itemForm.priceSrv ?? '').trim().replace(/,/g, '')
  if (!priceSrv) local.push({ field: 'priceUnits', issue: 'Add a price.' })
  else if (!/^\d*(\.\d{0,6})?$/.test(priceSrv)) local.push({ field: 'priceUnits', issue: 'Use digits only, up to 6 decimals.' })
  else if (srvToUnits(priceSrv) === '0') local.push({ field: 'priceUnits', issue: 'Price must be greater than zero.' })

  if (!props.kindOptions.includes(itemForm.kind)) local.push({ field: 'kind', issue: 'Pick an item type.' })
  if (String(itemForm.description ?? '').length > 400) local.push({ field: 'description', issue: 'Description must be 400 characters or fewer.' })

  const royalty = Number(String(itemForm.royaltyBps).replace(/[^\d]/g, '') || '0')
  if (royalty > 2000) local.push({ field: 'royaltyBps', issue: 'Royalty cannot exceed 2000 bps (20%).' })

  if (!itemForm.id) {
    const sku = itemForm.sku.trim()
    if (!sku) local.push({ field: 'sku', issue: 'Add a SKU.' })
    else if (!/^[a-z0-9_]{2,40}$/.test(sku)) local.push({ field: 'sku', issue: 'Lowercase letters, digits and _ only (2–40).' })
  }

  const artUrl = String(itemForm.art.url ?? '').trim()
  if (artUrl && artUrl.length > 500) local.push({ field: 'art', issue: 'Art URL is too long.' })
  else if (artUrl && !artUrl.startsWith('/') && !/^https?:\/\//i.test(artUrl)) local.push({ field: 'art', issue: 'Use an http(s) URL or a /path.' })

  if (local.length) {
    itemIssues.value = local
    itemError.value = 'Please fix the highlighted fields.'
    return
  }

  itemSaving.value = true
  try {
    let result: Record<string, any>
    if (itemForm.id) {
      const body = buildItemBody(false)
      result = await api.one<Record<string, any>>(`/api/v1/items/${itemForm.id}`, {
        method: 'PATCH',
        body: {
          name: body.name,
          description: body.description,
          priceUnits: body.priceUnits,
          slot: null,
          supplyMax: body.supplyMax,
          traits: body.traits,
          art: body.art,
          status: 'active',
        },
      })
    } else {
      result = await api.one<Record<string, any>>(`/api/v1/games/${props.gameId}/items`, {
        method: 'POST',
        body: { ...buildItemBody(true), status: 'active' },
      })
    }
    toast.push(itemForm.id ? 'Item updated' : 'Item created', result?.name ?? '')
    emit('saved', result, !!itemForm.id)
  } catch (raw: unknown) {
    itemIssues.value = issuesOf(raw)
    itemError.value = itemIssues.value.length ? 'Please fix the highlighted fields.' : messageOf(raw, 'Could not save the item.')
  } finally {
    itemSaving.value = false
  }
}

defineExpose({ modalEl, closeModal })
</script>

<style scoped>
.itemtop { display: flex; gap: 16px; margin-bottom: 18px; }
.itemart { width: 96px; height: 96px; border-radius: var(--r-md); object-fit: cover; border: 1px solid var(--border); flex-shrink: 0; }

@media (max-width: 768px) {
  .itemtop { flex-direction: column; }
  .itemart { width: 100%; height: 160px; }
}
</style>
