<template>
  <StudioShell wide>
    <StudioAccess v-if="error" :error="error" />

    <template v-else-if="pending">
      <div class="phead">
        <div class="sk" style="height:12px;width:110px"></div>
        <div class="sk" style="height:30px;width:240px;margin-top:10px"></div>
        <div class="sk" style="height:14px;width:520px;max-width:100%;margin-top:10px"></div>
      </div>
      <div class="sk" style="height:40px;width:640px;max-width:100%;margin-bottom:26px;border-radius:var(--r-md)"></div>
      <div class="card card--pad"><div class="sk" style="height:340px"></div></div>
    </template>

    <template v-else-if="studio">
      <div class="wrap" :class="{ 'wrap--wide': currentStep === 3 && job?.mode === 'ai' }">
        <div class="phead">
          <p class="eyebrow">Sverse Build</p>
          <h1>Publish a game</h1>
          <p>No business entity, no KYB, no platform review queue. Target: under 30 minutes from finished build to live storefront.</p>
        </div>

        <ol class="steps" aria-label="Publish progress">
          <li
            v-for="(label, index) in STEP_LABELS"
            :key="label"
            :class="['step', { done: currentStep > index + 1, now: currentStep === index + 1 }]"
            :aria-current="currentStep === index + 1 ? 'step' : undefined"
          >
            <span class="step__n">{{ currentStep > index + 1 ? '✓' : index + 1 }}</span>{{ label }}
            <span v-if="index < STEP_LABELS.length - 1" class="step__line" aria-hidden="true"></span>
          </li>
        </ol>

        <PublishStep1
          v-if="currentStep === 1"
          :studio="studio"
          :source="source"
          :games="games"
          :selected-game-id="selectedGameId"
          :selected-game="selectedGame"
          :form="form"
          :genres="genres"
          :creating="creating"
          :can-create="canCreate"
          :create-error="createError"
          :form-error="formError"
          @update:source="source = $event"
          @update:selected-game-id="selectedGameId = $event"
          @start-run="startRun"
          @create-game="createGame"
          @clear-field="clearField"
        />

        <PublishStep2
          v-else-if="currentStep === 2"
          :game-title="gameTitle"
          :form="form"
          :levels="levels"
          :starting="starting"
          :start-error="startError"
          @back="currentStep = 1"
          @apply="applyIntegration"
        />

        <PublishStep3
          v-else-if="currentStep === 3 && job"
          :job="job"
          :draft-rows="draftRows"
          :row-issues="rowIssues"
          :live-items="liveItems"
          :approving="approving"
          :publishing="publishing"
          :poll-busy="pollBusy"
          :can-approve="canApprove"
          :inline-error="inlineError"
          :row-error="rowError"
          :agent-prompt="agentPrompt"
          :copied-prompt="copiedPrompt"
          @copy-prompt="copyAgentPrompt"
          @clear-row-issue="clearRowIssue"
          @remove-row="removeRow"
          @add-row="addRow"
          @approve-catalog="approveCatalog"
          @publish-manual="publishManual"
          @refresh="fetchJob()"
          @go-step4="currentStep = 4"
        />

        <PublishStep4
          v-else-if="job"
          :job="job"
          :studio="studio"
          :game-title="gameTitle"
          :cover-emoji="coverEmoji"
          :is-blocked-on-bond="isBlockedOnBond"
          :live-review-message="liveReviewMessage"
          :elapsed-label="elapsedLabel"
          :publish-checks="publishChecks"
          :minted-count="mintedCount"
          :minted-tier="mintedTier"
          :sandbox-label="sandboxLabel"
          @back="currentStep = 3"
          @reset="resetRun"
        />

        <PublishRecentRuns :runs="runs" @resume="resume" />
      </div>
    </template>
    <StudioAccess v-else />
  </StudioShell>
</template>

