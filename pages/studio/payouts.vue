<template>
  <StudioShell>
    <div v-if="error" class="empty">
      <p class="empty__i">⚠️</p>
      <p>{{ errorMessage }}</p>
      <NuxtLink class="btn btn--grad btn--sm" to="/login?next=/studio/payouts">Sign in as a creator</NuxtLink>
    </div>

    <template v-else-if="pending">
      <div class="phead">
        <div class="sk" style="height:13px;width:110px"></div>
        <div class="sk" style="height:30px;width:220px;margin-top:10px"></div>
        <div class="sk" style="height:14px;width:520px;max-width:100%;margin-top:10px"></div>
      </div>
      <div class="sgrid">
        <div>
          <div class="vault"><div class="sk" style="height:140px"></div></div>
          <div class="card card--pad" style="margin-top:30px"><div class="sk" style="height:180px"></div></div>
          <div class="card card--pad" style="margin-top:30px"><div class="sk" style="height:200px"></div></div>
        </div>
        <div>
          <div class="note note--warn"><div class="sk" style="height:90px"></div></div>
          <div class="card card--pad" style="margin-top:30px"><div class="sk" style="height:120px"></div></div>
          <div class="card card--pad" style="margin-top:30px"><div class="sk" style="height:140px"></div></div>
        </div>
      </div>
    </template>

    <template v-else-if="studio">
      <div class="phead">
        <p class="eyebrow">Studio Vault</p>
        <h1 class="t-h1">Payouts</h1>
        <p>90% of every sale lands here instantly. Funds inside the 30-day dispute window are
          locked — that is stated on screen, never discovered at withdrawal time.</p>
      </div>

      <div class="sgrid">
        <div>
          <!-- ══ Vault hero ══ -->
          <div class="vault">
            <p class="t-micro dim">Available to withdraw</p>
            <p class="vault__n grad-text num">{{ studio.vault?.availableSrv ?? '0.00' }} <span class="vault__u dim">SRV</span></p>
            <p class="t-small dim">≈ ${{ usdEquivalent }} at today's rate</p>

            <div class="lockbar">
              <div :style="{ width: `${availableShare}%`, background: 'var(--grad)' }"></div>
              <div :style="{ width: `${lockedShare}%`, background: 'rgba(255,190,61,.55)' }"></div>
            </div>
            <div class="legend">
              <span><i style="background:var(--pink)"></i>Available {{ formatSrv(studio.vault?.availableUnits) }}</span>
              <span><i style="background:rgba(255,190,61,.55)"></i>Locked {{ formatSrv(studio.vault?.lockedUnits) }} · dispute window</span>
            </div>

            <div class="rows" style="margin-top:20px">
              <div><span>Gross lifetime</span><strong>{{ formatSrv(studio.counters?.grossUnits, { suffix: true }) }}</strong></div>
              <div><span>Protocol fee paid</span><strong>{{ formatSrv(feePaidUnits, { suffix: true }) }} · {{ feePercent }}%</strong></div>
              <div><span>Secondary royalties earned</span><strong>{{ formatSrv(royaltiesUnits, { suffix: true }) }}</strong></div>
              <div><span>Creator rewards claimed</span><strong>{{ formatSrv(creatorRewardsUnits, { suffix: true }) }}</strong></div>
              <div><span>Withdrawn to date</span><strong>{{ formatSrv(studio.withdrawnUnits, { suffix: true }) }}</strong></div>
              <div class="tot"><span>Vault balance</span><strong>{{ studio.vault?.balanceSrv ?? '0.00' }} SRV</strong></div>
            </div>
          </div>

          <!-- ══ Withdraw ══ -->
          <p class="sect">Withdraw</p>
          <div class="card card--pad">
            <div v-if="kycPanelVisible" class="note note--warn" style="margin-bottom:18px">
              <span class="note__i">🪪</span>
              <div>
                <b>Identity verification required.</b>
                Crypto withdrawals continue unaffected, but the fiat off-ramp needs verification once
                your lifetime withdrawals cross {{ formatSrv(kycThresholdUnits, { suffix: true }) }}.
                You have withdrawn {{ formatSrv(studio.withdrawnUnits, { suffix: true }) }} lifetime.
                <br><br>
                <a href="https://sverse.example/onboarding/kyc" target="_blank" rel="noopener" style="text-decoration:underline">Start verification →</a>
              </div>
            </div>

            <div class="f2">
              <div class="field">
                <label>Amount (SRV)</label>
                <input v-model="withdrawAmount" type="text" inputmode="decimal" placeholder="0.00" :disabled="submitPending">
                <p v-if="withdrawReason" class="field__err">{{ withdrawReason }}</p>
              </div>
              <div class="field">
                <label>Destination</label>
                <AppSelect
                  v-model="withdrawDestination"
                  :options="destinations"
                  :disabled="submitPending"
                  aria-label="Withdrawal destination"
                  block
                />
              </div>
            </div>

            <div class="rows" style="margin-top:6px">
              <div><span>You receive</span><strong>{{ youReceiveSrv }} SRV</strong></div>
              <div><span>Network fee</span><strong>paid by the protocol paymaster</strong></div>
            </div>

            <div class="submit">
              <button class="btn btn--grad submit__btn" type="button" :disabled="submitDisabled" @click="submitWithdrawal">
                {{ submitLabel }}
              </button>
              <span class="t-small dim">{{ submitHint }}</span>
            </div>

            <div v-if="withdrawSuccess" class="note" style="margin-top:16px">
              <span class="note__i">✅</span>
              <div><b>Withdrawal submitted.</b> It is settling now — locked funds are excluded automatically.</div>
            </div>
            <div v-else-if="withdrawError" class="note note--bad" style="margin-top:16px">
              <span class="note__i">⚠️</span>
              <div><b>Withdrawal not submitted.</b> {{ withdrawError }}</div>
            </div>
          </div>

          <!-- ══ Staking ══ -->
          <p class="sect">Staking · lowers your fee tier</p>
          <div class="card card--pad">
            <div class="grid g3" style="gap:14px;margin-bottom:18px">
              <div class="tile" :style="isCurrentTier('standard') ? { borderColor: 'var(--pink)' } : undefined">
                <p class="tile__k">Current</p>
                <p class="tile__v">{{ feePctFor('standard') }}</p>
                <p class="tile__s">standard · {{ formatSrv(stakedUnits, { suffix: true }) }} staked</p>
              </div>
              <div class="tile" :style="isCurrentTier('staked') ? { borderColor: 'var(--pink)' } : undefined">
                <p class="tile__k">Staked tier</p>
                <p class="tile__v">{{ feePctFor('staked') }}</p>
                <p class="tile__s">stake {{ formatSrv(tierStake('staked'), { suffix: true }) }}</p>
              </div>
              <div class="tile" :style="isCurrentTier('premium') ? { borderColor: 'var(--pink)' } : undefined">
                <p class="tile__k">Premium</p>
                <p class="tile__v">{{ feePctFor('premium') }}</p>
                <p class="tile__s">stake {{ formatSrv(tierStake('premium'), { suffix: true }) }}</p>
              </div>
            </div>

            <div class="f2">
              <div class="field" style="margin:0">
                <label>Stake amount (SRV)</label>
                <input v-model="stakeAmount" type="text" inputmode="decimal" placeholder="0.00" :disabled="stakePending || unstakePending">
                <p v-if="stakeReason" class="field__err">{{ stakeReason }}</p>
              </div>
              <div class="stake__actions">
                <button class="btn btn--ghost btn--full" type="button" :disabled="stakeDisabled" @click="stake">{{ stakeLabel }}</button>
                <button class="btn btn--ghost btn--full" type="button" :disabled="unstakeDisabled" @click="unstake">{{ unstakeLabel }}</button>
              </div>
            </div>

            <div v-if="stakeError" class="note note--bad" style="margin-top:14px">
              <span class="note__i">⚠️</span>
              <div><b>Could not update your stake.</b> {{ stakeError }}</div>
            </div>

            <p class="t-small dim" style="margin-top:12px">Staking lowers your protocol fee tier and locks
              supply against the cohort most aligned with the network — that is the point. It also raises
              your Store placement, drop allocation and deed-attestation limits.</p>
          </div>

          <!-- ══ History ══ -->
          <p class="sect">Withdrawal history</p>
          <div v-if="withdrawals.length" class="tw">
            <table>
              <thead>
                <tr><th>Date</th><th class="num">Amount</th><th>Destination</th><th>Tx</th><th>Status</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in withdrawals" :key="row.id">
                  <td>{{ formatDate(row.createdAt) }}</td>
                  <td class="num">{{ formatSrv(row.amountUnits, { suffix: true }) }}</td>
                  <td class="dim">{{ destinationLabel(row.destinationAddress) }}</td>
                  <td class="t-mono dim tx">
                    <a v-if="row.explorerUrl" :href="row.explorerUrl" target="_blank" rel="noopener">{{ shortHash(row.txHash) }}</a>
                    <span v-else>{{ row.txHash ? shortHash(row.txHash) : '—' }}</span>
                  </td>
                  <td><span :class="withdrawalChip(row.status)"><i v-if="row.status === 'settled'" class="dot"></i>{{ withdrawalStatusLabel(row.status) }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty">
            <p class="empty__i">◈</p>
            <p>No withdrawals yet.</p>
            <p class="t-small dim">Your first payout will appear here the moment it is submitted.</p>
          </div>
        </div>

        <!-- ══ Right rail ══ -->
        <div>
          <p class="sect" style="margin-top:0">State: KYC threshold</p>
          <div v-if="kycRequired" class="note note--warn">
            <span class="note__i">🪪</span>
            <div><b>Identity verification required.</b> You have withdrawn
              {{ formatSrv(studio.withdrawnUnits, { suffix: true }) }} lifetime, past the
              {{ formatSrv(kycThresholdUnits, { suffix: true }) }} fiat threshold. Crypto withdrawals
              continue unaffected; the fiat off-ramp needs verification through our licensed partner.
              <br><br><a href="https://sverse.example/onboarding/kyc" target="_blank" rel="noopener" style="text-decoration:underline">Start verification →</a></div>
          </div>
          <div v-else class="note">
            <span class="note__i">🛡</span>
            <div><b>Identity verification not required yet.</b> Crypto withdrawals work today. The fiat
              off-ramp will ask for verification after
              {{ formatSrv(kycThresholdUnits, { suffix: true }) }} of lifetime withdrawals.</div>
          </div>

          <template v-if="availableUnits <= 0n">
          <p class="sect">No funds available</p>
          <div class="card card--pad">
            <p style="font-weight:600">{{ studio.vault?.availableSrv ?? '0.00' }} SRV available</p>
            <p v-if="lockedUnits > 0n" class="t-small dim" style="margin-top:6px">All {{ formatSrv(studio.vault?.lockedUnits, { suffix: true }) }}
              in your vault is inside the 30-day dispute window. The withdrawal form is disabled and says why.</p>
            <p v-else class="t-small dim" style="margin-top:6px">Your vault is empty. Funds will be available here once your studio receives revenue.</p>
            <button class="btn btn--ghost btn--full is-off" disabled style="margin-top:14px">Withdraw unavailable</button>
          </div>
          </template>

          <p class="sect">Why funds lock</p>
          <div class="card card--pad">
            <p class="t-small dim">A card purchase can be charged back for 30 days. If we let you withdraw
              that money immediately and a chargeback landed, the ledger would go negative — so the protocol
              would have to cover it or your account would go into debt.</p>
            <p class="t-small dim" style="margin-top:10px">Locking is the honest version. The number is
              always visible, and it releases on a schedule you can see.</p>
          </div>

          <p class="sect">Upcoming unlocks</p>
          <div v-if="upcomingUnlocks.length" class="rows">
            <div v-for="unlock in upcomingUnlocks" :key="unlock.key">
              <span>{{ formatDate(unlock.date) }}</span><strong>{{ formatSrv(unlock.amountUnits, { suffix: true }) }}</strong>
            </div>
          </div>
          <p v-else class="t-small dim">Nothing is scheduled to unlock right now.</p>
        </div>
      </div>
    </template>
  </StudioShell>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'studio' })

