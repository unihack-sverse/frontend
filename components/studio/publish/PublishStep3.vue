<template>
  <section aria-labelledby="s3-h">
    <h2 id="s3-h" class="sr-only">Step 3 · Catalog</h2>

    <div v-if="job.mode === 'ai'" class="agentgrid">
      <div class="card card--pad">
        <p class="sect" style="margin-top:0">Pipeline</p>
        <div class="rows">
          <div v-for="entry in job.steps" :key="entry.step">
            <span>{{ stepTitle(entry.step) }}</span>
            <strong :class="entry.status === 'failed' ? 'is-bad' : ''">{{ stepStatusLabel(entry, job.catalogApproved) }}</strong>
          </div>
        </div>
        <p class="t-small dim" style="margin-top:14px">
          Run <span class="t-mono">{{ job.id }}</span>
        </p>
      </div>

      <div class="agentprompt">
        <div class="agentprompt__h">
          <div>
            <p class="t-h3" style="font-size:.95rem">
              {{ job.catalogApproved ? 'Paste this to continue' : 'Paste this into your agent' }}
            </p>
            <p class="t-small dim" style="margin-top:3px">
              {{ job.catalogApproved
                ? 'The catalogue is approved — this tells the model what to do next.'
                : 'It names the job and the stopping point, so the model does not have to guess.' }}
            </p>
          </div>
          <button class="btn btn--ghost btn--sm" type="button" @click="emit('copyPrompt')">
            {{ copiedPrompt ? 'Copied' : 'Copy' }}
          </button>
        </div>
        <pre class="configblk">{{ agentPrompt }}</pre>
        <p class="t-small dim" style="margin-top:10px">
          Need a key first? <NuxtLink to="/studio/settings?tab=keys" class="mcpneed__a">Create one →</NuxtLink>
        </p>
      </div>
    </div>

    <p class="sect">Catalog · {{ draftRows.length }} item{{ draftRows.length === 1 ? '' : 's' }}</p>
    <div class="grid" style="gap:12px">
      <div
        v-for="(row, index) in draftRows"
        :key="row.uid"
        class="crow"
        :class="{
          'crow--edit': job.mode === 'manual' && !job.catalogApproved,
          'crow--bad': rowIssues[row.uid],
        }"
      >
        <div class="crow__av">
          <img v-if="row.artUrl && !row.artBroken" :src="row.artUrl" :alt="row.name || 'Item art'" @error="row.artBroken = true">
          <span v-else>{{ row.emoji || '📦' }}</span>
        </div>

        <div class="crow__main">
          <div class="crow__top">
            <div class="crow__field crow__field--name">
              <span v-if="job.mode === 'manual' && !job.catalogApproved" class="crow__lbl">Item name</span>
              <input
                v-model.trim="row.name"
                class="crow__name"
                :class="{ bad: rowErrorFor(row.uid, 'name') }"
                maxlength="80"
                placeholder="e.g. Starter Pack, Crimson Blade…"
                :disabled="approving || job.catalogApproved || job.mode === 'ai'"
                :aria-invalid="Boolean(rowErrorFor(row.uid, 'name'))"
                aria-label="Item name"
                @input="emit('clearRowIssue', row.uid, 'name')"
              >
              <p v-if="rowErrorFor(row.uid, 'name')" class="crow__err">{{ rowErrorFor(row.uid, 'name') }}</p>
            </div>

            <div v-if="job.mode === 'manual'" class="crow__field crow__field--kind">
              <span v-if="!job.catalogApproved" class="crow__lbl">Type</span>
              <AppSelect
                v-model="row.kind"
                :options="ITEM_KINDS"
                size="sm"
                block
                :disabled="approving || job.catalogApproved"
                aria-label="Item type"
              />
            </div>

            <div class="crow__field crow__field--price">
              <span v-if="job.mode === 'manual' && !job.catalogApproved" class="crow__lbl">Price</span>
              <div class="crow__p" :class="{ bad: rowErrorFor(row.uid, 'price'), 'is-readonly': job.catalogApproved || job.mode === 'ai' }">
                <input
                  v-model="row.price"
                  type="text"
                  inputmode="decimal"
                  placeholder="0.00"
                  :class="{ bad: rowErrorFor(row.uid, 'price') }"
                  :aria-invalid="Boolean(rowErrorFor(row.uid, 'price'))"
                  aria-label="Price in SRV"
                  :disabled="job.catalogApproved || job.mode === 'ai'"
                  @input="emit('clearRowIssue', row.uid, 'price')"
                >
                <span class="crow__unit">SRV</span>
              </div>
              <p v-if="rowErrorFor(row.uid, 'price')" class="crow__err crow__err--right">{{ rowErrorFor(row.uid, 'price') }}</p>
            </div>

            <button
              v-if="job.mode === 'manual' && !job.catalogApproved"
              class="crow__del"
              type="button"
              :disabled="approving"
              title="Remove item"
              aria-label="Remove item"
              @click="emit('removeRow', index)"
            >✕</button>
          </div>

          <div v-if="job.mode === 'manual' && !job.catalogApproved" class="crow__bottom">
            <div class="crow__art">
              <input
                v-model.trim="row.artUrl"
                type="url"
                class="crow__artinput"
                placeholder="Image URL (optional) — https://…/item.png"
                :class="{ bad: rowErrorFor(row.uid, 'art') }"
                :aria-invalid="Boolean(rowErrorFor(row.uid, 'art'))"
                aria-label="Item image URL"
                :disabled="approving"
                @input="row.artBroken = false; emit('clearRowIssue', row.uid, 'art')"
              >
              <p v-if="rowErrorFor(row.uid, 'art')" class="crow__err">{{ rowErrorFor(row.uid, 'art') }}</p>
            </div>
            <span v-if="kindHint(row.kind)" class="crow__hint">{{ kindHint(row.kind) }}</span>
          </div>

          <p v-else class="crow__d">
            <template v-if="job.mode === 'manual'">
              <span class="crow__hint">{{ kindHint(row.kind) }}</span>
            </template>
            <template v-else>
              <span v-if="row.schemaId">{{ row.schemaId }} · </span><span>{{ row.interopTier }}</span>
              <span v-if="row.slot"> · slot {{ row.slot }}</span>
              <span v-if="row.kind"> · {{ row.kind }}</span>
            </template>
          </p>
        </div>
      </div>

      <div v-if="!draftRows.length" class="catalogempty">
        <p class="t-small dim" style="margin:0">
          <template v-if="job.mode === 'manual'">
            No items yet. Add what this game sells — a starter bundle, a season pass, a cosmetic.
          </template>
          <template v-else>
            Nothing proposed yet. Your agent will fill this in.
          </template>
        </p>
      </div>

      <button v-if="job.mode === 'manual' && !job.catalogApproved" class="drop" type="button" :disabled="approving" @click="emit('addRow')">
        ＋ Add an item
      </button>
    </div>

    <div v-if="rowError" class="note note--bad" style="margin-top:14px">
      <span class="note__i">⚠️</span>
      <div>{{ rowError }}</div>
    </div>

    <div v-if="draftRows.length && !job.catalogApproved" class="note" style="margin-top:16px">
      <span class="note__i">🌐</span>
      <div>Approving maps every item onto a shared schema, so it stays usable across other Sverse games.</div>
    </div>

    <template v-if="liveItems.length">
      <p class="sect" style="margin-top:24px">Items in this game · {{ liveItems.length }}</p>
      <div class="tw">
        <table>
          <thead>
            <tr><th>Item</th><th>Kind</th><th>Interop</th><th class="num">Price</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in liveItems" :key="item.id" :class="{ dimrow: item.status === 'archived' }">
              <td><b>{{ item.name }}</b><span class="t-mono dim sku">{{ item.sku }}</span></td>
              <td>{{ item.kind }}</td>
              <td><span :class="tierChip(item.interopTier)">{{ item.interopTier }}</span></td>
              <td class="num">{{ formatSrv(item.priceUnits, { suffix: true }) }}</td>
              <td>{{ item.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;align-items:center">
      <template v-if="job.mode === 'manual'">
        <button v-if="!job.catalogApproved" class="btn btn--grad" type="button" :disabled="approving || !canApprove" @click="emit('approveCatalog')">
          {{ approving ? 'Approving…' : 'Approve catalog' }}
        </button>
        <button v-else-if="job.status !== 'done'" class="btn btn--grad" type="button" :disabled="publishing" @click="emit('publishManual')">
          {{ publishing ? 'Publishing…' : 'Publish to the Store →' }}
        </button>
      </template>

      <template v-else>
        <button v-if="!job.catalogApproved" class="btn btn--ghost btn--fixed" type="button" :disabled="pollBusy" @click="emit('refresh')">
          {{ pollBusy ? 'Refreshing…' : 'Refresh' }}
        </button>
        <button v-if="!job.catalogApproved" class="btn btn--grad btn--fixed" type="button" :disabled="approving || !canApprove" @click="emit('approveCatalog')">
          {{ approving ? 'Approving…' : 'Approve catalog' }}
        </button>
        <button v-else-if="job.status !== 'done'" class="btn btn--ghost btn--fixed" type="button" :disabled="pollBusy" @click="emit('refresh')">
          {{ pollBusy ? 'Refreshing…' : 'Refresh' }}
        </button>
        <span v-else-if="job.catalogApproved" class="t-small dim">
          Approved. Your agent continues from here — this page updates automatically.
        </span>
      </template>

      <button v-if="job.status === 'done'" class="btn btn--ghost" type="button" @click="emit('goStep4')">See result →</button>
      <span v-if="job.mode === 'manual' && !job.catalogApproved && !canApprove && draftRows.length" class="t-small dim">
        Every item needs a name and a price above zero.
      </span>
      <span v-else-if="job.mode === 'manual' && !job.catalogApproved && !draftRows.length" class="t-small dim">
        Add at least one item to approve.
      </span>
    </div>

    <div v-if="inlineError" class="note note--bad" style="margin-top:16px">
      <span class="note__i">⚠️</span>
      <div>
        <b>{{ inlineError.title }}</b> {{ inlineError.message }}
        <div v-if="inlineError.code === 'build_required' && job.game?.id" class="noteact">
          <NuxtLink class="notelink" :to="`/studio/games/${job.game.id}`">Open game editor →</NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  ITEM_KINDS,
  kindHint,
  stepStatusLabel,
  stepTitle,
  type DraftRow,
  type LiveItemSummary,
  type PublishJobRecord,
  type RowIssueField,
  type RowIssues,
} from '~/utils/studioPublish'

const props = defineProps<{
  job: PublishJobRecord
  draftRows: DraftRow[]
  rowIssues: RowIssues
  liveItems: LiveItemSummary[]
  approving: boolean
  publishing: boolean
  pollBusy: boolean
  canApprove: boolean
  inlineError: { title: string; message: string; code?: string } | null
  rowError: string
  agentPrompt: string
  copiedPrompt: boolean
}>()

const emit = defineEmits<{
  copyPrompt: []
  clearRowIssue: [uid: string, field: RowIssueField]
  removeRow: [index: number]
  addRow: []
  approveCatalog: []
  publishManual: []
  refresh: []
  goStep4: []
}>()

const { formatSrv, tierChip } = useStudioFormat()

function rowErrorFor(uid: string, field: RowIssueField) {
  return props.rowIssues[uid]?.[field] ?? ''
}
</script>

<style scoped>
.catalogempty {
  padding: 18px 20px; border-radius: var(--r-md);
  background: var(--surface); border: 1px dashed var(--border-2);
}

.tw { overflow-x: auto; }
.tw table { width: 100%; border-collapse: collapse; font-size: .82rem; }
.tw th, .tw td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--border); }
.tw th { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; color: var(--text-dim); }
.tw .num { text-align: right; font-family: var(--mono); }
.tw .sku { display: block; font-size: .72rem; }
.tw .dimrow { opacity: .55; }

