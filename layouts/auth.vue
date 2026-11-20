<template>
  <div class="authwrap">
    <div class="authart" aria-hidden="true">
      <img :src="artUrl" alt="">
      <div class="authart__q">
        <span class="chip chip--yours" style="margin-bottom:16px">S-PASSPORT</span>
        <p>One passport for every game on Sverse. Items are minted to you — not to a game's server — and their history travels with them.</p>
      </div>
    </div>
    <div class="authbox">
      <div class="authbox__in">
        <NuxtLink class="authlogo" to="/" aria-label="Back to the Sverse Store">
          <img :src="sverseLogo" alt="Sverse">
        </NuxtLink>
        <slot />
      </div>
    </div>
    <AppToasts />
  </div>
</template>

<script setup lang="ts">
import sverseLogo from '~/assets/images/sverse-logo.png'
import { normalizeApiBase } from '~/composables/useApi'

const config = useRuntimeConfig()
const artUrl = computed(() => `${normalizeApiBase(String(config.public.apiBase ?? ''))}/assets/seed/games/voidrunner-cover.png`)
</script>