useHead({ title: 'Payouts · Sverse' })

interface StudioTier { tier: string; minStakeUnits: string; feeBps: number }
interface WithdrawalRow {
  id: string
  amountUnits: string
  amountSrv: string
  destinationAddress: string | null
  status: string
  txHash: string | null
  explorerUrl: string | null
  failureCode: string | null
  createdAt: string | null
  settledAt: string | null
}

const api = useApi()
const { formatSrv: formatSrvRaw, formatDate } = useStudioFormat()

function formatSrv(units: string | number | bigint | null | undefined, options?: { digits?: number; suffix?: boolean }) {
  return formatSrvRaw(units === null || units === undefined ? units : units.toString(), options)
}

const BROWSER_USD_RATE = 0.042
const DISPUTE_WINDOW_DAYS = 30
const KYC_ONBOARDING_URL = 'https://sverse.example/onboarding/kyc'

const { data: studioRes, pending: studioPending, error: studioError, refresh: refreshStudio } = await useAsyncData('studio-me', () =>
  api.one<any>('/api/v1/studios/me').catch(() => null),
)
const { data: withdrawalsRes, pending: withdrawalsPending, refresh: refreshWithdrawals } = await useAsyncData('studio-withdrawals', () =>
  api.many<WithdrawalRow>('/api/v1/studios/me/withdrawals').catch(() => ({ data: [], meta: { count: 0, hasMore: false, nextCursor: null } })),
)