.crow {
  display: flex; align-items: center; gap: 16px;
  padding: 14px 16px; border-radius: var(--r-lg);
  background: var(--surface); border: 1px solid var(--border);
  transition: border-color .18s, background .18s;
}
.crow--edit {
  align-items: flex-start;
  padding: 16px 18px;
}
.crow:hover { border-color: var(--border-2); }
.crow__av {
  width: 48px; height: 48px; border-radius: var(--r-md); flex-shrink: 0;
  display: grid; place-items: center; font-size: 1.45rem; overflow: hidden;
  background: var(--bg-2); border: 1px solid var(--border-2);
}
.crow--edit .crow__av {
  width: 64px; height: 64px; font-size: 1.7rem;
  margin-top: 18px;
}
.crow__av img { width: 100%; height: 100%; object-fit: cover; display: block; }
.crow__main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.crow:not(.crow--edit) .crow__main { gap: 4px; }

.crow__top {
  display: flex; align-items: flex-start; gap: 12px;
}
.crow:not(.crow--edit) .crow__top {
  align-items: center;
}
.crow__field { display: flex; flex-direction: column; min-width: 0; }
.crow__field--name { flex: 1 1 220px; }
.crow__field--kind { flex: 0 0 156px; }
.crow__field--price { flex: 0 0 144px; }
.crow:not(.crow--edit) .crow__field--price { flex: 0 0 auto; margin-left: auto; }

