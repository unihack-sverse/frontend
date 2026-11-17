<template>
  <div v-if="message" class="note note--bad" :class="{ 'note--compact': compact }" role="alert">
    <span class="note__i">✕</span>
    <div>
      {{ message }}
      <template v-if="installUrl">
        <br>
        <a :href="installUrl" target="_blank" rel="noopener noreferrer" class="wallet-err-link">
          Install Core Wallet (core.app) ↗
        </a>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message: string
  installUrl?: string | null
  compact?: boolean
}>()
</script>
