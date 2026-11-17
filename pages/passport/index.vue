<template>
  <main class="sfwrap sfbody">
    <section v-if="user" class="pbanner">
      <div class="pbanner__bg pbanner__bg--grad" aria-hidden="true"></div>
      <div class="pbanner__in">
        <span class="pbanner__av pbanner__av--glyph" aria-hidden="true">{{ user.handle.charAt(0).toUpperCase() }}</span>
        <div>
          <p class="t-micro" style="color:var(--pink);margin-bottom:5px">S-PASSPORT</p>
          <div v-if="!editingHandle" class="pbanner__hrow">
            <h1>@{{ user.handle }}</h1>
            <button class="btn btn--ghost btn--sm" type="button" @click="startHandleEdit">Edit</button>
          </div>
          <form v-else class="pbanner__hform" novalidate @submit.prevent="saveHandle">
            <div class="pbanner__hinputs">
              <label class="sr-only" for="passport-handle-input">Passport handle</label>
              <div class="hinput" :class="{ bad: Boolean(handleError) }">
                <span class="hinput__at" aria-hidden="true">@</span>
                <input
                  id="passport-handle-input"
                  ref="handleInputRef"
                  v-model.trim="handleDraft"
                  maxlength="20"
                  autocomplete="username"
                  :disabled="savingHandle"
                  :aria-invalid="Boolean(handleError)"
                  aria-describedby="passport-handle-err"
                  @keydown.esc.prevent="cancelHandleEdit"
                >
              </div>
              <button class="btn btn--grad btn--sm" type="submit" :disabled="savingHandle">
                <span v-if="savingHandle" class="spin" aria-hidden="true">◐</span>
                {{ savingHandle ? 'Saving…' : 'Save' }}
              </button>
              <button class="btn btn--ghost btn--sm" type="button" :disabled="savingHandle" @click="cancelHandleEdit">Cancel</button>
            </div>
            <p v-if="handleError" id="passport-handle-err" class="field__err" role="alert">{{ handleError }}</p>
            <p v-else class="field__hint">3–20 letters, digits or underscores.</p>
          </form>
          <p class="pbanner__id" :title="user.custodialAddress ?? ''">{{ shortHash(user.custodialAddress, 8, 4) || 'address pending' }} · smart account, gasless, no seed phrase</p>
          <div class="pbanner__k">
            <span class="chip chip--live">★ {{ user.reputation }} reputation</span>
            <span v-if="user.skill?.tier" class="chip chip--t1">{{ humanize(user.skill.tier) }}</span>
            <span v-if="user.creator" class="chip chip--yours">STUDIO @{{ user.creator.handle }}</span>
            <span v-if="user.walletAddress" class="chip chip--t1" :title="user.walletAddress">
              Avalanche Fuji · {{ shortHash(user.walletAddress, 6, 4) }}
            </span>
          </div>
          <div v-if="!user.walletAddress" class="pbanner__wallet">
            <WalletSelector
              v-if="wallets.length >= 2"
              v-model="selectedWalletId"
              :wallets="wallets"
              :disabled="linkingWallet"
              compact
            />
            <button
              class="btn btn--ghost btn--sm"
              type="button"
              :disabled="linkingWallet"
              @click="connectAndLinkWallet"
            >
              <span v-if="linkingWallet" class="spin" aria-hidden="true">◐</span>
              {{ linkingWallet ? (linkStep || 'Linking wallet…') : 'Link Avalanche wallet' }}
            </button>
            <WalletErrorNote :message="linkError" :install-url="linkInstallUrl" compact />
          </div>
        </div>
        <div class="pbanner__stats">
          <div class="pstat"><p class="pstat__v num">{{ user.inventory.count }}</p><p class="pstat__k">Items</p></div>
          <div class="pstat"><p class="pstat__v num">{{ user.inventory.gameCount }}</p><p class="pstat__k">Games</p></div>
          <div class="pstat"><p class="pstat__v num">{{ user.wardrobe.renderTargets }}</p><p class="pstat__k">Renders in</p></div>
          <div class="pstat"><p class="pstat__v num grad-text" :title="`${user.balanceUnits} units`">{{ groupSrv(user.balanceSrv) }}</p><p class="pstat__k">SRV</p></div>
        </div>
      </div>
    </section>
    <div v-else class="sk" style="height:172px;border-radius:var(--r-xl);margin:24px 0 8px"></div>

    <div class="fbar">
      <button
        v-for="filter in KIND_FILTERS"
        :key="filter.value"
        class="sfcat"
        :class="{ on: kind === filter.value }"
        type="button"
        :aria-pressed="kind === filter.value"
        @click="setQuery({ kind: filter.value || undefined })"
      >
        {{ filter.label }}
      </button>
      <span style="flex:1"></span>
      <AppSelect
        :model-value="gameId ?? ''"
        :options="[{ value: '', label: 'All games' }, ...gameOptions.map((game) => ({ value: game.id, label: game.title }))]"
        aria-label="Filter by game"
        size="sm"
        @update:model-value="setQuery({ gameId: $event || undefined })"
      />
      <FaucetButton />
    </div>

    <section class="shelf">
      <div class="shelf__h">
        <h3>{{ heading }}</h3>
        <NuxtLink to="/passport/deeds">Open the deed ledger →</NuxtLink>
      </div>
      <p class="shelf__s">Living Items get <b>History</b> and <b>Import</b>; T1 cosmetics get <b>Equip</b>; anything transferable can be listed on the market.</p>

      <div v-if="status === 'pending' && !items.length" class="items" aria-busy="true">
        <div v-for="n in 6" :key="n" class="item"><div class="sk" style="aspect-ratio:1"></div><div class="item__body"><div class="sk" style="height:14px;width:70%"></div></div></div>
      </div>
      <ErrorState v-else-if="error" title="Could not load your inventory" :error="error" :retry="refresh" />
      <EmptyState v-else-if="!items.length && (kind || gameId)" icon="◌" title="Nothing matches that filter" body="Try another kind or game.">
        <button class="btn btn--ghost btn--sm" type="button" @click="setQuery({ kind: undefined, gameId: undefined })">Clear filters</button>
      </EmptyState>
      <EmptyState v-else-if="!items.length" icon="🎒" title="Nothing yet" body="Buy something in the Store and it appears here, minted to your passport — not to a game's server.">
        <NuxtLink class="btn btn--grad btn--sm" to="/">Browse the Store</NuxtLink>
      </EmptyState>
      <template v-else>
        <div class="items">
          <InventoryCard
            v-for="item in items"
            :key="item.id"
            :item="item"
            :listing="listingFor(item.id)"
            :busy="busy[item.id]"
            :error="itemErrors[item.id]"
            @history="historyItem = $event"
            @import="importItem = $event"
            @equip="toggleEquip"
            @list="listItem = $event"
            @cancel="cancelListing"
          />
        </div>
        <div v-if="nextCursor" style="text-align:center;margin-top:20px">
          <button class="btn btn--ghost btn--sm" type="button" :disabled="loadingMore" @click="loadMore">{{ loadingMore ? 'Loading…' : 'Load more' }}</button>
        </div>
      </template>
    </section>

    <div class="note" style="margin-top:8px">
      <span class="note__i">🔐</span>
      <div>Your passport is a <b>custodial smart account</b>: gas is sponsored, there is no seed phrase, and items minted at L3+ are owned by your address on-chain.</div>
    </div>

    <DeedLedgerModal v-if="historyItem" :inventory-item-id="historyItem.id" :name="historyItem.name" :schema-id="historyItem.schemaId" @close="historyItem = null" />
    <InteropImportModal v-if="importItem" :item="importItem" @close="importItem = null" />
    <ListForSaleModal v-if="listItem" :item="listItem" @close="listItem = null" @listed="onListed" />
  </main>
