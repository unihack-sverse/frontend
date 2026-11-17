import {
  CORE_WALLET_INSTALL_URL,
  discoverWallets,
  isWalletError,
  subscribeWallets,
  type DiscoveredWallet,
} from '~/utils/avalanche'

export function useWallets() {
  const wallets = ref<DiscoveredWallet[]>([])
  const selectedWalletId = ref('')
  let unsubscribe: (() => void) | null = null

  function applyWallets(next: DiscoveredWallet[]) {
    wallets.value = next
    if (!next.length) {
      selectedWalletId.value = ''
      return
    }
    if (!next.some((wallet) => wallet.id === selectedWalletId.value)) {
      selectedWalletId.value = next[0]!.id
    }
  }

  function refresh() {
    applyWallets(discoverWallets())
    return wallets.value
  }

  onMounted(() => {
    unsubscribe = subscribeWallets(applyWallets)
  })

  onBeforeUnmount(() => {
    unsubscribe?.()
    unsubscribe = null
  })

  const selectedWallet = computed(
    () => wallets.value.find((wallet) => wallet.id === selectedWalletId.value) ?? wallets.value[0] ?? null,
  )
  const hasMultipleWallets = computed(() => wallets.value.length >= 2)

  return {
    wallets,
    selectedWalletId,
    selectedWallet,
    hasMultipleWallets,
    refresh,
  }
}

export function describeWalletAuthError(error: unknown): { message: string; installUrl: string | null } {
  if (isWalletError(error)) {
    return {
      message: error.message,
      installUrl: error.code === 'wallet_unavailable' ? (error.installUrl ?? CORE_WALLET_INSTALL_URL) : null,
    }
  }

  if (isApiError(error, 'invalid_wallet_challenge') || isApiError(error, 'wallet_challenge_expired')) {
    return { message: 'Wallet verification expired or is invalid. Please try again.', installUrl: null }
  }
  if (isApiError(error, 'invalid_wallet_signature')) {
    return { message: 'Signature verification failed. Make sure you signed with the selected wallet.', installUrl: null }
  }
  if (isApiError(error, 'wallet_taken')) {
    return { message: 'This wallet is already linked to another S-Passport.', installUrl: null }
  }
  if (isApiError(error, 'wallet_already_linked')) {
    return { message: 'Your S-Passport already has a linked wallet.', installUrl: null }
  }
  if (isApiError(error, 'handle_taken')) {
    return { message: 'That handle is taken — try another.', installUrl: null }
  }
  if (isApiError(error, 'invalid_wallet_chain') || isApiError(error, 'unsupported_chain')) {
    return { message: 'Please switch your wallet to Avalanche Fuji Testnet (Chain ID 43113).', installUrl: null }
  }
  if (isApiError(error, 'account_suspended')) {
    return { message: 'This account is suspended. Contact support if you think this is a mistake.', installUrl: null }
  }
  if (isApiError(error, 'too_many_attempts') || isApiError(error, 'rate_limited')) {
    return { message: 'Too many wallet attempts. Wait a moment and try again.', installUrl: null }
  }
  if (isApiError(error, 'validation_failed')) {
    const issue = error.details[0]?.issue
    return { message: issue ? String(issue) : errorMessage(error), installUrl: null }
  }

  return { message: errorMessage(error), installUrl: null }
}
