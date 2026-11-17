<template>
  <StudioShell>
    <StudioAccess v-if="error" :error="error" />

    <template v-else-if="pending">
      <div class="shead">
        <div class="sk" style="width:62px;height:62px;border-radius:50%"></div>
        <div style="flex:1">
          <div class="sk" style="height:24px;width:180px"></div>
          <div class="sk" style="height:13px;width:280px;margin-top:9px"></div>
        </div>
      </div>
      <div class="tiles" style="margin-bottom:26px">
        <div v-for="n in 4" :key="n" class="tile"><div class="sk" style="height:52px"></div></div>
      </div>
    </template>

    <template v-else-if="studio">
      <div class="shead">
        <img class="shead__av" :src="studio.avatarUrl || seedAsset('studios/voidrunner.png')" alt="">
        <div style="flex:1;min-width:200px">
          <h1 class="shead__h">@{{ studio.handle }}</h1>
          <p class="t-small dim">
            {{ studio.oneHumanStudio ? 'One-human studio' : 'Studio' }}
            · joined {{ formatDate(studio.createdAt) }}
            · ★ {{ reputation }} reputation
          </p>
        </div>
        <span v-if="studio.status && studio.status !== 'active'" class="chip chip--bad">{{ studio.status }}</span>
        <NuxtLink class="btn btn--grad" to="/studio/publish">＋ Publish a game</NuxtLink>
      </div>

      <!-- ══ Prominent listing bond notice ══ -->
      <div v-if="bondShortfall || hasBlockedGame" class="note note--warn" style="margin-bottom:26px;align-items:center;background:linear-gradient(90deg, rgba(255, 190, 61, 0.15), rgba(123, 47, 247, 0.12));border:1px solid rgba(255, 190, 61, 0.4);border-radius:var(--r-md);padding:14px 18px">
        <span class="note__i" style="font-size:1.4rem">⚠️</span>
        <div style="flex:1">
          <b style="font-size:0.95rem">Listing bond chưa đủ điều kiện publish ({{ studio.bond?.balanceSrv ?? '0.00' }} / {{ formatSrv(studio.minListingBondUnits) }} SRV).</b>
          <div class="dim" style="margin-top:2px;font-size:0.85rem">Game sẽ ở trạng thái chờ duyệt (in review / blocked) cho đến khi stake đủ bond.</div>
        </div>
        <NuxtLink class="btn btn--grad btn--sm" to="/studio/payouts#stake">Stake bond ngay →</NuxtLink>
      </div>

      <div class="tiles" style="margin-bottom:26px">
        <div class="tile">
          <p class="tile__k">Gross revenue · {{ range }}d</p>
          <p class="tile__v num">{{ analytics?.grossSrv ?? '0.00' }} <span class="t-small dim">SRV</span></p>
          <p class="tile__s">{{ analytics?.orders ?? 0 }} orders · {{ analytics?.buyers ?? 0 }} buyers</p>
        </div>
        <div class="tile">
          <p class="tile__k">Net after fee</p>
          <p class="tile__v num">{{ analytics?.netSrv ?? '0.00' }} <span class="t-small dim">SRV</span></p>
          <p class="tile__s">{{ feePercent }}% protocol fee</p>
        </div>
        <div class="tile">
          <p class="tile__k">Units sold</p>
          <p class="tile__v num">{{ formatNum(analytics?.unitsSold ?? 0) }}</p>
          <p class="tile__s">across {{ games.length }} game{{ games.length === 1 ? '' : 's' }}</p>
        </div>
        <div class="tile">
          <p class="tile__k">DAU across games</p>
          <p class="tile__v num">{{ formatNum(analytics?.dau ?? 0) }}</p>
          <p class="tile__s">{{ formatNum(analytics?.activePlayers ?? 0) }} active this window</p>
        </div>
      </div>

      <div class="sg2">
        <div>
          <div class="card card--pad">
            <div class="schart__h">
              <div>
                <p class="t-h3">Revenue in SRV</p>
                <p class="t-small dim">Gross, before the {{ feePercent }}% protocol fee</p>
              </div>
              <div class="tabs" style="margin:0">
                <button
                  v-for="option in ranges"
                  :key="option"
                  :class="{ on: range === option }"
                  type="button"
                  :disabled="rangeLoading"
                  @click="setRange(option)"
                >
                  {{ option }}d
                </button>
              </div>
            </div>

            <div v-if="chartColumns.length" class="chart">
              <div v-for="(column, index) in chartColumns" :key="index" class="chart__c" :title="`${column.value} SRV`">
                <div class="chart__b" :style="{ height: `${column.pct}%` }"></div>
                <span class="chart__x">{{ column.label }}</span>
              </div>
            </div>
            <div v-else class="empty" style="padding:34px 0">
              <p class="empty__i">◔</p>
              <p>No settled orders in the last {{ range }} days.</p>
              <p class="t-small dim">Sales appear here the moment a checkout completes.</p>
            </div>
          </div>

          <p class="sect">Your games <NuxtLink class="sect__act" to="/studio/games">Manage all →</NuxtLink></p>
          <div v-if="games.length" class="tw">
            <table>
              <thead>
                <tr>
                  <th>Game</th><th>Status</th><th>Level</th><th>Interop</th>
                  <th class="num">DAU</th><th class="num">D7</th><th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="game in games" :key="game.id">
                  <td>
                    <div class="srow">
                      <img :src="game.coverArt?.url || seedAsset(`games/${game.slug}-cover.png`)" :alt="game.title">
                      <div>
                        <div style="font-weight:600">{{ game.title }}</div>
                        <div class="t-small dim">{{ genreLabel(game.genre) }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span :class="statusChip(game.status)"><i v-if="game.status === 'live'" class="dot"></i>{{ statusLabel(game.status) }}</span>
                    <span v-if="game.blockedReason === 'bond_required'" class="chip chip--warn" style="margin-left:6px">bond required</span>
                  </td>
                  <td><span class="chip chip--lvl">{{ game.tokenizationLevel }}</span></td>
                  <td><span :class="tierChip(game.interopTier)">{{ game.interopTier }}</span></td>
                  <td class="num">{{ formatNum(game.stats?.dau ?? 0) }}</td>
                  <td class="num">{{ formatPct(game.stats?.d7, { ratio: true }) }}</td>
                  <td style="white-space:nowrap">
                    <NuxtLink v-if="game.blockedReason === 'bond_required'" class="btn btn--grad btn--sm" to="/studio/payouts#stake" style="margin-right:6px">Stake bond</NuxtLink>
                    <NuxtLink class="btn btn--ghost btn--sm" :to="`/studio/games/${game.id}`">Edit</NuxtLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty">
            <p class="empty__i">◇</p>
            <p>No games under this studio yet.</p>
            <NuxtLink class="btn btn--grad btn--sm" to="/studio/publish">Publish a game</NuxtLink>
          </div>

          <template v-if="analytics?.byItem?.length">
            <p class="sect">Top items · {{ range }}d</p>
            <div class="tw">
              <table>
                <thead><tr><th>SKU</th><th class="num">Sold</th><th class="num">Gross SRV</th></tr></thead>
                <tbody>
                  <tr v-for="row in analytics.byItem.slice(0, 8)" :key="row.sku">
                    <td class="t-mono">{{ row.sku }}</td>
                    <td class="num">{{ row.units }}</td>
                    <td class="num">{{ formatSrv(row.grossUnits) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>

        <div>
          <div class="feetier">
            <p class="t-micro dim">Protocol fee tier</p>
            <p class="feetier__n">{{ feePercent }}%</p>
            <div class="tierbar">
              <div v-for="(tier, index) in feeTiersAscending" :key="tier.tier" :class="{ on: index <= currentTierIndex }"></div>
            </div>
            <p class="t-small dim">{{ tierSentence }}</p>
            <div class="sactions">
              <NuxtLink class="btn btn--grad btn--sm" to="/studio/payouts#stake">Stake SRV</NuxtLink>
              <NuxtLink class="btn btn--ghost btn--sm" to="/studio/settings">Details</NuxtLink>
            </div>
          </div>

          <p class="sect">Vault</p>
          <div class="rows">
            <div><span>Balance</span><strong>{{ studio.vault?.balanceSrv ?? '0.00' }} SRV</strong></div>
            <div><span>Locked · dispute window</span><strong>{{ formatSrv(studio.vault?.lockedUnits, { suffix: true }) }}</strong></div>
            <div class="tot"><span>Available</span><strong>{{ studio.vault?.availableSrv ?? '0.00' }} SRV</strong></div>
          </div>
          <NuxtLink class="btn btn--ghost btn--full btn--sm" to="/studio/payouts" style="margin-top:12px">Withdraw</NuxtLink>

          <p class="sect">Retention</p>
          <div class="rows">
            <div><span>D1</span><strong>{{ retention.d1 }}%</strong></div>
            <div><span>D7</span><strong>{{ retention.d7 }}%</strong></div>
            <div><span>D30</span><strong>{{ retention.d30 }}%</strong></div>
          </div>

          <p class="sect">Listing bond</p>
          <div class="rows">
            <div><span>Staked</span><strong>{{ studio.bond?.balanceSrv ?? '0.00' }} SRV</strong></div>
            <div><span>Minimum to publish</span><strong>{{ formatSrv(studio.minListingBondUnits, { suffix: true }) }}</strong></div>
          </div>
          <div v-if="bondShortfall" class="note note--warn" style="margin-top:12px">
            <span class="note__i">⚠️</span>
            <div>
              <b>Bond is below the publishing minimum.</b> New games stay in review until the vault is topped up or the bond is staked.
              <div style="margin-top:10px">
                <NuxtLink to="/studio/payouts#stake" class="btn btn--grad btn--sm">Nạp vault & stake bond →</NuxtLink>
              </div>
            </div>
          </div>
          <NuxtLink v-else class="btn btn--ghost btn--full btn--sm" to="/studio/payouts#stake" style="margin-top:10px">Manage stake →</NuxtLink>

          <template v-if="needsAttention.length">
            <p class="sect">Needs attention</p>
            <div v-for="game in needsAttention" :key="game.id" class="note note--warn">
              <span class="note__i">⚠️</span>
              <div style="flex:1">
                <b>{{ game.title }} is {{ statusLabel(game.status) }}.</b>
                <div v-if="game.blockedReason === 'bond_required'" style="margin-top:6px">
                  <NuxtLink to="/studio/payouts#stake" class="btn btn--grad btn--sm">Stake listing bond →</NuxtLink>
                </div>
                <div v-else style="margin-top:4px">
                  <NuxtLink :to="`/studio/games/${game.id}`" style="text-decoration:underline"> Open the editor →</NuxtLink>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>
    <StudioAccess v-else />
  </StudioShell>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'studio' })

useHead({ title: 'Studio overview · Sverse' })

type Range = 7 | 30 | 90

const api = useApi()
const { seedAsset, formatSrv, formatNum, formatPct, formatDate, genreLabel, statusLabel, statusChip, tierChip } = useStudioFormat()

const ranges: Range[] = [7, 30, 90]
const range = ref<Range>(30)
const rangeLoading = ref(false)

const { data: studioRes, pending: studioPending, error: studioError } = await useAsyncData('studio-me', () =>
  api.one<any>('/api/v1/studios/me'),
)
const { data: gamesRes, pending: gamesPending } = await useAsyncData('studio-games', () =>
  api.many<any>('/api/v1/studios/me/games').catch(() => ({ data: [] })),
)
const { data: analyticsRes, pending: analyticsPending } = await useAsyncData('studio-analytics', () =>
  api.one<any>('/api/v1/studios/me/analytics', { query: { days: 30 } }).catch(() => null),
)
const { data: passportRes } = await useAsyncData('studio-passport', () =>
  api.one<any>('/api/v1/passport/me').catch(() => null),
)

const studio = computed(() => studioRes.value ?? null)
const games = computed<any[]>(() => gamesRes.value?.data ?? [])
const analytics = computed(() => analyticsRes.value ?? null)
const pending = computed(() => studioPending.value || gamesPending.value || analyticsPending.value)
const error = computed(() => studioError.value)
const errorMessage = computed(() => {
  const code = (error.value as any)?.data?.error?.code
  if (code === 'creator_required' || code === 'missing_session') return 'This area needs a creator account.'
  return 'Could not load your studio.'
})

const reputation = computed(() => passportRes.value?.reputation ?? 0)
const feePercent = computed(() => Number(studio.value?.feeBps ?? 1000) / 100)
const retention = computed(() => ({
  d1: analytics.value?.retention?.d1 ?? 0,
  d7: analytics.value?.retention?.d7 ?? 0,
  d30: analytics.value?.retention?.d30 ?? 0,
}))
const feeTiersAscending = computed<any[]>(() =>
  [...(studio.value?.feeTiers ?? [])].sort((a, b) => Number(a.minStakeUnits) - Number(b.minStakeUnits)),
)
const currentTierIndex = computed(() => {
  const staked = BigInt(studio.value?.bond?.balanceUnits ?? '0')
  let index = 0
  feeTiersAscending.value.forEach((tier, i) => {
    if (staked >= BigInt(tier.minStakeUnits)) index = i
  })
  return index
})
const tierSentence = computed(() => {
  const next = feeTiersAscending.value[currentTierIndex.value + 1]
  if (!next) return 'Premium tier — the lowest protocol fee available.'
  return `${capitalize(String(studio.value?.feeTier ?? 'standard'))} · ${feePercent.value}% → stake ${formatSrv(next.minStakeUnits, { suffix: true })} for ${Number(next.feeBps) / 100}%`
})
const bondShortfall = computed(() => {
  const bond = BigInt(studio.value?.bond?.balanceUnits ?? '0')
  const min = BigInt(studio.value?.minListingBondUnits ?? '0')
  return min > 0n && bond < min
})
const hasBlockedGame = computed(() => games.value.some((game: any) => game.blockedReason === 'bond_required' || game.status === 'in_review'))
const needsAttention = computed(() => games.value.filter((game: any) => game.status !== 'live'))

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''
}

