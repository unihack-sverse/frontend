<template>
  <StudioShell>
    <div v-if="error" class="empty">
      <p class="empty__i">⚠️</p>
      <p>{{ errorMessage }}</p>
      <NuxtLink class="btn btn--grad btn--sm" to="/login?next=/studio/games">Sign in as a creator</NuxtLink>
    </div>

    <template v-else>
      <div class="ghead">
        <div>
          <p class="eyebrow">Studio console</p>
          <h1 class="ghead__h">Games</h1>
          <p class="t-small dim">
            {{ games.length }} game{{ games.length === 1 ? '' : 's' }}
            <template v-if="liveCount !== games.length"> · {{ liveCount }} live</template>
          </p>
        </div>
        <NuxtLink class="btn btn--grad" to="/studio/publish">＋ Publish a game</NuxtLink>
      </div>

      <div class="gfilters">
        <div class="tabs" style="margin:0">
          <button
            v-for="option in filters"
            :key="option.value"
            type="button"
            :class="{ on: filter === option.value }"
            @click="filter = option.value"
          >
            {{ option.label }}<template v-if="option.value !== 'all'"> ({{ countFor(option.value) }})</template>
          </button>
        </div>
        <form class="gsearch" role="search" @submit.prevent>
          <span aria-hidden="true">⌕</span>
          <input v-model="query" type="search" placeholder="Filter by title, slug or genre..." aria-label="Filter games">
        </form>
      </div>

      <div v-if="pending" class="store-grid store-grid--games" aria-busy="true">
        <div v-for="n in 3" :key="n" class="gcard">
          <div class="sk" style="height:112px;border-radius:10px"></div>
          <div class="sk" style="height:16px;width:60%;margin-top:12px"></div>
          <div class="sk" style="height:12px;width:40%;margin-top:8px"></div>
        </div>
      </div>

      <div v-else-if="visible.length" class="gcards">
        <article v-for="game in visible" :key="game.id" class="gcard">
          <NuxtLink class="gcard__cover" :to="`/studio/games/${game.id}`">
            <img :src="game.coverArt?.url || seedAsset(`games/${game.slug}-cover.png`)" :alt="game.title">
            <span :class="statusChip(game.status)" class="gcard__status">
              <i v-if="game.status === 'live'" class="dot"></i>{{ statusLabel(game.status) }}
            </span>
          </NuxtLink>

          <div class="gcard__body">
            <div class="gcard__top">
              <NuxtLink class="gcard__t" :to="`/studio/games/${game.id}`">{{ game.title }}</NuxtLink>
              <p class="t-small dim">{{ genreLabel(game.genre) }} · <span class="t-mono">{{ game.slug }}</span></p>
            </div>

            <div class="gcard__chips">
              <span class="chip chip--lvl">{{ game.tokenizationLevel }}</span>
              <span :class="tierChip(game.interopTier)">{{ game.interopTier }}</span>
              <span v-if="game.statsSource === 'seed'" class="chip">seed data</span>
            </div>

            <dl class="gcard__stats">
              <div><dt>DAU</dt><dd>{{ formatNum(game.stats?.dau ?? 0) }}</dd></div>
              <div><dt>D7</dt><dd>{{ formatPct(game.stats?.d7, { ratio: true }) }}</dd></div>
              <div><dt>Price from</dt><dd>{{ game.priceFromSrv ? `${game.priceFromSrv} SRV` : '—' }}</dd></div>
            </dl>

            <div class="gcard__acts">
              <NuxtLink class="btn btn--ghost btn--sm" :to="`/studio/games/${game.id}`">Edit</NuxtLink>
              <NuxtLink
                v-if="game.slug"
                class="btn btn--ghost btn--sm"
                :to="`/store/g/${game.slug}`"
                target="_blank"
                rel="noopener"
              >View ↗</NuxtLink>
            </div>
          </div>
        </article>
      </div>

      <div v-else-if="!games.length" class="empty">
        <p class="empty__i">◇</p>
        <p>No games under this studio yet.</p>
        <p class="t-small dim">Publishing takes one wizard and a staked listing bond.</p>
        <NuxtLink class="btn btn--grad btn--sm" to="/studio/publish">Publish your first game</NuxtLink>
      </div>

      <div v-else class="empty">
        <p class="empty__i">⌕</p>
        <p>No games match this filter.</p>
        <button class="btn btn--ghost btn--sm" type="button" @click="resetFilters">Clear filters</button>
      </div>
    </template>
  </StudioShell>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'studio' })
