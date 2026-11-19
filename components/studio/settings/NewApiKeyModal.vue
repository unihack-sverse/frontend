<template>
  <div v-if="open" class="backdrop">
    <div class="modal" :class="{ 'modal--wide': keyForm.created && keyForm.scopes.includes('publish') }">
      <div class="modal__h">
        <div>
          <h3>{{ keyForm.created ? 'API key created' : 'New API key' }}</h3>
          <p>{{ keyForm.created ? 'Copy it now — this is the only time it is shown' : 'Scoped access for a game client or agent' }}</p>
        </div>
        <button v-if="!keyForm.created" class="modal__x" type="button" @click="closeModal">✕</button>
      </div>

      <div class="modal__b">
        <template v-if="keyForm.created">
          <div :class="keyForm.scopes.includes('publish') ? 'keytwo' : ''">
            <div class="keytwo__l">
              <div class="note note--warn" style="margin-bottom:16px">
                <span class="note__i">⚠️</span>
                <div><b>We store only a hash.</b> If you lose this value you must revoke the key and create a new one. There is no recovery path — by design.</div>
              </div>
              <p class="t-micro dim" style="margin-bottom:9px">Secret</p>
              <div class="copyf">
                <span style="flex:1">{{ keyForm.secret }}</span>
                <button class="btn btn--ghost btn--sm" type="button" @click="emit('copy', keyForm.secret, 'secret')">
                  {{ copiedId === 'secret' ? 'Copied' : 'Copy' }}
                </button>
              </div>

              <div v-if="!keyForm.scopes.includes('publish')" class="note" style="margin-top:16px">
                <span class="note__i">ℹ️</span>
                <div>
                  This key has no <span class="t-mono">publish</span> scope, so it cannot drive the MCP server.
                  Create another key with <span class="t-mono">publish</span> and <span class="t-mono">read</span>
                  to get a ready-to-paste agent config.
                </div>
              </div>
              <p v-else class="t-small dim" style="margin-top:16px">
                Then ask your agent: <span class="t-mono">Use sverse_whoami</span>. The full guide ships with
                the server at <span class="t-mono">mcp/docs/USER-GUIDE.md</span> — setup, what each step does,
                and what to do when the flow stops.
              </p>

              <div class="keyacts">
                <button class="btn btn--grad" type="button" @click="closeModal">I have copied the secret</button>
              </div>
            </div>

            <div v-if="keyForm.scopes.includes('publish')" class="keytwo__r">
              <p class="t-micro dim" style="margin:0 0 8px">Agent config</p>
              <p class="t-small dim" style="margin:0 0 10px">
                Same JSON for every MCP client — only the file differs.
              </p>

              <div class="cfgpath">
                <span class="cfgpath__k">Cursor</span>
                <span class="cfgpath__v t-mono">.cursor/mcp.json</span>
              </div>
              <div class="cfgpath">
                <span class="cfgpath__k">Claude Desktop</span>
                <span class="cfgpath__v t-mono">claude_desktop_config.json</span>
              </div>

              <pre class="configblk">{{ mcpConfig }}</pre>
              <div class="copyf" style="margin-top:8px">
                <span style="flex:1" class="t-small dim">Replace the two &lt;absolute-path…&gt; placeholders.</span>
                <button class="btn btn--ghost btn--sm" type="button" @click="emit('copy', mcpConfig, 'mcp')">
                  {{ copiedId === 'mcp' ? 'Copied' : 'Copy config' }}
                </button>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="field" :class="{ bad: keyFieldError('label') }">
            <label>Label</label>
            <input v-model.trim="keyForm.label" maxlength="60" placeholder="e.g. Production client" :disabled="keyCreating">
            <p v-if="keyFieldError('label')" class="field__err">{{ keyFieldError('label') }}</p>
          </div>
          <div class="field">
            <label>Bind to game</label>
            <AppSelect
              v-model="keyForm.gameId"
              :options="[{ value: '', label: 'All games' }, ...games.map((game) => ({ value: game.id, label: game.title }))]"
              :disabled="keyCreating"
              aria-label="Bind to game"
              block
            />
          </div>
          <p class="t-micro dim" style="margin-bottom:9px">Scopes</p>
          <div class="evgrid">
            <label v-for="scope in scopeOptions" :key="scope" class="ev">
              <span class="toggle" :class="{ on: keyForm.scopes.includes(scope) }"></span>
              <input type="checkbox" class="ev__cb" :checked="keyForm.scopes.includes(scope)" :disabled="keyCreating" @change="toggleScope(scope)">
              <span class="t-mono">{{ scope }}</span>
            </label>
          </div>
          <div v-if="keyError" class="note note--bad" style="margin-top:16px">
            <span class="note__i">⚠️</span>
            <div>{{ keyError }}</div>
          </div>
        </template>
      </div>

      <div v-if="!keyForm.created" class="modal__f">
        <button class="btn btn--ghost" type="button" :disabled="keyCreating" @click="closeModal">Cancel</button>
        <button class="btn btn--grad createbtn" type="button" :disabled="keyCreating" @click="createKey">
          {{ keyCreating ? 'Creating…' : 'Create key' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { issuesOf, messageOf, type FieldIssue } from '~/utils/studioGame'
import {
  buildMcpConfigJson,
  fieldErrorFrom,
  type ApiKeyScope,
  type SettingsGameRef,
} from '~/utils/studioSettings'

const props = defineProps<{
  open: boolean
  games: SettingsGameRef[]
  scopeOptions: ApiKeyScope[]
  copiedId: string
}>()

const emit = defineEmits<{
  close: []
  created: []
  copy: [value: string, id: string]
}>()

const api = useApi()
const keyCreating = ref(false)
const keyError = ref('')
const keyIssues = ref<FieldIssue[]>([])
const keyForm = reactive<{ label: string; gameId: string; scopes: ApiKeyScope[]; secret: string; created: boolean }>({
  label: '', gameId: '', scopes: ['game'], secret: '', created: false,
})

const mcpConfig = computed(() => {
  const apiOrigin = useRequestURL().origin.replace(/\/$/, '')
  const consoleOrigin = import.meta.client ? window.location.origin : apiOrigin
  return buildMcpConfigJson(keyForm.secret, apiOrigin, consoleOrigin)
})

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  keyForm.label = ''
  keyForm.gameId = ''
  keyForm.scopes = ['game']
  keyForm.secret = ''
  keyForm.created = false
  keyError.value = ''
  keyIssues.value = []
})

