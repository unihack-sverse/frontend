<template>
  <section v-show="visible" class="pane on">
    <div class="note note--warn" style="margin-bottom:22px">
      <span class="note__i">🔑</span>
      <div>
        <b>This key signs your deeds.</b> Every gameplay event your game writes to a Living Item
        is signed with it. If it leaks, someone can fabricate history on your players' items —
        and your bond gets slashed for it, not theirs.
      </div>
    </div>

    <div class="card card--pad">
      <p class="sect" style="margin-top:0">Deed attestation secret</p>
      <div class="copyf">
        <span style="flex:1">{{ keyCount ? '••••••••••••••••••••••••••••••••' : 'no secret provisioned yet' }}</span>
        <button class="btn btn--ghost btn--sm" type="button" disabled title="Rotation is not exposed by the API yet">Rotate</button>
      </div>
      <p class="t-small dim" style="margin-top:10px">
        Rotation is not exposed by the API yet — the secret is provisioned with each API key and
        there is no rotate endpoint. Re-key with a fresh API key if it is ever compromised.
      </p>

      <p class="t-micro dim" style="margin:20px 0 10px">Signature base string</p>
      <div class="term">
        <div class="term__b" style="min-height:auto">
          <div class="term__l"><span class="tdim">HMAC-SHA256(secret,</span></div>
          <div class="term__l"><span class="tdim">&nbsp;&nbsp;`${inventoryItemId}.${deedType}.${canonicalJson(detail)}.${nonce}`)</span></div>
        </div>
      </div>
      <p class="t-small dim" style="margin-top:12px">
        The <span class="t-mono">nonce</span> must be unique per item for 24h. A replayed nonce
        returns the <b>original</b> deed rather than creating a second one — so a network retry
        can never double-mutate an item.
      </p>
    </div>

    <p class="sect">Verification health</p>
    <div class="tiles">
      <div class="tile"><p class="tile__k">Deeds written 30d</p><p class="tile__v num dim">—</p><p class="tile__s">not exposed yet</p></div>
      <div class="tile"><p class="tile__k">Verified</p><p class="tile__v num dim">—</p><p class="tile__s">not exposed yet</p></div>
      <div class="tile"><p class="tile__k">Failed cross-check</p><p class="tile__v num dim">—</p><p class="tile__s">not exposed yet</p></div>
      <div class="tile"><p class="tile__k">Open review cases</p><p class="tile__v num dim">—</p><p class="tile__s">not exposed yet</p></div>
    </div>
    <p class="t-small dim" style="margin-top:12px">No endpoint exposes deed verification metrics yet, so these tiles are intentionally empty.</p>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  keyCount: number
}>()
</script>

<style scoped>
.copyf {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; border-radius: 11px;
  background: var(--bg-2); border: 1px solid var(--border-2);
  font-family: var(--mono); font-size: .82rem; word-break: break-all;
}
.copyf button { flex-shrink: 0; }
</style>