const studio = computed(() => studioRes.value ?? null)
const withdrawals = computed<WithdrawalRow[]>(() => withdrawalsRes.value?.data ?? [])
const pending = computed(() => studioPending.value || withdrawalsPending.value)
const error = computed(() => studioError.value)
const errorMessage = computed(() => {
  const code = (error.value as any)?.data?.error?.code
  if (code === 'creator_required' || code === 'missing_session') return 'This area needs a creator account.'
  return 'Could not load your vault.'
})

/* ── money helpers (integer-unit maths only) ── */
const SRV_UNITS = 1_000_000n

function srvStringToUnits(value: string): bigint | null {
  const trimmed = value.trim().replace(/,/g, '')
  if (!trimmed) return null
  if (!/^\d*(\.\d*)?$/.test(trimmed)) return null
  const [whole = '', frac = ''] = trimmed.split('.')
  if (!whole && !frac) return null
  const fracPadded = (frac + '000000').slice(0, 6)
  const wholeUnits = BigInt(whole || '0') * SRV_UNITS
  const fracUnits = BigInt(fracPadded || '0')
  return wholeUnits + fracUnits
}

function unitsString(value: bigint): string {
  return value.toString()
}

/* ── vault hero ── */
const availableUnits = computed(() => BigInt(studio.value?.vault?.availableUnits ?? '0'))
const lockedUnits = computed(() => BigInt(studio.value?.vault?.lockedUnits ?? '0'))
const availableNumber = computed(() => Number(availableUnits.value) / 1_000_000)
const availableShare = computed(() => {
  const total = availableUnits.value + lockedUnits.value
  if (total <= 0n) return 100
  return Math.max(2, Number((availableUnits.value * 100n) / total))
})
const lockedShare = computed(() => {
  const total = availableUnits.value + lockedUnits.value
  if (total <= 0n || lockedUnits.value <= 0n) return 0
  return Math.max(2, 100 - availableShare.value)
})
const usdEquivalent = computed(() =>
  (availableNumber.value * BROWSER_USD_RATE).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
)