.crow__lbl {
  display: block; font-size: .7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .08em;
  color: var(--text-dim); margin-bottom: 5px; line-height: 1.2;
}

.crow__name {
  display: block; width: 100%; height: 38px;
  font-weight: 600; font-size: .88rem; font-family: var(--font);
  background: var(--bg-2); border: 1px solid var(--border); border-radius: 9px;
  padding: 0 12px; color: var(--text);
  transition: border-color .16s;
}
.crow__name::placeholder { color: var(--text-dim); font-weight: 400; opacity: .75; }
.crow__name:hover:not(:disabled) { border-color: var(--border-2); }
.crow__name:focus { border-color: var(--pink); outline: none; }
.crow__name:disabled {
  height: auto; background: transparent; border-color: transparent;
  padding: 0; font-size: .92rem;
}

.crow__field--kind :deep(.sel__btn) {
  height: 38px; padding: 0 12px; border-radius: 9px;
  background: var(--bg-2); font-size: .85rem; font-weight: 500;
}

.crow__p {
  display: flex; align-items: center; height: 38px;
  border-radius: 9px; background: var(--bg-2); border: 1px solid var(--border);
  padding: 0 11px 0 4px; transition: border-color .16s;
}
.crow__p:hover:not(.is-readonly) { border-color: var(--border-2); }
.crow__p:focus-within:not(.is-readonly) { border-color: var(--pink); }
.crow__p.is-readonly {
  height: auto; background: transparent; border-color: transparent; padding: 0;
}
.crow__p input {
  flex: 1; min-width: 0; width: 100%; height: 100%;
  padding: 0 6px; border: none; background: transparent;
  color: var(--text); font-family: var(--mono); font-size: .86rem; font-weight: 600;
  text-align: right;
}
.crow__p input::placeholder { color: var(--text-dim); font-weight: 400; opacity: .65; }
.crow__p input:focus { outline: none; }
.crow__unit {
  font-family: var(--mono); font-size: .74rem; font-weight: 700;
  color: var(--text-dim); letter-spacing: .04em; flex-shrink: 0;
  padding-left: 4px;
}