<script setup lang="ts">
import PublishRecentRuns from '~/components/studio/publish/PublishRecentRuns.vue'
import PublishStep1 from '~/components/studio/publish/PublishStep1.vue'
import PublishStep2 from '~/components/studio/publish/PublishStep2.vue'
import PublishStep3 from '~/components/studio/publish/PublishStep3.vue'
import PublishStep4 from '~/components/studio/publish/PublishStep4.vue'
import { messageOf } from '~/utils/studioGame'
import {
  buildAgentPrompt,
  buildUrlIsValid,
  coverUrlIsValid,
  errorTitleFor,
  formatElapsed,
  PUBLISH_GENRES,
  PUBLISH_LEVELS,
  publishCodeOf,
  publishErrorMessage,
  publishIssuesOf,
  publishSrvToUnits,
  priceToSrv,
  STEP_LABELS,
  stepForJob,
  validateDraftRows,
  type DraftRow,
  type GameRow,
  type LiveItemSummary,
  type Mode,
  type PublishJobRecord,
  type PublishStepCheck,
  type RowIssueField,
  type RowIssues,
  type StepIssue,
  type StepNumber,
  type StudioPublishSummary,
} from '~/utils/studioPublish'

definePageMeta({ layout: 'studio' })
useHead({ title: 'Publish a game · Studio · Sverse' })

const api = useApi()
const route = useRoute()
const router = useRouter()

const genres = PUBLISH_GENRES
const levels = PUBLISH_LEVELS

/* ── data ─────────────────────────────────────────────── */

const { data: studioRes, pending: studioPending, error: studioError } = await useAsyncData('studio-me', () =>
  api.one<StudioPublishSummary>('/api/v1/studios/me'),
)
const { data: gamesRes, refresh: refreshGames } = await useAsyncData('studio-publish-games', () =>
  api.many<GameRow>('/api/v1/studios/me/games').catch(() => ({ data: [], meta: { count: 0, hasMore: false, nextCursor: null } })),
)
const { data: runsRes, refresh: refreshRuns } = await useAsyncData('studio-publish-jobs', () =>
  api.many<PublishJobRecord>('/api/v1/publish/jobs').catch(() => ({ data: [], meta: { count: 0, hasMore: false, nextCursor: null } })),
)

const studio = computed<StudioPublishSummary | null>(() => studioRes.value ?? null)
const pending = computed(() => studioPending.value)
const error = computed(() => studioError.value)

const games = computed<GameRow[]>(() => gamesRes.value?.data ?? [])
const runs = computed<PublishJobRecord[]>(() => runsRes.value?.data ?? [])

/* ── step state ───────────────────────────────────────── */

const job = ref<PublishJobRecord | null>(null)
const currentStep = ref<StepNumber>(1)
const source = ref<'existing' | 'new'>('existing')

const isRunning = computed(() => job.value?.status === 'running')

/* ── step 1 ───────────────────────────────────────────── */

const selectedGameId = ref('')
/** The game returned by the create call, kept until the list refresh includes it. */
const draftGame = ref<GameRow | null>(null)
const selectedGame = computed(() => games.value.find((entry) => entry.id === selectedGameId.value) ?? (draftGame.value?.id === selectedGameId.value ? draftGame.value : null))

const form = reactive({
  title: '',
  genre: 'action_rpg',
  blurb: '',
  buildUrl: '',
  coverUrl: '',
  mode: 'ai' as Mode,
  level: 'L2',
})

const creating = ref(false)
const starting = ref(false)
const createError = ref('')
const startError = ref('')
const issues = ref<StepIssue[]>([])

/** A game cannot be created without a cover: the store would show a placeholder where art is expected. */
const canCreate = computed(() =>
  form.title.trim().length >= 2 && buildUrlIsValid(form.buildUrl) && coverUrlIsValid(form.coverUrl),
)

function clearField(field: string) {
  issues.value = issues.value.filter((issue) => issue.field !== field)
}
function formError(field: string) {
  return issues.value.find((issue) => issue.field === field)?.issue ?? ''
}

/* ── step 3 ───────────────────────────────────────────── */

const pollBusy = ref(false)
const approving = ref(false)
const publishing = ref(false)
const inlineError = ref<{ title: string; message: string; code?: string } | null>(null)
const rowError = ref('')

const draftRows = ref<DraftRow[]>([])
const normalized = ref<Array<Record<string, unknown>>>([])
/** Fingerprint of the catalog last taken from the server, so polls do not rebuild unchanged rows. */
const lastCatalogKey = ref('')
/** Fingerprint of the row contents, used to tell a server update from the creator typing. */
const lastRowShape = ref('')