const feePercent = computed(() => Number(studio.value?.feeBps ?? 1000) / 100)
const grossUnits = computed(() => BigInt(studio.value?.counters?.grossUnits ?? '0'))
const netUnits = computed(() => BigInt(studio.value?.vault?.balanceUnits ?? '0') + BigInt(studio.value?.withdrawnUnits ?? '0'))
const feePaidUnits = computed(() => (grossUnits.value > netUnits.value ? grossUnits.value - netUnits.value : 0n))
const royaltiesUnits = computed(() => BigInt(studio.value?.counters?.secondaryRoyaltiesUnits ?? '0'))
const creatorRewardsUnits = computed(() => BigInt(studio.value?.counters?.creatorRewardsClaimedUnits ?? '0'))

/* ── KYC ── */
const kycThresholdUnits = computed(() => BigInt(studio.value?.kycThresholdUnits ?? '0'))
const kycRequired = computed(() => {
  const threshold = kycThresholdUnits.value
  if (threshold <= 0n) return false
  return BigInt(studio.value?.withdrawnUnits ?? '0') >= threshold
})

/* ── withdraw form ── */
const withdrawAmount = ref('')
const withdrawDestination = ref('crypto')
const submitPending = ref(false)
const withdrawSuccess = ref(false)
const kycPanelVisible = ref(false)
const withdrawError = ref('')