.crow__del {
  width: 38px; height: 38px; border-radius: 9px; flex-shrink: 0;
  margin-top: 19px;
  display: grid; place-items: center;
  background: var(--bg-2); border: 1px solid var(--border);
  color: var(--text-dim); font-size: .85rem;
  transition: color .16s, border-color .16s, background .16s;
}
.crow__del:hover:not(:disabled) {
  color: var(--red); border-color: rgba(255, 95, 87, .45); background: rgba(255, 95, 87, .1);
}
.crow__del:disabled { opacity: .45; cursor: not-allowed; }

.crow__bottom {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}
.crow__art { flex: 1 1 260px; min-width: 0; }
.crow__artinput {
  width: 100%; height: 36px; padding: 0 12px; border-radius: 9px;
  background: var(--bg-2); border: 1px solid var(--border);
  color: var(--text); font-family: var(--font); font-size: .8rem;
  transition: border-color .16s;
}
.crow__artinput::placeholder { color: var(--text-dim); opacity: .75; }
.crow__artinput:hover:not(:disabled) { border-color: var(--border-2); }
.crow__artinput:focus { outline: none; border-color: var(--pink); }

.crow__d {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  margin: 0; line-height: 1.5;
  font-family: var(--font); font-size: .78rem; color: var(--text-dim);
}
.crow__hint {
  flex: 0 0 auto; font-size: .76rem; color: var(--text-dim);
  padding: 5px 11px; border-radius: var(--r-pill);
  background: rgba(255, 255, 255, .035); border: 1px solid var(--border);
  white-space: nowrap;
}
.crow:not(.crow--edit) .crow__hint {
  padding: 0; border: none; background: transparent; white-space: normal;
}

