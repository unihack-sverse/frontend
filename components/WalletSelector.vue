<template>
  <div v-if="wallets.length >= 2" class="wpicker" :class="{ 'wpicker--compact': compact }" role="group" aria-label="Choose wallet">
    <button
      v-for="wallet in wallets"
      :key="wallet.id"
      type="button"
      class="wpill"
      :class="{ on: modelValue === wallet.id, 'wpill--sm': compact }"
      :aria-pressed="modelValue === wallet.id"
      :disabled="disabled"
      @click="$emit('update:modelValue', wallet.id)"
    >
      <img v-if="safeIcon(wallet.icon)" :src="safeIcon(wallet.icon)" alt="" class="wpill__ico" aria-hidden="true">
      <span>{{ wallet.name }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { DiscoveredWallet } from '~/utils/avalanche'

defineProps<{
  modelValue: string
  wallets: DiscoveredWallet[]
  disabled?: boolean
  compact?: boolean
}>()

defineEmits<{
  'update:modelValue': [id: string]
}>()

function safeIcon(icon?: string) {
  if (!icon) return ''
  return icon.startsWith('data:image/') || icon.startsWith('https://') ? icon : ''
}
</script>
