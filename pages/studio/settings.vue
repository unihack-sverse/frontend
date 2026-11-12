<template>
  <StudioShell>
    <div v-if="error" class="empty">
      <p class="empty__i">⚠️</p>
      <p>{{ errorMessage }}</p>
      <NuxtLink class="btn btn--grad btn--sm" to="/login?next=/studio/settings">Sign in as a creator</NuxtLink>
    </div>

    <template v-else-if="studioPending">
      <div class="phead">
        <div class="sk" style="height:12px;width:110px"></div>
        <div class="sk" style="height:28px;width:180px;margin-top:10px"></div>
      </div>
      <div class="sk" style="height:44px;width:520px;border-radius:var(--r-md);margin-bottom:24px"></div>
      <div class="sgrid">
        <div class="card card--pad"><div class="sk" style="height:340px"></div></div>
        <div class="card card--pad"><div class="sk" style="height:220px"></div></div>
      </div>
    </template>

    <template v-else-if="studio">
      <div class="phead">
        <p class="eyebrow">Studio settings</p>
        <h1>@{{ studio.handle }}</h1>
      </div>

      <div class="tabs">
        <button :class="{ on: activeTab === 'profile' }" type="button" @click="setTab('profile')">Profile</button>
        <button :class="{ on: activeTab === 'keys' }" type="button" @click="setTab('keys')">API keys</button>
        <button :class="{ on: activeTab === 'hooks' }" type="button" @click="setTab('hooks')">Webhooks</button>
        <button :class="{ on: activeTab === 'attest' }" type="button" @click="setTab('attest')">Attestation</button>
      </div>

      <!-- ══ PROFILE ══ -->
      <section v-show="activeTab === 'profile'" class="pane on">
        <div class="sgrid">
          <div class="card card--pad">
            <p class="sect" style="margin-top:0">Studio identity</p>

            <div class="idrow">
              <img class="idrow__av" :src="form.avatarUrl || studio.avatarUrl || seedAsset('studios/voidrunner.png')" alt="">
              <div class="idrow__b">
                <button class="btn btn--ghost btn--sm" type="button" :disabled="saving" @click="openAvatarPrompt">Replace avatar</button>
                <p class="t-micro dim" style="margin-top:9px">Paste an image URL — no upload endpoint yet.</p>
              </div>
            </div>

            <div v-if="avatarEditing" class="field">
              <label>Avatar URL</label>
              <input v-model.trim="form.avatarUrl" type="url" placeholder="https://…/avatar.png" :disabled="saving">
              <p class="field__hint">A direct link to a square image works best.</p>
            </div>

            <div class="field">
              <label>Handle <span class="dim">· immutable</span></label>
              <input :value="studio.handle" disabled>
              <p class="field__hint">The handle is your permanent public identity — it cannot be changed after the studio is created.</p>
            </div>

            <div class="field" :class="{ bad: fieldError('displayName') }">
              <label>Display name</label>
              <input v-model.trim="form.displayName" maxlength="60" :disabled="saving">
              <p v-if="fieldError('displayName')" class="field__err">{{ fieldError('displayName') }}</p>
            </div>

            <div class="field" :class="{ bad: fieldError('bio') }">
              <label>Bio</label>
              <textarea v-model="form.bio" maxlength="500" :disabled="saving"></textarea>
              <p v-if="fieldError('bio')" class="field__err">{{ fieldError('bio') }}</p>
              <p v-else class="field__hint">{{ form.bio ? form.bio.length : 0 }}/500</p>
            </div>

            <div class="f2">
              <div class="field" :class="{ bad: fieldError('links.site') }">
                <label>Website</label>
                <input v-model.trim="form.site" type="url" placeholder="https://…" :disabled="saving">
                <p v-if="fieldError('links.site')" class="field__err">{{ fieldError('links.site') }}</p>
              </div>
              <div class="field" :class="{ bad: fieldError('links.x') }">
                <label>X / Twitter</label>
                <input v-model.trim="form.x" type="url" placeholder="https://x.com/…" :disabled="saving">
                <p v-if="fieldError('links.x')" class="field__err">{{ fieldError('links.x') }}</p>
              </div>
            </div>

            <label class="onerow">
              <span class="toggle" :class="{ on: studio.oneHumanStudio }"></span>
              <span>
                <b>One-human studio</b><br>
                <span class="t-small dim">
                  {{ studio.oneHumanStudio
                    ? 'You attested you are the sole owner and operator of this studio.'
                    : 'Not attested for this studio.' }}
                  This attestation cannot be changed after registration.
                </span>
              </span>
            </label>

            <div v-if="saveError" class="note note--bad" style="margin-top:18px">
              <span class="note__i">⚠️</span>
              <div>{{ saveError }}</div>
            </div>
            <div v-else-if="saveOk" class="note" style="margin-top:18px">
              <span class="note__i">✓</span>
              <div><b>Profile saved.</b> Your public studio page is updated.</div>
            </div>

            <button class="btn btn--grad savebtn" type="button" :disabled="saving" @click="saveProfile">
              {{ saving ? 'Saving…' : 'Save profile' }}
            </button>
          </div>

          <div>
            <div class="card card--pad feecard">
              <p class="sect" style="margin-top:0">Fee tier</p>
              <p class="feecard__n">{{ feePercent }}%</p>
              <p class="t-small dim">{{ capitalize(String(studio.feeTier ?? 'standard')) }} tier · {{ formatSrv(String(bondedUnits), { suffix: true }) }} staked</p>
              <NuxtLink class="btn btn--ghost btn--full btn--sm" to="/studio/payouts" style="margin-top:14px">{{ tierCta }}</NuxtLink>
            </div>

            <div class="card card--pad" style="margin-top:18px">
              <p class="sect" style="margin-top:0">Standing</p>
              <div class="rows">
                <div><span>Reputation</span><strong class="grad-text">★ {{ formatNum(reputation) }}</strong></div>
                <div><span>Strikes</span><strong :class="studio.strikes ? 'vu' : 'vf'">{{ studio.strikes ?? 0 }}</strong></div>
                <div><span>Listing bond</span><strong>{{ studio.bond?.balanceSrv ?? '0.00' }} SRV staked</strong></div>
                <div><span>Genesis cohort</span><strong>{{ studio.genesis ? 'Founding member' : 'Not in cohort' }}</strong></div>
              </div>
              <div class="note" style="margin-top:14px;font-size:.8rem">
                <span class="note__i">🛡</span>
                <div>
                  {{ studio.strikes
                    ? 'Open strikes keep new games in manual review. Clear them by resolving the flagged content.'
                    : 'Zero strikes keeps you on the auto-approve path — new games publish without a human review. Your bond is slashable for fraud or IP infringement.' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ══ API KEYS ══ -->
      <section v-show="activeTab === 'keys'" class="pane on">
        <div class="shead">
          <p class="t-small dim">Keys authenticate your game clients and AI agents. Only a hash is stored — we cannot show you a secret twice.</p>
          <button class="btn btn--grad btn--sm" type="button" @click="openKeyModal">＋ New API key</button>
        </div>

        <div v-if="keysPending" class="sk" style="height:180px;border-radius:var(--r-lg)"></div>
        <template v-else-if="keys.length">
          <div class="tw">
            <table>
              <thead>
                <tr>
                  <th>Label</th><th>Prefix</th><th>Scopes</th><th>Bound to</th>
                  <th>Last used</th><th class="num">Requests 24h</th><th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="key in keys" :key="key.id" :class="{ keyrow: key.revokedAt }">
                  <td><b>{{ key.label || 'Untitled key' }}</b></td>
                  <td class="t-mono dim">{{ key.prefix }}…</td>
                  <td>
                    <span v-for="scope in key.scopes" :key="scope" :class="scope === 'publish' ? 'chip chip--t2' : 'chip'" class="scopec">{{ scope }}</span>
                  </td>
                  <td class="dim">{{ key.gameId ? gameTitle(key.gameId, key.gameSlug) : 'all games' }}</td>
                  <td class="dim">{{ key.revokedAt ? `revoked ${formatDate(key.revokedAt)}` : lastUsed(key.lastUsedAt) }}</td>
                  <td class="num">{{ key.revokedAt ? '—' : formatNum(key.requestCount ?? 0) }}</td>
                  <td>
                    <span v-if="key.revokedAt" class="chip chip--bad">revoked</span>
                    <button
                      v-else
                      class="btn btn--ghost btn--sm btn--danger revbtn"
                      type="button"
                      :disabled="revokingId === key.id"
                      @click="revokeKey(key.id)"
                    >{{ revokingId === key.id ? 'Revoking…' : 'Revoke' }}</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <div v-else class="empty">
          <p class="empty__i">🔑</p>
          <p>No API keys yet.</p>
          <p class="t-small dim">Create a key to let a game client or agent talk to the API.</p>
        </div>

        <div v-if="keyListError" class="note note--bad" style="margin-top:16px">
          <span class="note__i">⚠️</span>
          <div>{{ keyListError }}</div>
        </div>

        <div class="note" style="margin-top:20px">
          <span class="note__i">🔐</span>
          <div>
            A key bound to one game <b>cannot read another game's data</b> — not its entitlements,
            not its passports, not its items. Scope <span class="t-mono">publish</span> can create
            item definitions but cannot touch live game data.
          </div>
        </div>
      </section>

      <!-- ══ WEBHOOKS ══ -->
      <section v-show="activeTab === 'hooks'" class="pane on">
        <div class="shead">
          <p class="t-small dim">Delivery is at-least-once. Dedupe on <span class="t-mono">event.id</span>.</p>
          <button class="btn btn--grad btn--sm" type="button" @click="openHookModal">＋ Add endpoint</button>
        </div>

        <div v-if="hooksPending" class="sk" style="height:200px;border-radius:var(--r-lg)"></div>
        <template v-else-if="endpoints.length">
          <div v-for="endpoint in endpoints" :key="endpoint.id" class="card card--pad hookcard">
            <div class="hookcard__h">
              <div style="min-width:0">
                <p class="t-mono hookcard__url">{{ endpoint.url }}</p>
                <p class="t-small dim">{{ endpoint.events.length }} event{{ endpoint.events.length === 1 ? '' : 's' }} subscribed · {{ endpoint.failureStreak }} failures in a row</p>
              </div>
              <div class="hookcard__act">
                <span :class="endpoint.status === 'active' ? 'chip chip--live' : 'chip chip--bad'">
                  <i v-if="endpoint.status === 'active'" class="dot"></i>{{ endpoint.status }}
                </span>
                <button class="btn btn--ghost btn--sm" type="button" @click="editEndpoint(endpoint)">Edit</button>
                <button class="btn btn--ghost btn--sm btn--danger" type="button" :disabled="deletingHookId === endpoint.id" @click="deleteEndpoint(endpoint.id)">
                  {{ deletingHookId === endpoint.id ? 'Deleting…' : 'Delete' }}
                </button>
              </div>
            </div>
            <p class="t-micro dim" style="margin:18px 0 10px">Signing secret</p>
            <div class="copyf">
              <span style="flex:1">{{ endpoint.signingSecretPrefix }}…</span>
              <button class="btn btn--ghost btn--sm" type="button" @click="copy(endpoint.signingSecretPrefix, `prefix-${endpoint.id}`)">
                {{ copiedId === `prefix-${endpoint.id}` ? 'Copied' : 'Copy' }}
              </button>
            </div>
            <p class="t-small dim" style="margin-top:10px">
              Verify: <span class="t-mono">HMAC-SHA256(secret, "&lt;timestamp&gt;.&lt;rawBody&gt;")</span>
              against header <span class="t-mono">X-Sverse-Signature: t=…,v1=…</span> — tolerate ±5 min
              skew, and verify against the <b>raw</b> body, not a re-serialised object. The full
              secret was shown once when this endpoint was created.
            </p>
          </div>
        </template>
        <div v-else class="empty">
          <p class="empty__i">⚡</p>
          <p>No webhook endpoints yet.</p>
          <p class="t-small dim">Add an endpoint to receive signed events from your games.</p>
        </div>

        <template v-if="endpoints.length || deliveries.length">
          <p class="sect">Recent deliveries</p>
          <div v-if="deliveries.length" class="tw">
            <table>
              <thead>
                <tr><th>Event</th><th>Event ID</th><th class="num">Attempts</th><th>Response</th><th>When</th><th></th></tr>
              </thead>
              <tbody>
                <tr v-for="delivery in deliveries" :key="delivery.id">
                  <td class="t-mono">{{ delivery.event }}</td>
                  <td class="t-mono dim" style="font-size:.74rem">{{ shortId(delivery.eventId) }}</td>
                  <td class="num">{{ delivery.attempts }}</td>
                  <td><span :class="deliveryChip(delivery)">{{ delivery.lastStatus ?? delivery.status }}</span></td>
                  <td class="dim">{{ relativeTime(delivery.deliveredAt || delivery.createdAt) }}</td>
                  <td>
                    <button
                      v-if="delivery.status === 'failed' || delivery.status === 'retrying'"
                      class="btn btn--ghost btn--sm replaybtn"
                      type="button"
                      :disabled="replayingId === delivery.id"
                      @click="replay(delivery)"
                    >{{ replayingId === delivery.id ? 'Replaying…' : 'Replay' }}</button>
                    <span v-else-if="delivery.attempts > 1" class="t-small dim">recovered after {{ delivery.attempts - 1 }} retries</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty" style="padding:34px 30px">
            <p class="empty__i">◔</p>
            <p>No deliveries recorded yet.</p>
          </div>

          <p class="sect">Subscribed events</p>
          <p class="t-small dim" style="margin:-6px 0 12px">Toggles apply to
            <b>{{ editingEndpoint ? editingEndpoint.url : endpoints[0]?.url }}</b>.</p>
          <div class="evgrid">
            <label v-for="event in availableEvents" :key="event" class="ev">
              <span class="toggle" :class="{ on: isSubscribed(event) }"></span>
              <input
                type="checkbox"
                class="ev__cb"
                :checked="isSubscribed(event)"
                :disabled="subscribing || !editingEndpoint"
                @change="toggleEvent(event)"
              >
              <span class="t-mono">{{ event }}</span>
            </label>
          </div>
          <div v-if="hookError" class="note note--bad" style="margin-top:14px">
            <span class="note__i">⚠️</span>
            <div>{{ hookError }}</div>
          </div>
        </template>
      </section>

      <!-- ══ ATTESTATION ══ -->
      <section v-show="activeTab === 'attest'" class="pane on">
        <div class="note note--warn" style="margin-bottom:22px">
          <span class="note__i">🔑</span>
          <div>
            <b>This key signs your deeds.</b> Every gameplay event your game writes to a Living Item
            is signed with it. If it leaks, someone can fabricate history on your players' items —
            and your bond gets slashed for it, not theirs.
          </div>
        </div>

        <div class="card card--pad">
          <p class="sect" style="margin-top:0">Deed attestation secret</p>
          <div class="copyf">
            <span style="flex:1">{{ keyCount ? '••••••••••••••••••••••••••••••••' : 'no secret provisioned yet' }}</span>
            <button class="btn btn--ghost btn--sm" type="button" disabled title="Rotation is not exposed by the API yet">Rotate</button>
          </div>
          <p class="t-small dim" style="margin-top:10px">
            Rotation is not exposed by the API yet — the secret is provisioned with each API key and
            there is no rotate endpoint. Re-key with a fresh API key if it is ever compromised.
          </p>

          <p class="t-micro dim" style="margin:20px 0 10px">Signature base string</p>
          <div class="term">
            <div class="term__b" style="min-height:auto">
              <div class="term__l"><span class="tdim">HMAC-SHA256(secret,</span></div>
              <div class="term__l"><span class="tdim">&nbsp;&nbsp;`${inventoryItemId}.${deedType}.${canonicalJson(detail)}.${nonce}`)</span></div>
            </div>
          </div>
          <p class="t-small dim" style="margin-top:12px">
            The <span class="t-mono">nonce</span> must be unique per item for 24h. A replayed nonce
            returns the <b>original</b> deed rather than creating a second one — so a network retry
            can never double-mutate an item.
          </p>
        </div>

        <p class="sect">Verification health</p>
        <div class="tiles">
          <div class="tile"><p class="tile__k">Deeds written 30d</p><p class="tile__v num dim">—</p><p class="tile__s">not exposed yet</p></div>
          <div class="tile"><p class="tile__k">Verified</p><p class="tile__v num dim">—</p><p class="tile__s">not exposed yet</p></div>
          <div class="tile"><p class="tile__k">Failed cross-check</p><p class="tile__v num dim">—</p><p class="tile__s">not exposed yet</p></div>
          <div class="tile"><p class="tile__k">Open review cases</p><p class="tile__v num dim">—</p><p class="tile__s">not exposed yet</p></div>
        </div>
        <p class="t-small dim" style="margin-top:12px">No endpoint exposes deed verification metrics yet, so these tiles are intentionally empty.</p>
      </section>
    </template>

    <!-- ══ new API key modal ══ -->
    <div v-if="keyModal" class="backdrop">
      <div class="modal" :class="{ 'modal--wide': keyForm.created && keyForm.scopes.includes('publish') }">
        <div class="modal__h">
          <div>
            <h3>{{ keyForm.created ? 'API key created' : 'New API key' }}</h3>
            <p>{{ keyForm.created ? 'Copy it now — this is the only time it is shown' : 'Scoped access for a game client or agent' }}</p>
          </div>
          <button v-if="!keyForm.created" class="modal__x" type="button" @click="closeKeyModal">✕</button>
        </div>

        <div class="modal__b">
          <template v-if="keyForm.created">
            <div :class="keyForm.scopes.includes('publish') ? 'keytwo' : ''">
              <div class="keytwo__l">
                <div class="note note--warn" style="margin-bottom:16px">
                  <span class="note__i">⚠️</span>
                  <div><b>We store only a hash.</b> If you lose this value you must revoke the key and create a new one. There is no recovery path — by design.</div>
                </div>
                <p class="t-micro dim" style="margin-bottom:9px">Secret</p>
                <div class="copyf">
                  <span style="flex:1">{{ keyForm.secret }}</span>
                  <button class="btn btn--ghost btn--sm" type="button" @click="copy(keyForm.secret, 'secret')">
                    {{ copiedId === 'secret' ? 'Copied' : 'Copy' }}
                  </button>
                </div>

                <div v-if="!keyForm.scopes.includes('publish')" class="note" style="margin-top:16px">
                  <span class="note__i">ℹ️</span>
                  <div>
                    This key has no <span class="t-mono">publish</span> scope, so it cannot drive the MCP server.
                    Create another key with <span class="t-mono">publish</span> and <span class="t-mono">read</span>
                    to get a ready-to-paste agent config.
                  </div>
                </div>
                <p v-else class="t-small dim" style="margin-top:16px">
                  Then ask your agent: <span class="t-mono">Use sverse_whoami</span>. The full guide ships with
                  the server at <span class="t-mono">mcp/docs/USER-GUIDE.md</span> — setup, what each step does,
                  and what to do when the flow stops.
                </p>

                <div class="keyacts">
                  <button class="btn btn--grad" type="button" @click="closeKeyModal">I have copied the secret</button>
                </div>
              </div>

              <div v-if="keyForm.scopes.includes('publish')" class="keytwo__r">
                <p class="t-micro dim" style="margin:0 0 8px">Agent config</p>
                <p class="t-small dim" style="margin:0 0 10px">
                  Same JSON for every MCP client — only the file differs.
                </p>

                <div class="cfgpath">
                  <span class="cfgpath__k">Cursor</span>
                  <span class="cfgpath__v t-mono">.cursor/mcp.json</span>
                </div>
                <div class="cfgpath">
                  <span class="cfgpath__k">Claude Desktop</span>
                  <span class="cfgpath__v t-mono">claude_desktop_config.json</span>
                </div>

                <pre class="configblk">{{ mcpConfig }}</pre>
                <div class="copyf" style="margin-top:8px">
                  <span style="flex:1" class="t-small dim">Replace the two &lt;absolute-path…&gt; placeholders.</span>
                  <button class="btn btn--ghost btn--sm" type="button" @click="copy(mcpConfig, 'mcp')">
                    {{ copiedId === 'mcp' ? 'Copied' : 'Copy config' }}
                  </button>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="field" :class="{ bad: keyFieldError('label') }">
              <label>Label</label>
              <input v-model.trim="keyForm.label" maxlength="60" placeholder="e.g. Production client" :disabled="keyCreating">
              <p v-if="keyFieldError('label')" class="field__err">{{ keyFieldError('label') }}</p>
            </div>
            <div class="field">
              <label>Bind to game</label>
              <AppSelect
                v-model="keyForm.gameId"
                :options="[{ value: '', label: 'All games' }, ...games.map((game) => ({ value: game.id, label: game.title }))]"
                :disabled="keyCreating"
                aria-label="Bind to game"
                block
              />
            </div>
            <p class="t-micro dim" style="margin-bottom:9px">Scopes</p>
            <div class="evgrid">
              <label v-for="scope in scopeOptions" :key="scope" class="ev">
                <span class="toggle" :class="{ on: keyForm.scopes.includes(scope) }"></span>
                <input type="checkbox" class="ev__cb" :checked="keyForm.scopes.includes(scope)" :disabled="keyCreating" @change="toggleScope(scope)">
                <span class="t-mono">{{ scope }}</span>
              </label>
            </div>
            <div v-if="keyError" class="note note--bad" style="margin-top:16px">
              <span class="note__i">⚠️</span>
              <div>{{ keyError }}</div>
            </div>
          </template>
        </div>

        <div v-if="!keyForm.created" class="modal__f">
          <button class="btn btn--ghost" type="button" :disabled="keyCreating" @click="closeKeyModal">Cancel</button>
          <button class="btn btn--grad createbtn" type="button" :disabled="keyCreating" @click="createKey">
            {{ keyCreating ? 'Creating…' : 'Create key' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══ webhook modal ══ -->
    <div v-if="hookModal" class="backdrop">
      <div class="modal modal--wide">
        <div class="modal__h">
          <div>
            <h3>{{ hookForm.id ? 'Edit webhook endpoint' : 'Add webhook endpoint' }}</h3>
            <p>We POST signed JSON on every subscribed event</p>
          </div>
          <button class="modal__x" type="button" @click="closeHookModal">✕</button>
        </div>
        <div class="modal__b">
          <div class="field" :class="{ bad: hookFieldError('url') }">
            <label>Endpoint URL</label>
            <input v-model.trim="hookForm.url" type="url" placeholder="https://example.com/hooks/sverse" :disabled="hookSaving">
            <p v-if="hookFieldError('url')" class="field__err">{{ hookFieldError('url') }}</p>
          </div>
          <div v-if="hookForm.id" class="field">
            <label>Status</label>
            <AppSelect
              v-model="hookForm.status"
              :options="[{ value: 'active', label: 'Active' }, { value: 'disabled', label: 'Disabled' }]"
              :disabled="hookSaving"
              aria-label="Webhook status"
              block
            />
          </div>
          <p class="t-micro dim" style="margin:16px 0 9px">Events</p>
          <div class="evgrid">
            <label v-for="event in availableEvents" :key="event" class="ev">
              <span class="toggle" :class="{ on: hookForm.events.includes(event) }"></span>
              <input type="checkbox" class="ev__cb" :checked="hookForm.events.includes(event)" :disabled="hookSaving" @change="toggleHookFormEvent(event)">
              <span class="t-mono">{{ event }}</span>
            </label>
          </div>
          <div class="note" style="margin-top:18px">
            <span class="note__i">↻</span>
            <div>Retries 5× with exponential backoff (1m → 16m), then dead-letters. Ten consecutive failures auto-disables the endpoint and emails you.</div>
          </div>
          <div v-if="hookError" class="note note--bad" style="margin-top:14px">
            <span class="note__i">⚠️</span>
            <div>{{ hookError }}</div>
          </div>
        </div>
        <div class="modal__f">
          <button class="btn btn--ghost" type="button" :disabled="hookSaving" @click="closeHookModal">Cancel</button>
          <button class="btn btn--grad savehook" type="button" :disabled="hookSaving" @click="saveHook">
            {{ hookSaving ? 'Saving…' : hookForm.id ? 'Save endpoint' : 'Add endpoint' }}
          </button>
        </div>
      </div>
    </div>
  </StudioShell>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'studio' })

useHead({ title: 'Studio settings · Sverse' })

type Tab = 'profile' | 'keys' | 'hooks' | 'attest'
type Scope = 'game' | 'publish' | 'read'

type FieldIssue = { field: string; issue: string }

const api = useApi()
const route = useRoute()
const router = useRouter()
const { seedAsset, formatSrv, formatNum, formatDate, capitalize } = useStudioFormat()

const TABS: Tab[] = ['profile', 'keys', 'hooks', 'attest']
const scopeOptions: Scope[] = ['game', 'publish', 'read']

const activeTab = computed<Tab>(() => {
  const value = String(route.query.tab ?? '')
  return (TABS as string[]).includes(value) ? (value as Tab) : 'profile'
})

function setTab(tab: Tab) {
  router.replace({ query: { ...route.query, tab } })
}

/* ── data ─────────────────────────────────────────────── */

const { data: studioRes, pending: studioPending, error: studioError, refresh: refreshStudio } = await useAsyncData(
  'studio-me',
  () => api.one<any>('/api/v1/studios/me').catch((e) => { throw e }),
)

const { data: keysRes, pending: keysPending, refresh: refreshKeys } = await useAsyncData(
  'studio-api-keys',
  () => api.many<any>('/api/v1/studios/me/api-keys').catch(() => ({ data: [], meta: { count: 0, hasMore: false, nextCursor: null } })),
)

const { data: hooksRes, pending: hooksPending, refresh: refreshHooks } = await useAsyncData(
  'studio-webhooks',
  () => api.many<any>('/api/v1/studios/me/webhooks').catch(() => ({ data: [], meta: { count: 0, hasMore: false, nextCursor: null, deliveries: [], availableEvents: [] } })),
)

const { data: gamesRes } = await useAsyncData(
  'studio-games',
  () => api.many<any>('/api/v1/games', { query: { limit: 100 } }).catch(() => ({ data: [], meta: { count: 0, hasMore: false, nextCursor: null } })),
)

const { data: passportRes } = await useAsyncData(
  'studio-passport',
  () => api.one<any>('/api/v1/passport/me').catch(() => null),
)

const studio = computed<any>(() => studioRes.value ?? null)
const games = computed<any[]>(() => gamesRes.value?.data ?? [])
const keys = computed<any[]>(() => keysRes.value?.data ?? [])
const endpoints = computed<any[]>(() => hooksRes.value?.data ?? [])
const deliveries = computed<any[]>(() => (hooksRes.value?.meta as any)?.deliveries ?? [])
const availableEvents = computed<string[]>(() => (hooksRes.value?.meta as any)?.availableEvents ?? [])
const reputation = computed(() => passportRes.value?.reputation ?? 0)

const error = computed(() => studioError.value)
const errorMessage = computed(() => {
  const code = (error.value as any)?.data?.error?.code
  if (code === 'creator_required' || code === 'missing_session') return 'This area needs a creator account.'
  return 'Could not load your studio.'
})

const feePercent = computed(() => Number(studio.value?.feeBps ?? 1000) / 100)
const bondedUnits = computed(() => BigInt(studio.value?.bond?.balanceUnits ?? '0'))
const tierCta = computed(() => {
  const tiers = [...(studio.value?.feeTiers ?? [])].sort((a: any, b: any) => Number(a.minStakeUnits) - Number(b.minStakeUnits))
  const currentIndex = tiers.findIndex((tier: any) => tier.tier === studio.value?.feeTier)
  const next = tiers[currentIndex + 1]
  if (!next) return 'View payout settings'
  return `Stake to reach ${Number(next.feeBps) / 100}%`
})

/* ── error helpers ────────────────────────────────────── */

function issuesOf(raw: any): FieldIssue[] {
  const details = raw?.data?.error?.details ?? raw?.data?.details ?? raw?.details
  return Array.isArray(details) ? details : []
}
function messageOf(raw: any, fallback: string): string {
  return raw?.data?.error?.message ?? raw?.data?.message ?? raw?.message ?? fallback
}
function fieldErrorFrom(issues: FieldIssue[], field: string) {
  return (issues.find((issue) => issue.field === field)?.issue) ?? ''
}

function fieldError(field: string) {
  return fieldErrorFrom(profileIssues.value, field)
}

/* ── profile ──────────────────────────────────────────── */

const form = reactive({ displayName: '', bio: '', avatarUrl: '', site: '', x: '' })
const avatarEditing = ref(false)
const saving = ref(false)
const saveError = ref('')
const saveOk = ref(false)
const profileIssues = ref<FieldIssue[]>([])

watch(studio, (value) => {
  if (!value) return
  form.displayName = value.displayName ?? ''
  form.bio = value.bio ?? ''
  form.avatarUrl = value.avatarUrl ?? ''
  form.site = value.links?.site ?? ''
  form.x = value.links?.x ?? ''
}, { immediate: true })

function openAvatarPrompt() {
  avatarEditing.value = true
}

async function saveProfile() {
  if (saving.value) return
  saving.value = true
  saveError.value = ''
  saveOk.value = false
  profileIssues.value = []
  const body: Record<string, any> = {
    displayName: form.displayName,
    bio: form.bio,
    links: { site: form.site || '', x: form.x || '', discord: studio.value?.links?.discord ?? '' },
  }
  if (form.avatarUrl) body.avatarUrl = form.avatarUrl
  try {
    await api.one('/api/v1/studios/me', { method: 'PATCH', body })
    await refreshStudio()
    saveOk.value = true
  } catch (raw: any) {
    profileIssues.value = issuesOf(raw)
    saveError.value = profileIssues.value.length ? 'Please fix the highlighted fields.' : messageOf(raw, 'Could not save your profile.')
  } finally {
    saving.value = false
  }
}

/* ── api keys ─────────────────────────────────────────── */

const keyModal = ref(false)
const keyCreating = ref(false)
const keyError = ref('')
const keyIssues = ref<FieldIssue[]>([])
type KeyForm = { label: string; gameId: string; scopes: Scope[]; secret: string; created: boolean }
const keyForm = reactive<KeyForm>({
  label: '', gameId: '', scopes: ['game'], secret: '', created: false,
})
const revokingId = ref('')
const keyListError = ref('')

/**
 * Ready-to-paste MCP client config. Built from the freshly created secret, the browser's API origin
 * and the console origin, so the copied block works without the creator looking anything up.
 */
const mcpConfig = computed(() => {
  const apiOrigin = useRequestURL().origin.replace(/\/$/, '')
  const consoleOrigin = import.meta.client ? window.location.origin : apiOrigin
  const payload = {
    mcpServers: {
      sverse: {
        command: 'node',
        args: ['<absolute-path-to-sverse>/mcp/dist/index.js'],
        env: {
          SVERSE_API_KEY: keyForm.secret,
          SVERSE_API_URL: apiOrigin,
          SVERSE_PROJECT_DIR: '<absolute-path-to-game>',
          SVERSE_CONSOLE_URL: consoleOrigin,
        },
      },
    },
  }
  return JSON.stringify(payload, null, 2)
})

function keyFieldError(field: string) {
  return fieldErrorFrom(keyIssues.value, field)
}

function openKeyModal() {
  keyForm.label = ''
  keyForm.gameId = ''
  keyForm.scopes = ['game']
  keyForm.secret = ''
  keyForm.created = false
  keyError.value = ''
  keyIssues.value = []
  keyModal.value = true
}

function closeKeyModal() {
  if (keyCreating.value) return
  keyModal.value = false
}

function toggleScope(scope: Scope) {
  const index = keyForm.scopes.indexOf(scope)
  if (index >= 0) keyForm.scopes.splice(index, 1)
  else keyForm.scopes.push(scope)
}

async function createKey() {
  if (keyCreating.value) return
  keyError.value = ''
  keyIssues.value = []
  if (!keyForm.scopes.length) {
    keyError.value = 'Select at least one scope.'
    return
  }
  keyCreating.value = true
  try {
    const created = await api.one<any>('/api/v1/studios/me/api-keys', {
      method: 'POST',
      body: { label: keyForm.label || undefined, scopes: [...keyForm.scopes], gameId: keyForm.gameId || null },
    })
    keyForm.secret = created.secret
    keyForm.created = true
    await refreshKeys()
  } catch (raw: any) {
    keyIssues.value = issuesOf(raw)
    keyError.value = keyIssues.value.length ? 'Please fix the highlighted fields.' : messageOf(raw, 'Could not create the key.')
  } finally {
    keyCreating.value = false
  }
}

async function revokeKey(id: string) {
  if (revokingId.value) return
  revokingId.value = id
  keyListError.value = ''
  try {
    await api.one(`/api/v1/studios/me/api-keys/${id}`, { method: 'DELETE' })
    await refreshKeys()
  } catch (raw: any) {
    keyListError.value = messageOf(raw, 'Could not revoke that key.')
  } finally {
    revokingId.value = ''
  }
}

function gameTitle(gameId: string, slug?: string | null) {
  const match = games.value.find((game) => game.id === gameId || game.slug === slug)
  return match?.title ?? slug ?? gameId
}

function lastUsed(value: string | null) {
  return value ? relativeTime(value) : 'never'
}

/* ── webhooks ─────────────────────────────────────────── */

const hookModal = ref(false)
const hookSaving = ref(false)
const hookError = ref('')
const hookIssues = ref<FieldIssue[]>([])
const deletingHookId = ref('')
const replayingId = ref('')
const subscribing = ref(false)
const editingEndpointId = ref('')
const hookForm = reactive<{ id: string; url: string; status: 'active' | 'disabled'; events: string[] }>({
  id: '', url: '', status: 'active', events: [],
})

const editingEndpoint = computed(() => endpoints.value.find((endpoint) => endpoint.id === editingEndpointId.value) ?? endpoints.value[0] ?? null)

watch(endpoints, (list) => {
  if (!editingEndpointId.value && list.length) editingEndpointId.value = list[0].id
  if (editingEndpointId.value && !list.some((endpoint) => endpoint.id === editingEndpointId.value)) {
    editingEndpointId.value = list[0]?.id ?? ''
  }
}, { immediate: true })

function hookFieldError(field: string) {
  return fieldErrorFrom(hookIssues.value, field)
}

function openHookModal() {
  hookForm.id = ''
  hookForm.url = ''
  hookForm.status = 'active'
  hookForm.events = availableEvents.value.slice(0, 1)
  hookError.value = ''
  hookIssues.value = []
  hookModal.value = true
}

function editEndpoint(endpoint: any) {
  hookForm.id = endpoint.id
  hookForm.url = endpoint.url
  hookForm.status = endpoint.status === 'disabled' ? 'disabled' : 'active'
  hookForm.events = [...(endpoint.events ?? [])]
  hookError.value = ''
  hookIssues.value = []
  hookModal.value = true
}

function closeHookModal() {
  if (hookSaving.value) return
  hookModal.value = false
}

function toggleHookFormEvent(event: string) {
  const index = hookForm.events.indexOf(event)
  if (index >= 0) hookForm.events.splice(index, 1)
  else hookForm.events.push(event)
}

async function saveHook() {
  if (hookSaving.value) return
  hookError.value = ''
  hookIssues.value = []
  if (!hookForm.events.length) {
    hookError.value = 'Subscribe to at least one event.'
    return
  }
  hookSaving.value = true
  try {
    if (hookForm.id) {
      await api.one(`/api/v1/studios/me/webhooks/${hookForm.id}`, {
        method: 'PATCH',
        body: { url: hookForm.url, events: [...hookForm.events], status: hookForm.status },
      })
    } else {
      await api.one('/api/v1/studios/me/webhooks', {
        method: 'POST',
        body: { url: hookForm.url, events: [...hookForm.events] },
      })
    }
    await refreshHooks()
    hookModal.value = false
  } catch (raw: any) {
    hookIssues.value = issuesOf(raw)
    hookError.value = hookIssues.value.length ? 'Please fix the highlighted fields.' : messageOf(raw, 'Could not save the endpoint.')
  } finally {
    hookSaving.value = false
  }
}

async function deleteEndpoint(id: string) {
  if (deletingHookId.value) return
  deletingHookId.value = id
  hookError.value = ''
  try {
    await api.one(`/api/v1/studios/me/webhooks/${id}`, { method: 'DELETE' })
    if (editingEndpointId.value === id) editingEndpointId.value = ''
    await refreshHooks()
  } catch (raw: any) {
    hookError.value = messageOf(raw, 'Could not delete that endpoint.')
  } finally {
    deletingHookId.value = ''
  }
}

function isSubscribed(event: string) {
  return !!editingEndpoint.value?.events?.includes(event)
}

async function toggleEvent(event: string) {
  const endpoint = editingEndpoint.value
  if (!endpoint || subscribing.value) return
  const current: string[] = endpoint.events ?? []
  const next = current.includes(event) ? current.filter((item) => item !== event) : [...current, event]
  if (!next.length) {
    hookError.value = 'An endpoint must stay subscribed to at least one event.'
    return
  }
  subscribing.value = true
  hookError.value = ''
  try {
    await api.one(`/api/v1/studios/me/webhooks/${endpoint.id}`, {
      method: 'PATCH',
      body: { events: next },
    })
    await refreshHooks()
  } catch (raw: any) {
    hookError.value = messageOf(raw, 'Could not update subscriptions.')
  } finally {
    subscribing.value = false
  }
}

async function replay(delivery: any) {
  if (replayingId.value) return
  replayingId.value = delivery.id
  hookError.value = ''
  try {
    await api.one(`/api/v1/studios/me/webhooks/${delivery.endpointId}/replay/${delivery.id}`, { method: 'POST' })
    await refreshHooks()
  } catch (raw: any) {
    hookError.value = messageOf(raw, 'Could not replay that delivery.')
  } finally {
    replayingId.value = ''
  }
}

function deliveryChip(delivery: any) {
  const status = Number(delivery?.lastStatus)
  if (status >= 200 && status < 300) return 'chip chip--live'
  if (delivery?.status === 'delivered') return 'chip chip--live'
  if (delivery?.status === 'retrying') return 'chip chip--warn'
  return 'chip chip--bad'
}

/* ── shared helpers ───────────────────────────────────── */

const copiedId = ref('')
async function copy(value: string, id: string) {
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    copiedId.value = id
    window.setTimeout(() => { if (copiedId.value === id) copiedId.value = '' }, 1600)
  } catch {
    copiedId.value = ''
  }
}

function shortId(value: string | null | undefined) {
  if (!value) return '—'
  return value.length > 12 ? `${value.slice(0, 12)}…` : value
}

function relativeTime(value: string | null | undefined) {
  if (!value) return 'recently'
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return 'recently'
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(value)
}

/* ── attestation ──────────────────────────────────────── */

const keyCount = computed(() => keys.value.filter((key) => !key.revokedAt).length)
</script>

<style scoped>
.phead { margin-bottom: 22px; }
.phead h1 { font-size: 1.65rem; }

.sgrid { display: grid; grid-template-columns: 1fr 340px; gap: 26px; align-items: start; }

.idrow { display: flex; gap: 16px; margin-bottom: 18px; }
.idrow__av { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-2); flex-shrink: 0; }
.idrow__b { flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0; }

