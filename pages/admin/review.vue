<template>
  <StudioShell>
    <div v-if="!canReview" class="empty">
      <p class="empty__i">🔒</p>
      <p>This page needs a moderator account.</p>
      <p class="t-small dim">Admin routes return 404 to non-staff by design, so the console's existence is not revealed.</p>
      <NuxtLink class="btn btn--grad btn--sm" to="/studio">Back to Studio</NuxtLink>
    </div>

    <template v-else>
      <div class="phead">
        <p class="eyebrow">Moderation</p>
        <h1>Review queue</h1>
        <p>Cases the automated checks could not clear. Submissions that passed every check are approved without appearing here.</p>
      </div>

      <div class="filter">
        <button
          v-for="option in FILTERS"
          :key="option.value"
          class="fchip"
          :class="{ on: outcomeFilter === option.value }"
          type="button"
          @click="outcomeFilter = option.value"
        >{{ option.label }}<span v-if="countFor(option.value)" class="fchip__n">{{ countFor(option.value) }}</span></button>
        <button class="btn btn--ghost btn--sm" style="margin-left:auto" type="button" :disabled="loading" @click="load">
          {{ loading ? 'Refreshing…' : 'Refresh' }}
        </button>
      </div>

      <div v-if="loadError" class="note note--bad" style="margin-top:16px">
        <span class="note__i">⚠️</span>
        <div>{{ loadError }}</div>
      </div>

      <div v-if="loading && !cases.length" class="sk" style="height:220px;border-radius:var(--r-lg);margin-top:16px"></div>

      <div v-else-if="!visible.length" class="empty" style="margin-top:20px">
        <p class="empty__i">✓</p>
        <p>{{ outcomeFilter === 'escalated' ? 'Nothing waiting for review.' : 'No cases match this filter.' }}</p>
      </div>

      <div v-else class="cases">
        <article v-for="entry in visible" :key="entry.id" class="case" :class="`case--${entry.status}`">
          <header class="case__h">
            <div class="case__id">
              <span :class="outcomeChip(entry)">{{ outcomeLabel(entry) }}</span>
              <b>{{ entry.game?.title ?? 'Unknown game' }}</b>
              <span class="dim t-small">@{{ entry.studio?.handle ?? entry.game?.studio ?? '—' }}</span>
            </div>
            <span class="dim t-small t-mono">{{ entry.id }}</span>
          </header>

          <dl class="case__meta">
            <div><dt>Kind</dt><dd class="t-mono">{{ entry.kind }}</dd></div>
            <div><dt>Game status</dt><dd>{{ gameStatusLabel(entry) }}</dd></div>
            <div v-if="entry.studio"><dt>Studio strikes</dt><dd>{{ entry.studio.strikes }}</dd></div>
            <div v-if="entry.game?.buildUrl"><dt>Build</dt><dd class="t-mono break">{{ entry.game.buildUrl }}</dd></div>
            <div><dt>Opened</dt><dd>{{ formatWhen(entry.createdAt) }}</dd></div>
          </dl>

          <div v-if="entry.checks?.length" class="case__checks">
            <p class="t-micro dim" style="margin-bottom:6px">Checks</p>
            <div v-for="check in entry.checks" :key="check.name" class="chk" :class="`chk--${check.status}`">
              <span class="chk__mark">{{ check.status === 'flagged' ? '!' : check.status === 'passed' ? '✓' : '·' }}</span>
              <span class="chk__name t-mono">{{ check.name }}</span>
              <span class="chk__detail dim">{{ check.detail || check.status }}</span>
            </div>
          </div>

          <p v-if="entry.reason" class="case__reason"><b>Reason:</b> {{ entry.reason }}</p>

          <div v-if="isActionable(entry)" class="case__acts">
            <input v-model.trim="drafts[entry.id]" class="reason" maxlength="1000" placeholder="Reason (required, 3+ characters)">
            <button
              class="btn btn--grad btn--sm"
              type="button"
              :disabled="busyId === entry.id || (drafts[entry.id] ?? '').trim().length < 3"
              @click="act(entry, 'approve')"
            >{{ busyId === entry.id ? 'Working…' : actionLabel(entry, 'approve') }}</button>
            <button
              class="btn btn--ghost btn--sm btn--danger"
              type="button"
              :disabled="busyId === entry.id || (drafts[entry.id] ?? '').trim().length < 3"
              @click="act(entry, 'reject')"
            >{{ actionLabel(entry, 'reject') }}</button>
          </div>
          <p v-else-if="entry.reviewedAt" class="t-small dim" style="margin-top:10px">
            Reviewed {{ formatWhen(entry.reviewedAt) }}
          </p>

          <div v-if="rowErrors[entry.id]" class="note note--bad" style="margin-top:12px">
            <span class="note__i">⚠️</span>
            <div>{{ rowErrors[entry.id] }}</div>
          </div>
        </article>
      </div>
    </template>
  </StudioShell>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'studio' })

