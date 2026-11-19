<template>
  <StudioShell wide>
    <!-- ══ error ══ -->
    <div v-if="loadError" class="empty">
      <p class="empty__i">⚠️</p>
      <p>{{ loadErrorMessage }}</p>
      <NuxtLink v-if="notFound" class="btn btn--ghost btn--sm" to="/studio">Back to Studio</NuxtLink>
      <NuxtLink v-else class="btn btn--grad btn--sm" to="/login?next=/studio">Sign in as a creator</NuxtLink>
    </div>

    <!-- ══ loading ══ -->
    <template v-else-if="pending">
      <div class="ghead">
        <div class="sk" style="width:96px;height:60px;border-radius:var(--r-sm)"></div>
        <div style="flex:1;min-width:200px">
          <div class="sk" style="height:26px;width:220px"></div>
          <div class="sk" style="height:13px;width:320px;margin-top:10px"></div>
        </div>
      </div>
      <div class="sk" style="height:44px;width:560px;border-radius:var(--r-md);margin-bottom:24px"></div>
      <div class="sk" style="height:360px;border-radius:var(--r-lg)"></div>
    </template>

    <!-- ══ loaded ══ -->
    <template v-else-if="game">
      <nav class="crumbs" aria-label="Breadcrumb">
        <NuxtLink to="/studio" class="dim">Studio</NuxtLink>
        <span class="dim">/</span>
        <NuxtLink to="/studio/games" class="dim">Games</NuxtLink>
        <span class="dim">/</span>
        <b>{{ game.title }}</b>
      </nav>

      <div class="ghead">
        <img class="ghead__art" :src="coverUrl" :alt="`${game.title} cover art`">
        <div style="flex:1;min-width:200px">
          <h1 class="t-h1">{{ game.title }}</h1>
          <p class="t-small dim ghead__meta">
            <span :class="statusChip(game.status)"><i v-if="game.status === 'live'" class="dot"></i>{{ statusLabel(game.status) }}</span>
            <span class="chip chip--lvl">{{ game.tokenizationLevel }}</span>
            <span :class="tierChip(game.interopTier)">{{ game.interopTier }}</span>
            <span style="margin-left:6px">slug <span class="t-mono">{{ game.slug }}</span> · locked after publish</span>
          </p>
          <div v-if="game.submissionNo || game.blockedReason || game.rejectionReason" class="t-small dim" style="margin-top:6px">
            <span v-if="game.submissionNo">Submission #{{ game.submissionNo }}</span>
            <span v-if="game.blockedReason === 'bond_required'" class="chip chip--warn" style="margin-left:8px">listing bond required</span>
            <NuxtLink v-if="game.blockedReason === 'bond_required'" class="btn btn--grad btn--sm" to="/studio/payouts#stake" style="margin-left:8px">Stake bond →</NuxtLink>
            <span v-else-if="game.rejectionReason" class="chip chip--bad" style="margin-left:8px">rejected · {{ game.rejectionReason }}</span>
          </div>
        </div>
      </div>

      <div v-if="game.status === 'rejected'" class="note note--bad" style="margin-bottom:20px;align-items:center">
        <span class="note__i">⚠️</span>
        <div style="flex:1">
          <b>Submission rejected<template v-if="game.rejectionReason">: "{{ game.rejectionReason }}"</template></b>
          Update your Build URL, Cover Art, or metadata below and save changes, then resubmit through the Publish wizard.
        </div>
        <NuxtLink class="btn btn--grad btn--sm" to="/studio/publish">Resubmit →</NuxtLink>
      </div>

      <div class="tabs">
        <button :class="{ on: activeTab === 'details' }" type="button" @click="setTab('details')">Details</button>
        <button :class="{ on: activeTab === 'catalog' }" type="button" @click="setTab('catalog')">Catalog · {{ items.length }}</button>
        <button :class="{ on: activeTab === 'interop' }" type="button" @click="setTab('interop')">Interop envelope</button>
        <button :class="{ on: activeTab === 'an' }" type="button" @click="setTab('an')">Analytics</button>
      </div>

      <!-- ═══════════════ DETAILS ═══════════════ -->
      <section v-show="activeTab === 'details'" class="pane on">
        <div class="dgrid">
          <div class="card card--pad">
            <p class="sect" style="margin-top:0">Basics</p>

            <div class="field" :class="{ bad: fieldError('title') }">
              <label>Title</label>
              <input v-model.trim="form.title" maxlength="80" :disabled="saving" @input="clearField('title')">
              <p v-if="fieldError('title')" class="field__err">{{ fieldError('title') }}</p>
            </div>

            <div class="f2">
              <div class="field" :class="{ bad: fieldError('genre') }">
                <label>Genre</label>
                <AppSelect
                  v-model="form.genre"
                  :options="genreOptions.map((option) => ({ value: option, label: genreLabel(option) }))"
                  :disabled="saving"
                  aria-label="Genre"
                  block
                  @update:model-value="clearField('genre')"
                />
                <p v-if="fieldError('genre')" class="field__err">{{ fieldError('genre') }}</p>
              </div>
              <div class="field" :class="{ bad: fieldError('buildType') }">
                <label>Build type</label>
                <AppSelect
                  v-model="form.buildType"
                  :options="buildTypeOptions"
                  :disabled="saving"
                  aria-label="Build type"
                  block
                  @update:model-value="clearField('buildType')"
                />
                <p v-if="fieldError('buildType')" class="field__err">{{ fieldError('buildType') }}</p>
              </div>
            </div>

            <div class="field" :class="{ bad: fieldError('blurb') }">
              <label>Blurb <span class="dim">· shown on cards, 140 max</span></label>
              <input v-model="form.blurb" maxlength="200" :disabled="saving" @input="clearField('blurb')">
              <p v-if="fieldError('blurb')" class="field__err">{{ fieldError('blurb') }}</p>
              <p v-else-if="form.blurb.length > 140" class="field__hint blurb-warn">{{ form.blurb.length }}/140 — trimmed on cards past 140</p>
              <p v-else class="field__hint">{{ form.blurb.length }}/140</p>
            </div>

            <div class="field" :class="{ bad: fieldError('description') }">
              <label>Description</label>
              <textarea v-model="form.description" maxlength="5000" :disabled="saving" @input="clearField('description')"></textarea>
              <p v-if="fieldError('description')" class="field__err">{{ fieldError('description') }}</p>
            </div>

            <div class="field" :class="{ bad: fieldError('buildUrl') }">
              <label>Build URL <span class="dim">· review scans this before the game goes live</span></label>
              <input v-model.trim="form.buildUrl" type="url" placeholder="https://…" :disabled="saving" @input="clearField('buildUrl')">
              <p v-if="fieldError('buildUrl')" class="field__err">{{ fieldError('buildUrl') }}</p>
              <p v-else-if="!form.buildUrl" class="field__hint">Required before publishing — without it the game cannot be submitted for review.</p>
            </div>

            <div v-if="saveError" class="note note--bad" style="margin-top:6px">
              <span class="note__i">⚠️</span>
              <div>{{ saveError }}</div>
            </div>

            <div class="savebar">
              <button class="btn btn--grad" type="button" :disabled="saving || !detailsDirty" @click="saveDetails">
                {{ saving ? 'Saving…' : 'Save changes' }}
              </button>
              <span v-if="detailsDirty" class="t-small dim">Unsaved changes</span>
              <span v-else class="t-small dim">No changes to save</span>
            </div>
          </div>

          <div>
            <div class="card card--pad">
              <p class="sect" style="margin-top:0">Cover art &amp; media</p>
              <img class="cover" :src="coverUrl" :alt="`${game.title} cover art`">
              <div class="field" :class="{ bad: fieldError('coverArt') }" style="margin-top:12px">
                <label>Cover image URL</label>
                <input v-model.trim="form.coverArt.url" type="url" placeholder="https://…/cover.png" :disabled="saving" @input="clearField('coverArt')">
                <p v-if="fieldError('coverArt')" class="field__err">{{ fieldError('coverArt') }}</p>
                <p v-else class="field__hint">Paste a direct link to a wide image (1280×800 or larger, WEBP or PNG). Uploads are not supported yet.</p>
              </div>

              <p class="t-micro dim" style="margin-top:18px">Screenshots · {{ screenshots.length }}</p>
              <div v-if="screenshots.length" class="mediarow">
                <figure v-for="(shot, index) in screenshots" :key="shot.url">
                  <img :src="shot.url" :alt="`Screenshot ${index + 1}`">
                  <button type="button" class="mediax" aria-label="Remove screenshot" @click="removeScreenshot(index)">✕</button>
                </figure>
              </div>
              <p v-else class="t-small dim" style="margin-top:8px">No screenshots yet.</p>
              <div class="field" style="margin-top:12px">
                <label>Screenshot URL</label>
                <input v-model.trim="shotDraft" type="url" placeholder="https://…/shot.png" :disabled="saving">
                <p class="field__hint">Paste a direct link, then Add. Uploads are not supported yet.</p>
                <div class="inlineacts">
                  <button class="btn btn--grad btn--sm" type="button" :disabled="!shotDraft" @click="addScreenshot">Add screenshot</button>
                </div>
              </div>
            </div>

            <div class="card card--pad" style="margin-top:18px">
              <p class="sect" style="margin-top:0">Tokenization level</p>
              <div class="lvlpick">
                <button
                  v-for="level in levels"
                  :key="level.key"
                  class="lvl"
                  type="button"
                  :class="{ on: level.key === form.tokenizationLevel, off: levelBelow(level.key) }"
                  :disabled="levelBelow(level.key) || saving"
                  :aria-pressed="level.key === form.tokenizationLevel"
                  @click="chooseLevel(level.key)"
                >
                  <span class="lvl__k">{{ level.key }}</span>
                  <span class="lvl__b">
                    <span class="lvl__t">{{ level.title }}<template v-if="level.key === game.tokenizationLevel"> · current</template></span>
                    <span class="lvl__d">{{ levelBelow(level.key) ? 'Below current level — cannot downgrade' : level.desc }}</span>
                  </span>
                  <span v-if="level.key === form.tokenizationLevel" class="lvl__mark" aria-hidden="true">✓</span>
                  <span v-else-if="levelBelow(level.key)" class="lvl__mark" aria-hidden="true">🔒</span>
                </button>
              </div>
              <div v-if="levelError" class="note note--bad" style="margin-top:14px">
                <span class="note__i">⚠️</span>
                <div>{{ levelError }}</div>
              </div>
              <div class="note note--warn" style="margin-top:14px">
                <span class="note__i">🔒</span>
                <div><b>The ladder is one-way.</b> Levels below {{ game.tokenizationLevel }} are disabled
                  because this game is already at {{ game.tokenizationLevel }}. Player ownership must not
                  be revocable by the issuer, so a level can only ever go up.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <GameCatalogTab
        :visible="activeTab === 'catalog'"
        :items="items"
        @open-csv="openCsvModal"
        @open-item="openItemModal"
        @ask-archive="askArchive"
      />

      <GameInteropTab
        :visible="activeTab === 'interop'"
        :game-title="game.title"
        :envelope-form="envelopeForm"
        :tiers="tiers"
        :saving-envelope="savingEnvelope"
        :envelope-error="envelopeError"
        :field-error="fieldError"
        @open-accept="openAcceptModal"
        @open-preview="openPreview"
        @remove-accept="removeAccept"
        @save="saveEnvelope"
        @clear-field="clearField"
      />

      <GameAnalyticsTab
        :visible="activeTab === 'an'"
        :game-id="gameId"
        :game="game"
        :analytics-res="analyticsRes"
      />
    </template>

    <ItemEditorModal
      ref="itemModalRef"
      :open="itemModal"
      :item="editingItem"
      :game-id="gameId"
      :game-title="game?.title ?? ''"
      :active-schemas="activeSchemas"
      :kind-options="kindOptions"
      :tiers="tiers"
      @close="itemModal = false"
      @saved="onItemSaved"
      @archive="askArchive"
    />

    <CsvImportModal
      ref="csvModalRef"
      :open="csvModal"
      :game-id="gameId"
      :tokenization-level="form.tokenizationLevel"
      @close="csvModal = false"
      @imported="refreshGame"
    />

    <ArchiveItemModal
      ref="archiveModalRef"
      :target="archiveTarget"
      @close="archiveTarget = null"
      @archived="onItemArchived"
    />

    <AcceptSchemaModal
      ref="acceptModalRef"
      :open="acceptModal"
      :active-schemas="activeSchemas"
      :tiers="tiers"
      :existing-schema-ids="envelopeForm.accepts.map((entry) => entry.schemaId)"
      :default-tier-max="envelopeForm.acceptsTierMax"
      :default-clamp-policy="envelopeForm.clampPolicy"
      @close="acceptModal = false"
      @add="onAcceptAdded"
    />

    <PreviewMappingModal
      ref="previewModalRef"
      :entry="previewEntry"
      :active-schemas="activeSchemas"
      @close="previewEntry = null"
    />
  </StudioShell>
