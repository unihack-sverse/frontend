export const AVALANCHE_FUJI_CHAIN_ID = 43113
export const AVALANCHE_FUJI_CHAIN_ID_HEX = '0xa869' as const
export const CORE_WALLET_INSTALL_URL = 'https://core.app'

export const AVALANCHE_FUJI_CHAIN_PARAMS = {
  chainId: AVALANCHE_FUJI_CHAIN_ID_HEX,
  chainName: 'Avalanche Fuji Testnet',
  rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
  nativeCurrency: {
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18,
  },
  blockExplorerUrls: ['https://subnets-test.avax.network/c-chain'],
} as const

export interface Eip1193Provider {
  request<T = unknown>(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<T>
  isCoreWallet?: boolean
  isAvalanche?: boolean
  isMetaMask?: boolean
  isRabby?: boolean
  providers?: Eip1193Provider[]
}

export interface Eip6963ProviderInfo {
  uuid: string
  name: string
  icon: string
  rdns: string
}

export interface Eip6963ProviderDetail {
  info: Eip6963ProviderInfo
  provider: Eip1193Provider
}

export interface DiscoveredWallet {
  id: string
  name: string
  rdns?: string
  icon?: string
  isCore: boolean
  source: 'eip6963' | 'injected'
  provider: Eip1193Provider
}

export type WalletErrorCode =
  | 'wallet_unavailable'
  | 'wallet_rejected'
  | 'wallet_pending'
  | 'wallet_chain_rejected'
  | 'wallet_unsupported'
  | 'wallet_error'

export type FujiConnectStage = 'connecting' | 'switching'

export class WalletError extends Error {
  readonly code: WalletErrorCode
  readonly installUrl?: string
  override readonly cause?: unknown

