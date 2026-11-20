<template>
  <section aria-labelledby="s4-h">
    <h2 id="s4-h" class="sr-only">Step 4 · Live</h2>

    <div v-if="isBlockedOnBond" class="note note--warn" style="align-items:center;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div style="display:flex;align-items:center;gap:10px">
        <span class="note__i">🔒</span>
        <div><b>{{ gameTitle }} stays in review.</b> Publishing requires a staked listing bond; your vault has {{ formatSrv(studio.vault?.availableUnits, { suffix: true }) }} available.</div>
      </div>
      <NuxtLink to="/studio/payouts#stake" class="btn btn--grad btn--sm">Stake bond ngay →</NuxtLink>
    </div>

    <div v-else-if="job.status === 'done'" class="card card--pad livecard">
      <div class="done">
        <div class="done__cover" role="img" :aria-label="`${gameTitle} cover`" :style="job.game?.status === 'in_review' ? 'border-color: rgba(255, 190, 61, .5); background: rgba(255, 190, 61, .08)' : ''">
          <span>{{ job.game?.status === 'in_review' ? '⏳' : coverEmoji }}</span>
        </div>
        <template v-if="job.game?.status === 'live'">
          <h2 class="t-h1">{{ gameTitle }} is live</h2>
          <p class="dim" style="margin:8px 0 18px">{{ liveReviewMessage }}</p>
        </template>
        <template v-else-if="job.game?.status === 'in_review'">
          <h2 class="t-h1" style="color:var(--amber)">{{ gameTitle }} is in review</h2>
          <p class="dim" style="margin:8px 0 18px">Automated review flagged items on your build or cover art. It has been escalated to moderators.</p>
        </template>
        <template v-else>
          <h2 class="t-h1">{{ gameTitle }} status: {{ statusLabel(job.game?.status) }}</h2>
          <p class="dim" style="margin:8px 0 18px">Published run completed with status {{ statusLabel(job.game?.status) }}.</p>
        </template>
        <p class="clock grad-text">{{ elapsedLabel }}</p>
        <p class="t-small dim">elapsed from "start run" to {{ job.game?.status === 'live' ? 'live storefront' : 'review submission' }}</p>
      </div>

      <div v-if="publishChecks.length" class="review-box" style="margin-top:20px">
        <p class="t-micro dim" style="margin-bottom:8px">Automated scan results</p>
        <div v-for="check in publishChecks" :key="check.name" class="chk" :class="`chk--${check.status}`">
          <span class="chk__mark">{{ check.status === 'flagged' ? '!' : check.status === 'passed' ? '✓' : '·' }}</span>
          <span class="chk__name t-mono">{{ check.name }}</span>
          <span class="chk__detail dim">{{ check.evidence?.reason ?? check.evidence?.note ?? check.status }}</span>
        </div>
      </div>

      <div class="rows" style="margin-top:22px">
        <div><span>Review status</span><strong>{{ statusLabel(job.game?.status) }}</strong></div>
        <div><span>Studio Vault</span><strong>deployed · receives {{ 100 - (studio.feeBps ?? 1000) / 100 }}%</strong></div>
        <div><span>Protocol fee</span><strong>{{ (studio.feeBps ?? 1000) / 100 }}%</strong></div>
        <div><span>Items written</span><strong>{{ mintedCount }} · interop {{ mintedTier }}</strong></div>
        <div><span>Sandbox purchase</span><strong>{{ sandboxLabel }}</strong></div>
        <div class="tot"><span>Listing bond staked</span><strong>{{ formatSrv(studio.bond?.balanceUnits, { suffix: true }) }}</strong></div>
      </div>

      <div class="formacts" style="margin-top:22px">
        <NuxtLink v-if="job.game?.status === 'live' && job.game?.slug" class="btn btn--grad" :to="`/store/g/${job.game.slug}`">View in Store →</NuxtLink>
        <NuxtLink v-else-if="job.game?.status === 'in_review'" class="btn btn--ghost" to="/admin/review">Open moderation queue →</NuxtLink>
        <NuxtLink v-if="isBlockedOnBond" class="btn btn--grad" to="/studio/payouts#stake">Stake listing bond →</NuxtLink>
        <NuxtLink v-if="job.gameId" class="btn btn--ghost" :to="`/studio/games/${job.gameId}`">Open game editor</NuxtLink>
      </div>
    </div>

    <div v-else class="note">
      <span class="note__i">◔</span>
      <div><b>The run is not finished.</b> This becomes the live storefront once every step is done and the game is live or in review.</div>
    </div>

    <div class="formacts" style="margin-top:18px">
      <button class="btn btn--ghost" type="button" @click="emit('back')">← Back to catalog</button>
      <button class="btn btn--ghost" type="button" @click="emit('reset')">Publish another</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PublishJobRecord, PublishStepCheck, StudioPublishSummary } from '~/utils/studioPublish'

defineProps<{
  job: PublishJobRecord
  studio: StudioPublishSummary
  gameTitle: string
  coverEmoji: string
  isBlockedOnBond: boolean
  liveReviewMessage: string
  elapsedLabel: string
  publishChecks: PublishStepCheck[]
  mintedCount: number
  mintedTier: string
  sandboxLabel: string
}>()

const emit = defineEmits<{
  back: []
  reset: []
}>()

const { formatSrv, statusLabel } = useStudioFormat()
</script>

<style scoped>
.done { text-align: center; padding: 16px 0 6px; }
.done__cover {
  width: 100%; max-width: 420px; height: 220px; margin: 0 auto 22px;
  border-radius: var(--r-lg); border: 1px solid var(--border-2); box-shadow: var(--e-2);
  display: grid; place-items: center; font-size: 4rem;
  background: radial-gradient(320px 180px at 30% 10%, rgba(123, 47, 247, 0.28), transparent 70%), var(--surface-2);
}
.clock { font-family: var(--mono); font-size: 2.4rem; font-weight: 700; }

.review-box {
  padding: 14px 18px; border-radius: var(--r-md);
  background: var(--bg-2); border: 1px solid var(--border);
}
.chk { display: flex; gap: 9px; align-items: baseline; font-size: .8rem; padding: 4px 0; }
.chk__mark { width: 16px; text-align: center; font-weight: 700; font-family: var(--mono); flex-shrink: 0; }
.chk--flagged .chk__mark { color: var(--red, #ff5f57); }
.chk--passed .chk__mark { color: var(--green, #28c840); }
.chk__name { flex-shrink: 0; min-width: 150px; font-weight: 600; }
.chk__detail { min-width: 0; word-break: break-word; }

.formacts { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
</style>