function keyFieldError(field: string) {
  return fieldErrorFrom(keyIssues.value, field)
}

function closeModal() {
  if (keyCreating.value) return
  emit('close')
}

function toggleScope(scope: ApiKeyScope) {
  const index = keyForm.scopes.indexOf(scope)
  if (index >= 0) keyForm.scopes.splice(index, 1)
  else keyForm.scopes.push(scope)
}

async function createKey() {
  if (keyCreating.value) return
  keyError.value = ''
  keyIssues.value = []
  if (!keyForm.scopes.length) {
    keyError.value = 'Select at least one scope.'
    return
  }
  keyCreating.value = true
  try {
    const created = await api.one<{ secret: string }>('/api/v1/studios/me/api-keys', {
      method: 'POST',
      body: { label: keyForm.label || undefined, scopes: [...keyForm.scopes], gameId: keyForm.gameId || null },
    })
    keyForm.secret = created.secret
    keyForm.created = true
    emit('created')
  } catch (raw: unknown) {
    keyIssues.value = issuesOf(raw)
    keyError.value = keyIssues.value.length ? 'Please fix the highlighted fields.' : messageOf(raw, 'Could not create the key.')
  } finally {
    keyCreating.value = false
  }
}
</script>

<style scoped>
.createbtn { min-width: 122px; }
.copyf {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; border-radius: 11px;
  background: var(--bg-2); border: 1px solid var(--border-2);
  font-family: var(--mono); font-size: .82rem; word-break: break-all;
}
.copyf button { flex-shrink: 0; }

.configblk {
  margin: 0; padding: 14px 16px; border-radius: 11px;
  background: var(--bg-2); border: 1px solid var(--border-2);
  font-family: var(--mono); font-size: .76rem; line-height: 1.55;
  color: var(--text); overflow-x: auto; white-space: pre;
}

.modal.modal--wide { width: min(920px, 100%); }
.keytwo {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 22px; align-items: start;
}
.keytwo__l, .keytwo__r { min-width: 0; }
.keytwo__r {
  padding-left: 22px; border-left: 1px solid var(--border);
  align-self: stretch;
}
.keyacts { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; }

.cfgpath {
  display: flex; align-items: baseline; gap: 10px;
  padding: 5px 0; font-size: .78rem;
}
.cfgpath__k { color: var(--text-dim); min-width: 108px; flex-shrink: 0; }
.cfgpath__v { color: var(--text); word-break: break-all; }
@media (max-width: 860px) {
  .keytwo { grid-template-columns: minmax(0, 1fr); }
  .keytwo__r { padding-left: 0; border-left: none; border-top: 1px solid var(--border); padding-top: 18px; }
}

.evgrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; }
.ev {
  display: flex; align-items: center; gap: 10px; font-size: .83rem;
  padding: 8px 11px; border-radius: 9px;
  background: var(--surface); border: 1px solid var(--border); cursor: pointer;
}
.ev .toggle { width: 34px; height: 20px; }
.ev .toggle::after { width: 14px; height: 14px; left: 2px; }
.ev .toggle.on::after { left: 17px; }
.ev__cb { position: absolute; opacity: 0; width: 0; height: 0; }

@media (max-width: 700px) {
  .evgrid { grid-template-columns: 1fr; }
}
</style>