</template>

<script setup lang="ts">
import type { InventoryItem, Listing, Wardrobe } from '~/types/sverse'

useHead({ title: 'My library · Sverse', meta: [{ name: 'robots', content: 'noindex' }] })

const KIND_FILTERS = [
  { label: 'All items', value: '' },
  { label: 'Living Items', value: 'living' },
  { label: 'Cosmetics', value: 'cosmetic' },
  { label: 'Bundles', value: 'bundle' },
  { label: 'Passes', value: 'pass' },
  { label: 'Consumables', value: 'consumable' },
]

const route = useRoute()
const router = useRouter()
const api = useApi()
const session = useSession()
const toast = useToast()
const user = session.user
const { data: gameOptions } = useGameOptions()
const { wallets, selectedWalletId, selectedWallet, refresh: refreshWallets } = useWallets()

const editingHandle = ref(false)
const handleDraft = ref('')
const handleError = ref('')
const savingHandle = ref(false)
const handleInputRef = ref<HTMLInputElement | null>(null)
watch(handleDraft, () => {
  handleError.value = ''
})

function startHandleEdit() {
  handleDraft.value = user.value?.handle ?? ''
  handleError.value = ''
  editingHandle.value = true
  nextTick(() => handleInputRef.value?.focus())
}

function cancelHandleEdit() {
  if (savingHandle.value) return
  editingHandle.value = false
  handleError.value = ''
}