</template>

<script setup lang="ts">
import AcceptSchemaModal from '~/components/studio/games/AcceptSchemaModal.vue'
import ArchiveItemModal from '~/components/studio/games/ArchiveItemModal.vue'
import CsvImportModal from '~/components/studio/games/CsvImportModal.vue'
import GameAnalyticsTab from '~/components/studio/games/GameAnalyticsTab.vue'
import GameCatalogTab from '~/components/studio/games/GameCatalogTab.vue'
import GameInteropTab from '~/components/studio/games/GameInteropTab.vue'
import ItemEditorModal from '~/components/studio/games/ItemEditorModal.vue'
import PreviewMappingModal from '~/components/studio/games/PreviewMappingModal.vue'
import { useModalFocusTrap } from '~/composables/useModalFocusTrap'
import {
  issuesOf,
  messageOf,
  srvToUnits,
  unitsToSrvInput,
  type EnvelopeAcceptEntry,
  type FieldIssue,
} from '~/utils/studioGame'

definePageMeta({ layout: 'studio' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const { seedAsset, genreLabel, statusLabel, statusChip, tierChip } = useStudioFormat()

const gameId = computed(() => String(route.params.id ?? ''))

/* ── tabs ─────────────────────────────────────────────── */
type Tab = 'details' | 'catalog' | 'interop' | 'an'
const TABS: Tab[] = ['details', 'catalog', 'interop', 'an']
const activeTab = computed<Tab>(() => {
  const value = String(route.query.tab ?? '')
  return (TABS as string[]).includes(value) ? (value as Tab) : 'details'
})
function setTab(tab: Tab) {
  router.replace({ query: { ...route.query, tab } })
}

/* ── reference data ───────────────────────────────────── */
const genreOptions = ['action_rpg', 'puzzle', 'strategy', 'cozy', 'arcade', 'platformer']
const kindOptions = ['cosmetic', 'bundle', 'pass', 'consumable', 'unlock', 'content', 'living']
const buildTypeOptions = [
  { value: 'web', label: 'Web' },
  { value: 'native', label: 'Native' },
  { value: 'miniapp', label: 'Miniapp' },
]

/** Enum trait values straight from the schema, shaped for AppSelect. */
function enumOptions(values: string[]) {
  return values.map((value) => ({ value, label: value }))
}
const tiers = ['T0', 'T1', 'T2', 'T3']
const levels = [
  { key: 'L0', title: 'Payments only', desc: 'Buy and sell in SRV — no on-chain items' },
  { key: 'L1', title: 'Receipts', desc: 'Purchase receipts anchored, items stay off-chain' },
  { key: 'L2', title: 'Tokenized items', desc: 'Ownership recorded on-chain' },
  { key: 'L3', title: 'Living Items · current', desc: 'Mutable traits + deed ledger' },
  { key: 'L4', title: 'Tokenized economy', desc: 'SRV-backed soft currency · needs economy review' },
  { key: 'L5', title: 'Full sovereignty', desc: 'Player-governed economy primitives' },
]

/* ── data ─────────────────────────────────────────────── */
const { data: studioRes } = await useAsyncData('studio-me', () =>
  api.one<any>('/api/v1/studios/me').catch(() => null),
)
const { data: gameRes, pending, error, refresh: refreshGame } = await useAsyncData('studio-game-manage', () =>
  api.one<any>(`/api/v1/games/${gameId.value}/manage`).catch((e) => { throw e }),
)
const { data: analyticsRes } = await useAsyncData('studio-analytics', () =>
  api.one<any>('/api/v1/studios/me/analytics', { query: { days: 30 } }).catch(() => null),
)
const { data: schemasRes } = await useAsyncData('studio-schemas', () =>
  api.many<any>('/api/v1/schemas').catch(() => ({ data: [], meta: { count: 0, hasMore: false, nextCursor: null } })),
)

const studio = computed<any>(() => studioRes.value ?? null)
const game = computed<any>(() => gameRes.value ?? null)
const items = computed<any[]>(() => game.value?.items ?? [])
const schemas = computed<any[]>(() => schemasRes.value?.data ?? [])
const activeSchemas = computed<any[]>(() => schemas.value.filter((schema) => schema.status === 'active'))

const loadError = computed(() => error.value)
const notFound = computed(() => (error.value as any)?.data?.error?.code === 'game_not_found' || (error.value as any)?.statusCode === 404)
const loadErrorMessage = computed(() => {
  const code = (loadError.value as any)?.data?.error?.code
  if (code === 'game_not_found') return 'This game does not exist or is not yours.'
  if (code === 'creator_required' || code === 'missing_session') return 'This area needs a creator account.'
  return 'Could not load this game.'
})

/* ── error helpers ────────────────────────────────────── */
const issues = ref<FieldIssue[]>([])
function fieldError(field: string) {
  return issues.value.find((issue) => issue.field === field)?.issue ?? ''
}
function clearField(field: string) {
  issues.value = issues.value.filter((issue) => issue.field !== field)
}

/* ── cover & media ────────────────────────────────────── */
const coverUrl = computed(() =>
  game.value?.coverArt?.url || seedAsset(`games/${game.value?.slug}-cover.png`),
)

/* ── DETAILS form ─────────────────────────────────────── */
const form = reactive({
  title: '',
  genre: 'action_rpg',
  buildType: 'web',
  blurb: '',
  description: '',
  buildUrl: '',
  tokenizationLevel: 'L0',
  coverArt: { url: '', gradient: '', emoji: '' },
})
const screenshots = ref<{ url: string; kind: 'screenshot' | 'video'; order: number }[]>([])
const shotDraft = ref('')
const saving = ref(false)
const toast = useToast()
const saveOk = ref(false)
const saveError = ref('')
const levelError = ref('')

watch(game, (value) => {
  if (!value) return
  form.title = value.title ?? ''
  form.genre = value.genre ?? 'action_rpg'
  form.buildType = value.buildType ?? 'web'
  form.blurb = value.blurb ?? ''
  form.description = value.description ?? ''
  form.buildUrl = value.buildUrl ?? ''
  form.tokenizationLevel = value.tokenizationLevel ?? 'L0'
  form.coverArt = {
    url: value.coverArt?.url ?? '',
    gradient: value.coverArt?.gradient ?? '',
    emoji: value.coverArt?.emoji ?? '',
  }
  screenshots.value = (value.media ?? [])
    .filter((m: any) => m.kind === 'screenshot')
    .map((m: any, index: number) => ({ url: m.url, kind: 'screenshot' as const, order: m.order ?? index }))
}, { immediate: true })

useHead(() => ({ title: `${game.value?.title ?? 'Game'} · Studio · Sverse` }))

/** True when the Basics form differs from what the server last returned, so Save is not a blind button. */
const detailsDirty = computed(() => {
  const saved = game.value
  if (!saved) return false
  const savedShots = (saved.media ?? [])
    .filter((m: any) => m.kind === 'screenshot')
    .map((m: any) => m.url)
  const formShots = screenshots.value.map((shot) => shot.url)
  const shotsDiffer = savedShots.length !== formShots.length || savedShots.some((url: string, i: number) => url !== formShots[i])
  return (
    form.title !== (saved.title ?? '')
    || form.genre !== (saved.genre ?? 'action_rpg')
    || form.buildType !== (saved.buildType ?? 'web')
    || form.blurb !== (saved.blurb ?? '')
    || form.description !== (saved.description ?? '')
    || form.buildUrl !== (saved.buildUrl ?? '')
    || form.tokenizationLevel !== (saved.tokenizationLevel ?? 'L0')
    || form.coverArt.url !== (saved.coverArt?.url ?? '')
    || form.coverArt.gradient !== (saved.coverArt?.gradient ?? '')
    || form.coverArt.emoji !== (saved.coverArt?.emoji ?? '')
    || shotsDiffer
  )
})

const gameLevelIndex = computed(() => levels.findIndex((level) => level.key === game.value?.tokenizationLevel))
function levelBelow(key: string) {
  const index = levels.findIndex((level) => level.key === key)
  return gameLevelIndex.value >= 0 && index < gameLevelIndex.value
}
function chooseLevel(key: string) {
  if (levelBelow(key)) return
  form.tokenizationLevel = key
  clearField('tokenizationLevel')
  levelError.value = ''
}

function addScreenshot() {
  const url = shotDraft.value.trim()
  if (!url) return
  screenshots.value.push({ url, kind: 'screenshot', order: screenshots.value.length })
  shotDraft.value = ''
}
function removeScreenshot(index: number) {
  screenshots.value.splice(index, 1)
  screenshots.value.forEach((shot, i) => { shot.order = i })
}

async function saveDetails() {
  if (saving.value) return
  saveOk.value = false
  saveError.value = ''
  issues.value = []
  /**
   * Mirror the server's `gameBody` rules (title 2–80, blurb ≤200, description ≤5000, buildUrl an
   * http(s) URL or empty) so mistakes land on the field instead of a generic failure.
   */
  const local: FieldIssue[] = []
  const title = form.title.trim()
  if (title.length < 2) local.push({ field: 'title', issue: 'Title needs at least 2 characters.' })
  else if (title.length > 80) local.push({ field: 'title', issue: 'Title must be 80 characters or fewer.' })

  if (String(form.blurb ?? '').length > 200) local.push({ field: 'blurb', issue: 'Blurb must be 200 characters or fewer.' })
  if (String(form.description ?? '').length > 5000) local.push({ field: 'description', issue: 'Description must be 5000 characters or fewer.' })

  const buildUrl = String(form.buildUrl ?? '').trim()
  if (buildUrl && !/^https?:\/\/\S+$/i.test(buildUrl)) local.push({ field: 'buildUrl', issue: 'Use a full http(s) URL, e.g. https://example.com/build.zip' })

  const coverUrl = String(form.coverArt.url ?? '').trim()
  if (coverUrl && !coverUrl.startsWith('/') && !/^https?:\/\//i.test(coverUrl)) local.push({ field: 'coverArt', issue: 'Use an http(s) URL or a /path.' })

  if (local.length) {
    issues.value = local
    saveError.value = 'Please fix the highlighted fields.'
    return
  }

  saving.value = true
  const body: Record<string, any> = {
    title,
    genre: form.genre,
    buildType: form.buildType,
    blurb: form.blurb,
    description: form.description,
    buildUrl,
    tokenizationLevel: form.tokenizationLevel,
    coverArt: { url: form.coverArt.url, gradient: form.coverArt.gradient, emoji: form.coverArt.emoji },
    media: screenshots.value.map((shot) => ({ url: shot.url, kind: shot.kind, order: shot.order })),
  }
  try {
    const saved = await api.one<any>(`/api/v1/games/${gameId.value}`, { method: 'PATCH', body })
    /**
     * Merge the server's answer into the local state instead of refetching `/manage`, which rebuilds
     * the page and makes the form flicker. `PATCH` returns the game summary (`mapGameSummary`), so
     * only the fields it actually carries are taken from it; the rest keep the values just submitted.
     */
    if (gameRes.value) {
      gameRes.value = {
        ...gameRes.value,
        id: saved?.id ?? gameRes.value.id,
        slug: saved?.slug ?? gameRes.value.slug,
        title: saved?.title ?? form.title,
        blurb: saved?.blurb ?? form.blurb,
        genre: saved?.genre ?? form.genre,
        status: saved?.status ?? gameRes.value.status,
        interopTier: saved?.interopTier ?? gameRes.value.interopTier,
        tokenizationLevel: saved?.tokenizationLevel ?? form.tokenizationLevel,
        coverArt: saved?.coverArt ?? gameRes.value.coverArt,
        // Not part of the summary — echo what was submitted so the form stays in sync with the model.
        buildType: form.buildType,
        description: form.description,
        buildUrl: form.buildUrl,
        media: screenshots.value.map((shot) => ({ url: shot.url, kind: shot.kind, order: shot.order })),
      }
      // The submitted body was trimmed; mirror that so dirty detection settles back to false.
      form.title = gameRes.value.title ?? ''
      form.buildUrl = gameRes.value.buildUrl ?? ''
    }
    saveOk.value = true
    setTimeout(() => { saveOk.value = false }, 4000)
    toast.push('Changes saved', `${form.title} was updated.`)
  } catch (raw: any) {
    issues.value = issuesOf(raw)
    const code = raw?.data?.error?.code
    if (code === 'level_downgrade_forbidden') {
      levelError.value = raw?.data?.error?.message ?? 'Ownership is not revocable'
      saveError.value = 'Please fix the highlighted field.'
    } else if (code === 'game_not_found') {
      saveError.value = 'This game no longer exists.'
    } else {
      saveError.value = issues.value.length ? 'Please fix the highlighted fields.' : messageOf(raw, 'Could not save changes.')
    }
  } finally {
    saving.value = false
  }
}

/* ── CATALOG ──────────────────────────────────────────── */
const itemModal = ref(false)
const editingItem = ref<Record<string, any> | null>(null)
const itemModalRef = ref<{ modalEl: HTMLElement | null; closeModal: () => void } | null>(null)

function openItemModal(item: Record<string, any> | null) {
  editingItem.value = item
  itemModal.value = true
}

async function onItemSaved(result: Record<string, any>) {
  const list = gameRes.value?.items
  if (Array.isArray(list) && result?.id) {
    const index = list.findIndex((entry: any) => entry.id === result.id)
    if (index >= 0) list.splice(index, 1, result)
    else list.push(result)
  } else {
    await refreshGame()
  }
  itemModal.value = false
}

/* ── archive ──────────────────────────────────────────── */
const archiveTarget = ref<any | null>(null)
const archiveModalRef = ref<{ modalEl: HTMLElement | null; closeModal: () => void } | null>(null)

function askArchive(item: any) {
  if (!item) return
  archiveTarget.value = item
}
async function onItemArchived() {
  await refreshGame()
  archiveTarget.value = null
  itemModal.value = false
}

/* ── CSV import ───────────────────────────────────────── */
const csvModal = ref(false)
const csvModalRef = ref<{ modalEl: HTMLElement | null; closeModal: () => void } | null>(null)

function openCsvModal() {
  csvModal.value = true
}

/* ── INTEROP envelope ─────────────────────────────────── */
const acceptModal = ref(false)
const acceptModalRef = ref<{ modalEl: HTMLElement | null; closeModal: () => void } | null>(null)

const envelopeForm = reactive<{
  acceptsTierMax: string
  accepts: EnvelopeAcceptEntry[]
  licenseRequirement: string
  feeSrv: string
  hostSharePct: string
  clampPolicy: 'reject' | 'clamp'
}>({
  acceptsTierMax: 'T2',
  accepts: [],
  licenseRequirement: 'display_only',
  feeSrv: '',
  hostSharePct: '50',
  clampPolicy: 'reject',
})

watch(game, (value) => {
  const envelope = value?.envelope
  if (!envelope) {
    envelopeForm.acceptsTierMax = 'T2'
    envelopeForm.accepts = []
    envelopeForm.licenseRequirement = 'display_only'
    envelopeForm.feeSrv = ''
    envelopeForm.hostSharePct = '50'
    envelopeForm.clampPolicy = 'reject'
    return
  }
  envelopeForm.acceptsTierMax = envelope.acceptsTierMax ?? 'T2'
  envelopeForm.accepts = (envelope.accepts ?? []).map((entry: EnvelopeAcceptEntry) => ({ ...entry, powerTierRange: [...(entry.powerTierRange ?? [])], mapping: { ...(entry.mapping ?? {}) } }))
  envelopeForm.licenseRequirement = envelope.licenseRequirement ?? 'display_only'
  envelopeForm.feeSrv = unitsToSrvInput(envelope.feeUnits)
  envelopeForm.hostSharePct = String(envelope.hostSharePct ?? 50)
  envelopeForm.clampPolicy = envelope.clampPolicy === 'clamp' ? 'clamp' : 'reject'
}, { immediate: true })

const savingEnvelope = ref(false)
const envelopeError = ref('')
const envelopeOk = ref(false)

function openAcceptModal() {
  acceptModal.value = true
}
function onAcceptAdded(entry: EnvelopeAcceptEntry) {
  envelopeForm.accepts.push(entry)
  acceptModal.value = false
}
function removeAccept(index: number) {
  envelopeForm.accepts.splice(index, 1)
}

async function saveEnvelope() {
  if (savingEnvelope.value) return
  savingEnvelope.value = true
  envelopeOk.value = false
  envelopeError.value = ''
  issues.value = []
  const body = {
    acceptsTierMax: envelopeForm.acceptsTierMax,
    accepts: envelopeForm.accepts.map((entry) => ({
      schemaId: entry.schemaId,
      tierMax: entry.tierMax,
      powerTierRange: entry.powerTierRange,
      mapping: entry.mapping ?? {},
      clampPolicy: entry.clampPolicy ?? envelopeForm.clampPolicy,
    })),
    licenseRequirement: envelopeForm.licenseRequirement,
    feeUnits: srvToUnits(envelopeForm.feeSrv) ?? '0',
    hostSharePct: Number(String(envelopeForm.hostSharePct).replace(/[^\d]/g, '') || '0'),
  }
  try {
    await api.one(`/api/v1/games/${gameId.value}/envelope`, { method: 'PUT', body })
    await refreshGame()
    envelopeOk.value = true
    toast.push('Interop envelope saved', 'Accepted schemas and mappings are updated.')
  } catch (raw: any) {
    issues.value = issuesOf(raw)
    envelopeError.value = issues.value.length ? 'Please fix the highlighted fields.' : messageOf(raw, 'Could not save the envelope.')
  } finally {
    savingEnvelope.value = false
  }
}

/* ── preview mapping ──────────────────────────────────── */
const previewEntry = ref<EnvelopeAcceptEntry | null>(null)
const previewModalRef = ref<{ modalEl: HTMLElement | null; closeModal: () => void } | null>(null)

function openPreview(entry: EnvelopeAcceptEntry) { previewEntry.value = entry }

/* ── modals: escape + focus trap ──────────────────────── */
function anyModalOpen() {
  return itemModal.value || csvModal.value || !!archiveTarget.value || acceptModal.value || !!previewEntry.value
}
const activeModalEl = computed<HTMLElement | null>(() => {
  if (previewEntry.value) return previewModalRef.value?.modalEl ?? null
  if (acceptModal.value) return acceptModalRef.value?.modalEl ?? null
  if (archiveTarget.value) return archiveModalRef.value?.modalEl ?? null
  if (csvModal.value) return csvModalRef.value?.modalEl ?? null
  if (itemModal.value) return itemModalRef.value?.modalEl ?? null
  return null
})

function closeActiveModal() {
  if (itemModal.value) itemModalRef.value?.closeModal()
  else if (csvModal.value) csvModalRef.value?.closeModal()
  else if (archiveTarget.value) archiveModalRef.value?.closeModal()
  else if (acceptModal.value) acceptModalRef.value?.closeModal()
  else if (previewEntry.value) previewModalRef.value?.closeModal()
}

useModalFocusTrap(anyModalOpen, activeModalEl, closeActiveModal)
</script>

<style scoped>
/* header */
.crumbs { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; margin-bottom: 16px; flex-wrap: wrap; }
.crumbs a:hover { color: var(--text); }

.ghead { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.ghead__art { width: 96px; height: 60px; border-radius: var(--r-sm); object-fit: cover; border: 1px solid var(--border); flex-shrink: 0; }
.ghead__meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 8px; }

/* details */
.dgrid { display: grid; grid-template-columns: 1fr 420px; gap: 30px; align-items: start; }

.blurb-warn { color: var(--amber); }

.savebar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--border);
}

.cover { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-radius: var(--r-md); border: 1px solid var(--border); }

.drop {
  display: block; width: 100%; margin-top: 12px; text-align: center;
  border: 1px dashed var(--border-2); border-radius: var(--r-md);
  padding: 16px; color: var(--text-dim); font-size: 0.85rem;
  background: var(--surface); cursor: pointer;
  transition: border-color 0.18s, color 0.18s;
}
.drop:hover:not(:disabled) { border-color: var(--pink); color: var(--text); }
.drop:disabled { opacity: 0.5; cursor: not-allowed; }

.mediarow { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
.mediarow figure { position: relative; width: 128px; margin: 0; }
.mediarow img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: var(--r-sm); border: 1px solid var(--border); }
.mediax {
  position: absolute; top: -6px; right: -6px; width: 22px; height: 22px; border-radius: 50%;
  background: var(--panel); border: 1px solid var(--border-2); font-size: 0.7rem; color: var(--text-dim);
  display: grid; place-items: center;
}
.mediax:hover { color: var(--text); border-color: var(--pink); }

.inlineacts { display: flex; gap: 8px; margin-top: 10px; }

.lvlpick { display: grid; gap: 9px; }
.lvl {
  display: flex; align-items: flex-start; gap: 13px; padding: 12px 15px; width: 100%; text-align: left;
  border-radius: 11px; background: var(--surface); border: 1px solid var(--border); cursor: pointer;
  color: var(--text); font: inherit; letter-spacing: normal;
}
.lvl:hover:not(.off) { border-color: var(--border-2); }
.lvl.on { border-color: var(--pink); background: rgba(233, 53, 193, 0.08); }
.lvl.off { opacity: 0.4; cursor: not-allowed; }
.lvl__k { flex: 0 0 auto; font-family: var(--mono); font-weight: 700; width: 28px; line-height: 1.6; }
.lvl__b { flex: 1 1 auto; min-width: 0; display: block; }
.lvl__t { font-size: 0.87rem; font-weight: 600; display: block; line-height: 1.45; }
.lvl__d { font-size: 0.78rem; color: var(--text-dim); display: block; line-height: 1.45; overflow-wrap: anywhere; }
.lvl__mark { flex: 0 0 auto; display: block; line-height: 1.6; }

/* responsive */
@media (max-width: 1400px) {
  .dgrid { grid-template-columns: 1fr 360px; }
}
@media (max-width: 1024px) {
  .dgrid { grid-template-columns: 1fr; }
}
@media (max-width: 375px) {
  .ghead__art { width: 100%; height: 150px; }
  .cover { aspect-ratio: 4 / 3; }
}
</style>