useHead({ title: 'Review queue · Moderation · Sverse' })

interface Check { name: string; status: string; evidence?: unknown; detail?: string }
interface ReviewCase {
  id: string
  kind: string
  outcome: string
  status: string
  submissionNo: number
  game: { id: string; slug: string; title: string; status: string; blockedReason?: string; buildUrl?: string; studio?: string } | null
  studio: { id: string; handle: string; strikes: number; status: string } | null
  checks: Check[]
  reason: string | null
  reviewedAt: string | null
  createdAt: string
}

type OutcomeFilter = '' | 'escalated' | 'auto_approved' | 'approved' | 'rejected'

const FILTERS: { value: OutcomeFilter; label: string }[] = [
  { value: 'escalated', label: 'Needs review' },
  { value: '', label: 'All' },
  { value: 'auto_approved', label: 'Auto-approved' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const api = useApi()
const toast = useToast()
const { user } = useSession()

/**
 * Admin routes 404 for non-staff, so the gate is only for UX — the API stays the authority.
 * A creator without the role never sees a queue, and never learns the route exists.
 */
const canReview = computed(() => Boolean(user.value?.roles?.includes('moderator') || user.value?.roles?.includes('admin')))

const cases = ref<ReviewCase[]>([])
const loading = ref(false)
const loadError = ref('')
const outcomeFilter = ref<OutcomeFilter>('escalated')
const busyId = ref('')
const drafts = reactive<Record<string, string>>({})
const rowErrors = reactive<Record<string, string>>({})

const visible = computed(() => {
  if (!outcomeFilter.value) return cases.value
  const want = outcomeFilter.value
  return cases.value.filter((entry) => entry.outcome === want)
})

function countFor(filter: OutcomeFilter): number {
  if (!cases.value.length) return 0
  return filter ? cases.value.filter((entry) => entry.outcome === filter).length : cases.value.length
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await api.many<ReviewCase>('/admin/v1/review-cases')
    cases.value = res.data ?? []
  } catch (raw: any) {
    const code = raw?.data?.error?.code ?? ''
    loadError.value = code === 'route_not_found' || raw?.status === 404
      ? 'This account cannot see the review queue.'
      : (raw?.data?.error?.message ?? 'Could not load review cases.')
  } finally {
    loading.value = false
  }
}

/** Submission cases are resolved through the game endpoints; everything else through the case. */
function isActionable(entry: ReviewCase): boolean {
  return entry.outcome === 'escalated' || entry.outcome === 'pending'
}

function actionLabel(entry: ReviewCase, verb: 'approve' | 'reject'): string {
  if (entry.kind === 'game_submission') return verb === 'approve' ? 'Approve & publish' : 'Reject submission'
  return verb === 'approve' ? 'Uphold case' : 'Dismiss case'
}

async function act(entry: ReviewCase, verb: 'approve' | 'reject') {
  if (busyId.value) return
  const reason = (drafts[entry.id] ?? '').trim()
  if (reason.length < 3) return
  busyId.value = entry.id
  delete rowErrors[entry.id]
  try {
    if (entry.kind === 'game_submission') {
      const path = verb === 'approve' ? 'approve' : 'reject'
      // approve takes an optional reason; reject requires one.
      await api.one(`/admin/v1/games/${entry.game?.id}/${path}`, { method: 'POST', body: { reason } })
    } else {
      await api.one(`/admin/v1/review-cases/${entry.id}/resolve`, {
        method: 'POST',
        body: { outcome: verb === 'approve' ? 'upheld' : 'dismissed', reason },
      })
    }
    delete drafts[entry.id]
    await load()
    const title = entry.game?.title ?? 'Case'
    if (entry.kind === 'game_submission') {
      if (verb === 'approve') toast.push('Game approved', `${title} is approved. If the studio bond is short it stays in review.`, '✅')
      else toast.push('Submission rejected', `${title} was rejected; the studio has been emailed your reason.`, '🚫')
    } else if (verb === 'approve') {
      toast.push('Case upheld', `The violation on ${title} stands; the studio keeps its strike.`, '⚖️')
    } else {
      toast.push('Case dismissed', `The case on ${title} was dismissed; one strike was removed.`, '↩️')
    }
  } catch (raw: any) {
    rowErrors[entry.id] = raw?.data?.error?.message ?? 'That action failed.'
  } finally {
    busyId.value = ''
  }
}

function outcomeLabel(entry: ReviewCase): string {
  switch (entry.outcome) {
    case 'escalated': return 'needs review'
    case 'auto_approved': return 'auto-approved'
    case 'approved': return 'approved'
    case 'rejected': return 'rejected'
    case 'upheld': return 'upheld'
    case 'dismissed': return 'dismissed'
    case 'pending': return 'pending'
    default: return entry.outcome
  }
}

function outcomeChip(entry: ReviewCase): string {
  if (entry.outcome === 'escalated' || entry.outcome === 'pending') return 'chip chip--warn'
  if (entry.outcome === 'rejected' || entry.outcome === 'upheld') return 'chip chip--bad'
  return 'chip chip--live'
}

function gameStatusLabel(entry: ReviewCase): string {
  if (!entry.game) return '—'
  return entry.game.blockedReason ? `${entry.game.status} · ${entry.game.blockedReason}` : entry.game.status
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  if (canReview.value) void load()
})
</script>