.onerow { display: flex; align-items: flex-start; gap: 12px; font-size: .87rem; margin-top: 6px; cursor: default; }
.onerow .toggle { margin-top: 2px; }

.savebtn { margin-top: 20px; min-width: 148px; }

.feecard__n { font-size: 2rem; font-weight: 800; margin: 4px 0 0; }

.shead {
  display: flex; justify-content: space-between; align-items: center;
  gap: 14px; flex-wrap: wrap; margin-bottom: 18px;
}
.shead .t-small { max-width: 620px; }

.scopec { margin-right: 6px; }
.keyrow { opacity: .5; }

.revbtn { min-width: 82px; }
.replaybtn { min-width: 78px; }
.createbtn, .savehook { min-width: 122px; }

.hookcard { margin-bottom: 20px; }
.hookcard__h { display: flex; justify-content: space-between; gap: 14px; flex-wrap: wrap; align-items: center; }
.hookcard__url { font-weight: 600; word-break: break-all; }
.hookcard__act { display: flex; gap: 9px; align-items: center; flex-wrap: wrap; }

/* copyf / evgrid / ev are not global — defined here to match settings.html */
.copyf {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; border-radius: 11px;
  background: var(--bg-2); border: 1px solid var(--border-2);
  font-family: var(--mono); font-size: .82rem; word-break: break-all;
}
.copyf button { flex-shrink: 0; }

