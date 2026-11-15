<template>
  <section class="card card--pad" style="max-width:540px" aria-labelledby="studio-access-title">
    <h1 id="studio-access-title" class="t-h2">{{ needsStudio ? 'Create your studio' : 'Studio access' }}</h1>
    <template v-if="!session.loggedIn.value">
      <p class="dim" style="margin:14px 0">Sign in to create or manage your studio.</p>
      <NuxtLink class="btn btn--grad" :to="`/login?next=${encodeURIComponent(route.fullPath)}`">Sign in</NuxtLink>
    </template>
    <form v-else-if="needsStudio" style="display:grid;gap:16px;margin-top:16px" @submit.prevent="createStudio">
      <p class="dim">Your account does not have a studio yet. Create one to publish games and manage your catalog.</p>
      <label>Studio handle
        <input v-model="handle" class="input" required minlength="3" maxlength="30" pattern="[a-zA-Z0-9._\-]{3,30}" autocomplete="off">
      </label>
      <p class="t-small dim">3–30 letters, digits, dots, dashes or underscores. Your handle cannot be changed later.</p>
      <label>Display name
        <input v-model="displayName" class="input" required minlength="2" maxlength="60" autocomplete="organization">
      </label>
      <p v-if="createError" role="alert">{{ createError }}</p>
      <button class="btn btn--grad" type="submit" :disabled="creating">{{ creating ? 'Creating studio…' : 'Create studio' }}</button>
    </form>
    <template v-else>
      <p role="alert" style="margin:14px 0">{{ errorMessage(error, 'Could not load your studio.') }}</p>
      <button class="btn btn--ghost" type="button" @click="refreshNuxtData()">Try again</button>
    </template>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{ error?: unknown }>()
const api = useApi()
const session = useSession()
const route = useRoute()
const handle = ref('')
const displayName = ref('')
const creating = ref(false)
const createError = ref('')
const needsStudio = computed(() => !props.error || ['creator_required', 'studio_not_found'].includes(apiErrorOf(props.error)?.code ?? ''))

async function createStudio() {
  if (creating.value) return
  creating.value = true
  createError.value = ''
  try {
    await api.one('/api/v1/studios', { method: 'POST', body: { handle: handle.value.trim(), displayName: displayName.value.trim() } })
    await session.reload()
    await reloadNuxtApp({ path: route.fullPath, force: true })
  } catch (error) {
    createError.value = errorMessage(error, 'Could not create your studio.')
  } finally {
    creating.value = false
  }
}
</script>
