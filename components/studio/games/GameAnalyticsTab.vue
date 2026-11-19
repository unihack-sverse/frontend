<template>
  <section v-show="visible" class="pane on">
    <div class="tiles" style="margin-bottom:22px">
      <div class="tile">
        <p class="tile__k">Revenue · 30d</p>
        <p class="tile__v num">{{ formatSrv(gameStats.revenueUnits, { suffix: false }) }} <span class="t-small dim">SRV</span></p>
        <p class="tile__s">across accepted imports &amp; sales</p>
      </div>
      <div class="tile">
        <p class="tile__k">DAU</p>
        <p class="tile__v num">{{ formatNum(gameStats.dau) }}</p>
        <p class="tile__s">{{ formatNum(gameStats.playersLive) }} live right now</p>
      </div>
      <div class="tile">
        <p class="tile__k">Conversion</p>
        <p class="tile__v num">{{ formatPct(gameStats.conversion, { ratio: true }) }}</p>
        <p class="tile__s">visit → purchase</p>
      </div>
      <div class="tile">
        <p class="tile__k">Avg playtime</p>
        <p class="tile__v num">{{ gameStats.avgSessionMinutes === null ? '—' : gameStats.avgSessionMinutes }}<span v-if="gameStats.avgSessionMinutes !== null" class="t-small dim"> min</span></p>
        <p class="tile__s">{{ gameStats.avgSessionMinutes === null ? 'no attested playtime yet' : 'per session' }}</p>
      </div>
    </div>

    <div class="card card--pad">
      <p class="t-h3" style="margin-bottom:4px">Daily active players</p>
      <p class="t-small dim">Attested playtime only — derived from heartbeats, never from a
        client-declared duration.</p>
      <div v-if="chartColumns.length" class="chart">
        <div v-for="(column, index) in chartColumns" :key="index" class="chart__c" :title="`${column.value} players`">
          <div class="chart__b" :style="{ height: `${column.pct}%` }"></div>
          <span class="chart__x">{{ column.label }}</span>
        </div>
      </div>
      <div v-else class="empty" style="padding:34px 0">
        <p class="empty__i">◔</p>
        <p>No player activity in the last 30 days.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  gameId: string
  game: { slug?: string; stats?: { playersLive?: number } } | null
  analyticsRes: {
    revenueUnits?: string
    dau?: number
    playtimeMinutes?: number
    conversion?: number
    playSeries?: Array<{ players?: number; value?: number; date?: string }>
    games?: Array<{
      id?: string
      slug?: string
      revenueUnits?: string
      playtimeMinutes?: number
      conversion?: number
      stats?: { dau?: number }
      playSeries?: Array<{ players?: number; value?: number; date?: string }>
    }>
  } | null
}>()

const { formatSrv, formatNum, formatPct } = useStudioFormat()

const gameStats = computed((): { revenueUnits: string; dau: number; playersLive: number; conversion: number; avgSessionMinutes: number | null } => {
  const slice = (props.analyticsRes?.games ?? []).find((row) => row.id === props.gameId || row.slug === props.game?.slug)
  const stats = slice?.stats ?? {}
  const revenueUnits = slice?.revenueUnits ?? props.analyticsRes?.revenueUnits ?? '0'
  const dau = stats.dau ?? props.analyticsRes?.dau ?? 0
  const playtimeMinutes = slice?.playtimeMinutes ?? props.analyticsRes?.playtimeMinutes ?? 0
  const conversion = slice?.conversion ?? props.analyticsRes?.conversion ?? 0
  return {
    revenueUnits,
    dau,
    playersLive: props.game?.stats?.playersLive ?? 0,
    conversion,
    // Playtime is only meaningful once the telemetry rollup has produced minutes. Rendering 0
    // would read as a real measurement, so the tile is absent until data exists.
    avgSessionMinutes: playtimeMinutes > 0 && dau ? Math.round(playtimeMinutes / dau) : null,
  }
})

const chartColumns = computed(() => {
  const slice = (props.analyticsRes?.games ?? []).find((row) => row.id === props.gameId || row.slug === props.game?.slug)
  const series = slice?.playSeries ?? props.analyticsRes?.playSeries ?? []
  if (!series.length) return []
  const values = series.map((row) => Number(row.players ?? row.value ?? 0))
  const max = Math.max(...values, 1)
  const step = Math.max(1, Math.ceil(series.length / 12))
  return series.map((row, index) => {
    const value = values[index] ?? 0
    return {
      value: value.toLocaleString(),
      pct: Math.max(2, Math.round((value / max) * 100)),
      label: index % step === 0 ? String(row.date ?? '').slice(5) : '',
    }
  })
})
</script>
