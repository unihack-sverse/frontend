<template>
  <template v-if="runs.length">
    <p class="sect">Recent runs</p>
    <div class="tw">
      <table>
        <thead>
          <tr><th>Game</th><th>Progress</th><th>Status</th><th>Started</th><th><span class="sr-only">Open</span></th></tr>
        </thead>
        <tbody>
          <tr v-for="entry in runs" :key="entry.id">
            <td>{{ entry.game?.title ?? '—' }}</td>
            <td class="dim">{{ progressLabel(entry) }}</td>
            <td>{{ entry.status }}</td>
            <td class="dim">{{ formatWhen(entry.createdAt) }}</td>
            <td>
              <button class="btn btn--ghost btn--sm" type="button" @click="emit('resume', entry)">{{ entry.status === 'done' ? 'View' : 'Resume' }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="t-small dim" style="margin-top:8px">Opening a finished run shows the result. Opening a running one resumes where it stopped.</p>
  </template>
</template>

<script setup lang="ts">
import { formatWhen, progressLabel, type PublishJobRecord } from '~/utils/studioPublish'

defineProps<{
  runs: PublishJobRecord[]
}>()

const emit = defineEmits<{
  resume: [entry: PublishJobRecord]
}>()
</script>

<style scoped>
.tw { overflow-x: auto; }
.tw table { width: 100%; border-collapse: collapse; font-size: .82rem; }
.tw th, .tw td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--border); }
.tw th { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; color: var(--text-dim); }
</style>
