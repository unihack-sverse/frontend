<template>
  <StudioShell>
    <div v-if="error" class="empty">
      <p class="empty__i">⚠️</p>
      <p>{{ errorMessage }}</p>
      <NuxtLink class="btn btn--grad btn--sm" to="/login?next=/studio/settings">Sign in as a creator</NuxtLink>
    </div>

    <template v-else-if="studioPending">
      <div class="phead">
        <div class="sk" style="height:12px;width:110px"></div>
        <div class="sk" style="height:28px;width:180px;margin-top:10px"></div>
      </div>
      <div class="sk" style="height:44px;width:520px;border-radius:var(--r-md);margin-bottom:24px"></div>
      <div class="sgrid">
        <div class="card card--pad"><div class="sk" style="height:340px"></div></div>
        <div class="card card--pad"><div class="sk" style="height:220px"></div></div>
      </div>
    </template>

    <template v-else-if="studio">
      <div class="phead">
        <p class="eyebrow">Studio settings</p>
        <h1>@{{ studio.handle }}</h1>
      </div>

      <div class="tabs">
        <button :class="{ on: activeTab === 'profile' }" type="button" @click="setTab('profile')">Profile</button>
        <button :class="{ on: activeTab === 'keys' }" type="button" @click="setTab('keys')">API keys</button>
        <button :class="{ on: activeTab === 'hooks' }" type="button" @click="setTab('hooks')">Webhooks</button>
        <button :class="{ on: activeTab === 'attest' }" type="button" @click="setTab('attest')">Attestation</button>
      </div>

      <!-- ══ PROFILE ══ -->
      <section v-show="activeTab === 'profile'" class="pane on">
        <div class="sgrid">
          <div class="card card--pad">
            <p class="sect" style="margin-top:0">Studio identity</p>

            <div class="idrow">
              <img class="idrow__av" :src="form.avatarUrl || studio.avatarUrl || seedAsset('studios/voidrunner.png')" alt="">
              <div class="idrow__b">
                <button class="btn btn--ghost btn--sm" type="button" :disabled="saving" @click="openAvatarPrompt">Replace avatar</button>
                <p class="t-micro dim" style="margin-top:9px">Paste an image URL — no upload endpoint yet.</p>
              </div>
            </div>

            <div v-if="avatarEditing" class="field">
              <label>Avatar URL</label>
              <input v-model.trim="form.avatarUrl" type="url" placeholder="https://…/avatar.png" :disabled="saving">
              <p class="field__hint">A direct link to a square image works best.</p>
            </div>

            <div class="field">
              <label>Handle <span class="dim">· immutable</span></label>
              <input :value="studio.handle" disabled>
              <p class="field__hint">The handle is your permanent public identity — it cannot be changed after the studio is created.</p>
            </div>

            <div class="field" :class="{ bad: fieldError('displayName') }">
              <label>Display name</label>
              <input v-model.trim="form.displayName" maxlength="60" :disabled="saving">
              <p v-if="fieldError('displayName')" class="field__err">{{ fieldError('displayName') }}</p>
            </div>

            <div class="field" :class="{ bad: fieldError('bio') }">
              <label>Bio</label>
              <textarea v-model="form.bio" maxlength="500" :disabled="saving"></textarea>
              <p v-if="fieldError('bio')" class="field__err">{{ fieldError('bio') }}</p>
              <p v-else class="field__hint">{{ form.bio ? form.bio.length : 0 }}/500</p>
            </div>

            <div class="f2">
              <div class="field" :class="{ bad: fieldError('links.site') }">
                <label>Website</label>
                <input v-model.trim="form.site" type="url" placeholder="https://…" :disabled="saving">
                <p v-if="fieldError('links.site')" class="field__err">{{ fieldError('links.site') }}</p>
              </div>
              <div class="field" :class="{ bad: fieldError('links.x') }">
                <label>X / Twitter</label>
                <input v-model.trim="form.x" type="url" placeholder="https://x.com/…" :disabled="saving">
                <p v-if="fieldError('links.x')" class="field__err">{{ fieldError('links.x') }}</p>
              </div>
            </div>

            <label class="onerow">
              <span class="toggle" :class="{ on: studio.oneHumanStudio }"></span>
              <span>
                <b>One-human studio</b><br>
                <span class="t-small dim">
                  {{ studio.oneHumanStudio
                    ? 'You attested you are the sole owner and operator of this studio.'
                    : 'Not attested for this studio.' }}
                  This attestation cannot be changed after registration.
                </span>
              </span>
            </label>

            <div v-if="saveError" class="note note--bad" style="margin-top:18px">
              <span class="note__i">⚠️</span>
              <div>{{ saveError }}</div>
            </div>
            <div v-else-if="saveOk" class="note" style="margin-top:18px">
              <span class="note__i">✓</span>
              <div><b>Profile saved.</b> Your public studio page is updated.</div>
            </div>

            <button class="btn btn--grad savebtn" type="button" :disabled="saving" @click="saveProfile">
              {{ saving ? 'Saving…' : 'Save profile' }}
            </button>
          </div>

          <div>
            <div class="card card--pad feecard">
              <p class="sect" style="margin-top:0">Fee tier</p>
              <p class="feecard__n">{{ feePercent }}%</p>
              <p class="t-small dim">{{ capitalize(String(studio.feeTier ?? 'standard')) }} tier · {{ formatSrv(String(bondedUnits), { suffix: true }) }} staked</p>
              <NuxtLink class="btn btn--ghost btn--full btn--sm" to="/studio/payouts" style="margin-top:14px">{{ tierCta }}</NuxtLink>
            </div>

            <div class="card card--pad" style="margin-top:18px">
              <p class="sect" style="margin-top:0">Standing</p>
              <div class="rows">
                <div><span>Reputation</span><strong class="grad-text">★ {{ formatNum(reputation) }}</strong></div>
                <div><span>Strikes</span><strong :class="studio.strikes ? 'vu' : 'vf'">{{ studio.strikes ?? 0 }}</strong></div>
                <div><span>Listing bond</span><strong>{{ studio.bond?.balanceSrv ?? '0.00' }} SRV staked</strong></div>
                <div><span>Genesis cohort</span><strong>{{ studio.genesis ? 'Founding member' : 'Not in cohort' }}</strong></div>
              </div>
              <div class="note" style="margin-top:14px;font-size:.8rem">
                <span class="note__i">🛡</span>
                <div>
                  {{ studio.strikes
                    ? 'Open strikes keep new games in manual review. Clear them by resolving the flagged content.'
                    : 'Zero strikes keeps you on the auto-approve path — new games publish without a human review. Your bond is slashable for fraud or IP infringement.' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SettingsKeysTab
        :visible="activeTab === 'keys'"
        :keys-pending="keysPending"
        :keys="keys"
        :games="games"
        :revoking-id="revokingId"
        :key-list-error="keyListError"
        @open-create="openKeyModal"
        @revoke="revokeKey"
      />

      <SettingsWebhooksTab
        :visible="activeTab === 'hooks'"
        :hooks-pending="hooksPending"
        :endpoints="endpoints"
        :deliveries="deliveries"
        :available-events="availableEvents"
        :editing-endpoint="editingEndpoint"
        :deleting-hook-id="deletingHookId"
        :replaying-id="replayingId"
        :subscribing="subscribing"
        :hook-error="hookError"
        :copied-id="copiedId"
        @open-create="openHookModal"
        @edit-endpoint="editEndpoint"
        @delete-endpoint="deleteEndpoint"
        @replay="replay"
        @toggle-event="toggleEvent"
        @copy="copy"
      />

      <SettingsAttestTab
        :visible="activeTab === 'attest'"
        :key-count="keyCount"
      />
    </template>

    <NewApiKeyModal
      :open="keyModal"
      :games="games"
      :scope-options="scopeOptions"
      :copied-id="copiedId"
      @close="keyModal = false"
      @created="refreshKeys"
      @copy="copy"
    />

    <WebhookModal
      :open="hookModal"
      :endpoint="hookModalEndpoint"
      :available-events="availableEvents"
      @close="hookModal = false"
      @saved="onHookSaved"
    />
  </StudioShell>
</template>

<script setup lang="ts">
import NewApiKeyModal from '~/components/studio/settings/NewApiKeyModal.vue'
import SettingsAttestTab from '~/components/studio/settings/SettingsAttestTab.vue'
import SettingsKeysTab from '~/components/studio/settings/SettingsKeysTab.vue'
import SettingsWebhooksTab from '~/components/studio/settings/SettingsWebhooksTab.vue'
import WebhookModal from '~/components/studio/settings/WebhookModal.vue'
import { issuesOf, messageOf, type FieldIssue } from '~/utils/studioGame'
import {
  computeTierCta,
  fieldErrorFrom,
  type ApiKeyRecord,
  type ApiKeyScope,
  type SettingsGameRef,
  type SettingsTab,
  type StudioSettingsSummary,
  type WebhookDeliveryRecord,
  type WebhookEndpointRecord,
} from '~/utils/studioSettings'

definePageMeta({ layout: 'studio' })

useHead({ title: 'Studio settings · Sverse' })

const api = useApi()
const route = useRoute()
const router = useRouter()
const { seedAsset, formatSrv, formatNum, capitalize } = useStudioFormat()

const TABS: SettingsTab[] = ['profile', 'keys', 'hooks', 'attest']
const scopeOptions: ApiKeyScope[] = ['game', 'publish', 'read']

const activeTab = computed<SettingsTab>(() => {
  const value = String(route.query.tab ?? '')
  return (TABS as string[]).includes(value) ? (value as SettingsTab) : 'profile'
})

function setTab(tab: SettingsTab) {
  router.replace({ query: { ...route.query, tab } })
}

/* ── data ─────────────────────────────────────────────── */

const { data: studioRes, pending: studioPending, error: studioError, refresh: refreshStudio } = await useAsyncData(
  'studio-me',
  () => api.one<StudioSettingsSummary>('/api/v1/studios/me').catch((e) => { throw e }),
)

const { data: keysRes, pending: keysPending, refresh: refreshKeys } = await useAsyncData(
  'studio-api-keys',
  () => api.many<ApiKeyRecord>('/api/v1/studios/me/api-keys').catch(() => ({ data: [], meta: { count: 0, hasMore: false, nextCursor: null } })),
)

interface WebhooksMeta {
  count: number
  hasMore: boolean
  nextCursor: string | null
  deliveries?: WebhookDeliveryRecord[]
  availableEvents?: string[]
}

const { data: hooksRes, pending: hooksPending, refresh: refreshHooks } = await useAsyncData(
  'studio-webhooks',
  () => api.many<WebhookEndpointRecord>('/api/v1/studios/me/webhooks').catch(() => ({
    data: [],
    meta: { count: 0, hasMore: false, nextCursor: null, deliveries: [], availableEvents: [] },
  })),
)

const { data: gamesRes } = await useAsyncData(
  'studio-games',
  () => api.many<SettingsGameRef>('/api/v1/games', { query: { limit: 100 } }).catch(() => ({ data: [], meta: { count: 0, hasMore: false, nextCursor: null } })),
)

const { data: passportRes } = await useAsyncData(
  'studio-passport',
  () => api.one<{ reputation?: number }>('/api/v1/passport/me').catch(() => null),
)

const studio = computed<StudioSettingsSummary | null>(() => studioRes.value ?? null)
const games = computed<SettingsGameRef[]>(() => gamesRes.value?.data ?? [])
const keys = computed<ApiKeyRecord[]>(() => keysRes.value?.data ?? [])
const endpoints = computed<WebhookEndpointRecord[]>(() => hooksRes.value?.data ?? [])
const deliveries = computed<WebhookDeliveryRecord[]>(() => (hooksRes.value?.meta as WebhooksMeta | undefined)?.deliveries ?? [])
const availableEvents = computed<string[]>(() => (hooksRes.value?.meta as WebhooksMeta | undefined)?.availableEvents ?? [])
const reputation = computed(() => passportRes.value?.reputation ?? 0)

const error = computed(() => studioError.value)
const errorMessage = computed(() => {
  const err = error.value as { data?: { error?: { code?: string } } } | null
  const code = err?.data?.error?.code
  if (code === 'creator_required' || code === 'missing_session') return 'This area needs a creator account.'
  return 'Could not load your studio.'
})

const feePercent = computed(() => Number(studio.value?.feeBps ?? 1000) / 100)
const bondedUnits = computed(() => BigInt(studio.value?.bond?.balanceUnits ?? '0'))
const tierCta = computed(() => computeTierCta(studio.value?.feeTiers, studio.value?.feeTier))

/* ── error helpers ────────────────────────────────────── */

function fieldError(field: string) {
  return fieldErrorFrom(profileIssues.value, field)
}

/* ── profile ──────────────────────────────────────────── */

const form = reactive({ displayName: '', bio: '', avatarUrl: '', site: '', x: '' })
const avatarEditing = ref(false)
const saving = ref(false)
const saveError = ref('')
const saveOk = ref(false)
const profileIssues = ref<FieldIssue[]>([])

watch(studio, (value) => {
  if (!value) return
  form.displayName = value.displayName ?? ''
  form.bio = value.bio ?? ''
  form.avatarUrl = value.avatarUrl ?? ''
  form.site = value.links?.site ?? ''
  form.x = value.links?.x ?? ''
}, { immediate: true })

function openAvatarPrompt() {
  avatarEditing.value = true
}

async function saveProfile() {
  if (saving.value) return
  saving.value = true
  saveError.value = ''
  saveOk.value = false
  profileIssues.value = []
  const body: Record<string, unknown> = {
    displayName: form.displayName,
    bio: form.bio,
    links: { site: form.site || '', x: form.x || '', discord: studio.value?.links?.discord ?? '' },
  }
  if (form.avatarUrl) body.avatarUrl = form.avatarUrl
  try {
    await api.one('/api/v1/studios/me', { method: 'PATCH', body })
    await refreshStudio()
    saveOk.value = true
  } catch (raw: unknown) {
    profileIssues.value = issuesOf(raw)
    saveError.value = profileIssues.value.length ? 'Please fix the highlighted fields.' : messageOf(raw, 'Could not save your profile.')
  } finally {
    saving.value = false
  }
}

/* ── api keys ─────────────────────────────────────────── */

const keyModal = ref(false)
const revokingId = ref('')
const keyListError = ref('')

function openKeyModal() {
  keyModal.value = true
}

async function revokeKey(id: string) {
  if (revokingId.value) return
  revokingId.value = id
  keyListError.value = ''
  try {
    await api.one(`/api/v1/studios/me/api-keys/${id}`, { method: 'DELETE' })
    await refreshKeys()
  } catch (raw: unknown) {
    keyListError.value = messageOf(raw, 'Could not revoke that key.')
  } finally {
    revokingId.value = ''
  }
}

/* ── webhooks ─────────────────────────────────────────── */

const hookModal = ref(false)
const hookModalEndpoint = ref<WebhookEndpointRecord | null>(null)
const hookError = ref('')
const deletingHookId = ref('')
const replayingId = ref('')
const subscribing = ref(false)
const editingEndpointId = ref('')

const editingEndpoint = computed(() => endpoints.value.find((endpoint) => endpoint.id === editingEndpointId.value) ?? endpoints.value[0] ?? null)

watch(endpoints, (list) => {
  if (!editingEndpointId.value && list.length) editingEndpointId.value = list[0]?.id ?? ''
  if (editingEndpointId.value && !list.some((endpoint) => endpoint.id === editingEndpointId.value)) {
    editingEndpointId.value = list[0]?.id ?? ''
  }
}, { immediate: true })

function openHookModal() {
  hookModalEndpoint.value = null
  hookModal.value = true
}

function editEndpoint(endpoint: WebhookEndpointRecord) {
  hookModalEndpoint.value = endpoint
  hookModal.value = true
}

async function onHookSaved() {
  await refreshHooks()
  hookModal.value = false
}

async function deleteEndpoint(id: string) {
  if (deletingHookId.value) return
  deletingHookId.value = id
  hookError.value = ''
  try {
    await api.one(`/api/v1/studios/me/webhooks/${id}`, { method: 'DELETE' })
    if (editingEndpointId.value === id) editingEndpointId.value = ''
    await refreshHooks()
  } catch (raw: unknown) {
    hookError.value = messageOf(raw, 'Could not delete that endpoint.')
  } finally {
    deletingHookId.value = ''
  }
}

async function toggleEvent(event: string) {
  const endpoint = editingEndpoint.value
  if (!endpoint || subscribing.value) return
  const current: string[] = endpoint.events ?? []
  const next = current.includes(event) ? current.filter((item) => item !== event) : [...current, event]
  if (!next.length) {
    hookError.value = 'An endpoint must stay subscribed to at least one event.'
    return
  }
  subscribing.value = true
  hookError.value = ''
  try {
    await api.one(`/api/v1/studios/me/webhooks/${endpoint.id}`, {
      method: 'PATCH',
      body: { events: next },
    })
    await refreshHooks()
  } catch (raw: unknown) {
    hookError.value = messageOf(raw, 'Could not update subscriptions.')
  } finally {
    subscribing.value = false
  }
}

async function replay(delivery: WebhookDeliveryRecord) {
  if (replayingId.value) return
  replayingId.value = delivery.id
  hookError.value = ''
  try {
    await api.one(`/api/v1/studios/me/webhooks/${delivery.endpointId}/replay/${delivery.id}`, { method: 'POST' })
    await refreshHooks()
  } catch (raw: unknown) {
    hookError.value = messageOf(raw, 'Could not replay that delivery.')
  } finally {
    replayingId.value = ''
  }
}

/* ── shared helpers ───────────────────────────────────── */

const copiedId = ref('')
async function copy(value: string, id: string) {
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    copiedId.value = id
    window.setTimeout(() => { if (copiedId.value === id) copiedId.value = '' }, 1600)
  } catch {
    copiedId.value = ''
  }
}

/* ── attestation ──────────────────────────────────────── */

const keyCount = computed(() => keys.value.filter((key) => !key.revokedAt).length)
</script>

<style scoped>
.phead { margin-bottom: 22px; }
.phead h1 { font-size: 1.65rem; }

.sgrid { display: grid; grid-template-columns: 1fr 340px; gap: 26px; align-items: start; }

.idrow { display: flex; gap: 16px; margin-bottom: 18px; }
.idrow__av { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-2); flex-shrink: 0; }
.idrow__b { flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0; }

.onerow { display: flex; align-items: flex-start; gap: 12px; font-size: .87rem; margin-top: 6px; cursor: default; }
.onerow .toggle { margin-top: 2px; }

.savebtn { margin-top: 20px; min-width: 148px; }

.feecard__n { font-size: 2rem; font-weight: 800; margin: 4px 0 0; }

@media (max-width: 1400px) {
  .sgrid { grid-template-columns: 1fr 320px; }
}
@media (max-width: 1024px) {
  .sgrid { grid-template-columns: 1fr; }
}
@media (max-width: 375px) {
  .savebtn { width: 100%; }
}
</style>