const chartColumns = computed(() => {
  const series = analytics.value?.revenueSeries ?? []
  if (!series.length) return []
  const values = series.map((row: any) => Number(row.grossUnits ?? 0) / 1_000_000)
  const max = Math.max(...values, 1)
  const step = Math.max(1, Math.ceil(series.length / 12))
  return series.map((row: any, index: number) => ({
    value: values[index].toLocaleString(undefined, { maximumFractionDigits: 0 }),
    pct: Math.max(2, Math.round((values[index] / max) * 100)),
    label: index % step === 0 ? String(row.date ?? '').slice(5) : '',
  }))
})

async function setRange(value: Range) {
  range.value = value
  rangeLoading.value = true
  try {
    analyticsRes.value = await api.one<any>('/api/v1/studios/me/analytics', { query: { days: value } })
  } catch {
    // Keep the previous window on failure rather than blanking the chart.
  } finally {
    rangeLoading.value = false
  }
}
</script>

<style scoped>
.shead { display: flex; align-items: center; gap: 16px; margin-bottom: 26px; flex-wrap: wrap; }
.shead__av { width: 62px; height: 62px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-2); }
.shead__h { font-size: 1.65rem; font-weight: 700; }

.sg2 { display: grid; grid-template-columns: 1fr 340px; gap: 30px; align-items: start; }

.schart__h { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 6px; }

.srow { display: flex; align-items: center; gap: 11px; }
.srow img { width: 52px; height: 33px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border); }

.feetier {
  padding: 22px 24px;
  border-radius: var(--r-lg);
  background: radial-gradient(400px 200px at 10% 0%, rgba(123, 47, 247, 0.18), transparent 70%), var(--surface);
  border: 1px solid var(--border-2);
}
.feetier__n { font-size: 1.9rem; font-weight: 800; margin: 4px 0 0; }

.tierbar { display: flex; gap: 6px; margin: 14px 0 10px; }
.tierbar div { flex: 1; height: 8px; border-radius: 4px; background: var(--surface-2); }
.tierbar div.on { background: var(--grad); }

.sactions { display: flex; gap: 8px; margin-top: 16px; }

@media (max-width: 1080px) {
  .sg2 { grid-template-columns: 1fr; }
}
</style>
