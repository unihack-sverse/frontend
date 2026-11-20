<template>
  <section v-show="visible" class="pane on">
    <div class="shead">
      <p class="t-small dim">Keys authenticate your game clients and AI agents. Only a hash is stored — we cannot show you a secret twice.</p>
      <button class="btn btn--grad btn--sm" type="button" @click="emit('openCreate')">＋ New API key</button>
    </div>

    <div v-if="keysPending" class="sk" style="height:180px;border-radius:var(--r-lg)"></div>
    <template v-else-if="keys.length">
      <div class="tw">
        <table>
          <thead>
            <tr>
              <th>Label</th><th>Prefix</th><th>Scopes</th><th>Bound to</th>
              <th>Last used</th><th class="num">Requests 24h</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="key in keys" :key="key.id" :class="{ keyrow: key.revokedAt }">
              <td><b>{{ key.label || 'Untitled key' }}</b></td>
              <td class="t-mono dim">{{ key.prefix }}…</td>
              <td>
                <span v-for="scope in key.scopes" :key="scope" :class="scope === 'publish' ? 'chip chip--t2' : 'chip'" class="scopec">{{ scope }}</span>
              </td>
              <td class="dim">{{ key.gameId ? gameTitle(key.gameId, key.gameSlug) : 'all games' }}</td>
              <td class="dim">{{ key.revokedAt ? `revoked ${formatDate(key.revokedAt)}` : lastUsed(key.lastUsedAt) }}</td>
              <td class="num">{{ key.revokedAt ? '—' : formatNum(key.requestCount ?? 0) }}</td>
              <td>
                <span v-if="key.revokedAt" class="chip chip--bad">revoked</span>
                <button
                  v-else
                  class="btn btn--ghost btn--sm btn--danger revbtn"
                  type="button"
                  :disabled="revokingId === key.id"
                  @click="emit('revoke', key.id)"
                >{{ revokingId === key.id ? 'Revoking…' : 'Revoke' }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <div v-else class="empty">
      <p class="empty__i">🔑</p>
      <p>No API keys yet.</p>
      <p class="t-small dim">Create a key to let a game client or agent talk to the API.</p>
    </div>

    <div v-if="keyListError" class="note note--bad" style="margin-top:16px">
      <span class="note__i">⚠️</span>
      <div>{{ keyListError }}</div>
    </div>

    <div class="note" style="margin-top:20px">
      <span class="note__i">🔐</span>
      <div>
        A key bound to one game <b>cannot read another game's data</b> — not its entitlements,
        not its passports, not its items. Scope <span class="t-mono">publish</span> can create
        item definitions but cannot touch live game data.
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { relativeTime, type ApiKeyRecord, type SettingsGameRef } from '~/utils/studioSettings'

const props = defineProps<{
  visible: boolean
  keysPending: boolean
  keys: ApiKeyRecord[]
  games: SettingsGameRef[]
  revokingId: string
  keyListError: string
}>()

const emit = defineEmits<{
  openCreate: []
  revoke: [id: string]
}>()

const { formatNum, formatDate } = useStudioFormat()

function gameTitle(gameId: string, slug?: string | null) {
  const match = props.games.find((game) => game.id === gameId || game.slug === slug)
  return match?.title ?? slug ?? gameId
}

function lastUsed(value: string | null) {
  return value ? relativeTime(value, formatDate) : 'never'
}
</script>

<style scoped>
.shead {
  display: flex; justify-content: space-between; align-items: center;
  gap: 14px; flex-wrap: wrap; margin-bottom: 18px;
}
.shead .t-small { max-width: 620px; }
.scopec { margin-right: 6px; }
.keyrow { opacity: .5; }
.revbtn { min-width: 82px; }
</style>