const destinations = computed(() => [
  { value: 'crypto', label: `Self-custody wallet · ${shortHash(studio.value?.vault?.accountId, 4)}` },
  { value: 'fiat', label: 'Fiat off-ramp · partner' },
])
const withdrawUnits = computed(() => srvStringToUnits(withdrawAmount.value))
const withdrawReason = computed(() => {
  if (availableUnits.value <= 0n) return lockedUnits.value > 0n
    ? 'No funds available — everything in the vault is inside the 30-day dispute window.'
    : 'No funds available — your vault is empty.'
  if (withdrawUnits.value === null) return withdrawAmount.value.trim() ? 'Enter a valid SRV amount.' : ''
  if (withdrawUnits.value <= 0n) return 'Amount must be greater than zero.'
  if (withdrawUnits.value > availableUnits.value) return `That is more than your ${formatSrv(studio.value?.vault?.availableUnits)} SRV available.`
  return ''
})
const submitDisabled = computed(() => submitPending.value || withdrawUnits.value === null || !!withdrawReason.value || withdrawUnits.value <= 0n)
const submitLabel = computed(() => {
  if (submitPending.value) return 'Withdrawing…'
  const amount = withdrawUnits.value
  if (amount && amount > 0n) return `Withdraw ${formatSrv(unitsString(amount))} SRV`
  return 'Withdraw'
})
const submitHint = computed(() => {
  if (withdrawReason.value) return withdrawReason.value
  return 'Locked funds are excluded automatically'
})
const youReceiveSrv = computed(() => {
  const amount = withdrawUnits.value
  if (!amount || amount <= 0n) return '0.00'
  return formatSrv(unitsString(amount))
})

async function submitWithdrawal() {
  if (submitDisabled.value) return
  const amountUnits = withdrawUnits.value
  if (!amountUnits) return
  submitPending.value = true
  withdrawError.value = ''
  withdrawSuccess.value = false
  try {
    await api.one<WithdrawalRow>('/api/v1/studios/me/withdrawals', {
      method: 'POST',
      body: {
        amountUnits: unitsString(amountUnits),
      },
    })
    withdrawSuccess.value = true
    kycPanelVisible.value = false
    withdrawAmount.value = ''
    await Promise.all([refreshStudio(), refreshWithdrawals()])
  } catch (err) {
    const code = (err as any)?.data?.error?.code
    const message = (err as any)?.data?.error?.message
    if (code === 'kyc_required') {
      kycPanelVisible.value = true
      withdrawError.value = ''
    } else if (code === 'insufficient_funds') {
      withdrawError.value = message ?? 'Not enough available funds for this withdrawal.'
    } else if (code === 'payout_address_required') {
      withdrawError.value = message ?? 'Add a destination address before withdrawing — this studio has no payout address set.'
    } else if (code === 'invalid_amount' || code === 'validation_failed') {
      withdrawError.value = message ?? 'That amount is not valid.'
    } else {
      withdrawError.value = message ?? 'Withdrawal failed. Please try again.'
    }
  } finally {
    submitPending.value = false
  }
}

/* ── staking ── */
const stakeAmount = ref('')
const stakePending = ref(false)
const unstakePending = ref(false)
const stakeError = ref('')

const feeTiersAscending = computed<StudioTier[]>(() =>
  [...(studio.value?.feeTiers ?? [])].sort((a: StudioTier, b: StudioTier) => Number(a.minStakeUnits) - Number(b.minStakeUnits)),
)
const currentTier = computed(() => String(studio.value?.feeTier ?? 'standard'))
const stakedUnits = computed(() => BigInt(studio.value?.bond?.balanceUnits ?? '0'))
const stakeUnits = computed(() => srvStringToUnits(stakeAmount.value))

function tierFor(tier: string): StudioTier | undefined {
  return feeTiersAscending.value.find((row) => row.tier === tier)
}
function feePctFor(tier: string) {
  const row = tierFor(tier)
  return `${Number(row?.feeBps ?? studio.value?.feeBps ?? 1000) / 100}%`
}
function tierStake(tier: string) {
  return tierFor(tier)?.minStakeUnits ?? '0'
}
function isCurrentTier(tier: string) {
  return currentTier.value === tier
}
const stakeReason = computed(() => {
  const amount = stakeUnits.value
  if (amount === null) return stakeAmount.value.trim() ? 'Enter a valid SRV amount.' : ''
  if (amount <= 0n) return 'Amount must be greater than zero.'
  const available = BigInt(studio.value?.vault?.availableUnits ?? '0')
  if (amount > available) return `That is more than your ${formatSrv(studio.value?.vault?.availableUnits)} SRV available.`
  return ''
})
const stakeDisabled = computed(() => stakePending.value || unstakePending.value || stakeUnits.value === null || !!stakeReason.value || stakeUnits.value <= 0n)
const unstakeDisabled = computed(() => stakePending.value || unstakePending.value || stakedUnits.value <= 0n)
const stakeLabel = computed(() => (stakePending.value ? 'Staking…' : 'Stake'))
const unstakeLabel = computed(() => (unstakePending.value ? 'Unstaking…' : 'Unstake'))

