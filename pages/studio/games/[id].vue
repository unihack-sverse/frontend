<template>
  <StudioShell wide>
    <!-- ══ error ══ -->
    <div v-if="loadError" class="empty">
      <p class="empty__i">⚠️</p>
      <p>{{ loadErrorMessage }}</p>
      <NuxtLink v-if="notFound" class="btn btn--ghost btn--sm" to="/studio">Back to Studio</NuxtLink>
      <NuxtLink v-else class="btn btn--grad btn--sm" to="/login?next=/studio">Sign in as a creator</NuxtLink>
    </div>

    <!-- ══ loading ══ -->
    <template v-else-if="pending">
      <div class="ghead">
        <div class="sk" style="width:96px;height:60px;border-radius:var(--r-sm)"></div>
        <div style="flex:1;min-width:200px">
          <div class="sk" style="height:26px;width:220px"></div>
          <div class="sk" style="height:13px;width:320px;margin-top:10px"></div>
        </div>
      </div>
      <div class="sk" style="height:44px;width:560px;border-radius:var(--r-md);margin-bottom:24px"></div>
      <div class="sk" style="height:360px;border-radius:var(--r-lg)"></div>
    </template>

    <!-- ══ loaded ══ -->
    <template v-else-if="game">
      <nav class="crumbs" aria-label="Breadcrumb">
        <NuxtLink to="/studio" class="dim">Studio</NuxtLink>
        <span class="dim">/</span>
        <NuxtLink to="/studio/games" class="dim">Games</NuxtLink>
        <span class="dim">/</span>
        <b>{{ game.title }}</b>
      </nav>

      <div class="ghead">
        <img class="ghead__art" :src="coverUrl" :alt="`${game.title} cover art`">
        <div style="flex:1;min-width:200px">
          <h1 class="t-h1">{{ game.title }}</h1>
          <p class="t-small dim ghead__meta">
            <span :class="statusChip(game.status)"><i v-if="game.status === 'live'" class="dot"></i>{{ statusLabel(game.status) }}</span>
            <span class="chip chip--lvl">{{ game.tokenizationLevel }}</span>
            <span :class="tierChip(game.interopTier)">{{ game.interopTier }}</span>
            <span style="margin-left:6px">slug <span class="t-mono">{{ game.slug }}</span> · locked after publish</span>
          </p>
          <div v-if="game.submissionNo || game.blockedReason || game.rejectionReason" class="t-small dim" style="margin-top:6px">
            <span v-if="game.submissionNo">Submission #{{ game.submissionNo }}</span>
            <span v-if="game.blockedReason === 'bond_required'" class="chip chip--warn" style="margin-left:8px">listing bond required</span>
            <NuxtLink v-if="game.blockedReason === 'bond_required'" class="btn btn--grad btn--sm" to="/studio/payouts#stake" style="margin-left:8px">Stake bond →</NuxtLink>
            <span v-else-if="game.rejectionReason" class="chip chip--bad" style="margin-left:8px">rejected · {{ game.rejectionReason }}</span>
          </div>
        </div>
      </div>

      <div v-if="game.status === 'rejected'" class="note note--bad" style="margin-bottom:20px;align-items:center">
        <span class="note__i">⚠️</span>
        <div style="flex:1">
          <b>Submission rejected<template v-if="game.rejectionReason">: "{{ game.rejectionReason }}"</template></b>
          Update your Build URL, Cover Art, or metadata below and save changes, then resubmit through the Publish wizard.
        </div>
        <NuxtLink class="btn btn--grad btn--sm" to="/studio/publish">Resubmit →</NuxtLink>
      </div>

      <div class="tabs">
        <button :class="{ on: activeTab === 'details' }" type="button" @click="setTab('details')">Details</button>
        <button :class="{ on: activeTab === 'catalog' }" type="button" @click="setTab('catalog')">Catalog · {{ items.length }}</button>
        <button :class="{ on: activeTab === 'interop' }" type="button" @click="setTab('interop')">Interop envelope</button>
        <button :class="{ on: activeTab === 'an' }" type="button" @click="setTab('an')">Analytics</button>
      </div>

      <!-- ═══════════════ DETAILS ═══════════════ -->
      <section v-show="activeTab === 'details'" class="pane on">
        <div class="dgrid">
          <div class="card card--pad">
            <p class="sect" style="margin-top:0">Basics</p>

            <div class="field" :class="{ bad: fieldError('title') }">
              <label>Title</label>
              <input v-model.trim="form.title" maxlength="80" :disabled="saving" @input="clearField('title')">
              <p v-if="fieldError('title')" class="field__err">{{ fieldError('title') }}</p>
            </div>

            <div class="f2">
              <div class="field" :class="{ bad: fieldError('genre') }">
                <label>Genre</label>
                <AppSelect
                  v-model="form.genre"
                  :options="genreOptions.map((option) => ({ value: option, label: genreLabel(option) }))"
                  :disabled="saving"
                  aria-label="Genre"
                  block
                  @update:model-value="clearField('genre')"
                />
                <p v-if="fieldError('genre')" class="field__err">{{ fieldError('genre') }}</p>
              </div>
              <div class="field" :class="{ bad: fieldError('buildType') }">
                <label>Build type</label>
                <AppSelect
                  v-model="form.buildType"
                  :options="buildTypeOptions"
                  :disabled="saving"
                  aria-label="Build type"
                  block
                  @update:model-value="clearField('buildType')"
                />
                <p v-if="fieldError('buildType')" class="field__err">{{ fieldError('buildType') }}</p>
              </div>
            </div>

            <div class="field" :class="{ bad: fieldError('blurb') }">
              <label>Blurb <span class="dim">· shown on cards, 140 max</span></label>
              <input v-model="form.blurb" maxlength="200" :disabled="saving" @input="clearField('blurb')">
              <p v-if="fieldError('blurb')" class="field__err">{{ fieldError('blurb') }}</p>
              <p v-else-if="form.blurb.length > 140" class="field__hint blurb-warn">{{ form.blurb.length }}/140 — trimmed on cards past 140</p>
              <p v-else class="field__hint">{{ form.blurb.length }}/140</p>
            </div>

            <div class="field" :class="{ bad: fieldError('description') }">
              <label>Description</label>
              <textarea v-model="form.description" maxlength="5000" :disabled="saving" @input="clearField('description')"></textarea>
              <p v-if="fieldError('description')" class="field__err">{{ fieldError('description') }}</p>
            </div>

            <div class="field" :class="{ bad: fieldError('buildUrl') }">
              <label>Build URL <span class="dim">· review scans this before the game goes live</span></label>
              <input v-model.trim="form.buildUrl" type="url" placeholder="https://…" :disabled="saving" @input="clearField('buildUrl')">
              <p v-if="fieldError('buildUrl')" class="field__err">{{ fieldError('buildUrl') }}</p>
              <p v-else-if="!form.buildUrl" class="field__hint">Required before publishing — without it the game cannot be submitted for review.</p>
            </div>

            <div v-if="saveError" class="note note--bad" style="margin-top:6px">
              <span class="note__i">⚠️</span>
              <div>{{ saveError }}</div>
            </div>

            <div class="savebar">
              <button class="btn btn--grad" type="button" :disabled="saving || !detailsDirty" @click="saveDetails">
                {{ saving ? 'Saving…' : 'Save changes' }}
              </button>
              <span v-if="detailsDirty" class="t-small dim">Unsaved changes</span>
              <span v-else class="t-small dim">No changes to save</span>
            </div>
          </div>

          <div>
            <div class="card card--pad">
              <p class="sect" style="margin-top:0">Cover art &amp; media</p>
              <img class="cover" :src="coverUrl" :alt="`${game.title} cover art`">
              <div class="field" :class="{ bad: fieldError('coverArt') }" style="margin-top:12px">
                <label>Cover image URL</label>
                <input v-model.trim="form.coverArt.url" type="url" placeholder="https://…/cover.png" :disabled="saving" @input="clearField('coverArt')">
                <p v-if="fieldError('coverArt')" class="field__err">{{ fieldError('coverArt') }}</p>
                <p v-else class="field__hint">Paste a direct link to a wide image (1280×800 or larger, WEBP or PNG). Uploads are not supported yet.</p>
              </div>

              <p class="t-micro dim" style="margin-top:18px">Screenshots · {{ screenshots.length }}</p>
              <div v-if="screenshots.length" class="mediarow">
                <figure v-for="(shot, index) in screenshots" :key="shot.url">
                  <img :src="shot.url" :alt="`Screenshot ${index + 1}`">
                  <button type="button" class="mediax" aria-label="Remove screenshot" @click="removeScreenshot(index)">✕</button>
                </figure>
              </div>
              <p v-else class="t-small dim" style="margin-top:8px">No screenshots yet.</p>
              <div class="field" style="margin-top:12px">
                <label>Screenshot URL</label>
                <input v-model.trim="shotDraft" type="url" placeholder="https://…/shot.png" :disabled="saving">
                <p class="field__hint">Paste a direct link, then Add. Uploads are not supported yet.</p>
                <div class="inlineacts">
                  <button class="btn btn--grad btn--sm" type="button" :disabled="!shotDraft" @click="addScreenshot">Add screenshot</button>
                </div>
              </div>
            </div>

            <div class="card card--pad" style="margin-top:18px">
              <p class="sect" style="margin-top:0">Tokenization level</p>
              <div class="lvlpick">
                <button
                  v-for="level in levels"
                  :key="level.key"
                  class="lvl"
                  type="button"
                  :class="{ on: level.key === form.tokenizationLevel, off: levelBelow(level.key) }"
                  :disabled="levelBelow(level.key) || saving"
                  :aria-pressed="level.key === form.tokenizationLevel"
                  @click="chooseLevel(level.key)"
                >
                  <span class="lvl__k">{{ level.key }}</span>
                  <span class="lvl__b">
                    <span class="lvl__t">{{ level.title }}<template v-if="level.key === game.tokenizationLevel"> · current</template></span>
                    <span class="lvl__d">{{ levelBelow(level.key) ? 'Below current level — cannot downgrade' : level.desc }}</span>
                  </span>
                  <span v-if="level.key === form.tokenizationLevel" class="lvl__mark" aria-hidden="true">✓</span>
                  <span v-else-if="levelBelow(level.key)" class="lvl__mark" aria-hidden="true">🔒</span>
                </button>
              </div>
              <div v-if="levelError" class="note note--bad" style="margin-top:14px">
                <span class="note__i">⚠️</span>
                <div>{{ levelError }}</div>
              </div>
              <div class="note note--warn" style="margin-top:14px">
                <span class="note__i">🔒</span>
                <div><b>The ladder is one-way.</b> Levels below {{ game.tokenizationLevel }} are disabled
                  because this game is already at {{ game.tokenizationLevel }}. Player ownership must not
                  be revocable by the issuer, so a level can only ever go up.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══════════════ CATALOG ═══════════════ -->
      <section v-show="activeTab === 'catalog'" class="pane on">
        <div class="shead">
          <p class="t-small dim" style="max-width:680px">Item definitions. Archiving stops new sales but
            never touches items players already own.</p>
          <div class="shead__act">
            <button class="btn btn--ghost btn--sm" type="button" @click="openCsvModal">Import CSV</button>
            <button class="btn btn--grad btn--sm" type="button" @click="openItemModal(null)">＋ New item</button>
          </div>
        </div>

        <div v-if="items.length" class="tw">
          <table>
            <thead>
              <tr>
                <th>Item</th><th>SKU</th><th>Kind</th><th>Schema</th><th>Interop</th>
                <th class="num">Price</th><th class="num">Supply</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.id" :class="{ archived: item.status === 'archived' }">
                <td>
                  <div class="irow">
                    <img :src="item.art?.url || seedAsset(`items/${item.sku}.png`)" :alt="item.name">
                    <b>{{ item.name }}</b>
                  </div>
                </td>
                <td class="t-mono dim">{{ item.sku }}</td>
                <td>{{ item.kind }}</td>
                <td class="t-mono dim schema">{{ item.schemaId || '—' }}</td>
                <td><span :class="tierChip(item.interopTier)">{{ item.interopTier }}</span></td>
                <td class="num">{{ formatSrv(item.priceUnits, { suffix: true }) }}</td>
                <td class="num">{{ supplyLabel(item) }}</td>
                <td><span :class="itemStatusChip(item.status)">{{ item.status }}</span></td>
                <td>
                  <div class="rowacts">
                    <button class="btn btn--ghost btn--sm" type="button" @click="openItemModal(item)">Edit</button>
                    <button
                      v-if="item.status !== 'archived'"
                      class="btn btn--ghost btn--sm btn--danger"
                      type="button"
                      @click="askArchive(item)"
                    >Archive</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty">
          <p class="empty__i">📦</p>
          <p>No item definitions yet.</p>
          <p class="t-small dim">Create one to start selling items in this game.</p>
          <button class="btn btn--grad btn--sm" type="button" @click="openItemModal(null)">＋ New item</button>
        </div>

        <div class="note" style="margin-top:20px">
          <span class="note__i">📦</span>
          <div>Limited supply <b>max can be raised but never lowered below minted</b> — the input's floor
            is the current mint count. Archiving an item changes nothing for the players who already own it.</div>
        </div>
      </section>

      <!-- ═══════════════ INTEROP ═══════════════ -->
      <section v-show="activeTab === 'interop'" class="pane on">
        <div class="note" style="margin-bottom:22px">
          <span class="note__i">⚖️</span>
          <div><b>This is where you keep control of your own balance.</b> You never import raw stats from
            another game — you declare which schemas you accept and the band you map them into. A mapping
            that would land outside your band <b>fails the import</b>; it is never clamped silently.</div>
        </div>

        <div class="card card--pad">
          <div class="shead" style="margin-bottom:6px">
            <div>
              <p class="t-h3">Accepted schemas</p>
              <p class="t-small dim">Items matching these can be imported into {{ game.title }}</p>
            </div>
            <button class="btn btn--ghost btn--sm" type="button" @click="openAcceptModal">＋ Accept a schema</button>
          </div>

          <div v-if="envelopeForm.accepts.length" class="envlist">
            <div class="envrow envorow">
              <span class="t-micro dim">Schema</span>
              <span class="t-micro dim">Max tier</span>
              <span class="t-micro dim">Power range</span>
              <span class="t-micro dim">Mapping</span>
              <span></span>
            </div>
            <div v-for="(entry, index) in envelopeForm.accepts" :key="entry.schemaId + index" class="envrow">
              <span class="t-mono scel">{{ entry.schemaId }}</span>
              <AppSelect
                v-model="entry.tierMax"
                :options="tiers.map((tier) => ({ value: tier, label: tier }))"
                :disabled="savingEnvelope"
                aria-label="Tier max"
                size="sm"
              />
              <span class="t-mono dim">{{ powerRangeLabel(entry) }}</span>
              <span class="t-small dim" v-html="mappingSummary(entry)"></span>
              <div class="rowacts">
                <button class="btn btn--ghost btn--sm" type="button" @click="openPreview(entry)">Preview</button>
                <button class="btn btn--ghost btn--sm btn--danger" type="button" aria-label="Remove accepted schema" @click="removeAccept(index)">✕</button>
              </div>
            </div>
          </div>
          <p v-else class="t-small dim" style="margin-top:16px">
            No schemas accepted yet. Your game imports nothing until you accept at least one.
          </p>
        </div>

        <div class="grid g2" style="margin-top:18px">
          <div class="card card--pad">
            <p class="sect" style="margin-top:0">Clamp policy</p>
            <div class="picks">
              <label class="pick" :class="{ on: envelopeForm.clampPolicy === 'reject' }">
                <span class="pick__r"></span>
                <input type="radio" class="pick__cb" value="reject" :checked="envelopeForm.clampPolicy === 'reject'" :disabled="savingEnvelope" @change="envelopeForm.clampPolicy = 'reject'">
                <span>
                  <span class="pick__t">Reject out-of-band <span class="chip chip--t2">RECOMMENDED</span></span>
                  <span class="pick__d">An import that would exceed your band fails outright. The player is
                    told why. Nothing enters your economy unexamined.</span>
                </span>
              </label>
              <label class="pick" :class="{ on: envelopeForm.clampPolicy === 'clamp' }">
                <span class="pick__r"></span>
                <input type="radio" class="pick__cb" value="clamp" :checked="envelopeForm.clampPolicy === 'clamp'" :disabled="savingEnvelope" @change="envelopeForm.clampPolicy = 'clamp'">
                <span>
                  <span class="pick__t">Clamp to band</span>
                  <span class="pick__d">Silently pins the value to your ceiling. Convenient, but a balance
                    disaster becomes invisible.</span>
                </span>
              </label>
            </div>
          </div>

          <div class="card card--pad">
            <p class="sect" style="margin-top:0">Import fee</p>
            <div class="f2">
              <div class="field" :class="{ bad: fieldError('feeUnits') }">
                <label>Fee (SRV)</label>
                <input v-model="envelopeForm.feeSrv" type="text" inputmode="decimal" placeholder="0.00" :disabled="savingEnvelope" @input="clearField('feeUnits')">
                <p v-if="fieldError('feeUnits')" class="field__err">{{ fieldError('feeUnits') }}</p>
              </div>
              <div class="field" :class="{ bad: fieldError('hostSharePct') }">
                <label>Your share</label>
                <input v-model="envelopeForm.hostSharePct" type="text" inputmode="numeric" placeholder="50" :disabled="savingEnvelope" @input="clearField('hostSharePct')">
                <p v-if="fieldError('hostSharePct')" class="field__err">{{ fieldError('hostSharePct') }}</p>
              </div>
            </div>
            <p class="t-small dim">The player pays; you keep your share, the protocol takes the rest.
              Accepting imports is revenue-positive — that is deliberate, so hosting other studios' items
              is worth doing.</p>

            <p class="sect">License requirement</p>
            <AppSelect
              v-model="envelopeForm.licenseRequirement"
              :options="[{ value: 'display_only', label: 'Display only' }, { value: 'derivative', label: 'Derivative allowed' }, { value: 'commercial', label: 'Commercial' }]"
              :disabled="savingEnvelope"
              aria-label="License requirement"
              block
            />
            <p class="t-small dim" style="margin-top:8px">Checked programmatically before anything renders.
              Rendering another studio's art without this is a copyright act.</p>
          </div>
        </div>

        <div v-if="envelopeError" class="note note--bad" style="margin-top:16px">
          <span class="note__i">⚠️</span>
          <div>{{ envelopeError }}</div>
        </div>

        <div class="envfoot">
          <button class="btn btn--grad" type="button" :disabled="savingEnvelope" @click="saveEnvelope">
            {{ savingEnvelope ? 'Saving…' : 'Save envelope' }}
          </button>
        </div>
      </section>

      <!-- ═══════════════ ANALYTICS ═══════════════ -->
      <section v-show="activeTab === 'an'" class="pane on">
        <div class="tiles" style="margin-bottom:22px">
          <div class="tile">
            <p class="tile__k">Revenue · 30d</p>
            <p class="tile__v num">{{ formatSrv(gameStats.revenueUnits, { suffix: false }) }} <span class="t-small dim">SRV</span></p>
            <p class="tile__s">across accepted imports &amp; sales</p>
          </div>
          <div class="tile">
            <p class="tile__k">DAU</p>
            <p class="tile__v num">{{ formatNum(gameStats.dau) }}</p>
            <p class="tile__s">{{ formatNum(gameStats.playersLive) }} live right now</p>
          </div>
          <div class="tile">
            <p class="tile__k">Conversion</p>
            <p class="tile__v num">{{ formatPct(gameStats.conversion, { ratio: true }) }}</p>
            <p class="tile__s">visit → purchase</p>
          </div>
          <div class="tile">
            <p class="tile__k">Avg playtime</p>
            <p class="tile__v num">{{ gameStats.avgSessionMinutes === null ? '—' : gameStats.avgSessionMinutes }}<span v-if="gameStats.avgSessionMinutes !== null" class="t-small dim"> min</span></p>
            <p class="tile__s">{{ gameStats.avgSessionMinutes === null ? 'no attested playtime yet' : 'per session' }}</p>
          </div>
        </div>

        <div class="card card--pad">
          <p class="t-h3" style="margin-bottom:4px">Daily active players</p>
          <p class="t-small dim">Attested playtime only — derived from heartbeats, never from a
            client-declared duration.</p>
          <div v-if="chartColumns.length" class="chart">
            <div v-for="(column, index) in chartColumns" :key="index" class="chart__c" :title="`${column.value} players`">
              <div class="chart__b" :style="{ height: `${column.pct}%` }"></div>
              <span class="chart__x">{{ column.label }}</span>
            </div>
          </div>
          <div v-else class="empty" style="padding:34px 0">
            <p class="empty__i">◔</p>
            <p>No player activity in the last 30 days.</p>
          </div>
        </div>
      </section>
    </template>

    <!-- ═══════════════ ITEM EDITOR MODAL ═══════════════ -->
    <div v-if="itemModal" class="backdrop" @click.self="closeItemModal">
      <div ref="itemModalEl" class="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="item-modal-title">
        <div class="modal__h">
          <div>
            <h3 id="item-modal-title">{{ itemForm.id ? 'Edit item definition' : 'New item definition' }}</h3>
            <p>{{ itemForm.id ? `${itemForm.sku} · ${game?.title}` : `Draft a new sellable for ${game?.title}` }}</p>
          </div>
          <button class="modal__x" type="button" aria-label="Close" @click="closeItemModal">✕</button>
        </div>
        <div class="modal__b">
          <div class="itemtop">
            <img class="itemart" :src="itemForm.art.url || seedAsset('items/placeholder.png')" alt="Item art preview">
            <div style="flex:1;min-width:0">
              <div class="field" :class="{ bad: fieldError('name') }" style="margin-bottom:10px">
                <label>Name</label>
                <input v-model.trim="itemForm.name" maxlength="80" :disabled="itemSaving" @input="clearField('name')">
                <p v-if="fieldError('name')" class="field__err">{{ fieldError('name') }}</p>
              </div>
              <div class="field" :class="{ bad: fieldError('art') }" style="margin-bottom:10px">
                <label>Art URL</label>
                <input v-model.trim="itemForm.art.url" type="url" placeholder="https://…/item.png" :disabled="itemSaving" @input="clearField('art')">
                <p v-if="fieldError('art')" class="field__err">{{ fieldError('art') }}</p>
              </div>
            </div>
          </div>

          <div class="field" :class="{ bad: fieldError('sku') }">
            <label>SKU <span class="dim">· lowercase, a–z 0–9 _</span></label>
            <input v-model.trim="itemForm.sku" maxlength="40" :disabled="itemSaving || !!itemForm.id" @input="clearField('sku')">
            <p v-if="fieldError('sku')" class="field__err">{{ fieldError('sku') }}</p>
            <p v-else-if="itemForm.id" class="field__hint">The SKU is immutable after creation.</p>
          </div>

          <div class="field" :class="{ bad: fieldError('description') }">
            <label>Description</label>
            <input v-model="itemForm.description" maxlength="400" :disabled="itemSaving" @input="clearField('description')">
            <p v-if="fieldError('description')" class="field__err">{{ fieldError('description') }}</p>
          </div>

          <div class="f3">
            <div class="field" :class="{ bad: fieldError('kind') }">
              <label>Kind</label>
              <AppSelect
                v-model="itemForm.kind"
                :options="kindOptions.map((kind) => ({ value: kind, label: kind }))"
                :disabled="itemSaving"
                aria-label="Item kind"
                block
                @update:model-value="clearField('kind')"
              />
              <p v-if="fieldError('kind')" class="field__err">{{ fieldError('kind') }}</p>
            </div>
            <div class="field" :class="{ bad: fieldError('priceUnits') }">
              <label>Price (SRV)</label>
              <input v-model="itemForm.priceSrv" type="text" inputmode="decimal" placeholder="0.00" :disabled="itemSaving" @input="clearField('priceUnits')">
              <p v-if="fieldError('priceUnits')" class="field__err">{{ fieldError('priceUnits') }}</p>
            </div>
            <div class="field" :class="{ bad: fieldError('royaltyBps') }">
              <label>Royalty (bps)</label>
              <input v-model="itemForm.royaltyBps" type="text" inputmode="numeric" placeholder="0" :disabled="itemSaving" @input="clearField('royaltyBps')">
              <p v-if="fieldError('royaltyBps')" class="field__err">{{ fieldError('royaltyBps') }}</p>
            </div>
          </div>

          <div class="f2">
            <div class="field">
              <label>Trait schema</label>
              <AppSelect
                v-model="itemForm.schemaId"
                :options="[{ value: '', label: '— none —' }, ...activeSchemas.map((schema) => ({ value: schema.schemaId, label: schema.schemaId }))]"
                :disabled="itemSaving"
                aria-label="Trait schema"
                block
              />
            </div>
            <div class="field" :class="{ bad: fieldError('interopTier') }">
              <label>Interop tier</label>
              <AppSelect
                v-model="itemForm.interopTier"
                :options="tiers.map((tier) => ({ value: tier, label: tier }))"
                :disabled="itemSaving"
                aria-label="Interop tier"
                block
                @update:model-value="clearField('interopTier')"
              />
              <p v-if="fieldError('interopTier')" class="field__err">{{ fieldError('interopTier') }}</p>
            </div>
          </div>

          <template v-if="selectedSchema && selectedSchema.fields.length">
            <p class="t-micro dim" style="margin:16px 0 10px">Traits · validated against the schema</p>
            <div class="f3">
              <div v-for="field in selectedSchema.fields" :key="field.name" class="field">
                <label>
                  {{ field.name }}
                  <span v-if="field.type === 'int' && field.min !== undefined" class="dim">{{ field.min }}–{{ field.max }}</span>
                </label>
                <AppSelect
                  v-if="field.type === 'enum' && field.values"
                  :model-value="String(itemForm.traits[field.name] ?? '')"
                  :options="enumOptions(field.values)"
                  :disabled="itemSaving"
                  :aria-label="field.name"
                  block
                  @update:model-value="(value) => { itemForm.traits[field.name] = value }"
                />
                <input
                  v-else-if="field.type === 'int'"
                  v-model="itemForm.traits[field.name]"
                  type="number"
                  :min="field.min"
                  :max="field.max"
                  :disabled="itemSaving"
                >
                <input v-else v-model="itemForm.traits[field.name]" type="text" :disabled="itemSaving">
              </div>
            </div>
          </template>

          <div class="f2">
            <div class="field">
              <label>Supply type</label>
              <AppSelect
                v-model="itemForm.supplyType"
                :options="[{ value: 'limited', label: 'Limited' }, { value: 'unlimited', label: 'Unlimited' }]"
                :disabled="itemSaving"
                aria-label="Supply type"
                block
              />
            </div>
            <div v-if="itemForm.supplyType === 'limited'" class="field" :class="{ bad: !!supplyFloorError || fieldError('supplyMax') }">
              <label>Max supply</label>
              <input v-model="itemForm.supplyMax" type="text" inputmode="numeric" :placeholder="String(mintedCount || '')" :disabled="itemSaving" @input="clearField('supplyMax')">
              <p v-if="supplyFloorError" class="field__err">{{ supplyFloorError }}</p>
              <p v-else-if="fieldError('supplyMax')" class="field__err">{{ fieldError('supplyMax') }}</p>
              <p v-else-if="mintedCount" class="field__hint">Floor is the {{ formatNum(mintedCount) }} already minted.</p>
            </div>
          </div>

          <div v-if="itemError" class="note note--bad" style="margin-top:6px">
            <span class="note__i">⚠️</span>
            <div>{{ itemError }}</div>
          </div>
        </div>
        <div class="modal__f">
          <button class="btn btn--ghost" type="button" :disabled="itemSaving" @click="closeItemModal">Cancel</button>
          <button
            v-if="itemForm.id"
            class="btn btn--ghost btn--danger"
            type="button"
            :disabled="itemSaving"
            @click="askArchive(itemSummary)"
          >Archive</button>
          <button class="btn btn--grad" type="button" :disabled="itemSaving || !!supplyFloorError" @click="saveItem">
            {{ itemSaving ? 'Saving…' : 'Save item' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════ CSV IMPORT MODAL ═══════════════ -->
    <div v-if="csvModal" class="backdrop" @click.self="closeCsvModal">
      <div ref="csvModalEl" class="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="csv-modal-title">
        <div class="modal__h">
          <div>
            <h3 id="csv-modal-title">Import CSV</h3>
            <p>Bulk-create item definitions from pasted rows or a file</p>
          </div>
          <button class="modal__x" type="button" aria-label="Close" @click="closeCsvModal">✕</button>
        </div>
        <div class="modal__b">
          <p class="t-small dim" style="margin-bottom:10px">
            Columns: <span class="t-mono">sku,name,description,kind,price_srv,royalty_bps,interop_tier,schema_id,supply_max</span>.
            Header row optional. Each row is created independently.
          </p>
          <div class="field">
            <label>Paste CSV</label>
            <textarea v-model="csvText" style="min-height:150px;font-family:var(--mono);font-size:.78rem" placeholder="sku,name,kind,price_srv,royalty_bps,interop_tier&#10;vr_boost,Boost Pack,bundle,9.99,500,T2" :disabled="csvBusy"></textarea>
          </div>
          <div class="field">
            <label>…or choose a file</label>
            <input type="file" accept=".csv,text/csv" :disabled="csvBusy" @change="onCsvFile">
          </div>

          <div v-if="csvRows.length" class="t-micro dim" style="margin:16px 0 10px">Preview · {{ csvRows.length }} row{{ csvRows.length === 1 ? '' : 's' }}</div>
          <div v-if="csvRows.length" class="rows csvpreview">
            <div v-for="(row, index) in csvPreviewRows" :key="`${row.sku}-${index}`">
              <span class="t-mono">{{ row.sku || '(missing sku)' }}</span>
              <strong>{{ row.name || '—' }} · {{ formatSrv(row.priceUnits, { suffix: true }) }}</strong>
            </div>
          </div>
          <p v-if="csvRows.length > 8" class="t-small dim" style="margin-top:8px">…and {{ csvRows.length - 8 }} more.</p>

          <div v-if="csvParseError" class="note note--bad" style="margin-top:16px">
            <span class="note__i">⚠️</span>
            <div>{{ csvParseError }}</div>
          </div>

          <template v-if="csvResults">
            <p class="sect">Import result</p>
            <div class="csvsum">
              <span class="chip chip--live">{{ csvResults.created }} created</span>
              <span class="chip" :class="csvResults.failed ? 'chip--bad' : ''">{{ csvResults.failed }} failed</span>
            </div>
            <div v-if="csvResults.failures.length" class="rows csvfail">
              <div v-for="failure in csvResults.failures" :key="failure.index">
                <span>Row {{ failure.index + 1 }}</span>
                <strong class="fk">{{ failure.error }}</strong>
              </div>
            </div>
          </template>
        </div>
        <div class="modal__f">
          <button class="btn btn--ghost" type="button" :disabled="csvBusy" @click="closeCsvModal">
            {{ csvResults ? 'Close' : 'Cancel' }}
          </button>
          <button v-if="!csvResults" class="btn btn--grad" type="button" :disabled="csvBusy || !csvRows.length" @click="runCsvImport">
            {{ csvBusy ? 'Importing…' : `Import ${csvRows.length || ''} row${csvRows.length === 1 ? '' : 's'}` }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════ ARCHIVE CONFIRM ═══════════════ -->
    <div v-if="archiveTarget" class="backdrop" @click.self="closeArchive">
      <div ref="archiveModalEl" class="modal" role="dialog" aria-modal="true" aria-labelledby="archive-modal-title">
        <div class="modal__h">
          <div>
            <h3 id="archive-modal-title">Archive {{ archiveTarget.name }}?</h3>
            <p>{{ archiveTarget.sku }}</p>
          </div>
          <button class="modal__x" type="button" aria-label="Close" @click="closeArchive">✕</button>
        </div>
        <div class="modal__b">
          <div class="note note--warn">
            <span class="note__i">📦</span>
            <div><b>Existing owners keep their items.</b> Archiving stops all new sales of this
              definition immediately, but every item already minted stays exactly as it is — owned,
              tradeable, and untouched.</div>
          </div>
          <div v-if="archiveError" class="note note--bad" style="margin-top:14px">
            <span class="note__i">⚠️</span>
            <div>{{ archiveError }}</div>
          </div>
        </div>
        <div class="modal__f">
          <button class="btn btn--ghost" type="button" :disabled="archivePending" @click="closeArchive">Cancel</button>
          <button class="btn btn--ghost btn--danger" type="button" :disabled="archivePending" @click="confirmArchive">
            {{ archivePending ? 'Archiving…' : 'Archive item' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════ ACCEPT SCHEMA MODAL ═══════════════ -->
    <div v-if="acceptModal" class="backdrop" @click.self="closeAcceptModal">
      <div ref="acceptModalEl" class="modal" role="dialog" aria-modal="true" aria-labelledby="accept-modal-title">
        <div class="modal__h">
          <div>
            <h3 id="accept-modal-title">Accept a schema</h3>
            <p>Declare a schema your game will import and the band it maps into</p>
          </div>
          <button class="modal__x" type="button" aria-label="Close" @click="closeAcceptModal">✕</button>
        </div>
        <div class="modal__b">
          <div class="field">
            <label>Schema</label>
            <AppSelect
              v-model="acceptDraft.schemaId"
              :options="activeSchemas.map((schema) => ({ value: schema.schemaId, label: schema.schemaId }))"
              aria-label="Schema"
              block
            />
          </div>
          <div class="f2">
            <div class="field">
              <label>Max tier</label>
              <AppSelect
                v-model="acceptDraft.tierMax"
                :options="tiers.map((tier) => ({ value: tier, label: tier }))"
                aria-label="Tier max"
                block
              />
            </div>
            <div class="field">
              <label>Clamp policy</label>
              <AppSelect
                v-model="acceptDraft.clampPolicy"
                :options="[{ value: 'clamp', label: 'Clamp to tier max' }, { value: 'skip', label: 'Skip the item' }]"
                aria-label="Clamp policy"
                block
              />
            </div>
          </div>
          <div class="f2">
            <div class="field">
              <label>Power floor</label>
              <input v-model="acceptDraft.powerMin" type="text" inputmode="numeric">
            </div>
            <div class="field">
              <label>Power ceiling</label>
              <input v-model="acceptDraft.powerMax" type="text" inputmode="numeric">
            </div>
          </div>
          <div v-if="acceptError" class="note note--bad">
            <span class="note__i">⚠️</span>
            <div>{{ acceptError }}</div>
          </div>
        </div>
        <div class="modal__f">
          <button class="btn btn--ghost" type="button" @click="closeAcceptModal">Cancel</button>
          <button class="btn btn--grad" type="button" @click="confirmAccept">Add schema</button>
        </div>
      </div>
    </div>

    <!-- ═══════════════ PREVIEW MAPPING MODAL ═══════════════ -->
    <div v-if="previewEntry" class="backdrop" @click.self="closePreview">
      <div ref="previewModalEl" class="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="preview-modal-title">
        <div class="modal__h">
          <div>
            <h3 id="preview-modal-title">Preview mapping</h3>
            <p>Test a sample item against your envelope before saving</p>
          </div>
          <button class="modal__x" type="button" aria-label="Close" @click="closePreview">✕</button>
        </div>
        <div class="modal__b">
          <div class="env">
            <div class="env__b">
              <h5>Incoming · source game</h5>
              <div v-for="row in previewIncoming" :key="row.key"><span>{{ row.key }}</span><strong>{{ row.value }}</strong></div>
            </div>
            <div class="env__a" aria-hidden="true">→</div>
            <div class="env__b out">
              <h5>Your band</h5>
              <div v-for="row in previewMapped" :key="row.key"><span>{{ row.key }}</span><strong>{{ row.value }}</strong></div>
            </div>
          </div>
          <div class="note" style="margin-top:18px">
            <span class="note__i">✓</span>
            <div>Maps inside your {{ previewEntryPowerLabel }} band. The item keeps its identity and its
              deeds, and your curve stays intact.</div>
          </div>
          <div class="note note--bad" style="margin-top:12px">
            <span class="note__i">✕</span>
            <div><b>Example rejection:</b> a value with no mapping inside your
              {{ previewEntryPowerLabel }} range fails with
              <span class="t-mono">422 normalization_out_of_band</span>. The player is told exactly which
              check failed and is charged nothing.</div>
          </div>
        </div>
        <div class="modal__f">
          <button class="btn btn--ghost" type="button" @click="closePreview">Close</button>
        </div>
      </div>
    </div>
  </StudioShell>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'studio' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const { seedAsset, formatSrv, formatNum, formatPct, genreLabel, statusLabel, statusChip, tierChip } = useStudioFormat()

const gameId = computed(() => String(route.params.id ?? ''))

/* ── tabs ─────────────────────────────────────────────── */
type Tab = 'details' | 'catalog' | 'interop' | 'an'
const TABS: Tab[] = ['details', 'catalog', 'interop', 'an']
const activeTab = computed<Tab>(() => {
  const value = String(route.query.tab ?? '')
  return (TABS as string[]).includes(value) ? (value as Tab) : 'details'
})
function setTab(tab: Tab) {
  router.replace({ query: { ...route.query, tab } })
}

/* ── reference data ───────────────────────────────────── */
const genreOptions = ['action_rpg', 'puzzle', 'strategy', 'cozy', 'arcade', 'platformer']
const kindOptions = ['cosmetic', 'bundle', 'pass', 'consumable', 'unlock', 'content', 'living']
const buildTypeOptions = [
  { value: 'web', label: 'Web' },
  { value: 'native', label: 'Native' },
  { value: 'miniapp', label: 'Miniapp' },
]

/** Enum trait values straight from the schema, shaped for AppSelect. */
function enumOptions(values: string[]) {
  return values.map((value) => ({ value, label: value }))
}
const tiers = ['T0', 'T1', 'T2', 'T3']
const levels = [
  { key: 'L0', title: 'Payments only', desc: 'Buy and sell in SRV — no on-chain items' },
  { key: 'L1', title: 'Receipts', desc: 'Purchase receipts anchored, items stay off-chain' },
  { key: 'L2', title: 'Tokenized items', desc: 'Ownership recorded on-chain' },
  { key: 'L3', title: 'Living Items · current', desc: 'Mutable traits + deed ledger' },
  { key: 'L4', title: 'Tokenized economy', desc: 'SRV-backed soft currency · needs economy review' },
  { key: 'L5', title: 'Full sovereignty', desc: 'Player-governed economy primitives' },
]

const SRV_UNITS = 1_000_000n

/* ── data ─────────────────────────────────────────────── */
const { data: studioRes } = await useAsyncData('studio-me', () =>
  api.one<any>('/api/v1/studios/me').catch(() => null),
)
const { data: gameRes, pending, error, refresh: refreshGame } = await useAsyncData('studio-game-manage', () =>
  api.one<any>(`/api/v1/games/${gameId.value}/manage`).catch((e) => { throw e }),
)
const { data: analyticsRes } = await useAsyncData('studio-analytics', () =>
  api.one<any>('/api/v1/studios/me/analytics', { query: { days: 30 } }).catch(() => null),
)
const { data: schemasRes } = await useAsyncData('studio-schemas', () =>
  api.many<any>('/api/v1/schemas').catch(() => ({ data: [], meta: { count: 0, hasMore: false, nextCursor: null } })),
)

const studio = computed<any>(() => studioRes.value ?? null)
const game = computed<any>(() => gameRes.value ?? null)
const items = computed<any[]>(() => game.value?.items ?? [])
const schemas = computed<any[]>(() => schemasRes.value?.data ?? [])
const activeSchemas = computed<any[]>(() => schemas.value.filter((schema) => schema.status === 'active'))

const loadError = computed(() => error.value)
const notFound = computed(() => (error.value as any)?.data?.error?.code === 'game_not_found' || (error.value as any)?.statusCode === 404)
const loadErrorMessage = computed(() => {
  const code = (loadError.value as any)?.data?.error?.code
  if (code === 'game_not_found') return 'This game does not exist or is not yours.'
  if (code === 'creator_required' || code === 'missing_session') return 'This area needs a creator account.'
  return 'Could not load this game.'
})

/* ── error helpers ────────────────────────────────────── */
type FieldIssue = { field: string; issue: string }
const issues = ref<FieldIssue[]>([])
function issuesOf(raw: any): FieldIssue[] {
  const details = raw?.data?.error?.details ?? raw?.data?.details ?? raw?.details
  return Array.isArray(details) ? details : []
}
function messageOf(raw: any, fallback: string): string {
  return raw?.data?.error?.message ?? raw?.data?.message ?? raw?.message ?? fallback
}
function fieldError(field: string) {
  return itemIssues.value.find((issue) => issue.field === field)?.issue
    ?? issues.value.find((issue) => issue.field === field)?.issue
    ?? ''
}
function clearField(field: string) {
  issues.value = issues.value.filter((issue) => issue.field !== field)
  itemIssues.value = itemIssues.value.filter((issue) => issue.field !== field)
}

/* ── units helpers ────────────────────────────────────── */
function srvToUnits(value: string | number): string | null {
  const trimmed = String(value ?? '').trim().replace(/,/g, '')
  if (!trimmed) return null
  if (!/^\d*(\.\d*)?$/.test(trimmed)) return null
  const [whole = '', frac = ''] = trimmed.split('.')
  if (!whole && !frac) return null
  const fracPadded = (frac + '000000').slice(0, 6)
  return (BigInt(whole || '0') * SRV_UNITS + BigInt(fracPadded || '0')).toString()
}
function unitsToSrvInput(units: string | number | null | undefined): string {
  const value = Number(units ?? 0) / 1_000_000
  return value ? String(value) : ''
}

/* ── cover & media ────────────────────────────────────── */
const coverUrl = computed(() =>
  game.value?.coverArt?.url || seedAsset(`games/${game.value?.slug}-cover.png`),
)

/* ── DETAILS form ─────────────────────────────────────── */
const form = reactive({
  title: '',
  genre: 'action_rpg',
  buildType: 'web',
  blurb: '',
  description: '',
  buildUrl: '',
  tokenizationLevel: 'L0',
  coverArt: { url: '', gradient: '', emoji: '' },
})
const screenshots = ref<{ url: string; kind: 'screenshot' | 'video'; order: number }[]>([])
const shotDraft = ref('')
const saving = ref(false)
const toast = useToast()
const saveOk = ref(false)
const saveError = ref('')
const levelError = ref('')

watch(game, (value) => {
  if (!value) return
  form.title = value.title ?? ''
  form.genre = value.genre ?? 'action_rpg'
  form.buildType = value.buildType ?? 'web'
  form.blurb = value.blurb ?? ''
  form.description = value.description ?? ''
  form.buildUrl = value.buildUrl ?? ''
  form.tokenizationLevel = value.tokenizationLevel ?? 'L0'
  form.coverArt = {
    url: value.coverArt?.url ?? '',
    gradient: value.coverArt?.gradient ?? '',
    emoji: value.coverArt?.emoji ?? '',
  }
  screenshots.value = (value.media ?? [])
    .filter((m: any) => m.kind === 'screenshot')
    .map((m: any, index: number) => ({ url: m.url, kind: 'screenshot' as const, order: m.order ?? index }))
}, { immediate: true })

useHead(() => ({ title: `${game.value?.title ?? 'Game'} · Studio · Sverse` }))

/** True when the Basics form differs from what the server last returned, so Save is not a blind button. */
const detailsDirty = computed(() => {
  const saved = game.value
  if (!saved) return false
  const savedShots = (saved.media ?? [])
    .filter((m: any) => m.kind === 'screenshot')
    .map((m: any) => m.url)
  const formShots = screenshots.value.map((shot) => shot.url)
  const shotsDiffer = savedShots.length !== formShots.length || savedShots.some((url: string, i: number) => url !== formShots[i])
  return (
    form.title !== (saved.title ?? '')
    || form.genre !== (saved.genre ?? 'action_rpg')
    || form.buildType !== (saved.buildType ?? 'web')
    || form.blurb !== (saved.blurb ?? '')
    || form.description !== (saved.description ?? '')
    || form.buildUrl !== (saved.buildUrl ?? '')
    || form.tokenizationLevel !== (saved.tokenizationLevel ?? 'L0')
    || form.coverArt.url !== (saved.coverArt?.url ?? '')
    || form.coverArt.gradient !== (saved.coverArt?.gradient ?? '')
    || form.coverArt.emoji !== (saved.coverArt?.emoji ?? '')
    || shotsDiffer
  )
})

const gameLevelIndex = computed(() => levels.findIndex((level) => level.key === game.value?.tokenizationLevel))
function levelBelow(key: string) {
  const index = levels.findIndex((level) => level.key === key)
  return gameLevelIndex.value >= 0 && index < gameLevelIndex.value
}
function chooseLevel(key: string) {
  if (levelBelow(key)) return
  form.tokenizationLevel = key
  clearField('tokenizationLevel')
  levelError.value = ''
}

function addScreenshot() {
  const url = shotDraft.value.trim()
  if (!url) return
  screenshots.value.push({ url, kind: 'screenshot', order: screenshots.value.length })
  shotDraft.value = ''
}
function removeScreenshot(index: number) {
  screenshots.value.splice(index, 1)
  screenshots.value.forEach((shot, i) => { shot.order = i })
}

async function saveDetails() {
  if (saving.value) return
  saveOk.value = false
  saveError.value = ''
  issues.value = []
  /**
   * Mirror the server's `gameBody` rules (title 2–80, blurb ≤200, description ≤5000, buildUrl an
   * http(s) URL or empty) so mistakes land on the field instead of a generic failure.
   */
  const local: FieldIssue[] = []
  const title = form.title.trim()
  if (title.length < 2) local.push({ field: 'title', issue: 'Title needs at least 2 characters.' })
  else if (title.length > 80) local.push({ field: 'title', issue: 'Title must be 80 characters or fewer.' })

  if (String(form.blurb ?? '').length > 200) local.push({ field: 'blurb', issue: 'Blurb must be 200 characters or fewer.' })
  if (String(form.description ?? '').length > 5000) local.push({ field: 'description', issue: 'Description must be 5000 characters or fewer.' })

  const buildUrl = String(form.buildUrl ?? '').trim()
  if (buildUrl && !/^https?:\/\/\S+$/i.test(buildUrl)) local.push({ field: 'buildUrl', issue: 'Use a full http(s) URL, e.g. https://example.com/build.zip' })

  const coverUrl = String(form.coverArt.url ?? '').trim()
  if (coverUrl && !coverUrl.startsWith('/') && !/^https?:\/\//i.test(coverUrl)) local.push({ field: 'coverArt', issue: 'Use an http(s) URL or a /path.' })

  if (local.length) {
    issues.value = local
    saveError.value = 'Please fix the highlighted fields.'
    return
  }

  saving.value = true
  const body: Record<string, any> = {
    title,
    genre: form.genre,
    buildType: form.buildType,
    blurb: form.blurb,
    description: form.description,
    buildUrl,
    tokenizationLevel: form.tokenizationLevel,
    coverArt: { url: form.coverArt.url, gradient: form.coverArt.gradient, emoji: form.coverArt.emoji },
    media: screenshots.value.map((shot) => ({ url: shot.url, kind: shot.kind, order: shot.order })),
  }
  try {
    const saved = await api.one<any>(`/api/v1/games/${gameId.value}`, { method: 'PATCH', body })
    /**
     * Merge the server's answer into the local state instead of refetching `/manage`, which rebuilds
     * the page and makes the form flicker. `PATCH` returns the game summary (`mapGameSummary`), so
     * only the fields it actually carries are taken from it; the rest keep the values just submitted.
     */
    if (gameRes.value) {
      gameRes.value = {
        ...gameRes.value,
        id: saved?.id ?? gameRes.value.id,
        slug: saved?.slug ?? gameRes.value.slug,
        title: saved?.title ?? form.title,
        blurb: saved?.blurb ?? form.blurb,
        genre: saved?.genre ?? form.genre,
        status: saved?.status ?? gameRes.value.status,
        interopTier: saved?.interopTier ?? gameRes.value.interopTier,
        tokenizationLevel: saved?.tokenizationLevel ?? form.tokenizationLevel,
        coverArt: saved?.coverArt ?? gameRes.value.coverArt,
        // Not part of the summary — echo what was submitted so the form stays in sync with the model.
        buildType: form.buildType,
        description: form.description,
        buildUrl: form.buildUrl,
        media: screenshots.value.map((shot) => ({ url: shot.url, kind: shot.kind, order: shot.order })),
      }
      // The submitted body was trimmed; mirror that so dirty detection settles back to false.
      form.title = gameRes.value.title ?? ''
      form.buildUrl = gameRes.value.buildUrl ?? ''
    }
    saveOk.value = true
    setTimeout(() => { saveOk.value = false }, 4000)
    toast.push('Changes saved', `${form.title} was updated.`)
  } catch (raw: any) {
    issues.value = issuesOf(raw)
    const code = raw?.data?.error?.code
    if (code === 'level_downgrade_forbidden') {
      levelError.value = raw?.data?.error?.message ?? 'Ownership is not revocable'
      saveError.value = 'Please fix the highlighted field.'
    } else if (code === 'game_not_found') {
      saveError.value = 'This game no longer exists.'
    } else {
      saveError.value = issues.value.length ? 'Please fix the highlighted fields.' : messageOf(raw, 'Could not save changes.')
    }
  } finally {
    saving.value = false
  }
}

/* ── CATALOG ──────────────────────────────────────────── */
function supplyLabel(item: any) {
  const minted = Number(item.supply?.minted ?? 0)
  if (item.supply?.type === 'unlimited') return `${formatNum(minted)} / ∞`
  return `${formatNum(minted)} / ${formatNum(item.supply?.max ?? 0)}`
}
function itemStatusChip(status: string) {
  if (status === 'active') return 'chip chip--live'
  if (status === 'draft') return 'chip chip--warn'
  return 'chip'
}

const itemModal = ref(false)
const itemModalEl = ref<HTMLElement | null>(null)
const itemSaving = ref(false)
const itemError = ref('')
const itemIssues = ref<FieldIssue[]>([])
const itemForm = reactive({
  id: '',
  sku: '',
  name: '',
  description: '',
  kind: 'cosmetic',
  priceSrv: '',
  royaltyBps: '0',
  schemaId: '',
  interopTier: 'T0',
  art: { url: '', emoji: '' },
  supplyType: 'unlimited' as 'limited' | 'unlimited',
  supplyMax: '',
  traits: {} as Record<string, string>,
  minted: 0,
})
const itemSummary = computed(() => (itemForm.id ? items.value.find((item) => item.id === itemForm.id) ?? null : null))
const mintedCount = computed(() => Number(itemSummary.value?.supply?.minted ?? itemForm.minted ?? 0))
const selectedSchema = computed(() => activeSchemas.value.find((schema) => schema.schemaId === itemForm.schemaId) ?? null)

const supplyFloorError = computed(() => {
  if (itemForm.supplyType !== 'limited') return ''
  const max = Number(String(itemForm.supplyMax).replace(/[^\d]/g, ''))
  if (!max) return ''
  if (mintedCount.value && max < mintedCount.value) return `Cannot be below ${formatNum(mintedCount.value)} already minted`
  return ''
})

function resetItemForm() {
  itemForm.id = ''
  itemForm.sku = ''
  itemForm.name = ''
  itemForm.description = ''
  itemForm.kind = 'cosmetic'
  itemForm.priceSrv = ''
  itemForm.royaltyBps = '0'
  itemForm.schemaId = ''
  itemForm.interopTier = 'T0'
  itemForm.art = { url: '', emoji: '' }
  itemForm.supplyType = 'unlimited'
  itemForm.supplyMax = ''
  itemForm.traits = {}
  itemForm.minted = 0
  itemError.value = ''
  itemIssues.value = []
}

function openItemModal(item: any | null) {
  resetItemForm()
  if (item) {
    itemForm.id = item.id
    itemForm.sku = item.sku
    itemForm.name = item.name
    itemForm.description = item.description ?? ''
    itemForm.kind = item.kind ?? 'cosmetic'
    itemForm.priceSrv = unitsToSrvInput(item.priceUnits)
    itemForm.royaltyBps = String(item.royaltyBps ?? 0)
    itemForm.schemaId = item.schemaId ?? ''
    itemForm.interopTier = item.interopTier ?? 'T0'
    itemForm.art = { url: item.art?.url ?? '', emoji: item.art?.emoji ?? '' }
    itemForm.supplyType = item.supply?.type === 'limited' ? 'limited' : 'unlimited'
    itemForm.supplyMax = item.supply?.max != null ? String(item.supply.max) : ''
    itemForm.minted = Number(item.supply?.minted ?? 0)
    itemForm.traits = { ...(item.traits ?? {}) }
  }
  itemModal.value = true
}

function closeItemModal() {
  if (itemSaving.value) return
  itemModal.value = false
}

function buildItemBody(includeSku: boolean) {
  const priceUnits = srvToUnits(itemForm.priceSrv)
  const body: Record<string, any> = {
    name: itemForm.name,
    description: itemForm.description,
    kind: itemForm.kind,
    priceUnits: priceUnits ?? '0',
    royaltyBps: Number(String(itemForm.royaltyBps).replace(/[^\d]/g, '') || '0'),
    schemaId: itemForm.schemaId || null,
    interopTier: itemForm.interopTier,
    art: { url: itemForm.art.url, emoji: itemForm.art.emoji },
    traits: { ...itemForm.traits },
    supplyMax: itemForm.supplyType === 'limited' ? Number(String(itemForm.supplyMax).replace(/[^\d]/g, '')) || null : null,
  }
  if (includeSku) body.sku = itemForm.sku
  return body
}

async function saveItem() {
  if (itemSaving.value || supplyFloorError.value) return
  itemError.value = ''
  itemIssues.value = []
  /**
   * Mirror the server's `itemBody` rules before the request, so an empty name or a zero price is
   * caught on the field instead of surfacing as a generic 422.
   */
  const local: FieldIssue[] = []
  const name = itemForm.name.trim()
  if (!name) local.push({ field: 'name', issue: 'Add a name.' })
  else if (name.length > 80) local.push({ field: 'name', issue: 'Name must be 80 characters or fewer.' })

  const priceSrv = String(itemForm.priceSrv ?? '').trim().replace(/,/g, '')
  if (!priceSrv) local.push({ field: 'priceUnits', issue: 'Add a price.' })
  else if (!/^\d*(\.\d{0,6})?$/.test(priceSrv)) local.push({ field: 'priceUnits', issue: 'Use digits only, up to 6 decimals.' })
  else if (srvToUnits(priceSrv) === '0') local.push({ field: 'priceUnits', issue: 'Price must be greater than zero.' })

  if (!kindOptions.includes(itemForm.kind)) local.push({ field: 'kind', issue: 'Pick an item type.' })
  if (String(itemForm.description ?? '').length > 400) local.push({ field: 'description', issue: 'Description must be 400 characters or fewer.' })

  const royalty = Number(String(itemForm.royaltyBps).replace(/[^\d]/g, '') || '0')
  if (royalty > 2000) local.push({ field: 'royaltyBps', issue: 'Royalty cannot exceed 2000 bps (20%).' })

  if (!itemForm.id) {
    const sku = itemForm.sku.trim()
    if (!sku) local.push({ field: 'sku', issue: 'Add a SKU.' })
    else if (!/^[a-z0-9_]{2,40}$/.test(sku)) local.push({ field: 'sku', issue: 'Lowercase letters, digits and _ only (2–40).' })
  }

  const artUrl = String(itemForm.art.url ?? '').trim()
  if (artUrl && artUrl.length > 500) local.push({ field: 'art', issue: 'Art URL is too long.' })
  else if (artUrl && !artUrl.startsWith('/') && !/^https?:\/\//i.test(artUrl)) local.push({ field: 'art', issue: 'Use an http(s) URL or a /path.' })

  if (local.length) {
    itemIssues.value = local
    itemError.value = 'Please fix the highlighted fields.'
    return
  }

  itemSaving.value = true
  try {
    let result: any
    if (itemForm.id) {
      const body = buildItemBody(false)
      result = await api.one<any>(`/api/v1/items/${itemForm.id}`, {
        method: 'PATCH',
        body: {
          name: body.name,
          description: body.description,
          priceUnits: body.priceUnits,
          slot: null,
          supplyMax: body.supplyMax,
          traits: body.traits,
          art: body.art,
          status: 'active',
        },
      })
    } else {
      result = await api.one<any>(`/api/v1/games/${gameId.value}/items`, {
        method: 'POST',
        body: { ...buildItemBody(true), status: 'active' },
      })
    }
    /**
     * Patch the created/updated row straight into the list rather than refetching `/manage` — the
     * modal closes onto the catalog tab and a full refresh there is a visible reload.
     */
    const list = gameRes.value?.items
    if (Array.isArray(list) && result?.id) {
      const index = list.findIndex((entry: any) => entry.id === result.id)
      if (index >= 0) list.splice(index, 1, result)
      else list.push(result)
    } else {
      await refreshGame()
    }
    itemModal.value = false
    toast.push(itemForm.id ? 'Item updated' : 'Item created', result?.name ?? '')
  } catch (raw: any) {
    itemIssues.value = issuesOf(raw)
    itemError.value = itemIssues.value.length ? 'Please fix the highlighted fields.' : messageOf(raw, 'Could not save the item.')
  } finally {
    itemSaving.value = false
  }
}

/* ── archive ──────────────────────────────────────────── */
const archiveTarget = ref<any | null>(null)
const archivePending = ref(false)
const archiveError = ref('')
const archiveModalEl = ref<HTMLElement | null>(null)

function askArchive(item: any) {
  if (!item) return
  archiveModalEl.value = null
  archiveTarget.value = item
  archiveError.value = ''
}
function closeArchive() {
  if (archivePending.value) return
  archiveTarget.value = null
}
async function confirmArchive() {
  const item = archiveTarget.value
  if (!item || archivePending.value) return
  archivePending.value = true
  archiveError.value = ''
  try {
    await api.one(`/api/v1/items/${item.id}/archive`, { method: 'POST' })
    await refreshGame()
    archiveTarget.value = null
    itemModal.value = false
    toast.push('Item archived', `${item.name} stops selling; owners keep what they have.`, '📦')
  } catch (raw: any) {
    archiveError.value = messageOf(raw, 'Could not archive that item.')
  } finally {
    archivePending.value = false
  }
}

/* ── CSV import ───────────────────────────────────────── */
const csvModal = ref(false)
const csvModalEl = ref<HTMLElement | null>(null)
const csvText = ref('')
const csvBusy = ref(false)
const csvParseError = ref('')
const csvResults = ref<{ created: number; failed: number; failures: { index: number; error: string }[] } | null>(null)

type CsvRow = {
  sku: string
  name: string
  kind: string
  priceSrv: string
  priceUnits: string
  royaltyBps: string
  interopTier: string
  schemaId: string
  supplyMax: string
}
const csvRows = computed<CsvRow[]>(() => {
  const text = csvText.value.trim()
  if (!text) return []
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (!lines.length) return []
  const header = (lines[0] ?? '').toLowerCase()
  const hasHeader = header.includes('sku') && header.includes('name')
  const source = hasHeader ? lines.slice(1) : lines
  return source.map((line): CsvRow => {
    const cells = line.split(',').map((cell) => cell.trim())
    const priceSrv = cells[4] ?? ''
    return {
      sku: cells[0] ?? '',
      name: cells[1] ?? '',
      kind: cells[3] || 'cosmetic',
      priceSrv,
      priceUnits: srvToUnits(priceSrv) ?? '0',
      royaltyBps: cells[5] ?? '0',
      interopTier: cells[6] ?? 'T0',
      schemaId: cells[7] ?? '',
      supplyMax: cells[8] ?? '',
    }
  })
})
const csvPreviewRows = computed<CsvRow[]>(() => csvRows.value.slice(0, 8))

function openCsvModal() {
  csvText.value = ''
  csvParseError.value = ''
  csvResults.value = null
  csvModal.value = true
}
function closeCsvModal() {
  if (csvBusy.value) return
  csvModal.value = false
}
function onCsvFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { csvText.value = String(reader.result ?? '') }
  reader.onerror = () => { csvParseError.value = 'Could not read that file.' }
  reader.readAsText(file)
}
async function runCsvImport() {
  if (csvBusy.value || !csvRows.value.length) return
  csvBusy.value = true
  csvParseError.value = ''
  csvResults.value = null
  const payload = csvRows.value.map((row) => ({
    sku: row.sku,
    name: row.name,
    description: '',
    kind: row.kind || 'cosmetic',
    priceUnits: row.priceUnits,
    schemaId: row.schemaId || null,
    interopTier: row.interopTier || 'T0',
    tokenizationLevel: form.tokenizationLevel,
    slot: null,
    supplyMax: row.supplyMax ? Number(String(row.supplyMax).replace(/[^\d]/g, '')) || null : null,
    traits: {},
    transferable: true,
    stackable: false,
    royaltyBps: Number(String(row.royaltyBps).replace(/[^\d]/g, '') || '0'),
    art: { url: '', emoji: '' },
    status: 'active',
  }))
  try {
    const result = await api.one<any>(`/api/v1/games/${gameId.value}/items/bulk`, { method: 'POST', body: { items: payload } })
    const failures = (result?.results ?? [])
      .map((entry: any, index: number) => ({ index: entry.index ?? index, ok: entry.ok, error: entry.error?.message ?? entry.error?.code ?? 'failed' }))
      .filter((entry: any) => !entry.ok)
      .map((entry: any) => ({ index: entry.index, error: entry.error }))
    csvResults.value = { created: result?.created ?? 0, failed: result?.failed ?? failures.length, failures }
    await refreshGame()
    toast.push('CSV import finished', `${csvResults.value.created} created, ${csvResults.value.failed} failed.`, csvResults.value.failed ? '⚠️' : '✓')
  } catch (raw: any) {
    csvParseError.value = messageOf(raw, 'The bulk import failed. Check the rows and try again.')
  } finally {
    csvBusy.value = false
  }
}

/* ── INTEROP envelope ─────────────────────────────────── */
const acceptModal = ref(false)
const acceptModalEl = ref<HTMLElement | null>(null)
const acceptError = ref('')
const acceptDraft = reactive({ schemaId: '', tierMax: 'T2', clampPolicy: 'reject' as 'reject' | 'clamp', powerMin: '1', powerMax: '5' })

const envelopeForm = reactive<{
  acceptsTierMax: string
  accepts: any[]
  licenseRequirement: string
  feeSrv: string
  hostSharePct: string
  clampPolicy: 'reject' | 'clamp'
}>({
  acceptsTierMax: 'T2',
  accepts: [],
  licenseRequirement: 'display_only',
  feeSrv: '',
  hostSharePct: '50',
  clampPolicy: 'reject',
})

watch(game, (value) => {
  const envelope = value?.envelope
  if (!envelope) {
    envelopeForm.acceptsTierMax = 'T2'
    envelopeForm.accepts = []
    envelopeForm.licenseRequirement = 'display_only'
    envelopeForm.feeSrv = ''
    envelopeForm.hostSharePct = '50'
    envelopeForm.clampPolicy = 'reject'
    return
  }
  envelopeForm.acceptsTierMax = envelope.acceptsTierMax ?? 'T2'
  envelopeForm.accepts = (envelope.accepts ?? []).map((entry: any) => ({ ...entry, powerTierRange: [...(entry.powerTierRange ?? [])], mapping: { ...(entry.mapping ?? {}) } }))
  envelopeForm.licenseRequirement = envelope.licenseRequirement ?? 'display_only'
  envelopeForm.feeSrv = unitsToSrvInput(envelope.feeUnits)
  envelopeForm.hostSharePct = String(envelope.hostSharePct ?? 50)
  envelopeForm.clampPolicy = envelope.clampPolicy === 'clamp' ? 'clamp' : 'reject'
}, { immediate: true })

const savingEnvelope = ref(false)
const envelopeError = ref('')
const envelopeOk = ref(false)

function powerRangeLabel(entry: any) {
  const range = entry?.powerTierRange
  if (!range || range.length < 2) return 'n/a'
  return `${range[0]} – ${range[1]}`
}
function mappingSummary(entry: any) {
  const mapping = entry.mapping ?? {}
  const keys = Object.keys(mapping)
  if (!keys.length) return 'visual passthrough'
  return keys
    .map((key) => {
      const rule = mapping[key]
      if (rule?.passthrough) return `${key} passthrough`
      if (rule?.from && rule?.curve) {
        const outRange = rule.outRange as number[] | undefined
        const out = outRange && outRange.length >= 2 ? ` → ${outRange[0]}–${outRange[1]}` : ''
        return `${key} ← ${rule.from} · ${rule.curve}${out}`
      }
      if (rule?.from) return `${key} ← ${rule.from}`
      return `${key} passthrough`
    })
    .join('<br>')
}

function openAcceptModal() {
  acceptDraft.schemaId = ''
  acceptDraft.tierMax = envelopeForm.acceptsTierMax || 'T2'
  acceptDraft.clampPolicy = envelopeForm.clampPolicy
  acceptDraft.powerMin = '1'
  acceptDraft.powerMax = '5'
  acceptError.value = ''
  acceptModal.value = true
}
function closeAcceptModal() { acceptModal.value = false }
function confirmAccept() {
  if (!acceptDraft.schemaId) { acceptError.value = 'Select a schema to accept.'; return }
  if (envelopeForm.accepts.some((entry) => entry.schemaId === acceptDraft.schemaId)) {
    acceptError.value = 'That schema is already accepted.'
    return
  }
  envelopeForm.accepts.push({
    schemaId: acceptDraft.schemaId,
    tierMax: acceptDraft.tierMax,
    powerTierRange: [Number(acceptDraft.powerMin) || 1, Number(acceptDraft.powerMax) || 1],
    mapping: {},
    clampPolicy: acceptDraft.clampPolicy,
  })
  acceptModal.value = false
}
function removeAccept(index: number) {
  envelopeForm.accepts.splice(index, 1)
}

async function saveEnvelope() {
  if (savingEnvelope.value) return
  savingEnvelope.value = true
  envelopeOk.value = false
  envelopeError.value = ''
  issues.value = []
  const body = {
    acceptsTierMax: envelopeForm.acceptsTierMax,
    accepts: envelopeForm.accepts.map((entry) => ({
      schemaId: entry.schemaId,
      tierMax: entry.tierMax,
      powerTierRange: entry.powerTierRange,
      mapping: entry.mapping ?? {},
      clampPolicy: entry.clampPolicy ?? envelopeForm.clampPolicy,
    })),
    licenseRequirement: envelopeForm.licenseRequirement,
    feeUnits: srvToUnits(envelopeForm.feeSrv) ?? '0',
    hostSharePct: Number(String(envelopeForm.hostSharePct).replace(/[^\d]/g, '') || '0'),
  }
  try {
    await api.one(`/api/v1/games/${gameId.value}/envelope`, { method: 'PUT', body })
    await refreshGame()
    envelopeOk.value = true
    toast.push('Interop envelope saved', 'Accepted schemas and mappings are updated.')
  } catch (raw: any) {
    issues.value = issuesOf(raw)
    envelopeError.value = issues.value.length ? 'Please fix the highlighted fields.' : messageOf(raw, 'Could not save the envelope.')
  } finally {
    savingEnvelope.value = false
  }
}

/* ── preview mapping ──────────────────────────────────── */
const previewEntry = ref<any | null>(null)
const previewModalEl = ref<HTMLElement | null>(null)
const previewEntryPowerLabel = computed(() => powerRangeLabel(previewEntry.value ?? {}))

function openPreview(entry: any) { previewEntry.value = entry }
function closePreview() { previewEntry.value = null }

const previewIncoming = computed<{ key: string; value: string }[]>(() => {
  const entry = previewEntry.value
  if (!entry) return []
  const fields = selectedSchemaFor(entry.schemaId)?.fields ?? []
  const rows = fields.slice(0, 3).map((field: any, index: number) => ({
    key: field.name,
    value: field.type === 'int' ? String((field.max ?? 5) + index) : 'legendary',
  }))
  if (!rows.length) {
    return [
      { key: 'power_tier', value: '5' },
      { key: 'rarity', value: 'legendary' },
      { key: 'raw damage', value: '910' },
    ]
  }
  return rows
})
const previewMapped = computed<{ key: string; value: string }[]>(() => {
  const entry = previewEntry.value
  if (!entry) return []
  const range = (entry.powerTierRange ?? [1, 5]) as number[]
  const ceiling = range[1] ?? 5
  const incoming = previewIncoming.value
  return incoming.map((row: { key: string; value: string }, index: number) => {
    if (index === 0) return { key: row.key, value: String(ceiling) }
    if (index === 1) return { key: 'rarity', value: row.value }
    return { key: 'damage', value: String(ceiling * 16 || 80) }
  })
})
function selectedSchemaFor(schemaId: string) {
  return activeSchemas.value.find((schema) => schema.schemaId === schemaId) ?? null
}

/* ── ANALYTICS ────────────────────────────────────────── */
const gameStats = computed((): { revenueUnits: string; dau: number; playersLive: number; conversion: number; avgSessionMinutes: number | null } => {
  const slice = (analyticsRes.value?.games ?? []).find((row: any) => row.id === gameId.value || row.slug === game.value?.slug)
  const stats = slice?.stats ?? {}
  const revenueUnits = slice?.revenueUnits ?? analyticsRes.value?.revenueUnits ?? '0'
  const dau = stats.dau ?? analyticsRes.value?.dau ?? 0
  const playtimeMinutes = slice?.playtimeMinutes ?? analyticsRes.value?.playtimeMinutes ?? 0
  const conversion = slice?.conversion ?? analyticsRes.value?.conversion ?? 0
  return {
    revenueUnits,
    dau,
    playersLive: game.value?.stats?.playersLive ?? 0,
    conversion,
    // Playtime is only meaningful once the telemetry rollup has produced minutes. Rendering 0
    // would read as a real measurement, so the tile is absent until data exists.
    avgSessionMinutes: playtimeMinutes > 0 && dau ? Math.round(playtimeMinutes / dau) : null,
  }
})

const chartColumns = computed(() => {
  const slice = (analyticsRes.value?.games ?? []).find((row: any) => row.id === gameId.value || row.slug === game.value?.slug)
  const series = slice?.playSeries ?? analyticsRes.value?.playSeries ?? []
  if (!series.length) return []
  const values = series.map((row: any) => Number(row.players ?? row.value ?? 0))
  const max = Math.max(...values, 1)
  const step = Math.max(1, Math.ceil(series.length / 12))
  return series.map((row: any, index: number) => {
    const value = values[index] ?? 0
    return {
      value: value.toLocaleString(),
      pct: Math.max(2, Math.round((value / max) * 100)),
      label: index % step === 0 ? String(row.date ?? '').slice(5) : '',
    }
  })
})

/* ── modals: escape + focus trap ──────────────────────── */
function anyModalOpen() {
  return itemModal.value || csvModal.value || !!archiveTarget.value || acceptModal.value || !!previewEntry.value
}
const activeModalEl = computed<HTMLElement | null>(() => {
  if (previewEntry.value) return previewModalEl.value
  if (acceptModal.value) return acceptModalEl.value
  if (archiveTarget.value) return archiveModalEl.value
  if (csvModal.value) return csvModalEl.value
  if (itemModal.value) return itemModalEl.value
  return null
})

function closeActiveModal() {
  if (itemModal.value) closeItemModal()
  else if (csvModal.value) closeCsvModal()
  else if (archiveTarget.value) closeArchive()
  else if (acceptModal.value) closeAcceptModal()
  else if (previewEntry.value) closePreview()
}

function onKeydown(event: KeyboardEvent) {
  if (!anyModalOpen()) return
  if (event.key === 'Escape') {
    event.preventDefault()
    closeActiveModal()
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

const modalOpenWatch = computed(() => anyModalOpen())
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
</script>

<style scoped>
/* header */
.crumbs { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; margin-bottom: 16px; flex-wrap: wrap; }
.crumbs a:hover { color: var(--text); }

.ghead { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.ghead__art { width: 96px; height: 60px; border-radius: var(--r-sm); object-fit: cover; border: 1px solid var(--border); flex-shrink: 0; }
.ghead__meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 8px; }

/* details */
.dgrid { display: grid; grid-template-columns: 1fr 420px; gap: 30px; align-items: start; }

.blurb-warn { color: var(--amber); }

.savebar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--border);
}

.cover { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border-radius: var(--r-md); border: 1px solid var(--border); }

.drop {
  display: block; width: 100%; margin-top: 12px; text-align: center;
  border: 1px dashed var(--border-2); border-radius: var(--r-md);
  padding: 16px; color: var(--text-dim); font-size: 0.85rem;
  background: var(--surface); cursor: pointer;
  transition: border-color 0.18s, color 0.18s;
}
.drop:hover:not(:disabled) { border-color: var(--pink); color: var(--text); }
.drop:disabled { opacity: 0.5; cursor: not-allowed; }

.mediarow { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
.mediarow figure { position: relative; width: 128px; margin: 0; }
.mediarow img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: var(--r-sm); border: 1px solid var(--border); }
.mediax {
  position: absolute; top: -6px; right: -6px; width: 22px; height: 22px; border-radius: 50%;
  background: var(--panel); border: 1px solid var(--border-2); font-size: 0.7rem; color: var(--text-dim);
  display: grid; place-items: center;
}
.mediax:hover { color: var(--text); border-color: var(--pink); }

.inlineacts { display: flex; gap: 8px; margin-top: 10px; }

.lvlpick { display: grid; gap: 9px; }
.lvl {
  display: flex; align-items: flex-start; gap: 13px; padding: 12px 15px; width: 100%; text-align: left;
  border-radius: 11px; background: var(--surface); border: 1px solid var(--border); cursor: pointer;
  color: var(--text); font: inherit; letter-spacing: normal;
}
.lvl:hover:not(.off) { border-color: var(--border-2); }
.lvl.on { border-color: var(--pink); background: rgba(233, 53, 193, 0.08); }
.lvl.off { opacity: 0.4; cursor: not-allowed; }
.lvl__k { flex: 0 0 auto; font-family: var(--mono); font-weight: 700; width: 28px; line-height: 1.6; }
.lvl__b { flex: 1 1 auto; min-width: 0; display: block; }
.lvl__t { font-size: 0.87rem; font-weight: 600; display: block; line-height: 1.45; }
.lvl__d { font-size: 0.78rem; color: var(--text-dim); display: block; line-height: 1.45; overflow-wrap: anywhere; }
.lvl__mark { flex: 0 0 auto; display: block; line-height: 1.6; }

/* catalog */
.shead { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
.shead__act { display: flex; gap: 9px; }
.irow { display: flex; align-items: center; gap: 10px; }
.irow img { width: 34px; height: 34px; border-radius: 7px; object-fit: cover; border: 1px solid var(--border); }
.schema { font-size: 0.74rem; }
.rowacts { display: flex; gap: 8px; justify-content: flex-end; }
tr.archived { opacity: 0.5; }

/* interop */
.envlist { margin-top: 16px; }
.envrow { display: grid; grid-template-columns: 1.4fr 0.7fr 0.9fr 1.4fr auto; gap: 10px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border); }
.envrow:last-child { border-bottom: none; }
.envorow { border-bottom: 1px solid var(--border-2) !important; }
.envrow select { padding: 7px 10px; border-radius: 8px; background: var(--surface); border: 1px solid var(--border); color: var(--text); font-size: 0.8rem; }
.envrow select:focus { outline: none; border-color: var(--pink); }
.scel { word-break: break-all; }

.picks { display: grid; gap: 10px; }
.pick { position: relative; }
.pick__cb { position: absolute; opacity: 0; width: 0; height: 0; }

.envfoot { margin-top: 18px; display: flex; justify-content: flex-end; }

/* item modal */
.itemtop { display: flex; gap: 16px; margin-bottom: 18px; }
.itemart { width: 96px; height: 96px; border-radius: var(--r-md); object-fit: cover; border: 1px solid var(--border); flex-shrink: 0; }

/* csv modal */
.csvpreview { margin-top: 4px; }
.csvsum { display: flex; gap: 8px; margin-bottom: 12px; }
.csvfail .fk { color: var(--red); font-weight: 500; text-align: right; }

/* responsive */
@media (max-width: 1400px) {
  .dgrid { grid-template-columns: 1fr 360px; }
}
@media (max-width: 1024px) {
  .dgrid { grid-template-columns: 1fr; }
}
@media (max-width: 900px) {
  .envrow { grid-template-columns: 1fr; gap: 6px; }
  .envorow { display: none; }
  .rowacts { justify-content: flex-start; }
}
@media (max-width: 768px) {
  .shead { flex-direction: column; align-items: flex-start; }
  .itemtop { flex-direction: column; }
  .itemart { width: 100%; height: 160px; }
}
@media (max-width: 375px) {
  .ghead__art { width: 100%; height: 150px; }
  .shead__act { width: 100%; flex-direction: column; }
  .shead__act .btn { width: 100%; }
  .cover { aspect-ratio: 4 / 3; }
}
</style>
