<template>
  <section v-show="visible" class="pane on">
    <div class="shead">
      <p class="t-small dim">Delivery is at-least-once. Dedupe on <span class="t-mono">event.id</span>.</p>
      <button class="btn btn--grad btn--sm" type="button" @click="emit('openCreate')">＋ Add endpoint</button>
    </div>

    <div v-if="hooksPending" class="sk" style="height:200px;border-radius:var(--r-lg)"></div>
    <template v-else-if="endpoints.length">
      <div v-for="endpoint in endpoints" :key="endpoint.id" class="card card--pad hookcard">
        <div class="hookcard__h">
          <div style="min-width:0">
            <p class="t-mono hookcard__url">{{ endpoint.url }}</p>
            <p class="t-small dim">{{ endpoint.events.length }} event{{ endpoint.events.length === 1 ? '' : 's' }} subscribed · {{ endpoint.failureStreak }} failures in a row</p>
          </div>
          <div class="hookcard__act">
            <span :class="endpoint.status === 'active' ? 'chip chip--live' : 'chip chip--bad'">
              <i v-if="endpoint.status === 'active'" class="dot"></i>{{ endpoint.status }}
            </span>
            <button class="btn btn--ghost btn--sm" type="button" @click="emit('editEndpoint', endpoint)">Edit</button>
            <button class="btn btn--ghost btn--sm btn--danger" type="button" :disabled="deletingHookId === endpoint.id" @click="emit('deleteEndpoint', endpoint.id)">
              {{ deletingHookId === endpoint.id ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
        <p class="t-micro dim" style="margin:18px 0 10px">Signing secret</p>
        <div class="copyf">
          <span style="flex:1">{{ endpoint.signingSecretPrefix }}…</span>
          <button class="btn btn--ghost btn--sm" type="button" @click="emit('copy', endpoint.signingSecretPrefix, `prefix-${endpoint.id}`)">
            {{ copiedId === `prefix-${endpoint.id}` ? 'Copied' : 'Copy' }}
          </button>
        </div>
        <p class="t-small dim" style="margin-top:10px">
          Verify: <span class="t-mono">HMAC-SHA256(secret, "&lt;timestamp&gt;.&lt;rawBody&gt;")</span>
          against header <span class="t-mono">X-Sverse-Signature: t=…,v1=…</span> — tolerate ±5 min
          skew, and verify against the <b>raw</b> body, not a re-serialised object. The full
          secret was shown once when this endpoint was created.
        </p>
      </div>
    </template>
    <div v-else class="empty">
      <p class="empty__i">⚡</p>
      <p>No webhook endpoints yet.</p>
      <p class="t-small dim">Add an endpoint to receive signed events from your games.</p>
    </div>

    <template v-if="endpoints.length || deliveries.length">
      <p class="sect">Recent deliveries</p>
      <div v-if="deliveries.length" class="tw">
        <table>
          <thead>
            <tr><th>Event</th><th>Event ID</th><th class="num">Attempts</th><th>Response</th><th>When</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="delivery in deliveries" :key="delivery.id">
              <td class="t-mono">{{ delivery.event }}</td>
              <td class="t-mono dim" style="font-size:.74rem">{{ shortId(delivery.eventId) }}</td>
              <td class="num">{{ delivery.attempts }}</td>
              <td><span :class="deliveryChip(delivery)">{{ delivery.lastStatus ?? delivery.status }}</span></td>
              <td class="dim">{{ relativeTime(delivery.deliveredAt || delivery.createdAt, formatDate) }}</td>
              <td>
                <button
                  v-if="delivery.status === 'failed' || delivery.status === 'retrying'"
                  class="btn btn--ghost btn--sm replaybtn"
                  type="button"
                  :disabled="replayingId === delivery.id"
                  @click="emit('replay', delivery)"
                >{{ replayingId === delivery.id ? 'Replaying…' : 'Replay' }}</button>
                <span v-else-if="delivery.attempts > 1" class="t-small dim">recovered after {{ delivery.attempts - 1 }} retries</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty" style="padding:34px 30px">
        <p class="empty__i">◔</p>
        <p>No deliveries recorded yet.</p>
      </div>

      <p class="sect">Subscribed events</p>
      <p class="t-small dim" style="margin:-6px 0 12px">Toggles apply to
        <b>{{ editingEndpoint ? editingEndpoint.url : endpoints[0]?.url }}</b>.</p>
      <div class="evgrid">
        <label v-for="event in availableEvents" :key="event" class="ev">
          <span class="toggle" :class="{ on: isSubscribed(event) }"></span>
          <input
            type="checkbox"
            class="ev__cb"
            :checked="isSubscribed(event)"
            :disabled="subscribing || !editingEndpoint"
            @change="emit('toggleEvent', event)"
          >
          <span class="t-mono">{{ event }}</span>
        </label>
      </div>
      <div v-if="hookError" class="note note--bad" style="margin-top:14px">
        <span class="note__i">⚠️</span>
        <div>{{ hookError }}</div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import {
  deliveryChip,
  relativeTime,
  shortId,
  type WebhookDeliveryRecord,
  type WebhookEndpointRecord,
} from '~/utils/studioSettings'

const props = defineProps<{
  visible: boolean
  hooksPending: boolean
  endpoints: WebhookEndpointRecord[]
  deliveries: WebhookDeliveryRecord[]
  availableEvents: string[]
  editingEndpoint: WebhookEndpointRecord | null
  deletingHookId: string
  replayingId: string
  subscribing: boolean
  hookError: string
  copiedId: string
}>()

const emit = defineEmits<{
  openCreate: []
  editEndpoint: [endpoint: WebhookEndpointRecord]
  deleteEndpoint: [id: string]
  replay: [delivery: WebhookDeliveryRecord]
  toggleEvent: [event: string]
  copy: [value: string, id: string]
}>()

const { formatDate } = useStudioFormat()

function isSubscribed(event: string) {
  return !!props.editingEndpoint?.events?.includes(event)
}
</script>

<style scoped>
.shead {
  display: flex; justify-content: space-between; align-items: center;
  gap: 14px; flex-wrap: wrap; margin-bottom: 18px;
}
.shead .t-small { max-width: 620px; }

.replaybtn { min-width: 78px; }
.hookcard { margin-bottom: 20px; }
.hookcard__h { display: flex; justify-content: space-between; gap: 14px; flex-wrap: wrap; align-items: center; }
.hookcard__url { font-weight: 600; word-break: break-all; }
.hookcard__act { display: flex; gap: 9px; align-items: center; flex-wrap: wrap; }

.copyf {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; border-radius: 11px;
  background: var(--bg-2); border: 1px solid var(--border-2);
  font-family: var(--mono); font-size: .82rem; word-break: break-all;
}
.copyf button { flex-shrink: 0; }

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

@media (max-width: 768px) {
  .hookcard__h { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 700px) {
  .evgrid { grid-template-columns: 1fr; }
}
</style>