/** Item definitions that already exist for this game — the real catalog, not this run's proposal. */
const liveItems = ref<LiveItemSummary[]>([])

const canApprove = computed(() => {
  if (!job.value || job.value.catalogApproved) return false
  if (!draftRows.value.length) return false
  if (job.value.mode === 'manual') return validateDraftRows(draftRows.value).ok
  const proposed = job.value.steps?.find((s) => s.step === 'propose_items')
  return proposed?.status === 'done'
})

/* ── derived ──────────────────────────────────────────── */

const isBlockedOnBond = computed(() => job.value?.game?.blockedReason === 'bond_required' && job.value?.status === 'done')
const publishStep = computed(() => job.value?.steps?.find((s) => s.step === 'publish'))
const publishChecks = computed<PublishStepCheck[]>(() => publishStep.value?.output?.checks ?? [])
const liveReviewMessage = computed(() => {
  const outcome = publishStep.value?.output?.outcome
  if (outcome === 'auto_approved' && publishChecks.value.length && publishChecks.value.every((check) => check.status === 'passed')) {
    return 'Automated review passed — malware scan, IP fingerprint, content policy.'
  }
  if (outcome === 'escalated' || outcome === 'approved') {
    return 'Approved by a moderator. The original automated scan results are shown below.'
  }
  return 'Your game has been approved and is available in the Store.'
})
const gameTitle = computed(() => job.value?.game?.title ?? selectedGame.value?.title ?? form.title ?? 'Your game')
const coverEmoji = computed(() => draftRows.value[0]?.emoji || '📦')

const mintedCount = computed(() => {
  const step = job.value?.steps?.find((s) => s.step === 'create_item_pack')
  return step?.output?.created ?? draftRows.value.length
})
const mintedTier = computed(() => {
  const item = normalized.value[0] ?? draftRows.value[0]
  return String((item as { interopTier?: string } | undefined)?.interopTier ?? 'T0')
})
const sandboxLabel = computed(() => {
  const step = job.value?.steps?.find((s) => s.step === 'test_purchase')
  if (step?.status !== 'done' || !step.output) return '—'
  return `${step.output.settled ? 'settled' : 'not settled'} · ${step.output.refunded ? 'refunded' : 'not refunded'}`
})

const elapsedLabel = computed(() => formatElapsed(job.value?.elapsedMs))

/* ── polling ──────────────────────────────────────────── */

let pollTimer: ReturnType<typeof setInterval> | null = null

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(() => {
    if (import.meta.client && document.visibilityState === 'hidden') return
    if (!job.value?.id || !isRunning.value) {
      stopPolling()
      return
    }
    void fetchJob({ silent: true })
  }, 1500)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onBeforeUnmount(stopPolling)

/* ── helpers ──────────────────────────────────────────── */

let rowSeq = 0
const rowIssues = ref<RowIssues>({})

function clearRowIssue(uid: string, field: RowIssueField) {
  const row = draftRows.value.find((entry) => entry.uid === uid)
  if (row?.pristine) row.pristine = false
  const entry = rowIssues.value[uid]
  if (!entry?.[field]) return
  delete entry[field]
  if (!entry.name && !entry.price && !entry.art) delete rowIssues.value[uid]
}

function rowFromDraft(item: Record<string, unknown>): DraftRow {
  const art = item.art as { url?: string } | undefined
  return {
    uid: `row_${++rowSeq}`,
    name: String(item.name ?? ''),
    price: priceToSrv((item.priceUnits ?? item.priceSrv) as string | number | null | undefined),
    emoji: String(item.emoji ?? ''),
    artUrl: String(art?.url ?? item.artUrl ?? ''),
    schemaId: String(item.schemaId ?? ''),
    interopTier: String(item.interopTier ?? 'T0'),
    slot: String(item.slot ?? ''),
    kind: String(item.kind ?? ''),
    raw: item,
  }
}

function stripTransientFields(rows: DraftRow[]) {
  return rows.map(({ uid: _uid, dirty: _dirty, pristine: _pristine, artBroken: _artBroken, ...rest }) => rest)
}

