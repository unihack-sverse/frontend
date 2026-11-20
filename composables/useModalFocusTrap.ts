import type { ComputedRef } from 'vue'

export function useModalFocusTrap(
  isAnyOpen: () => boolean,
  activeModalEl: ComputedRef<HTMLElement | null>,
  onCloseActive: () => void,
) {
  function onKeydown(event: KeyboardEvent) {
    if (!isAnyOpen()) return
    if (event.key === 'Escape') {
      event.preventDefault()
      onCloseActive()
      return
    }
    if (event.key !== 'Tab') return
    const el = activeModalEl.value
    if (!el) return
    const focusable = Array.from(el.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((node) => node.offsetParent !== null)
    if (!focusable.length) return
    const first = focusable[0] as HTMLElement
    const last = focusable[focusable.length - 1] as HTMLElement
    const active = document.activeElement as HTMLElement | null
    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const modalOpenWatch = computed(() => isAnyOpen())
  watch(modalOpenWatch, (open) => {
    if (import.meta.client) {
      document.documentElement.style.overflow = open ? 'hidden' : ''
    }
  })

  onMounted(() => {
    if (import.meta.client) window.addEventListener('keydown', onKeydown)
    watch(activeModalEl, (el) => {
      if (!el) return
      nextTick(() => {
        const focusable = el.querySelector<HTMLElement>(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
        )
        focusable?.focus()
      })
    })
  })

  onBeforeUnmount(() => {
    if (import.meta.client) {
      window.removeEventListener('keydown', onKeydown)
      document.documentElement.style.overflow = ''
    }
  })
}
