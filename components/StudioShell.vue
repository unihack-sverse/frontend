<template>
  <div class="st">
    <aside class="st__side">
      <NuxtLink class="st__logo" to="/" aria-label="Sverse Store">
        <img :src="sverseLogo" alt="Sverse">
      </NuxtLink>

      <div class="st__group">
        <p class="st__label">Creator</p>
        <NuxtLink v-for="item in creatorLinks" :key="item.to" class="st__link" :class="{ on: isActive(item.to) }" :to="item.to">
          <span class="st__ico">{{ item.icon }}</span> {{ item.label }}
        </NuxtLink>
      </div>

      <div v-if="isStaff" class="st__group">
        <p class="st__label">Moderation</p>
        <NuxtLink class="st__link" :class="{ on: route.path.startsWith('/admin') }" to="/admin/review">
          <span class="st__ico">⚖</span> Review queue
        </NuxtLink>
      </div>

      <div class="st__group">
        <p class="st__label">Player</p>
        <NuxtLink class="st__link" to="/"><span class="st__ico">←</span> Back to Store</NuxtLink>
        <NuxtLink class="st__link" to="/passport"><span class="st__ico">◆</span> My Passport</NuxtLink>
      </div>

      <div class="st__foot">
        <NuxtLink to="/login?next=/studio">Switch account</NuxtLink>
      </div>
    </aside>

    <main class="st__main">
      <div class="st__page" :class="{ 'st__page--wide': wide }">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import sverseLogo from '~/assets/images/sverse-logo.png'

const props = withDefaults(defineProps<{
  wide?: boolean
}>(), {
  wide: false,
})

const route = useRoute()
const { user } = useSession()

/** Staff-only nav. The API 404s admin routes for everyone else, so this is only for discoverability. */
const isStaff = computed(() => Boolean(user.value?.roles?.includes('moderator') || user.value?.roles?.includes('admin')))

const creatorLinks = [
  { to: '/studio', label: 'Overview', icon: '◉', exact: true },
  { to: '/studio/games', label: 'Games', icon: '▤' },
  { to: '/studio/publish', label: 'Publish', icon: '↑' },
  { to: '/studio/payouts', label: 'Payouts', icon: '◈' },
  { to: '/studio/settings', label: 'Settings', icon: '⚙' },
]

function isActive(to: string) {
  const exact = creatorLinks.find((link) => link.to === to)?.exact
  if (exact) return route.path === to
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<style scoped>
.st { display: grid; grid-template-columns: var(--sidebar) 1fr; min-height: 100vh; }

.st__side {
  border-right: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.28);
  padding: 22px 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: sticky;
  top: 0;
  align-self: start;
  height: 100vh;
  overflow-y: auto;
}

.st__logo { display: flex; align-items: center; justify-content: center; padding: 4px 8px 2px; }
.st__logo img { display: block; width: 100%; max-width: 180px; height: auto; object-fit: contain; }

.st__group { display: grid; gap: 3px; }

.st__label {
  font-size: 0.66rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
  padding: 0 10px 6px;
  font-weight: 700;
}

.st__link {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  border-radius: 11px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-dim);
  transition: background 0.18s, color 0.18s;
}
.st__link:hover { background: var(--surface); color: var(--text); }
.st__link.on { background: var(--surface-2); color: var(--text); font-weight: 600; }
.st__link.on::before {
  content: "";
  width: 3px;
  height: 18px;
  border-radius: 3px;
  background: var(--grad);
  margin-left: -6px;
  margin-right: 2px;
}

.st__ico { width: 20px; text-align: center; font-size: 1rem; opacity: 0.9; }

.st__foot { margin-top: auto; font-size: 0.78rem; }
.st__foot a { color: var(--text-dim); padding: 0 4px; }
.st__foot a:hover { color: var(--text); }

.st__main { min-width: 0; }

.st__page { padding: 30px; max-width: var(--page-max); }
.st__page--wide { max-width: none; }

@media (max-width: 900px) {
  .st { grid-template-columns: 1fr; }
  .st__side {
    position: static;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }
  .st__group { display: flex; flex-wrap: wrap; }
  .st__label { display: none; }
  .st__logo { padding: 0; }
  .st__logo img { max-width: 96px; }
  .st__foot { margin-top: 0; }
  .st__page { padding-left: 18px; padding-right: 18px; }
}
</style>
