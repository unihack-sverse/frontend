<template>
  <div ref="root" class="sel" :class="{ 'sel--open': open, 'sel--block': block, 'sel--sm': size === 'sm' }">
    <button
      ref="trigger"
      class="sel__btn"
      type="button"
      role="combobox"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-label="ariaLabel"
      :disabled="disabled"
      @click="toggle"
      @keydown="onTriggerKey"
    >
      <span class="sel__val" :class="{ 'sel__val--empty': selectedLabel === null }">
        {{ selectedLabel ?? placeholder }}
      </span>
      <svg class="sel__caret" viewBox="0 0 12 8" aria-hidden="true">
        <path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        :id="listId"
        ref="list"
        class="sel__list"
        role="listbox"
        :style="listStyle"
        :aria-label="ariaLabel"
      >
        <button
          v-for="(option, index) in options"
          :key="String(option.value)"
          class="sel__opt"
          type="button"
          role="option"
          :aria-selected="option.value === modelValue"
          :class="{ 'is-active': index === activeIndex, 'is-selected': option.value === modelValue }"
          @click="pick(option)"
          @mousemove="activeIndex = index"
        >
          <span class="sel__optlabel">{{ option.label }}</span>
          <span v-if="option.hint" class="sel__opthint">{{ option.hint }}</span>
          <span v-if="option.value === modelValue" class="sel__tick" aria-hidden="true">✓</span>
        </button>
        <p v-if="!options.length" class="sel__none">{{ emptyText }}</p>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
/**
 * A listbox instead of a native <select>. Native popups are drawn by the OS: their colours ignore the
 * page, so a dark theme cannot style them and they look nothing like the rest of the product. This one
 * renders its own list, so the surface, border, radius and hover state are all ours.
 *
 * Keyboard: Arrow/Home/End move, type-ahead jumps, Enter/Space pick, Escape closes. The list is portalled
 * to `body` so an overflow-hidden card cannot clip it, and it flips above the trigger near the viewport
 * bottom.
 */
export interface SelectOption {
  value: string
  label: string
  hint?: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
  emptyText?: string
  /** Stretch to the parent's width instead of hugging the trigger's content. */
  block?: boolean
  size?: 'sm' | 'md'
}>(), {
  placeholder: 'Select…',
  disabled: false,
  ariaLabel: undefined,
  emptyText: 'Nothing to choose from.',
  block: false,
  size: 'md',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const list = ref<HTMLElement | null>(null)
const open = ref(false)
const activeIndex = ref(-1)
const listStyle = ref<Record<string, string>>({})
const listId = `sel-${useId()}`

const selectedIndex = computed(() => props.options.findIndex((option) => option.value === props.modelValue))
const selectedLabel = computed(() => {
  const option = selectedIndex.value >= 0 ? props.options[selectedIndex.value] : undefined
  return option ? option.label : null
})

function toggle() {
  if (props.disabled) return
  open.value ? close() : show()
}

function show() {
  if (props.disabled) return
  positionList()
  open.value = true
  activeIndex.value = selectedIndex.value >= 0 ? selectedIndex.value : 0
  nextTick(() => {
    positionList()
    scrollActiveIntoView()
    document.addEventListener('pointerdown', onOutside, true)
    window.addEventListener('resize', positionList)
    window.addEventListener('scroll', positionList, true)
  })
}

function close() {
  open.value = false
  document.removeEventListener('pointerdown', onOutside, true)
  window.removeEventListener('resize', positionList)
  window.removeEventListener('scroll', positionList, true)
  trigger.value?.focus()
}

function pick(option: SelectOption) {
  emit('update:modelValue', option.value)
  close()
}

/**
 * The list lives in `body`, so its coordinates come from the trigger's rect. Flipping upward keeps it on
 * screen when the trigger sits near the bottom of a modal or a long form.
 */
function positionList() {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  const gap = 6
  const spaceBelow = window.innerHeight - rect.bottom - gap
  const spaceAbove = rect.top - gap
  const maxHeight = Math.min(320, Math.max(spaceBelow, spaceAbove))
  const above = spaceBelow < 160 && spaceAbove > spaceBelow

  listStyle.value = {
    position: 'fixed',
    left: `${Math.round(rect.left)}px`,
    minWidth: `${Math.round(rect.width)}px`,
    maxWidth: `${Math.min(Math.round(rect.width) + 180, window.innerWidth - rect.left - 12)}px`,
    maxHeight: `${Math.round(maxHeight)}px`,
    ...(above
      ? { bottom: `${Math.round(window.innerHeight - rect.top + gap)}px` }
      : { top: `${Math.round(rect.bottom + gap)}px` }),
    zIndex: '1200',
  }
}

function onOutside(event: Event) {
  const target = event.target as Node
  if (root.value?.contains(target) || list.value?.contains(target)) return
  close()
}

function onTriggerKey(event: KeyboardEvent) {
  if (props.disabled) return
  const key = event.key
  if (!open.value) {
    if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
      event.preventDefault()
      show()
    }
    return
  }
  if (key === 'Escape') { event.preventDefault(); close(); return }
  if (key === 'Tab') { close(); return }
  if (key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, props.options.length - 1)
    scrollActiveIntoView()
  } else if (key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
    scrollActiveIntoView()
  } else if (key === 'Home') {
    event.preventDefault()
    activeIndex.value = 0
    scrollActiveIntoView()
  } else if (key === 'End') {
    event.preventDefault()
    activeIndex.value = props.options.length - 1
    scrollActiveIntoView()
  } else if (key === 'Enter' || key === ' ') {
    event.preventDefault()
    const option = props.options[activeIndex.value]
    if (option) pick(option)
  } else if (key.length === 1) {
    // Type-ahead: jump to the next option whose label starts with the typed letter.
    const letter = key.toLowerCase()
    const start = activeIndex.value + 1
    const ordered = [...props.options.slice(start), ...props.options.slice(0, start)]
    const hit = ordered.find((option) => option.label.toLowerCase().startsWith(letter))
    if (hit) {
      activeIndex.value = props.options.indexOf(hit)
      scrollActiveIntoView()
    }
  }
}