function adoptJob(next: PublishJobRecord | null, { step }: { step?: StepNumber } = {}) {
  job.value = next
  if (!next) return
  const incoming = next.draftCatalog ?? []
  const incomingKey = JSON.stringify(incoming)
  const dirty = draftRows.value.some((row) => row.dirty)
  if (incomingKey !== lastCatalogKey.value && !dirty) {
    draftRows.value = incoming.map(rowFromDraft)
    normalized.value = incoming
    lastCatalogKey.value = incomingKey
    lastRowShape.value = JSON.stringify(stripTransientFields(draftRows.value))
  } else if (!lastCatalogKey.value) {
    lastCatalogKey.value = incomingKey
  }
  const hasProgress = (next.steps ?? []).some((entry) => entry.status !== 'pending')
  if (next.mode && hasProgress) form.mode = next.mode === 'manual' ? 'manual' : 'ai'
  if (next.game?.title) form.title = next.game.title
  if (next.game?.tokenizationLevel) form.level = next.game.tokenizationLevel
  if (step) currentStep.value = step
  if (isRunning.value) startPolling()
  else stopPolling()
}

async function fetchJob(options: { silent?: boolean } = {}) {
  if (!job.value?.id) return
  if (!options.silent) pollBusy.value = true
  try {
    adoptJob(await api.one<PublishJobRecord>(`/api/v1/publish/jobs/${job.value.id}`))
    await loadLiveItems()
  } catch {
    // transient poll failure — keep the last good state
  } finally {
    if (!options.silent) pollBusy.value = false
  }
}

/** Reads the game's own item definitions so the page shows what is actually sellable right now. */
async function loadLiveItems() {
  const gameId = job.value?.gameId
  if (!gameId) {
    liveItems.value = []
    return
  }
  try {
    const managed = await api.one<{ items?: LiveItemSummary[] }>(`/api/v1/games/${gameId}/manage`)
    liveItems.value = managed?.items ?? []
  } catch {
    liveItems.value = []
  }
}

/* ── step 1 actions ───────────────────────────────────── */

async function createGame() {
  if (creating.value || !canCreate.value) return
  creating.value = true
  createError.value = ''
  issues.value = []
  const local: StepIssue[] = []
  if (!buildUrlIsValid(form.buildUrl)) local.push({ field: 'buildUrl', issue: 'Use a full http(s) URL, e.g. https://example.com/build.zip' })
  if (!String(form.coverUrl ?? '').trim()) local.push({ field: 'coverArt', issue: 'Add a cover image URL.' })
  else if (!coverUrlIsValid(form.coverUrl)) local.push({ field: 'coverArt', issue: 'Use an http(s) URL or a /path.' })
  if (local.length) {
    issues.value = local
    createError.value = 'Please fix the highlighted fields.'
    creating.value = false
    return
  }
  try {
    const game = await api.one<GameRow>('/api/v1/studios/me/games', {
      method: 'POST',
      body: {
        title: form.title.trim(),
        genre: form.genre,
        blurb: form.blurb.trim(),
        tokenizationLevel: form.level,
        ...(form.buildUrl.trim() ? { buildUrl: form.buildUrl.trim() } : {}),
        coverArt: { url: form.coverUrl.trim() },
      },
    })
    selectedGameId.value = game.id
    draftGame.value = game
    source.value = 'existing'
    await refreshGames()
    currentStep.value = 2
  } catch (raw: unknown) {
    issues.value = publishIssuesOf(raw)
    createError.value = issues.value.length ? 'Please fix the highlighted fields.' : messageOf(raw, 'Could not create the game.')
  } finally {
    creating.value = false
  }
}

function startRun() {
  if (!selectedGameId.value || starting.value) return
  startError.value = ''
  currentStep.value = 2
}

/* ── step 2 actions ───────────────────────────────────── */

async function applyIntegration() {
  if (starting.value) return
  starting.value = true
  startError.value = ''
  try {
    if (!job.value?.id) {
      if (!selectedGameId.value) throw new Error('Pick or create a game first.')
      const created = await api.one<PublishJobRecord>('/api/v1/publish/jobs', {
        method: 'POST',
        body: { mode: form.mode, gameId: selectedGameId.value },
      })
      adoptJob(created, { step: 3 })
      await refreshRuns()
      return
    }

    if (form.level) {
      await api.one(`/api/v1/games/${job.value.gameId}`, { method: 'PATCH', body: { tokenizationLevel: form.level } }).catch(() => null)
    }
    if (job.value.mode !== form.mode) {
      startError.value = `This run was started as ${job.value.mode === 'manual' ? 'Manual' : 'AI-assisted'}, so it cannot switch now. Use "Publish another" to start a fresh run with ${form.mode === 'manual' ? 'Manual' : 'AI-assisted'}.`
      return
    }
    currentStep.value = 3
  } catch (raw: unknown) {
    startError.value = messageOf(raw, 'Could not start the run.')
  } finally {
    starting.value = false
  }
}