useHead({ title: 'Games · Studio · Sverse' })

type GameStatus = 'all' | 'live' | 'in_review' | 'draft' | 'rejected' | 'delisted'

const api = useApi()
const { seedAsset, formatNum, formatPct, genreLabel, statusLabel, statusChip, tierChip } = useStudioFormat()

const filter = ref<GameStatus>('all')
const query = ref('')

const { data: studioRes } = await useAsyncData('studio-me', () =>
  api.one<any>('/api/v1/studios/me').catch(() => null),
)
const { data: gamesRes, pending, error } = await useAsyncData('studio-games', () =>
  api.many<any>('/api/v1/studios/me/games').catch(() => ({ data: [], meta: { count: 0, hasMore: false, nextCursor: null } })),
)

const studio = computed(() => studioRes.value ?? null)
const games = computed<any[]>(() => gamesRes.value?.data ?? [])
const liveCount = computed(() => games.value.filter((game: any) => game.status === 'live').length)

const errorMessage = computed(() => {
  const code = (error.value as any)?.data?.error?.code ?? (error.value as any)?.code
  if (code === 'creator_required' || code === 'missing_session') return 'This area needs a creator account.'
  return 'Could not load your games.'
})

const filters: { value: GameStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'in_review', label: 'In review' },
  { value: 'draft', label: 'Drafts' },
  { value: 'rejected', label: 'Rejected' },
]

function countFor(status: GameStatus) {
  return games.value.filter((game: any) => game.status === status).length
}

const visible = computed(() => {
  const needle = query.value.trim().toLowerCase()
  return games.value.filter((game: any) => {
    if (filter.value !== 'all' && game.status !== filter.value) return false
    if (!needle) return true
    return [game.title, game.slug, game.genre]
      .filter(Boolean)
      .some((field: string) => String(field).toLowerCase().includes(needle))
  })
})

function resetFilters() {
  filter.value = 'all'
  query.value = ''
}
</script>

<style scoped>
.ghead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 22px;
}
.ghead__h {
  font-size: 1.7rem;
  font-weight: 700;
  margin: 4px 0 2px;
}

.gfilters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.gsearch {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border: 1px solid var(--border);
  border-radius: var(--r-pill);
  background: var(--surface);
  min-width: 240px;
  flex: 1 1 240px;
  max-width: 340px;
}
.gsearch input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.85rem;
  outline: none;
}

.gcards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
}

.gcard {
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  background: var(--surface);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.gcard__cover {
  position: relative;
  display: block;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--surface-2);
}
.gcard__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}
.gcard__cover:hover img {
  transform: scale(1.04);
}

.gcard__status {
  position: absolute;
  top: 10px;
  left: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  backdrop-filter: blur(8px);
}

.gcard__body {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 11px;
  flex: 1;
}

.gcard__t {
  font-weight: 650;
  font-size: 1rem;
}
.gcard__t:hover {
  color: var(--pink);
}

.gcard__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.gcard__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 0;
  padding: 10px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.gcard__stats div {
  min-width: 0;
}
.gcard__stats dt {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-dim);
}
.gcard__stats dd {
  margin: 2px 0 0;
  font-size: 0.88rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gcard__acts {
  display: flex;
  gap: 8px;
  margin-top: auto;
}

@media (max-width: 620px) {
  .gcards {
    grid-template-columns: 1fr;
  }
  .gsearch {
    max-width: none;
    flex-basis: 100%;
  }
}
</style>