async function saveHandle() {
  if (savingHandle.value) return
  const nextHandle = handleDraft.value.trim()
  if (!/^[A-Za-z0-9_]{3,20}$/.test(nextHandle)) {
    handleError.value = 'Handle must be 3–20 letters, digits or underscores.'
    return
  }
  if (nextHandle === user.value?.handle) {
    editingHandle.value = false
    return
  }
  savingHandle.value = true
  handleError.value = ''
  try {
    const me = await session.updateHandle(nextHandle)
    editingHandle.value = false
    toast.push('Handle updated', `You are now @${me.handle}.`, '✓')
  } catch (err) {
    if (isApiError(err, 'handle_taken')) handleError.value = 'That handle is taken — try another.'
    else if (isApiError(err, 'validation_failed')) handleError.value = err.field('handle') ?? 'Handle must be 3–20 letters, digits or underscores.'
    else handleError.value = errorMessage(err)
  } finally {
    savingHandle.value = false
  }
}

const linkingWallet = ref(false)
const linkStep = ref('')
const linkError = ref('')
const linkInstallUrl = ref<string | null>(null)

async function connectAndLinkWallet() {
  if (linkingWallet.value) return
  linkError.value = ''
  linkInstallUrl.value = null
  linkStep.value = 'Connecting wallet…'
  linkingWallet.value = true
  try {
    const provider = selectedWallet.value?.provider ?? refreshWallets()[0]?.provider ?? null
    const me = await session.linkWallet({
      provider,
      onStep: (step) => {
        linkStep.value = step
      },
    })
    toast.push('Wallet linked', `Avalanche Fuji · ${shortHash(me.walletAddress, 6, 4)}`, '✓')
  } catch (err) {
    const info = describeWalletAuthError(err)
    linkError.value = info.message
    linkInstallUrl.value = info.installUrl
  } finally {
    linkingWallet.value = false
    linkStep.value = ''
  }
}

const kind = computed(() => {
  const value = String(route.query.kind ?? '')
  return KIND_FILTERS.some((filter) => filter.value === value) ? value : ''
})
const gameId = computed(() => String(route.query.gameId ?? ''))
const heading = computed(() => KIND_FILTERS.find((filter) => filter.value === kind.value)?.label ?? 'All items')

function setQuery(patch: Record<string, string | undefined>) {
  router.replace({ query: { ...route.query, ...patch } })
}

const apiQuery = computed(() => ({ kind: kind.value || undefined, gameId: gameId.value || undefined, limit: 48 }))
const { data, status, error, refresh } = usePassportData(
  'passport:inventory',
  () => api.many<InventoryItem>('/api/v1/passport/me/inventory', { query: apiQuery.value }),
  { watch: [apiQuery] },
)
const { data: myListings, refresh: refreshListings } = usePassportData('passport:my-listings', () => api.many<Listing>('/api/v1/market/listings/mine').then((res) => res.data))

// Local overrides keep writes instant (no refetch): item patches + appended pages.
const patches = reactive<Record<string, Partial<InventoryItem>>>({})
const extra = ref<InventoryItem[]>([])
const nextCursor = ref<string | null>(null)
const loadingMore = ref(false)
watch(
  data,
  (value) => {
    extra.value = []
    nextCursor.value = value?.meta?.nextCursor ?? null
    for (const key of Object.keys(patches)) delete patches[key]
  },
  { immediate: true },
)