.configblk {
  margin: 0; padding: 14px 16px; border-radius: 11px;
  background: var(--bg-2); border: 1px solid var(--border-2);
  font-family: var(--mono); font-size: .76rem; line-height: 1.55;
  color: var(--text); overflow-x: auto; white-space: pre;
}

/**
 * The "key created" state is a rectangle, not a tall column: secret on the left, the paste-ready
 * agent config on the right, so both are visible without scrolling the modal.
 */
.modal.modal--wide { width: min(920px, 100%); }
.keytwo {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 22px; align-items: start;
}
.keytwo__l, .keytwo__r { min-width: 0; }
.keytwo__r {
  padding-left: 22px; border-left: 1px solid var(--border);
  align-self: stretch;
}
.keyacts { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; }

/* Where the same JSON goes, per client. The block itself is identical for both. */
.cfgpath {
  display: flex; align-items: baseline; gap: 10px;
  padding: 5px 0; font-size: .78rem;
}
.cfgpath__k { color: var(--text-dim); min-width: 108px; flex-shrink: 0; }
.cfgpath__v { color: var(--text); word-break: break-all; }
@media (max-width: 860px) {
  .keytwo { grid-template-columns: minmax(0, 1fr); }
  .keytwo__r { padding-left: 0; border-left: none; border-top: 1px solid var(--border); padding-top: 18px; }
}

.evgrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; }
.ev {
  display: flex; align-items: center; gap: 10px; font-size: .83rem;
  padding: 8px 11px; border-radius: 9px;
  background: var(--surface); border: 1px solid var(--border); cursor: pointer;
}
.ev .toggle { width: 34px; height: 20px; }
.ev .toggle::after { width: 14px; height: 14px; left: 2px; }
.ev .toggle.on::after { left: 17px; }
.ev__cb { position: absolute; opacity: 0; width: 0; height: 0; }

@media (max-width: 1400px) {
  .sgrid { grid-template-columns: 1fr 320px; }
}
@media (max-width: 1024px) {
  .sgrid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .hookcard__h { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 700px) {
  .evgrid { grid-template-columns: 1fr; }
}
@media (max-width: 375px) {
  .savebtn { width: 100%; }
}
</style>
