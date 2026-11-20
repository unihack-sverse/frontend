<template>
  <section aria-labelledby="s1-h">
    <h2 id="s1-h" class="sr-only">Step 1 · Studio and game</h2>

    <div class="note" style="margin-bottom:18px">
      <span class="note__i" aria-hidden="true">🪪</span>
      <div>Publishing as <b>@{{ studio.handle }}</b>. Your Studio Vault receives {{ 100 - (studio.feeBps ?? 1000) / 100 }}% of every sale instantly. No entity, no KYB at this tier.</div>
    </div>

    <div class="tabs" role="tablist" aria-label="Game source">
      <button type="button" role="tab" :aria-selected="source === 'existing'" :class="{ on: source === 'existing' }" @click="emit('update:source', 'existing')">Existing game</button>
      <button type="button" role="tab" :aria-selected="source === 'new'" :class="{ on: source === 'new' }" @click="emit('update:source', 'new')">New game</button>
    </div>

    <template v-if="source === 'existing'">
      <p v-if="!games.length" class="t-small dim">No publishable games yet. Switch to <b>New game</b> to create one.</p>
      <div v-else class="picks" role="radiogroup" aria-label="Choose a game">
        <label v-for="entry in games" :key="entry.id" class="pick" :class="{ on: selectedGameId === entry.id }">
          <span class="pick__r"></span>
          <input v-model="selectedGameModel" class="pick__cb" type="radio" :value="entry.id">
          <span>
            <span class="pick__t">{{ entry.title }} <span class="chip chip--lvl">{{ entry.tokenizationLevel ?? 'L2' }}</span></span>
            <span class="pick__d">{{ statusLabel(entry.status) }} · {{ genreLabel(entry.genre) }}<template v-if="entry.blockedReason"> · blocked: {{ entry.blockedReason }}</template></span>
          </span>
        </label>
      </div>

      <div v-if="selectedGame?.status === 'live'" class="note note--warn t-small" style="margin:14px 0">
        <span class="note__i">◔</span>
        <div>This game is already live. A new publish run starts from its current catalog.</div>
      </div>

      <div class="formacts" style="margin-top:18px">
        <button class="btn btn--grad" type="button" :disabled="!selectedGameId" @click="emit('startRun')">
          Continue with this game →
        </button>
      </div>
    </template>

    <template v-else>
      <div class="card card--pad">
        <div class="field" :class="{ bad: formError('title') }">
          <label for="pg-title">Game title</label>
          <input id="pg-title" v-model.trim="form.title" maxlength="80" placeholder="Emberloop">
          <p v-if="formError('title')" class="field__err">{{ formError('title') }}</p>
        </div>
        <div class="f2">
          <div class="field">
            <label>Studio handle <span class="dim">· from your S-Passport</span></label>
            <input :value="`@${studio.handle}`" disabled>
          </div>
          <div class="field">
            <label id="pg-genre-label">Genre</label>
            <AppSelect v-model="form.genre" :options="genres" aria-label="Genre" block />
          </div>
        </div>
        <div class="field">
          <label for="pg-blurb">One line about it</label>
          <input id="pg-blurb" v-model.trim="form.blurb" maxlength="140" placeholder="A deckbuilder where every card you burn stays burned.">
        </div>

        <div class="f2">
          <div class="field" :class="{ bad: formError('buildUrl') }">
            <label for="pg-build">Build URL <span class="dim">· required to publish</span></label>
            <input id="pg-build" v-model.trim="form.buildUrl" type="url" placeholder="https://…/build.zip" @input="emit('clearField', 'buildUrl')">
            <p v-if="formError('buildUrl')" class="field__err">{{ formError('buildUrl') }}</p>
            <p v-else class="field__hint">Review scans this link before the game goes live.</p>
          </div>
          <div class="field" :class="{ bad: formError('coverArt') }">
            <label for="pg-cover">Cover image URL <span class="dim">· required</span></label>
            <input id="pg-cover" v-model.trim="form.coverUrl" type="url" placeholder="https://…/cover.png" @input="emit('clearField', 'coverArt')">
            <p v-if="formError('coverArt')" class="field__err">{{ formError('coverArt') }}</p>
            <p v-else-if="!form.coverUrl.trim()" class="field__hint">The store needs a cover image — this is what players see first.</p>
            <p v-else class="field__hint">A wide image, 1280×800 or larger.</p>
          </div>
        </div>

        <div v-if="form.coverUrl" class="coverpreview">
          <img :src="form.coverUrl" alt="Cover preview">
        </div>
      </div>

      <div v-if="createError" class="note note--bad" style="margin-top:14px">
        <span class="note__i">⚠️</span>
        <div><b>Could not create the game.</b> {{ createError }}</div>
      </div>

      <div class="formacts" style="margin-top:18px">
        <button class="btn btn--ghost" type="button" @click="emit('update:source', 'existing')">← Back</button>
        <button class="btn btn--grad" type="button" :disabled="creating || !canCreate" @click="emit('createGame')">
          {{ creating ? 'Creating…' : 'Create game →' }}
        </button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import type { GameRow, Mode, StudioPublishSummary } from '~/utils/studioPublish'

const props = defineProps<{
  studio: StudioPublishSummary
  source: 'existing' | 'new'
  games: GameRow[]
  selectedGameId: string
  selectedGame: GameRow | null
  form: {
    title: string
    genre: string
    blurb: string
    buildUrl: string
    coverUrl: string
    mode: Mode
    level: string
  }
  genres: Array<{ value: string; label: string }>
  creating: boolean
  canCreate: boolean
  createError: string
  formError: (field: string) => string
}>()

const emit = defineEmits<{
  'update:source': [value: 'existing' | 'new']
  'update:selectedGameId': [value: string]
  startRun: []
  createGame: []
  clearField: [field: string]
}>()

const { genreLabel, statusLabel } = useStudioFormat()

const selectedGameModel = computed({
  get: () => props.selectedGameId,
  set: (value: string) => emit('update:selectedGameId', value),
})
</script>

<style scoped>
.coverpreview {
  margin-top: 14px; border-radius: var(--r-md); overflow: hidden;
  border: 1px solid var(--border-2); background: var(--surface-2);
}
.coverpreview img { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; }
.pick__cb { position: absolute; opacity: 0; width: 0; height: 0; }
.formacts { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
</style>
