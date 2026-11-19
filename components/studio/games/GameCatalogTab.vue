<template>
  <section v-show="visible" class="pane on">
    <div class="shead">
      <p class="t-small dim" style="max-width:680px">Item definitions. Archiving stops new sales but
        never touches items players already own.</p>
      <div class="shead__act">
        <button class="btn btn--ghost btn--sm" type="button" @click="emit('openCsv')">Import CSV</button>
        <button class="btn btn--grad btn--sm" type="button" @click="emit('openItem', null)">＋ New item</button>
      </div>
    </div>

    <div v-if="items.length" class="tw">
      <table>
        <thead>
          <tr>
            <th>Item</th><th>SKU</th><th>Kind</th><th>Schema</th><th>Interop</th>
            <th class="num">Price</th><th class="num">Supply</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id" :class="{ archived: item.status === 'archived' }">
            <td>
              <div class="irow">
                <img :src="item.art?.url || seedAsset(`items/${item.sku}.png`)" :alt="item.name">
                <b>{{ item.name }}</b>
              </div>
            </td>
            <td class="t-mono dim">{{ item.sku }}</td>
            <td>{{ item.kind }}</td>
            <td class="t-mono dim schema">{{ item.schemaId || '—' }}</td>
            <td><span :class="tierChip(item.interopTier)">{{ item.interopTier }}</span></td>
            <td class="num">{{ formatSrv(item.priceUnits, { suffix: true }) }}</td>
            <td class="num">{{ supplyLabel(item) }}</td>
            <td><span :class="itemStatusChip(item.status)">{{ item.status }}</span></td>
            <td>
              <div class="rowacts">
                <button class="btn btn--ghost btn--sm" type="button" @click="emit('openItem', item)">Edit</button>
                <button
                  v-if="item.status !== 'archived'"
                  class="btn btn--ghost btn--sm btn--danger"
                  type="button"
                  @click="emit('askArchive', item)"
                >Archive</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty">
      <p class="empty__i">📦</p>
      <p>No item definitions yet.</p>
      <p class="t-small dim">Create one to start selling items in this game.</p>
      <button class="btn btn--grad btn--sm" type="button" @click="emit('openItem', null)">＋ New item</button>
    </div>

    <div class="note" style="margin-top:20px">
      <span class="note__i">📦</span>
      <div>Limited supply <b>max can be raised but never lowered below minted</b> — the input's floor
        is the current mint count. Archiving an item changes nothing for the players who already own it.</div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  items: Array<Record<string, any>>
}>()

const emit = defineEmits<{
  openCsv: []
  openItem: [item: Record<string, any> | null]
  askArchive: [item: Record<string, any>]
}>()

const { seedAsset, formatSrv, formatNum, tierChip } = useStudioFormat()

function supplyLabel(item: Record<string, any>) {
  const minted = Number(item.supply?.minted ?? 0)
  if (item.supply?.type === 'unlimited') return `${formatNum(minted)} / ∞`
  return `${formatNum(minted)} / ${formatNum(item.supply?.max ?? 0)}`
}

function itemStatusChip(status: string) {
  if (status === 'active') return 'chip chip--live'
  if (status === 'draft') return 'chip chip--warn'
  return 'chip'
}
</script>

<style scoped>
.shead { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
.shead__act { display: flex; gap: 9px; }
.irow { display: flex; align-items: center; gap: 10px; }
.irow img { width: 34px; height: 34px; border-radius: 7px; object-fit: cover; border: 1px solid var(--border); }
.schema { font-size: 0.74rem; }
.rowacts { display: flex; gap: 8px; justify-content: flex-end; }
tr.archived { opacity: 0.5; }

@media (max-width: 900px) {
  .rowacts { justify-content: flex-start; }
}
@media (max-width: 768px) {
  .shead { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 375px) {
  .shead__act { width: 100%; flex-direction: column; }
  .shead__act .btn { width: 100%; }
}
</style>
