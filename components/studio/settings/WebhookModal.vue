<template>
  <div v-if="open" class="backdrop">
    <div class="modal modal--wide">
      <div class="modal__h">
        <div>
          <h3>{{ hookForm.id ? 'Edit webhook endpoint' : 'Add webhook endpoint' }}</h3>
          <p>We POST signed JSON on every subscribed event</p>
        </div>
        <button class="modal__x" type="button" @click="closeModal">✕</button>
      </div>
      <div class="modal__b">
        <div class="field" :class="{ bad: hookFieldError('url') }">
          <label>Endpoint URL</label>
          <input v-model.trim="hookForm.url" type="url" placeholder="https://example.com/hooks/sverse" :disabled="hookSaving">
          <p v-if="hookFieldError('url')" class="field__err">{{ hookFieldError('url') }}</p>
        </div>
        <div v-if="hookForm.id" class="field">
          <label>Status</label>
          <AppSelect
            v-model="hookForm.status"
            :options="[{ value: 'active', label: 'Active' }, { value: 'disabled', label: 'Disabled' }]"
            :disabled="hookSaving"
            aria-label="Webhook status"
            block
          />
        </div>
        <p class="t-micro dim" style="margin:16px 0 9px">Events</p>
        <div class="evgrid">
          <label v-for="event in availableEvents" :key="event" class="ev">
            <span class="toggle" :class="{ on: hookForm.events.includes(event) }"></span>
            <input type="checkbox" class="ev__cb" :checked="hookForm.events.includes(event)" :disabled="hookSaving" @change="toggleHookFormEvent(event)">
            <span class="t-mono">{{ event }}</span>
          </label>
        </div>
        <div class="note" style="margin-top:18px">
          <span class="note__i">↻</span>
          <div>Retries 5× with exponential backoff (1m → 16m), then dead-letters. Ten consecutive failures auto-disables the endpoint and emails you.</div>
        </div>
        <div v-if="hookError" class="note note--bad" style="margin-top:14px">
          <span class="note__i">⚠️</span>
          <div>{{ hookError }}</div>
        </div>
      </div>
      <div class="modal__f">
        <button class="btn btn--ghost" type="button" :disabled="hookSaving" @click="closeModal">Cancel</button>
        <button class="btn btn--grad savehook" type="button" :disabled="hookSaving" @click="saveHook">
          {{ hookSaving ? 'Saving…' : hookForm.id ? 'Save endpoint' : 'Add endpoint' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { issuesOf, messageOf, type FieldIssue } from '~/utils/studioGame'
import { fieldErrorFrom, type WebhookEndpointRecord } from '~/utils/studioSettings'

const props = defineProps<{
  open: boolean
  endpoint: WebhookEndpointRecord | null
  availableEvents: string[]
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const api = useApi()
const hookSaving = ref(false)
const hookError = ref('')
const hookIssues = ref<FieldIssue[]>([])
const hookForm = reactive<{ id: string; url: string; status: 'active' | 'disabled'; events: string[] }>({
  id: '', url: '', status: 'active', events: [],
})

watch(() => [props.open, props.endpoint] as const, ([isOpen, endpoint]) => {
  if (!isOpen) return
  if (endpoint) {
    hookForm.id = endpoint.id
    hookForm.url = endpoint.url
    hookForm.status = endpoint.status === 'disabled' ? 'disabled' : 'active'
    hookForm.events = [...(endpoint.events ?? [])]
  } else {
    hookForm.id = ''
    hookForm.url = ''
    hookForm.status = 'active'
    hookForm.events = props.availableEvents.slice(0, 1)
  }
  hookError.value = ''
  hookIssues.value = []
})

function hookFieldError(field: string) {
  return fieldErrorFrom(hookIssues.value, field)
}

function closeModal() {
  if (hookSaving.value) return
  emit('close')
}

function toggleHookFormEvent(event: string) {
  const index = hookForm.events.indexOf(event)
  if (index >= 0) hookForm.events.splice(index, 1)
  else hookForm.events.push(event)
}

async function saveHook() {
  if (hookSaving.value) return
  hookError.value = ''
  hookIssues.value = []
  if (!hookForm.events.length) {
    hookError.value = 'Subscribe to at least one event.'
    return
  }
  hookSaving.value = true
  try {
    if (hookForm.id) {
      await api.one(`/api/v1/studios/me/webhooks/${hookForm.id}`, {
        method: 'PATCH',
        body: { url: hookForm.url, events: [...hookForm.events], status: hookForm.status },
      })
    } else {
      await api.one('/api/v1/studios/me/webhooks', {
        method: 'POST',
        body: { url: hookForm.url, events: [...hookForm.events] },
      })
    }
    emit('saved')
  } catch (raw: unknown) {
    hookIssues.value = issuesOf(raw)
    hookError.value = hookIssues.value.length ? 'Please fix the highlighted fields.' : messageOf(raw, 'Could not save the endpoint.')
  } finally {
    hookSaving.value = false
  }
}
</script>

<style scoped>
.savehook { min-width: 122px; }
.modal.modal--wide { width: min(920px, 100%); }

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