/* ── step 3 actions ───────────────────────────────────── */

async function approveCatalog() {
  if (!job.value?.id || approving.value || !canApprove.value) return
  inlineError.value = null
  rowError.value = ''
  rowIssues.value = {}
  if (job.value.mode === 'manual' && !job.value.game?.buildUrl) {
    inlineError.value = {
      title: 'Build URL required',
      message: 'Add a build URL on the game page — review scans it before the game can go live.',
      code: 'build_required',
    }
    return
  }
  approving.value = true
  try {
    let body: Record<string, unknown> = {}
    if (job.value.mode === 'manual') {
      const check = validateDraftRows(draftRows.value)
      rowIssues.value = check.issues
      if (!check.ok) {
        rowError.value = check.summary
        return
      }
      body = {
        draft: draftRows.value.map((row) => ({
          name: row.name.trim(),
          kind: row.kind || 'cosmetic',
          priceUnits: publishSrvToUnits(row.price),
          ...(row.schemaId ? { schemaId: row.schemaId } : {}),
          ...(row.slot ? { slot: row.slot } : {}),
          ...(row.emoji || row.artUrl ? { art: { ...(row.artUrl ? { url: row.artUrl.trim() } : {}), ...(row.emoji ? { emoji: row.emoji } : {}) } } : {}),
        })),
      }
    }
    let approved = await api.one<PublishJobRecord>(`/api/v1/publish/jobs/${job.value.id}/approve-catalog`, { method: 'POST', body })

    if (job.value.mode === 'manual') {
      const mapStep = approved.steps?.find((step) => step.step === 'map_to_schema')
      if (mapStep && mapStep.status !== 'done') {
        approved = await api.one<PublishJobRecord>(`/api/v1/publish/jobs/${job.value.id}/steps/map_to_schema`, {
          method: 'POST',
          body: { overrides: {} },
        })
      }
    }

    adoptJob(approved)
    await refreshRuns()
  } catch (raw: unknown) {
    rowError.value = messageOf(raw, 'Could not approve the catalog.')
    inlineError.value = { title: errorTitleFor(publishCodeOf(raw)), message: rowError.value, code: publishCodeOf(raw) }
  } finally {
    approving.value = false
  }
}

async function publishManual() {
  if (!job.value?.id || publishing.value) return
  publishing.value = true
  inlineError.value = null
  try {
    let current = job.value
    const hasStep = (name: string) => (current.steps ?? []).some((step) => step.step === name)
    const stepDone = (name: string) => (current.steps ?? []).some((step) => step.step === name && step.status === 'done')
    const runIfNeeded = async (name: string, body: Record<string, unknown> = {}) => {
      if (!hasStep(name) || stepDone(name)) return
      current = await api.one<PublishJobRecord>(`/api/v1/publish/jobs/${current.id}/steps/${name}`, { method: 'POST', body })
    }

    await runIfNeeded('map_to_schema', { overrides: {} })
    await runIfNeeded('create_item_pack')
    const published = await api.one<PublishJobRecord>(`/api/v1/publish/jobs/${current.id}/steps/publish`, { method: 'POST', body: {} })
    adoptJob(published, { step: 4 })
    await loadLiveItems()
    await refreshRuns()
  } catch (raw: unknown) {
    inlineError.value = { title: errorTitleFor(publishCodeOf(raw)), message: publishErrorMessage(raw), code: publishCodeOf(raw) }
  } finally {
    publishing.value = false
  }
}

