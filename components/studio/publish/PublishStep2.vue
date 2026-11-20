<template>
  <section aria-labelledby="s2-h">
    <h2 id="s2-h" class="sr-only">Step 2 · Integration</h2>
    <p class="dim" style="margin-bottom:14px">How do you want to wire up payments for <b>{{ gameTitle }}</b>?</p>

    <div class="picks" role="radiogroup" aria-label="Integration mode">
      <label class="pick" :class="{ on: form.mode === 'ai' }">
        <span class="pick__r"></span>
        <input v-model="form.mode" class="pick__cb" type="radio" value="ai">
        <span>
          <span class="pick__t">Let my AI do it <span class="chip chip--t2">RECOMMENDED</span></span>
          <span class="pick__d">
            Run the Sverse MCP server in whatever assistant you already use. It scans your project,
            proposes a catalog and runs each step. This page shows progress and asks you to approve the
            catalog.
          </span>
          <span v-if="form.mode === 'ai'" class="mcpneed">
            Need an API key?
            <NuxtLink to="/studio/settings?tab=keys" class="mcpneed__a">Create one here →</NuxtLink>
            <span class="dim"> (scopes <span class="t-mono">publish</span> + <span class="t-mono">read</span>; the key screen also gives you a paste-ready agent config)</span>
          </span>
        </span>
      </label>
      <label class="pick" :class="{ on: form.mode === 'manual' }">
        <span class="pick__r"></span>
        <input v-model="form.mode" class="pick__cb" type="radio" value="manual">
        <span>
          <span class="pick__t">Do it manually</span>
          <span class="pick__d">No agent. Define the catalog here and publish through the same state machine.</span>
        </span>
      </label>
    </div>

    <p class="sect">Tokenization level</p>
    <div class="lvlsel">
      <label v-for="level in levels" :key="level.value" class="lvl" :class="{ on: form.level === level.value }">
        <input v-model="form.level" class="lvl__cb" type="radio" :value="level.value">
        <span class="lvl__k">{{ level.value }}</span>
        <span style="flex:1">
          <b style="font-size:.87rem">{{ level.title }} <span v-if="level.value === 'L2'" class="chip chip--t2">DEFAULT</span></b>
          <span class="t-small dim" style="display:block">{{ level.desc }}</span>
        </span>
      </label>
    </div>
    <p class="t-small dim" style="margin-top:12px">A dial, not a door. Moving up later is a config change — but it is one-way, because player ownership must not be revocable.</p>

    <div v-if="startError" class="note note--bad" style="margin-top:16px">
      <span class="note__i">⚠️</span>
      <div>{{ startError }}</div>
    </div>

    <div class="formacts" style="margin-top:20px">
      <button class="btn btn--ghost" type="button" :disabled="starting" @click="emit('back')">← Back</button>
      <button class="btn btn--grad" type="button" :disabled="starting" @click="emit('apply')">
        {{ starting ? 'Saving…' : 'Continue →' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Mode } from '~/utils/studioPublish'

defineProps<{
  gameTitle: string
  form: { mode: Mode; level: string }
  levels: Array<{ value: string; title: string; desc: string }>
  starting: boolean
  startError: string
}>()

const emit = defineEmits<{
  back: []
  apply: []
}>()
</script>

<style scoped>
.lvlsel { display: grid; gap: 8px; }
.lvl {
  display: flex; align-items: center; gap: 12px; padding: 11px 14px;
  border-radius: 11px; background: var(--surface); border: 1px solid var(--border); cursor: pointer;
}
.lvl.on { border-color: var(--pink); background: rgba(233, 53, 193, .08); }
.lvl__cb { position: absolute; opacity: 0; width: 0; height: 0; }
.lvl__k { font-family: var(--mono); font-weight: 700; width: 26px; }
.pick__cb { position: absolute; opacity: 0; width: 0; height: 0; }
.mcpneed { display: block; margin-top: 8px; font-size: .78rem; color: var(--text-dim); }
.mcpneed__a { color: var(--pink); text-decoration: underline; }
.formacts { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
</style>