.crow__err { font-family: var(--font); font-size: .74rem; line-height: 1.4; color: var(--red); margin-top: 5px; }
.crow__err--right { text-align: right; }
.crow--bad { border-color: rgba(255, 95, 87, .45); }
.bad { border-color: var(--red) !important; }

.drop {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; border: 1px dashed var(--border-2); border-radius: var(--r-lg);
  padding: 14px 18px; text-align: center; color: var(--text-dim);
  font: inherit; font-size: .86rem; font-weight: 600;
  background: var(--surface); cursor: pointer;
  transition: border-color .18s, color .18s, background .18s;
}
.drop:hover:not(:disabled) { border-color: var(--pink); color: var(--text); background: var(--surface-2); }
.drop[disabled] { opacity: .55; cursor: not-allowed; }

.mcpneed__a { color: var(--pink); text-decoration: underline; }

.agentgrid {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px; align-items: start;
}
.agentprompt {
  padding: 18px 20px; border-radius: var(--r-lg);
  background: var(--surface); border: 1px solid var(--border);
  display: flex; flex-direction: column;
}
.agentprompt__h {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 14px; margin-bottom: 12px;
}
.agentprompt .configblk { flex: 1; max-height: none; }

@media (max-width: 1100px) {
  .agentgrid { grid-template-columns: minmax(0, 1fr); }
}

.configblk {
  margin: 0; padding: 14px 16px; border-radius: var(--r-md);
  background: var(--bg-2); border: 1px solid var(--border);
  font-family: var(--mono); font-size: .74rem; line-height: 1.6;
  color: var(--text-dim); white-space: pre-wrap; word-break: break-word;
  max-height: 320px; overflow-y: auto;
}

.notelink { color: var(--pink); text-decoration: underline; font-weight: 600; cursor: pointer; }
.noteact { margin-top: 8px; position: relative; z-index: 1; }
.btn--fixed { min-width: 132px; justify-content: center; }

@media (max-width: 768px) {
  .crow { flex-wrap: wrap; }
  .crow--edit .crow__av { margin-top: 0; width: 48px; height: 48px; font-size: 1.4rem; }
  .crow__top { flex-wrap: wrap; }
  .crow__field--name { flex: 1 1 100%; }
  .crow__field--kind { flex: 1 1 140px; }
  .crow__field--price { flex: 1 1 130px; }
}
</style>