function addRow() {
  const nextRow: DraftRow = {
    uid: `row_${++rowSeq}`,
    name: '',
    price: '',
    emoji: '',
    artUrl: '',
    schemaId: '',
    interopTier: '',
    slot: '',
    kind: 'cosmetic',
    raw: {},
    dirty: true,
    pristine: true,
  }
  lastRowShape.value = JSON.stringify(stripTransientFields(draftRows.value))
  draftRows.value.push(nextRow)
  lastRowShape.value = JSON.stringify(stripTransientFields(draftRows.value))
}

function removeRow(index: number) {
  const [removed] = draftRows.value.splice(index, 1)
  if (removed?.uid) delete rowIssues.value[removed.uid]
  if (!draftRows.value.length) rowError.value = ''
}

/* ── navigation ───────────────────────────────────────── */

function resume(entry: PublishJobRecord) {
  adoptJob(entry, { step: entry.status === 'done' ? 4 : 3 })
}

function resetRun() {
  stopPolling()
  job.value = null
  draftRows.value = []
  normalized.value = []
  currentStep.value = 1
  source.value = 'existing'
  selectedGameId.value = ''
  form.title = ''
  form.blurb = ''
  form.buildUrl = ''
  form.coverUrl = ''
  inlineError.value = null
  rowError.value = ''
  void router.replace({ query: {} })
}

/* ── agent prompt ─────────────────────────────────────── */

const copiedPrompt = ref(false)
const agentPrompt = computed(() => buildAgentPrompt(job.value))

async function copyAgentPrompt() {
  try {
    await navigator.clipboard.writeText(agentPrompt.value)
    copiedPrompt.value = true
    window.setTimeout(() => { copiedPrompt.value = false }, 1600)
  } catch {
    copiedPrompt.value = false
  }
}

/* ── deep links + resume ──────────────────────────────── */

onMounted(async () => {
  const queryJob = String(route.query.job ?? '')
  const queryGame = String(route.query.game ?? '')

  if (queryJob) {
    try {
      const loaded = await api.one<PublishJobRecord>(`/api/v1/publish/jobs/${queryJob}`)
      adoptJob(loaded, { step: stepForJob(loaded) })
      await loadLiveItems()
      return
    } catch {
      // fall through to a fresh start
    }
  }

  if (queryGame) {
    selectedGameId.value = queryGame
    source.value = 'existing'
    currentStep.value = 1
    return
  }

  currentStep.value = 1
})

watch(
  draftRows,
  (rows) => {
    const current = JSON.stringify(stripTransientFields(rows))
    if (current !== lastRowShape.value) {
      lastRowShape.value = current
      for (const row of rows) row.dirty = true
    }
    if (job.value?.mode !== 'manual') return
    const { issues } = validateDraftRows(rows)
    const next: RowIssues = {}
    for (const row of rows) {
      if (row.pristine) continue
      const issue = issues[row.uid]
      if (issue) next[row.uid] = issue
    }
    rowIssues.value = next
  },
  { deep: true },
)

watch(() => job.value?.id, (id) => {
  if (route.path !== '/studio/publish') return
  const query: Record<string, string | string[] | undefined | null> = { ...(route.query as Record<string, string | string[] | undefined | null>) }
  delete query.tab
  delete query.game
  if (id) query.job = id
  else delete query.job
  void router.replace({ path: '/studio/publish', query })
})
</script>

<style scoped>
.wrap { max-width: 860px; }
.wrap--wide { max-width: 1240px; }

.steps { display: flex; gap: 0; list-style: none; margin: 0 0 26px; padding: 0; }
.step {
  display: flex; align-items: center; gap: 8px; position: relative;
  flex: 1; font-size: .8rem; color: var(--text-dim); padding-right: 14px;
}
.step__n {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  display: grid; place-items: center;
  font-family: var(--mono); font-size: .7rem; font-weight: 700;
  background: var(--surface-2); border: 1px solid var(--border-2);
}
.step.now { color: var(--text); }
.step.now .step__n { background: var(--pink); border-color: var(--pink); color: #fff; }
.step.done { color: var(--text); }
.step.done .step__n { background: transparent; border-color: var(--green, #28c840); color: var(--green, #28c840); }
.step__line { position: absolute; right: 0; top: 50%; width: 10px; height: 1px; background: var(--border-2); }

@media (max-width: 768px) {
  .steps { flex-direction: column; gap: 8px; }
  .step__line { display: none; }
}
</style>
