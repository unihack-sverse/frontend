# Sverse Web Application

Nuxt 4 + Vue 3 web client for the Sverse platform (`@sverse/frontend`), covering the game storefront, S-Passport (email/password and Avalanche Fuji EIP-1193 wallet authentication, wardrobe, Living Item deeds, orders, rewards), secondary marketplace, Studio Console, and admin moderation/chain health console.

## Quick start (local)

Start the backend API first (`backend-v2` on `http://127.0.0.1:4000`), then run:

```bash
npm ci
npm run dev          # http://localhost:3000 (or http://127.0.0.1:3000)
```

> **Same-site cookie note:** Session authentication uses HTTP-only `SameSite=Lax` cookies issued by the API (`nuxt.config.ts`). In local development, access the frontend and `NUXT_PUBLIC_API_BASE` on the same site (for example, both on `127.0.0.1` or both on `localhost`).

## Environment

Configured via `nuxt.config.ts` (`runtimeConfig.public`):

| Variable | Default | Description |
| --- | --- | --- |
| `NUXT_PUBLIC_API_BASE` | `http://127.0.0.1:4000` | Base URL of the `backend-v2` API (`normalizeApiBase` strips trailing slashes and a trailing `/api` suffix) |
| `NUXT_PUBLIC_STUDIO_URL` | `http://127.0.0.1:5173/studio` | External/studio deep-link fallback URL |

## Verification & tests

```bash
npm run check        # nuxt typecheck (vue-tsc)
npm test             # vitest run (pure utility & API client unit tests)
npm run build        # nuxt build --preset=cloudflare_module
npm run build:node   # standard Node SSR build
```

`tests/unit/` covers:
- `money.test.ts` — `BigInt` micro-SRV (`1 SRV = 1,000,000 units`) parsing and formatting (`srvToUnits` rejects `'0'`, `'0.00'`, negative numbers, and strings with more than 6 fractional digits).
- `useApi.test.ts` — `normalizeApiBase`, recursive `/assets/...` URL rewriting against the configured API origin, and `ApiError` unwrapping across SSR/client payloads.
- `studioGame.test.ts` — Studio catalog form parsing (`parseStudioSrvUnits`), CSV import parsing, and interop envelope `clampPolicy` options (`clamp`, `reject`).
- `studioPublish.test.ts` — 7-step publish pipeline state helpers and step payload builders.
- `studioSettings.test.ts` — API key scope validation, webhook event filtering, and attestation helpers.

## Architecture & surfaces

```text
pages/
  index.vue, store/index.vue, store/g/[slug].vue   Storefront, game detail, catalog & game clubs
  login.vue, signup.vue                            Email/password & Avalanche Fuji wallet sign-in
  passport/                                        Overview, Wardrobe (equip/interop), Deeds, Orders, Rewards
  market/index.vue                                 Secondary ERC-1155 custodial marketplace
  studio/                                          Studio overview, Games ([id]: Catalog, Interop, Analytics),
                                                   7-step Publish pipeline, Payouts, Settings (API keys, Webhooks)
  admin/review.vue                                 Moderation queue, user management & chain outbox reconciliation
components/
  studio/games/                                    Catalog, Interop, Analytics tabs & focus-trapped modals
  studio/publish/                                  PublishStep1..4 & PublishRecentRuns
  studio/settings/                                 Keys, Webhooks, Attest tabs & modals
composables/
  useApi.ts                                        $fetch wrapper with 401 single-flight token refresh & Idempotency-Key
  useSession.ts, usePassportData.ts, useGames.ts   SSR-aware session and domain state
  useChainStatus.ts, useWallets.ts                 Chain health banner & custodial/external wallet helpers
  useModalFocusTrap.ts                             Accessible Tab/Shift+Tab focus trap and Escape handling
utils/
  money.ts                                         BigInt micro-SRV conversion and fee breakdown helpers
  avalanche.ts                                     EIP-1193 browser wallet connect, Fuji (43113 / 0xa869) switch & personal_sign
  studioGame.ts, studioPublish.ts, studioSettings.ts
```

### Key client behaviors
- **Single-flight 401 refresh (`composables/useApi.ts`):** The backend rotates refresh tokens and revokes the token family on reuse. `useApi` serializes concurrent 401 refreshes behind a single `refreshInFlight` promise on the client and skips refresh on auth endpoints (`/api/v1/auth/*`).
- **Avalanche Fuji wallet authentication (`utils/avalanche.ts`):** Requests a nonce challenge from `POST /api/v1/auth/wallet/challenge`, switches/adds Avalanche Fuji Testnet (`chainId: 43113`, `0xa869`) via EIP-1193 `wallet_switchEthereumChain` / `wallet_addEthereumChain`, signs the challenge with `personal_sign`, and verifies via `POST /api/v1/auth/wallet/verify` (or links to an existing passport via `POST /api/v1/passport/me/wallet/link`).
- **Human-gated publish approval (`pages/studio/publish.vue`):** Steps driven by an assistant or the MCP server pause before `create_item_pack`; a human creator must review and approve the proposed catalog in the Studio web console (`POST /api/v1/publish/jobs/:id/approve-catalog`).

## What is real vs mocked

- **All data and state transitions come from `backend-v2`:** The frontend holds no mock database. Catalog items, ledger balances, custodial addresses, chain transaction hashes/explorer links, publish jobs, and review cases are fetched from `/api/v1/*` and `/admin/v1/*`.
- **Browser wallet signing (`utils/avalanche.ts`):** Uses a real EIP-1193 injected wallet (Core, MetaMask, Rabby) targeting Avalanche Fuji Testnet (`43113`) for challenge signing. On-chain item minting, transfers, burns, deed anchoring, and tSRV payouts are executed asynchronously by the backend relayer outbox rather than direct contract calls from the browser.
- **Automated tests (`npm test`):** Run in Node via Vitest against pure TypeScript utility and `useApi` modules; no headless browser or live backend is required for `npm test`.

## Known limitations

1. **No automated DOM/E2E browser test suite:** Vitest tests cover pure TypeScript utilities and `useApi` normalization/error helpers; Vue pages and modals are validated via `nuxt typecheck` (`npm run check`) rather than mounted component or Playwright tests.
2. **Same-site deployment requirement for cookies:** Because session cookies use `SameSite=Lax` by default, deploying the frontend and API on unrelated top-level domains requires configuring `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true` on the backend.
3. **Auth layout cover artwork depends on backend `/assets`:** `layouts/auth.vue` loads `${apiBase}/assets/seed/games/voidrunner-cover.png` from the backend static asset mount; if the API origin is unreachable or serves an invalid TLS certificate, the cover image will not render.
4. **Desktop EIP-1193 wallet only:** Wallet login and linking require an injected `window.ethereum` provider in the browser; WalletConnect / mobile deep-linking is not implemented.

## Deployment

`.github/workflows/deploy.yml` builds the application with the `cloudflare_module` Nitro preset (`npm ci`, `npm run check`, `npm test`, `npm run build`) and deploys to Cloudflare Workers via `cloudflare/wrangler-action@v3` on pushes to the `release` branch or manual `workflow_dispatch`.