<style scoped>
.filter { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 18px; }
.fchip {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 13px; border-radius: 999px; font: inherit; font-size: .8rem; cursor: pointer;
  background: var(--surface); border: 1px solid var(--border); color: var(--text-dim);
}
.fchip:hover { border-color: var(--border-2); color: var(--text); }
.fchip.on { background: var(--pink); border-color: var(--pink); color: #fff; }
.fchip__n {
  font-family: var(--mono); font-size: .68rem; font-weight: 700;
  padding: 1px 6px; border-radius: 999px; background: rgba(0, 0, 0, .22);
}

.cases { display: grid; gap: 14px; }
.case {
  border: 1px solid var(--border); border-radius: var(--r-lg);
  background: var(--surface); padding: 18px 20px;
}
.case--needs_review { border-color: rgba(254, 188, 46, .34); }
.case__h { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.case__id { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.case__meta { display: flex; flex-wrap: wrap; gap: 8px 26px; margin: 14px 0 0; }
.case__meta div { display: flex; gap: 7px; align-items: baseline; }
.case__meta dt { font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: var(--text-dim); }
.case__meta dd { margin: 0; font-size: .82rem; }
.break { word-break: break-all; max-width: 340px; }

.case__checks { margin-top: 14px; }
.chk { display: flex; gap: 9px; align-items: baseline; font-size: .8rem; padding: 3px 0; }
.chk__mark { width: 16px; text-align: center; font-weight: 700; font-family: var(--mono); flex-shrink: 0; }
.chk--flagged .chk__mark { color: var(--red, #ff5f57); }
.chk--passed .chk__mark { color: var(--green, #28c840); }
.chk__name { flex-shrink: 0; min-width: 168px; }
.chk__detail { min-width: 0; }

.case__reason { margin: 12px 0 0; font-size: .82rem; }

.case__acts { display: flex; gap: 9px; flex-wrap: wrap; margin-top: 16px; align-items: center; }
.reason {
  flex: 1; min-width: 220px; padding: 8px 12px; border-radius: 9px; font: inherit; font-size: .82rem;
  background: var(--bg-2); border: 1px solid var(--border); color: var(--text);
}
.reason:focus { outline: none; border-color: var(--pink); }
</style>