const items = computed(() => [...(data.value?.data ?? []), ...extra.value].map((item) => ({ ...item, ...(patches[item.id] ?? {}) })))
const listingsByItem = ref<Record<string, Listing>>({})
watch(
  myListings,
  (rows) => {
    listingsByItem.value = Object.fromEntries((rows ?? []).filter((listing) => listing.status === 'open' && listing.inventoryItemId).map((listing) => [listing.inventoryItemId!, listing]))
  },
  { immediate: true },
)
function listingFor(itemId: string) {
  return listingsByItem.value[itemId] ?? null
}

const busy = reactive<Record<string, string>>({})
const itemErrors = reactive<Record<string, string>>({})
const historyItem = ref<InventoryItem | null>(null)
const importItem = ref<InventoryItem | null>(null)
const listItem = ref<InventoryItem | null>(null)

async function loadMore() {
  if (!nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const page = await api.many<InventoryItem>('/api/v1/passport/me/inventory', { query: { ...apiQuery.value, cursor: nextCursor.value } })
    extra.value = [...extra.value, ...page.data]
    nextCursor.value = page.meta.nextCursor
  } finally {
    loadingMore.value = false
  }
}

async function toggleEquip(item: InventoryItem) {
  if (busy[item.id]) return
  busy[item.id] = 'equip'
  delete itemErrors[item.id]
  const equip = !item.equipped
  // Optimistic: one item per slot — equipping displaces the current holder in the same update.
  const snapshot = items.value.map((row) => ({ id: row.id, equipped: row.equipped }))
  patches[item.id] = { ...patches[item.id], equipped: equip }
  if (equip && item.slot) {
    for (const row of items.value) if (row.id !== item.id && row.slot === item.slot && row.equipped) patches[row.id] = { ...patches[row.id], equipped: false }
  }
  try {
    const result = await api.one<{ equipped: Array<{ inventoryItemId: string }> } & Partial<Wardrobe>>('/api/v1/passport/me/wardrobe', {
      method: 'PATCH',
      body: equip ? { equip: [item.id] } : { unequip: [item.id] },
    })
    const equippedIds = new Set((result.equipped ?? []).map((row) => row.inventoryItemId))
    for (const row of items.value) patches[row.id] = { ...patches[row.id], equipped: equippedIds.has(row.id) }
    const displaced = snapshot.filter((row) => row.equipped && row.id !== item.id && !equippedIds.has(row.id))
    toast.push(equip ? 'Equipped' : 'Unequipped', displaced.length ? `Replaced ${displaced.map((row) => items.value.find((i) => i.id === row.id)?.name).join(', ')} in the ${item.slot} slot.` : 'Your loadout syncs to every T1 game.', '🧥')
    session.reload()
  } catch (err) {
    for (const row of snapshot) patches[row.id] = { ...patches[row.id], equipped: row.equipped }
    itemErrors[item.id] = isApiError(err, 'item_listed') ? 'Listed items cannot be equipped — cancel the listing first.' : isApiError(err, 'not_interoperable') ? 'T0 items cannot be equipped across games.' : errorMessage(err)
  } finally {
    delete busy[item.id]
  }
}

function onListed(listing: Listing) {
  const item = listItem.value
  listItem.value = null
  if (!item) return
  patches[item.id] = { ...patches[item.id], listed: true, status: 'listed', equipped: false }
  listingsByItem.value = { ...listingsByItem.value, [item.id]: listing }
}

async function cancelListing(item: InventoryItem) {
  const listing = listingFor(item.id)
  if (!listing || busy[item.id]) {
    if (!listing) await refreshListings()
    return
  }
  busy[item.id] = 'cancel'
  delete itemErrors[item.id]
  try {
    await api.one<Listing>(`/api/v1/market/listings/${listing.id}`, { method: 'DELETE' })
    patches[item.id] = { ...patches[item.id], listed: false, status: 'owned' }
    const next = { ...listingsByItem.value }
    delete next[item.id]
    listingsByItem.value = next
    toast.push('Listing cancelled', `${item.name} is back in your passport.`, '↩')
  } catch (err) {
    if (isApiError(err, 'listing_not_open')) {
      itemErrors[item.id] = 'This listing already closed (sold or cancelled). Refreshing…'
      await Promise.all([refresh(), refreshListings()])
    } else itemErrors[item.id] = errorMessage(err)
  } finally {
    delete busy[item.id]
  }
}

onMounted(() => {
  if (session.loggedIn.value) session.reload()
})
</script>