function scrollActiveIntoView() {
  nextTick(() => {
    list.value?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' })
  })
}

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onOutside, true)
  window.removeEventListener('resize', positionList)
  window.removeEventListener('scroll', positionList, true)
})
</script>

<style scoped>
.sel { position: relative; display: inline-block; }
.sel--block { display: block; width: 100%; }
.sel--open { z-index: 1; }

.sel__btn {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 11px 14px; border-radius: 11px;
  background: var(--surface); border: 1px solid var(--border);
  color: var(--text); font: inherit; font-size: 0.9rem; text-align: left;
  cursor: pointer;
}
.sel--sm .sel__btn { padding: 7px 11px; font-size: 0.82rem; border-radius: 9px; }
.sel__btn:hover:not(:disabled) { border-color: var(--border-2); }
.sel__btn:focus-visible { outline: none; border-color: var(--pink); }
.sel__btn:disabled { opacity: 0.55; cursor: not-allowed; }
.sel--open .sel__btn { border-color: var(--pink); }

.sel__val { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sel__val--empty { color: var(--text-dim); }

.sel__caret { width: 11px; height: 8px; flex-shrink: 0; color: var(--text-dim); transition: transform 0.16s ease; }
.sel--open .sel__caret { transform: rotate(180deg); }

.sel__list {
  padding: 5px; overflow-y: auto; overscroll-behavior: contain;
  background: #140c28; border: 1px solid var(--border-2);
  border-radius: var(--r-md); box-shadow: var(--e-2);
}

.sel__opt {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 8px 10px; border: none; border-radius: 8px;
  background: transparent; color: var(--text);
  font: inherit; font-size: 0.86rem; text-align: left; cursor: pointer;
}
.sel__opt.is-active { background: rgba(233, 53, 193, 0.14); }
.sel__opt.is-selected { color: var(--pink); font-weight: 600; }
.sel__optlabel { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sel__opthint { font-size: 0.72rem; color: var(--text-dim); font-family: var(--mono); flex-shrink: 0; }
.sel__tick { font-size: 0.72rem; flex-shrink: 0; }

.sel__none { margin: 0; padding: 10px; font-size: 0.8rem; color: var(--text-dim); }
</style>