async function bondMutation(path: string, amount: bigint, pendingRef: typeof stakePending) {
  pendingRef.value = true
  stakeError.value = ''
  try {
    await api.one(`/api/v1/studios/me/bond/${path}`, { method: 'POST', body: { amountUnits: unitsString(amount) } })
    stakeAmount.value = ''
    await Promise.all([refreshStudio(), refreshWithdrawals()])
  } catch (err) {
    stakeError.value = (err as any)?.data?.error?.message ?? 'The request was rejected.'
  } finally {
    pendingRef.value = false
  }
}
async function stake() {
  if (stakeDisabled.value || !stakeUnits.value) return
  await bondMutation('stake', stakeUnits.value, stakePending)
}
async function unstake() {
  if (unstakeDisabled.value) return
  await bondMutation('unstake', stakedUnits.value, unstakePending)
}

/* ── history + unlocks ── */
function withdrawalStatusLabel(status: string) {
  if (status === 'settled') return 'settled'
  if (status === 'pending') return 'pending'
  if (status === 'kyc_required') return 'pending KYC'
  if (status === 'failed') return 'failed'
  return status
}
function withdrawalChip(status: string) {
  if (status === 'settled') return 'chip chip--live'
  if (status === 'pending') return 'chip chip--warn'
  if (status === 'kyc_required' || status === 'failed') return 'chip chip--bad'
  return 'chip'
}
function shortHash(value: string | null | undefined, keep = 6) {
  if (!value) return '—'
  if (value.length <= keep * 2 + 2) return value
  return `${value.slice(0, keep + 2)}…${value.slice(-4)}`
}
function destinationLabel(address: string | null) {
  if (!address) return 'Fiat off-ramp'
  return shortHash(address)
}

const upcomingUnlocks = computed(() => {
  const now = Date.now()
  return withdrawals.value
    .filter((row) => row.status === 'pending' || row.status === 'kyc_required')
    .map((row) => {
      const created = row.createdAt ? new Date(row.createdAt).getTime() : now
      const unlock = new Date(created + DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000)
      return { key: row.id, date: unlock.toISOString(), amountUnits: row.amountUnits, unlockTime: unlock.getTime() }
    })
    .filter((row) => row.unlockTime > now)
    .sort((a, b) => a.unlockTime - b.unlockTime)
    .slice(0, 6)
})
</script>

<style scoped>
.phead { margin-bottom: 26px; }
.phead h1 { font-size: 1.65rem; }
.phead p { color: var(--text-dim); font-size: 0.93rem; margin-top: 6px; max-width: 680px; }

.sgrid { display: grid; grid-template-columns: 1fr 380px; gap: 30px; align-items: start; }

.vault {
  padding: 28px 30px;
  border-radius: var(--r-xl);
  background: radial-gradient(500px 250px at 12% 0%, rgba(123, 47, 247, 0.2), transparent 70%), var(--surface);
  border: 1px solid var(--border-2);
}
.vault__n { font-size: 2.4rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.vault__u { font-size: 1.1rem; font-weight: 600; }

.lockbar {
  display: flex;
  height: 10px;
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid var(--border);
  margin: 16px 0 10px;
}
.lockbar > div { height: 100%; transition: width 0.3s ease; }

.submit {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 18px;
  flex-wrap: wrap;
}
.submit__btn { min-width: 200px; }

.stake__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  align-content: end;
}

.tx a { text-decoration: underline; color: var(--pink); }

@media (max-width: 1080px) {
  .sgrid { grid-template-columns: 1fr; }
}
@media (max-width: 620px) {
  .stake__actions { grid-template-columns: 1fr; }
  .vault__n { font-size: 2rem; }
  .submit__btn { min-width: 0; flex: 1 1 auto; }
}
</style>