  constructor(code: WalletErrorCode, message: string, options: { installUrl?: string; cause?: unknown } = {}) {
    super(message)
    this.name = 'WalletError'
    this.code = code
    this.installUrl = options.installUrl
    this.cause = options.cause
  }
}

export function isWalletError(value: unknown): value is WalletError {
  return value instanceof WalletError || (value instanceof Error && value.name === 'WalletError' && 'code' in value)
}

type WalletWindow = Window & {
  avalanche?: Eip1193Provider
  ethereum?: Eip1193Provider
}

function clientWindow(): WalletWindow | null {
  if (import.meta.server || typeof window === 'undefined') return null
  return window as WalletWindow
}

function isProvider(value: unknown): value is Eip1193Provider {
  return Boolean(value && typeof value === 'object' && typeof (value as Eip1193Provider).request === 'function')
}

function isCoreWallet(provider: Eip1193Provider, info?: Partial<Eip6963ProviderInfo>): boolean {
  if (provider.isCoreWallet || provider.isAvalanche) return true
  const rdns = String(info?.rdns ?? '').toLowerCase()
  if (rdns === 'app.core.extension' || rdns === 'app.core' || rdns.startsWith('app.core.')) return true
  return /\bcore\b/i.test(String(info?.name ?? ''))
}

function inferInjectedName(provider: Eip1193Provider, fromAvalancheGlobal = false): string {
  if (fromAvalancheGlobal || provider.isCoreWallet || provider.isAvalanche) return 'Core Wallet'
  if (provider.isRabby) return 'Rabby Wallet'
  if (provider.isMetaMask) return 'MetaMask'
  return 'Browser Wallet'
}

function buildDiscoveredWallets(eip6963Details: Eip6963ProviderDetail[], win: WalletWindow): DiscoveredWallet[] {
  const wallets: DiscoveredWallet[] = []
  const seenProviders = new Set<Eip1193Provider>()
  const seenKeys = new Set<string>()

  const pushWallet = (wallet: DiscoveredWallet) => {
    if (seenProviders.has(wallet.provider) || seenKeys.has(wallet.id)) return
    seenProviders.add(wallet.provider)
    seenKeys.add(wallet.id)
    wallets.push(wallet)
  }

  for (const detail of eip6963Details) {
    if (!isProvider(detail?.provider)) continue
    const key = detail.info?.rdns || detail.info?.uuid || detail.info?.name
    if (!key) continue
    pushWallet({
      id: `eip6963:${key}`,
      name: detail.info.name || inferInjectedName(detail.provider),
      rdns: detail.info.rdns || undefined,
      icon: detail.info.icon || undefined,
      isCore: isCoreWallet(detail.provider, detail.info),
      source: 'eip6963',
      provider: detail.provider,
    })
  }

  // Fallback to legacy globals when no EIP-6963 wallet was announced,
  // or if Core Wallet is only available on window.avalanche.
  if (wallets.length === 0) {
    if (isProvider(win.avalanche)) {
      pushWallet({
        id: 'injected:avalanche',
        name: 'Core Wallet',
        isCore: true,
        source: 'injected',
        provider: win.avalanche,
      })
    }
    const eth = win.ethereum
    if (eth) {
      const injectedList = Array.isArray(eth.providers) && eth.providers.length ? eth.providers : [eth]
      injectedList.forEach((candidate, index) => {
        if (!isProvider(candidate)) return
        const core = isCoreWallet(candidate)
        pushWallet({
          id: `injected:ethereum:${index}:${inferInjectedName(candidate).toLowerCase().replace(/\s+/g, '-')}`,
          name: inferInjectedName(candidate),
          isCore: core,
          source: 'injected',
          provider: candidate,
        })
      })
    }
  } else if (!wallets.some((wallet) => wallet.isCore) && isProvider(win.avalanche)) {
    pushWallet({
      id: 'injected:avalanche',
      name: 'Core Wallet',
      isCore: true,
      source: 'injected',
      provider: win.avalanche,
    })
  }

  wallets.sort((a, b) => (a.isCore === b.isCore ? 0 : a.isCore ? -1 : 1))
  return wallets
}

/** Discover Avalanche-compatible EIP-6963 and legacy injected wallets (SSR-safe, Core sorted first). */
export function discoverWallets(): DiscoveredWallet[] {
  const win = clientWindow()
  if (!win) return []

  const details: Eip6963ProviderDetail[] = []
  const onAnnounce = (event: Event) => {
    const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail
    if (detail?.provider && isProvider(detail.provider)) details.push(detail)
  }

  win.addEventListener('eip6963:announceProvider', onAnnounce)
  try {
    win.dispatchEvent(new Event('eip6963:requestProvider'))
  } finally {
    win.removeEventListener('eip6963:announceProvider', onAnnounce)
  }
  return buildDiscoveredWallets(details, win)
}

/** Subscribe to EIP-6963 wallet announcements (plus injected fallback) until cleanup. */
export function subscribeWallets(onChange: (wallets: DiscoveredWallet[]) => void): () => void {
  const win = clientWindow()
  if (!win) return () => {}

  const details: Eip6963ProviderDetail[] = []
  const emit = () => onChange(buildDiscoveredWallets(details, win))

  const onAnnounce = (event: Event) => {
    const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail
    if (!detail?.provider || !isProvider(detail.provider)) return
    details.push(detail)
    emit()
  }

  win.addEventListener('eip6963:announceProvider', onAnnounce)
  win.dispatchEvent(new Event('eip6963:requestProvider'))
  emit()

  return () => {
    win.removeEventListener('eip6963:announceProvider', onAnnounce)
  }
}

function normalizeChainId(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return `0x${value.toString(16)}`
  const text = String(value ?? '').trim().toLowerCase()
  if (!text) return ''
  if (text.startsWith('0x')) {
    const parsed = Number.parseInt(text, 16)
    return Number.isFinite(parsed) ? `0x${parsed.toString(16)}` : text
  }
  const decimal = Number(text)
  return Number.isFinite(decimal) ? `0x${decimal.toString(16)}` : text
}

function collectErrorCodes(error: unknown): Array<number | string> {
  const codes: Array<number | string> = []
  const queue: unknown[] = [error]
  const visited = new Set<unknown>()

  while (queue.length && codes.length < 16) {
    const current = queue.shift()
    if (!current || typeof current !== 'object' || visited.has(current)) continue
    visited.add(current)
    const rec = current as Record<string, unknown>
    if (typeof rec.code === 'number' || typeof rec.code === 'string') codes.push(rec.code)
    if (rec.cause) queue.push(rec.cause)
    if (rec.error) queue.push(rec.error)
    if (rec.data && typeof rec.data === 'object') {
      const data = rec.data as Record<string, unknown>
      if (data.originalError) queue.push(data.originalError)
    }
    if (rec.info && typeof rec.info === 'object') {
      const info = rec.info as Record<string, unknown>
      if (info.error) queue.push(info.error)
    }
  }
  return codes
}

function hasErrorCode(error: unknown, target: number | string): boolean {
  const targetStr = String(target)
  return collectErrorCodes(error).some((code) => code === target || String(code) === targetStr)
}

/** Map EIP-1193 / EIP-3326 wallet errors into user-friendly WalletError values. */
export function mapWalletError(error: unknown, fallback = 'Wallet request failed. Please try again.'): WalletError {
  if (isWalletError(error)) return error

  if (hasErrorCode(error, 4001) || hasErrorCode(error, 'ACTION_REJECTED')) {
    return new WalletError('wallet_rejected', 'Wallet request was cancelled.', { cause: error })
  }
  if (hasErrorCode(error, -32002)) {
    return new WalletError(
      'wallet_pending',
      'A wallet approval prompt is already open. Check your wallet extension to continue.',
      { cause: error },
    )
  }
  if (hasErrorCode(error, 4902)) {
    return new WalletError(
      'wallet_chain_rejected',
      'Avalanche Fuji Testnet (43113) could not be selected in your wallet.',
      { cause: error },
    )
  }
  if (hasErrorCode(error, -32601)) {
    return new WalletError(
      'wallet_unsupported',
      'This wallet does not support the required Avalanche Fuji signing method.',
      { cause: error },
    )
  }

  const rawMessage =
    error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message.trim()
      : ''
  return new WalletError('wallet_error', rawMessage || fallback, { cause: error })
}

/** Request wallet accounts and ensure the wallet is connected to Avalanche Fuji Testnet (43113). */
export async function connectAndSwitchFuji(
  provider?: Eip1193Provider | null,
  onStage?: (stage: FujiConnectStage) => void,
): Promise<{ provider: Eip1193Provider; address: string; chainId: number }> {
  const resolved = provider ?? discoverWallets()[0]?.provider
  if (!isProvider(resolved)) {
    throw new WalletError(
      'wallet_unavailable',
      'No Avalanche wallet extension detected. Install Core Wallet or another EVM wallet to continue.',
      { installUrl: CORE_WALLET_INSTALL_URL },
    )
  }

  onStage?.('connecting')
  let accounts: string[]
  try {
    accounts = await resolved.request<string[]>({ method: 'eth_requestAccounts' })
  } catch (error) {
    throw mapWalletError(error, 'Could not connect to your wallet.')
  }

  const address = Array.isArray(accounts) ? String(accounts[0] ?? '').trim() : ''
  if (!address) {
    throw new WalletError('wallet_rejected', 'No wallet account was authorized.')
  }

  let rawChainId: unknown
  try {
    rawChainId = await resolved.request<string>({ method: 'eth_chainId' })
  } catch (error) {
    throw mapWalletError(error, 'Could not read the active wallet network.')
  }

  if (normalizeChainId(rawChainId) !== AVALANCHE_FUJI_CHAIN_ID_HEX) {
    onStage?.('switching')
    try {
      await resolved.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: AVALANCHE_FUJI_CHAIN_ID_HEX }],
      })
    } catch (switchError) {
      if (hasErrorCode(switchError, 4902)) {
        try {
          await resolved.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: AVALANCHE_FUJI_CHAIN_PARAMS.chainId,
                chainName: AVALANCHE_FUJI_CHAIN_PARAMS.chainName,
                rpcUrls: [...AVALANCHE_FUJI_CHAIN_PARAMS.rpcUrls],
                nativeCurrency: { ...AVALANCHE_FUJI_CHAIN_PARAMS.nativeCurrency },
                blockExplorerUrls: [...AVALANCHE_FUJI_CHAIN_PARAMS.blockExplorerUrls],
              },
            ],
          })
        } catch (addError) {
          throw mapWalletError(addError, 'Could not add Avalanche Fuji Testnet to your wallet.')
        }
      } else {
        throw mapWalletError(switchError, 'Could not switch to Avalanche Fuji Testnet.')
      }
    }
  }

  return { provider: resolved, address, chainId: AVALANCHE_FUJI_CHAIN_ID }
}

/** Encode a UTF-8 string as 0x-prefixed hex bytes for EIP-1193 personal_sign. */
export function utf8ToHex(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let hex = '0x'
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i]!.toString(16).padStart(2, '0')
  }
  return hex
}

/** Request an EIP-191 personal_sign signature for a UTF-8 challenge message. */
export async function signPersonalMessage(
  provider: Eip1193Provider,
  address: string,
  message: string,
): Promise<string> {
  if (!isProvider(provider)) {
    throw new WalletError(
      'wallet_unavailable',
      'No Avalanche wallet extension detected. Install Core Wallet or another EVM wallet to continue.',
      { installUrl: CORE_WALLET_INSTALL_URL },
    )
  }

  const hexMessage = utf8ToHex(message)
  try {
    const signature = await provider.request<string>({
      method: 'personal_sign',
      params: [hexMessage, address],
    })
    if (typeof signature !== 'string' || !signature.startsWith('0x')) {
      throw new WalletError('wallet_error', 'Wallet returned an invalid signature.')
    }
    return signature
  } catch (error) {
    throw mapWalletError(error, 'Signature request failed.')
  }
}
