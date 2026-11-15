<template>
  <StudioShell wide>
    <StudioAccess v-if="error" :error="error" />

    <template v-else-if="pending">
      <div class="phead">
        <div class="sk" style="height:12px;width:110px"></div>
        <div class="sk" style="height:30px;width:240px;margin-top:10px"></div>
        <div class="sk" style="height:14px;width:520px;max-width:100%;margin-top:10px"></div>
      </div>
      <div class="sk" style="height:40px;width:640px;max-width:100%;margin-bottom:26px;border-radius:var(--r-md)"></div>
      <div class="card card--pad"><div class="sk" style="height:340px"></div></div>
    </template>

    <template v-else-if="studio">
      <div class="wrap" :class="{ 'wrap--wide': currentStep === 3 && job?.mode === 'ai' }">
        <div class="phead">
          <p class="eyebrow">Sverse Build</p>
          <h1>Publish a game</h1>
          <p>No business entity, no KYB, no platform review queue. Target: under 30 minutes from finished build to live storefront.</p>
        </div>

        <ol class="steps" aria-label="Publish progress">
          <li
            v-for="(label, index) in STEP_LABELS"
            :key="label"
            :class="['step', { done: currentStep > index + 1, now: currentStep === index + 1 }]"
            :aria-current="currentStep === index + 1 ? 'step' : undefined"
          >
            <span class="step__n">{{ currentStep > index + 1 ? '✓' : index + 1 }}</span>{{ label }}
            <span v-if="index < STEP_LABELS.length - 1" class="step__line" aria-hidden="true"></span>
          </li>
        </ol>

        <!-- ══ STEP 1 · Studio & game ══ -->
        <section v-if="currentStep === 1" aria-labelledby="s1-h">
          <h2 id="s1-h" class="sr-only">Step 1 · Studio and game</h2>

          <div class="note" style="margin-bottom:18px">
            <span class="note__i" aria-hidden="true">🪪</span>
            <div>Publishing as <b>@{{ studio.handle }}</b>. Your Studio Vault receives {{ 100 - (studio.feeBps ?? 1000) / 100 }}% of every sale instantly. No entity, no KYB at this tier.</div>
          </div>

          <div class="tabs" role="tablist" aria-label="Game source">
            <button type="button" role="tab" :aria-selected="source === 'existing'" :class="{ on: source === 'existing' }" @click="source = 'existing'">Existing game</button>
            <button type="button" role="tab" :aria-selected="source === 'new'" :class="{ on: source === 'new' }" @click="source = 'new'">New game</button>
          </div>

          <template v-if="source === 'existing'">
            <p v-if="!games.length" class="t-small dim">No publishable games yet. Switch to <b>New game</b> to create one.</p>
            <div v-else class="picks" role="radiogroup" aria-label="Choose a game">
              <label v-for="entry in games" :key="entry.id" class="pick" :class="{ on: selectedGameId === entry.id }">
                <span class="pick__r"></span>
                <input v-model="selectedGameId" class="pick__cb" type="radio" :value="entry.id">
                <span>
                  <span class="pick__t">{{ entry.title }} <span class="chip chip--lvl">{{ entry.tokenizationLevel ?? 'L2' }}</span></span>
                  <span class="pick__d">{{ statusLabel(entry.status) }} · {{ genreLabel(entry.genre) }}<template v-if="entry.blockedReason"> · blocked: {{ entry.blockedReason }}</template></span>
                </span>
              </label>
            </div>

            <div v-if="selectedGame?.status === 'live'" class="note note--warn t-small" style="margin:14px 0">
              <span class="note__i">◔</span>
              <div>This game is already live. A new publish run starts from its current catalog.</div>
            </div>

            <div class="formacts" style="margin-top:18px">
              <button class="btn btn--grad" type="button" :disabled="!selectedGameId" @click="startRun">
                Continue with this game →
              </button>
            </div>
          </template>

          <template v-else>
            <div class="card card--pad">
              <div class="field" :class="{ bad: formError('title') }">
                <label for="pg-title">Game title</label>
                <input id="pg-title" v-model.trim="form.title" maxlength="80" placeholder="Emberloop">
                <p v-if="formError('title')" class="field__err">{{ formError('title') }}</p>
              </div>
              <div class="f2">
                <div class="field">
                  <label>Studio handle <span class="dim">· from your S-Passport</span></label>
                  <input :value="`@${studio.handle}`" disabled>
                </div>
                <div class="field">
                  <label id="pg-genre-label">Genre</label>
                  <AppSelect v-model="form.genre" :options="genres" aria-label="Genre" block />
                </div>
              </div>
              <div class="field">
                <label for="pg-blurb">One line about it</label>
                <input id="pg-blurb" v-model.trim="form.blurb" maxlength="140" placeholder="A deckbuilder where every card you burn stays burned.">
              </div>

              <!-- Collect the two things review needs before the game can go live, while the creator
                   is already thinking about the game rather than after they hit Publish. -->
              <div class="f2">
                <div class="field" :class="{ bad: formError('buildUrl') }">
                  <label for="pg-build">Build URL <span class="dim">· required to publish</span></label>
                  <input id="pg-build" v-model.trim="form.buildUrl" type="url" placeholder="https://…/build.zip" @input="clearField('buildUrl')">
                  <p v-if="formError('buildUrl')" class="field__err">{{ formError('buildUrl') }}</p>
                  <p v-else class="field__hint">Review scans this link before the game goes live.</p>
                </div>
                <div class="field" :class="{ bad: formError('coverArt') }">
                  <label for="pg-cover">Cover image URL <span class="dim">· required</span></label>
                  <input id="pg-cover" v-model.trim="form.coverUrl" type="url" placeholder="https://…/cover.png" @input="clearField('coverArt')">
                  <p v-if="formError('coverArt')" class="field__err">{{ formError('coverArt') }}</p>
                  <p v-else-if="!form.coverUrl.trim()" class="field__hint">The store needs a cover image — this is what players see first.</p>
                  <p v-else class="field__hint">A wide image, 1280×800 or larger.</p>
                </div>
              </div>

              <div v-if="form.coverUrl" class="coverpreview">
                <img :src="form.coverUrl" alt="Cover preview">
              </div>
            </div>

            <div v-if="createError" class="note note--bad" style="margin-top:14px">
              <span class="note__i">⚠️</span>
              <div><b>Could not create the game.</b> {{ createError }}</div>
            </div>

            <div class="formacts" style="margin-top:18px">
              <button class="btn btn--ghost" type="button" @click="source = 'existing'">← Back</button>
              <button class="btn btn--grad" type="button" :disabled="creating || !canCreate" @click="createGame">
                {{ creating ? 'Creating…' : 'Create game →' }}
              </button>
            </div>
          </template>
        </section>

        <!-- ══ STEP 2 · Integration ══ -->
        <section v-else-if="currentStep === 2" aria-labelledby="s2-h">
          <h2 id="s2-h" class="sr-only">Step 2 · Integration</h2>
          <p class="dim" style="margin-bottom:14px">How do you want to wire up payments for <b>{{ gameTitle }}</b>?</p>

          <div class="picks" role="radiogroup" aria-label="Integration mode">
            <label class="pick" :class="{ on: form.mode === 'ai' }">
              <span class="pick__r"></span>
              <input v-model="form.mode" class="pick__cb" type="radio" value="ai">
              <span>
                <span class="pick__t">Let my AI do it <span class="chip chip--t2">RECOMMENDED</span></span>
                <span class="pick__d">
                  Run the Sverse MCP server in whatever assistant you already use. It scans your project,
                  proposes a catalog and runs each step. This page shows progress and asks you to approve the
                  catalog.
                </span>
                <span v-if="form.mode === 'ai'" class="mcpneed">
                  Need an API key?
                  <NuxtLink to="/studio/settings?tab=keys" class="mcpneed__a">Create one here →</NuxtLink>
                  <span class="dim"> (scopes <span class="t-mono">publish</span> + <span class="t-mono">read</span>; the key screen also gives you a paste-ready agent config)</span>
                </span>
              </span>
            </label>
            <label class="pick" :class="{ on: form.mode === 'manual' }">
              <span class="pick__r"></span>
              <input v-model="form.mode" class="pick__cb" type="radio" value="manual">
              <span>
                <span class="pick__t">Do it manually</span>
                <span class="pick__d">No agent. Define the catalog here and publish through the same state machine.</span>
              </span>
            </label>
          </div>

          <p class="sect">Tokenization level</p>
          <div class="lvlsel">
            <label v-for="level in levels" :key="level.value" class="lvl" :class="{ on: form.level === level.value }">
              <input v-model="form.level" class="lvl__cb" type="radio" :value="level.value">
              <span class="lvl__k">{{ level.value }}</span>
              <span style="flex:1">
                <b style="font-size:.87rem">{{ level.title }} <span v-if="level.value === 'L2'" class="chip chip--t2">DEFAULT</span></b>
                <span class="t-small dim" style="display:block">{{ level.desc }}</span>
              </span>
            </label>
          </div>
          <p class="t-small dim" style="margin-top:12px">A dial, not a door. Moving up later is a config change — but it is one-way, because player ownership must not be revocable.</p>

          <div v-if="startError" class="note note--bad" style="margin-top:16px">
            <span class="note__i">⚠️</span>
            <div>{{ startError }}</div>
          </div>

          <div class="formacts" style="margin-top:20px">
            <button class="btn btn--ghost" type="button" :disabled="starting" @click="currentStep = 1">← Back</button>
            <button class="btn btn--grad" type="button" :disabled="starting" @click="applyIntegration">
              {{ starting ? 'Saving…' : 'Continue →' }}
            </button>
          </div>
        </section>

        <!-- ══ STEP 3 · Catalog ══ -->
        <section v-else-if="currentStep === 3" aria-labelledby="s3-h">
          <h2 id="s3-h" class="sr-only">Step 3 · Catalog</h2>

          <!--
            The pipeline is progress, not a setup step: it stays visible for the whole run. The prompt is
            only useful before approval, so it drops out once the catalogue is approved.
          -->
          <div v-if="job.mode === 'ai'" class="agentgrid">
            <div class="card card--pad">
              <p class="sect" style="margin-top:0">Pipeline</p>
              <div class="rows">
                <div v-for="entry in job.steps" :key="entry.step">
                  <span>{{ stepTitle(entry.step) }}</span>
                  <strong :class="entry.status === 'failed' ? 'is-bad' : ''">{{ stepStatusLabel(entry) }}</strong>
                </div>
              </div>
              <p class="t-small dim" style="margin-top:14px">
                Run <span class="t-mono">{{ job.id }}</span>
              </p>
            </div>

            <div class="agentprompt">
              <div class="agentprompt__h">
                <div>
                  <p class="t-h3" style="font-size:.95rem">
                    {{ job.catalogApproved ? 'Paste this to continue' : 'Paste this into your agent' }}
                  </p>
                  <p class="t-small dim" style="margin-top:3px">
                    {{ job.catalogApproved
                      ? 'The catalogue is approved — this tells the model what to do next.'
                      : 'It names the job and the stopping point, so the model does not have to guess.' }}
                  </p>
                </div>
                <button class="btn btn--ghost btn--sm" type="button" @click="copyAgentPrompt">
                  {{ copiedPrompt ? 'Copied' : 'Copy' }}
                </button>
              </div>
              <pre class="configblk">{{ agentPrompt }}</pre>
              <p class="t-small dim" style="margin-top:10px">
                Need a key first? <NuxtLink to="/studio/settings?tab=keys" class="mcpneed__a">Create one →</NuxtLink>
              </p>
            </div>
          </div>

          <p class="sect">Catalog · {{ draftRows.length }} item{{ draftRows.length === 1 ? '' : 's' }}</p>
          <div class="grid" style="gap:12px">
            <div
              v-for="(row, index) in draftRows"
              :key="row.uid"
              class="crow"
              :class="{
                'crow--edit': job.mode === 'manual' && !job.catalogApproved,
                'crow--bad': rowIssues[row.uid],
              }"
            >
              <div class="crow__av">
                <img v-if="row.artUrl && !row.artBroken" :src="row.artUrl" :alt="row.name || 'Item art'" @error="row.artBroken = true">
                <span v-else>{{ row.emoji || '📦' }}</span>
              </div>

              <div class="crow__main">
                <div class="crow__top">
                  <div class="crow__field crow__field--name">
                    <span v-if="job.mode === 'manual' && !job.catalogApproved" class="crow__lbl">Item name</span>
                    <input
                      v-model.trim="row.name"
                      class="crow__name"
                      :class="{ bad: rowErrorFor(row.uid, 'name') }"
                      maxlength="80"
                      placeholder="e.g. Starter Pack, Crimson Blade…"
                      :disabled="approving || job.catalogApproved || job.mode === 'ai'"
                      :aria-invalid="Boolean(rowErrorFor(row.uid, 'name'))"
                      aria-label="Item name"
                      @input="clearRowIssue(row.uid, 'name')"
                    >
                    <p v-if="rowErrorFor(row.uid, 'name')" class="crow__err">{{ rowErrorFor(row.uid, 'name') }}</p>
                  </div>

                  <div v-if="job.mode === 'manual'" class="crow__field crow__field--kind">
                    <span v-if="!job.catalogApproved" class="crow__lbl">Type</span>
                    <AppSelect
                      v-model="row.kind"
                      :options="ITEM_KINDS"
                      size="sm"
                      block
                      :disabled="approving || job.catalogApproved"
                      aria-label="Item type"
                    />
                  </div>

                  <div class="crow__field crow__field--price">
                    <span v-if="job.mode === 'manual' && !job.catalogApproved" class="crow__lbl">Price</span>
                    <div class="crow__p" :class="{ bad: rowErrorFor(row.uid, 'price'), 'is-readonly': job.catalogApproved || job.mode === 'ai' }">
                      <input
                        v-model="row.price"
                        type="text"
                        inputmode="decimal"
                        placeholder="0.00"
                        :class="{ bad: rowErrorFor(row.uid, 'price') }"
                        :aria-invalid="Boolean(rowErrorFor(row.uid, 'price'))"
                        aria-label="Price in SRV"
                        :disabled="job.catalogApproved || job.mode === 'ai'"
                        @input="clearRowIssue(row.uid, 'price')"
                      >
                      <span class="crow__unit">SRV</span>
                    </div>
                    <p v-if="rowErrorFor(row.uid, 'price')" class="crow__err crow__err--right">{{ rowErrorFor(row.uid, 'price') }}</p>
                  </div>

                  <button
                    v-if="job.mode === 'manual' && !job.catalogApproved"
                    class="crow__del"
                    type="button"
                    :disabled="approving"
                    title="Remove item"
                    aria-label="Remove item"
                    @click="removeRow(index)"
                  >✕</button>
                </div>

                <div v-if="job.mode === 'manual' && !job.catalogApproved" class="crow__bottom">
                  <div class="crow__art">
                    <input
                      v-model.trim="row.artUrl"
                      type="url"
                      class="crow__artinput"
                      placeholder="Image URL (optional) — https://…/item.png"
                      :class="{ bad: rowErrorFor(row.uid, 'art') }"
                      :aria-invalid="Boolean(rowErrorFor(row.uid, 'art'))"
                      aria-label="Item image URL"
                      :disabled="approving"
                      @input="row.artBroken = false; clearRowIssue(row.uid, 'art')"
                    >
                    <p v-if="rowErrorFor(row.uid, 'art')" class="crow__err">{{ rowErrorFor(row.uid, 'art') }}</p>
                  </div>
                  <span v-if="kindHint(row.kind)" class="crow__hint">{{ kindHint(row.kind) }}</span>
                </div>

                <p v-else class="crow__d">
                  <template v-if="job.mode === 'manual'">
                    <span class="crow__hint">{{ kindHint(row.kind) }}</span>
                  </template>
                  <template v-else>
                    <span v-if="row.schemaId">{{ row.schemaId }} · </span><span>{{ row.interopTier }}</span>
                    <span v-if="row.slot"> · slot {{ row.slot }}</span>
                    <span v-if="row.kind"> · {{ row.kind }}</span>
                  </template>
                </p>
              </div>
            </div>

            <div v-if="!draftRows.length" class="catalogempty">
              <p class="t-small dim" style="margin:0">
                <template v-if="job.mode === 'manual'">
                  No items yet. Add what this game sells — a starter bundle, a season pass, a cosmetic.
                </template>
                <template v-else>
                  Nothing proposed yet. Your agent will fill this in.
                </template>
              </p>
            </div>

            <!-- Only manual runs write the catalogue by hand; AI runs take the agent's proposal as-is. -->
            <button v-if="job.mode === 'manual' && !job.catalogApproved" class="drop" type="button" :disabled="approving" @click="addRow">
              ＋ Add an item
            </button>
          </div>

          <div v-if="rowError" class="note note--bad" style="margin-top:14px">
            <span class="note__i">⚠️</span>
            <div>{{ rowError }}</div>
          </div>

          <div v-if="draftRows.length && !job.catalogApproved" class="note" style="margin-top:16px">
            <span class="note__i">🌐</span>
            <div>Approving maps every item onto a shared schema, so it stays usable across other Sverse games.</div>
          </div>

          <!-- What actually exists for this game, whether this run created it or an earlier one did. -->
          <template v-if="liveItems.length">
            <p class="sect" style="margin-top:24px">Items in this game · {{ liveItems.length }}</p>
            <div class="tw">
              <table>
                <thead>
                  <tr><th>Item</th><th>Kind</th><th>Interop</th><th class="num">Price</th><th>Status</th></tr>
                </thead>
                <tbody>
                  <tr v-for="item in liveItems" :key="item.id" :class="{ dimrow: item.status === 'archived' }">
                    <td><b>{{ item.name }}</b><span class="t-mono dim sku">{{ item.sku }}</span></td>
                    <td>{{ item.kind }}</td>
                    <td><span :class="tierChip(item.interopTier)">{{ item.interopTier }}</span></td>
                    <td class="num">{{ formatSrv(item.priceUnits, { suffix: true }) }}</td>
                    <td>{{ item.status }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;align-items:center">
            <!-- Manual: the creator writes and approves. AI: they only approve what the agent proposed. -->
            <template v-if="job.mode === 'manual'">
              <button v-if="!job.catalogApproved" class="btn btn--grad" type="button" :disabled="approving || !canApprove" @click="approveCatalog">
                {{ approving ? 'Approving…' : 'Approve catalog' }}
              </button>
              <button v-else-if="job.status !== 'done'" class="btn btn--grad" type="button" :disabled="publishing" @click="publishManual">
                {{ publishing ? 'Publishing…' : 'Publish to the Store →' }}
              </button>
            </template>

            <template v-else>
              <button v-if="!job.catalogApproved" class="btn btn--ghost btn--fixed" type="button" :disabled="pollBusy" @click="fetchJob()">
                {{ pollBusy ? 'Refreshing…' : 'Refresh' }}
              </button>
              <button v-if="!job.catalogApproved" class="btn btn--grad btn--fixed" type="button" :disabled="approving || !canApprove" @click="approveCatalog">
                {{ approving ? 'Approving…' : 'Approve catalog' }}
              </button>
              <button v-else-if="job.status !== 'done'" class="btn btn--ghost btn--fixed" type="button" :disabled="pollBusy" @click="fetchJob()">
                {{ pollBusy ? 'Refreshing…' : 'Refresh' }}
              </button>
              <span v-else-if="job.catalogApproved" class="t-small dim">
                Approved. Your agent continues from here — this page updates automatically.
              </span>
            </template>

            <button v-if="job.status === 'done'" class="btn btn--ghost" type="button" @click="currentStep = 4">See result →</button>
            <span v-if="job.mode === 'manual' && !job.catalogApproved && !canApprove && draftRows.length" class="t-small dim">
              Every item needs a name and a price above zero.
            </span>
            <span v-else-if="job.mode === 'manual' && !job.catalogApproved && !draftRows.length" class="t-small dim">
              Add at least one item to approve.
            </span>
          </div>

          <div v-if="inlineError" class="note note--bad" style="margin-top:16px">
            <span class="note__i">⚠️</span>
            <div>
              <b>{{ inlineError.title }}</b> {{ inlineError.message }}
              <div v-if="inlineError.code === 'build_required' && job.game?.id" class="noteact">
                <NuxtLink class="notelink" :to="`/studio/games/${job.game.id}`">Open game editor →</NuxtLink>
              </div>
            </div>
          </div>
        </section>

        <!-- ══ STEP 4 · Live ══ -->
        <section v-else aria-labelledby="s4-h">
          <h2 id="s4-h" class="sr-only">Step 4 · Live</h2>

          <div v-if="isBlockedOnBond" class="note note--warn">
            <span class="note__i">🔒</span>
            <div><b>{{ gameTitle }} stays in review.</b> Publishing requires a staked listing bond; your vault has {{ formatSrv(studio.vault?.availableUnits, { suffix: true }) }} available.
              <NuxtLink to="/studio/payouts" style="text-decoration:underline"> Top up the vault →</NuxtLink></div>
          </div>

          <div v-else-if="job.status === 'done'" class="card card--pad livecard">
            <div class="done">
              <div class="done__cover" role="img" :aria-label="`${gameTitle} cover`" :style="job.game?.status === 'in_review' ? 'border-color: rgba(255, 190, 61, .5); background: rgba(255, 190, 61, .08)' : ''">
                <span>{{ job.game?.status === 'in_review' ? '⏳' : coverEmoji }}</span>
              </div>
              <template v-if="job.game?.status === 'live'">
                <h2 class="t-h1">{{ gameTitle }} is live</h2>
                <p class="dim" style="margin:8px 0 18px">Automated review passed — malware scan, IP fingerprint, content policy.</p>
              </template>
              <template v-else-if="job.game?.status === 'in_review'">
                <h2 class="t-h1" style="color:var(--amber)">{{ gameTitle }} is in review</h2>
                <p class="dim" style="margin:8px 0 18px">Automated review flagged items on your build or cover art. It has been escalated to moderators.</p>
              </template>
              <template v-else>
                <h2 class="t-h1">{{ gameTitle }} status: {{ statusLabel(job.game?.status) }}</h2>
                <p class="dim" style="margin:8px 0 18px">Published run completed with status {{ statusLabel(job.game?.status) }}.</p>
              </template>
              <p class="clock grad-text">{{ elapsedLabel }}</p>
              <p class="t-small dim">elapsed from "start run" to {{ job.game?.status === 'live' ? 'live storefront' : 'review submission' }}</p>
            </div>

            <div v-if="publishChecks.length" class="review-box" style="margin-top:20px">
              <p class="t-micro dim" style="margin-bottom:8px">Automated scan results</p>
              <div v-for="check in publishChecks" :key="check.name" class="chk" :class="`chk--${check.status}`">
                <span class="chk__mark">{{ check.status === 'flagged' ? '!' : check.status === 'passed' ? '✓' : '·' }}</span>
                <span class="chk__name t-mono">{{ check.name }}</span>
                <span class="chk__detail dim">{{ check.evidence?.reason ?? check.evidence?.note ?? check.status }}</span>
              </div>
            </div>

            <div class="rows" style="margin-top:22px">
              <div><span>Review status</span><strong>{{ statusLabel(job.game?.status) }}</strong></div>
              <div><span>Studio Vault</span><strong>deployed · receives {{ 100 - (studio.feeBps ?? 1000) / 100 }}%</strong></div>
              <div><span>Protocol fee</span><strong>{{ (studio.feeBps ?? 1000) / 100 }}%</strong></div>
              <div><span>Items written</span><strong>{{ mintedCount }} · interop {{ mintedTier }}</strong></div>
              <div><span>Sandbox purchase</span><strong>{{ sandboxLabel }}</strong></div>
              <div class="tot"><span>Listing bond staked</span><strong>{{ formatSrv(studio.bond?.balanceUnits, { suffix: true }) }}</strong></div>
            </div>

            <div class="formacts" style="margin-top:22px">
              <NuxtLink v-if="job.game?.status === 'live' && job.game?.slug" class="btn btn--grad" :to="`/store/g/${job.game.slug}`">View in Store →</NuxtLink>
              <NuxtLink v-else-if="job.game?.status === 'in_review'" class="btn btn--ghost" to="/admin/review">Open moderation queue →</NuxtLink>
              <NuxtLink v-if="job.gameId" class="btn btn--ghost" :to="`/studio/games/${job.gameId}`">Open game editor</NuxtLink>
            </div>
          </div>

          <div v-else class="note">
            <span class="note__i">◔</span>
            <div><b>The run is not finished.</b> This becomes the live storefront once every step is done and the game is live or in review.</div>
          </div>

          <div class="formacts" style="margin-top:18px">
            <button class="btn btn--ghost" type="button" @click="currentStep = 3">← Back to catalog</button>
            <button class="btn btn--ghost" type="button" @click="resetRun">Publish another</button>
          </div>
        </section>

        <!-- ══ Recent runs ══ -->
        <template v-if="runs.length">
          <p class="sect">Recent runs</p>
          <div class="tw">
            <table>
              <thead>
                <tr><th>Game</th><th>Progress</th><th>Status</th><th>Started</th><th><span class="sr-only">Open</span></th></tr>
              </thead>
              <tbody>
                <tr v-for="entry in runs" :key="entry.id">
                  <td>{{ entry.game?.title ?? '—' }}</td>
                  <td class="dim">{{ progressLabel(entry) }}</td>
                  <td>{{ entry.status }}</td>
                  <td class="dim">{{ formatWhen(entry.createdAt) }}</td>
                  <td>
                    <button class="btn btn--ghost btn--sm" type="button" @click="resume(entry)">{{ entry.status === 'done' ? 'View' : 'Resume' }}</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="t-small dim" style="margin-top:8px">Opening a finished run shows the result. Opening a running one resumes where it stopped.</p>
        </template>
      </div>
    </template>
    <StudioAccess v-else />
  </StudioShell>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'studio' })
useHead({ title: 'Publish a game · Studio · Sverse' })

type Mode = 'ai' | 'manual'
type StepNumber = 1 | 2 | 3 | 4

interface StepIssue { field: string; issue: string }
interface GameRow { id: string; title: string; status: string; genre?: string; tokenizationLevel?: string; blockedReason?: string }

const STEP_LABELS = ['Studio & game', 'Integration', 'Catalog', 'Live']

const api = useApi()
const route = useRoute()
const router = useRouter()
const { formatSrv, genreLabel, statusLabel, tierChip } = useStudioFormat()

const genres = [
  { value: 'action_rpg', label: 'Action RPG' },
  { value: 'puzzle', label: 'Puzzle' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'cozy', label: 'Cozy' },
  { value: 'arcade', label: 'Arcade' },
  { value: 'platformer', label: 'Platformer' },
]

/**
 * The kinds a creator can pick by hand. `unlock` and `living` are left out: they need data the console
 * does not collect yet (unlock targets, mutable trait definitions).
 */
const ITEM_KINDS = [
  { value: 'cosmetic', label: 'Cosmetic' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'pass', label: 'Pass' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'content', label: 'Content' },
]

/** One line explaining what the chosen kind means for the buyer and for interop. */
const KIND_HINTS: Record<string, string> = {
  cosmetic: 'a look you can wear',
  bundle: 'several things sold together as one purchase',
  pass: 'a season of rewards, kept in this game only',
  consumable: 'used up on use — kept in this game only',
  content: 'an extra pack of levels or chapters',
}

function kindHint(kind: string): string {
  return KIND_HINTS[kind] ?? ''
}

const levels = [
  { value: 'L0', title: 'Payments only', desc: 'No NFTs, zero wallet friction for your players' },
  { value: 'L2', title: 'Tokenized items', desc: "ERC-1155 minted to the player's passport" },
  { value: 'L3', title: 'Living Items', desc: 'Mutable traits + deed ledger' },
  { value: 'L4', title: 'Tokenized economy', desc: 'Needs an economy review before publishing' },
]

/* ── data ─────────────────────────────────────────────── */

const { data: studioRes, pending: studioPending, error: studioError } = await useAsyncData('studio-me', () =>
  api.one<any>('/api/v1/studios/me'),
)
const { data: gamesRes, refresh: refreshGames } = await useAsyncData('studio-publish-games', () =>
  api.many<GameRow>('/api/v1/studios/me/games').catch(() => ({ data: [], meta: { count: 0, hasMore: false, nextCursor: null } })),
)
const { data: runsRes, refresh: refreshRuns } = await useAsyncData('studio-publish-jobs', () =>
  api.many<any>('/api/v1/publish/jobs').catch(() => ({ data: [], meta: { count: 0, hasMore: false, nextCursor: null } })),
)

const studio = computed<any>(() => studioRes.value ?? null)
const pending = computed(() => studioPending.value)
const error = computed(() => studioError.value)
const errorMessage = computed(() => {
  const code = (error.value as any)?.data?.error?.code
  if (code === 'creator_required' || code === 'missing_session') return 'This area needs a creator account.'
  return 'Could not load your studio.'
})

const games = computed<GameRow[]>(() => gamesRes.value?.data ?? [])
const runs = computed<any[]>(() => runsRes.value?.data ?? [])

/* ── step state ───────────────────────────────────────── */

const job = ref<any>(null)
const currentStep = ref<StepNumber>(1)
const source = ref<'existing' | 'new'>('existing')

const isRunning = computed(() => job.value?.status === 'running')

/* ── step 1 ───────────────────────────────────────────── */

const selectedGameId = ref('')
/** The game returned by the create call, kept until the list refresh includes it. */
const draftGame = ref<GameRow | null>(null)
const selectedGame = computed(() => games.value.find((entry) => entry.id === selectedGameId.value) ?? (draftGame.value?.id === selectedGameId.value ? draftGame.value : null))

const form = reactive({
  title: '',
  genre: 'action_rpg',
  blurb: '',
  buildUrl: '',
  coverUrl: '',
  mode: 'ai' as Mode,
  level: 'L2',
})

const creating = ref(false)
const starting = ref(false)
const createError = ref('')
const startError = ref('')
const issues = ref<StepIssue[]>([])

/** A game cannot be created without a cover: the store would show a placeholder where art is expected. */
const canCreate = computed(() =>
  form.title.trim().length >= 2 && buildUrlIsValid(form.buildUrl) && coverUrlIsValid(form.coverUrl),
)

/** Empty is fine here (the game is created first); anything typed must be a real http(s) URL. */
function buildUrlIsValid(value: string) {
  const url = String(value ?? '').trim()
  return !url || /^https?:\/\/\S+$/i.test(url)
}
/** Required. Accepts an http(s) URL or a site-relative /path, matching the server's `assetUrl`. */
function coverUrlIsValid(value: string) {
  const url = String(value ?? '').trim()
  if (!url) return false
  return /^https?:\/\/\S+$/i.test(url) || url.startsWith('/')
}

function clearField(field: string) {
  issues.value = issues.value.filter((issue) => issue.field !== field)
}
function formError(field: string) {
  return issues.value.find((issue) => issue.field === field)?.issue ?? ''
}

/* ── step 3 ───────────────────────────────────────────── */

const pollBusy = ref(false)
const approving = ref(false)
const publishing = ref(false)
const inlineError = ref<{ title: string; message: string; code?: string } | null>(null)
const rowError = ref('')

const draftRows = ref<any[]>([])
const normalized = ref<any[]>([])
/** Fingerprint of the catalog last taken from the server, so polls do not rebuild unchanged rows. */
const lastCatalogKey = ref('')
/** Fingerprint of the row contents, used to tell a server update from the creator typing. */
const lastRowShape = ref('')

/** Item definitions that already exist for this game — the real catalog, not this run's proposal. */
const liveItems = ref<any[]>([])

/**
 * Approving is allowed once there is something valid to approve: a finished proposal, or — in manual
 * mode — at least one row the creator filled in correctly. The button reflects the row validation so
 * an empty row disables it instead of letting the click fail later.
 */
const canApprove = computed(() => {
  if (!job.value || job.value.catalogApproved) return false
  if (!draftRows.value.length) return false
  if (job.value.mode === 'manual') return validateDraftRows(draftRows.value).ok
  const proposed = job.value.steps?.find((s: any) => s.step === 'propose_items')
  return proposed?.status === 'done'
})

/* ── derived ──────────────────────────────────────────── */

const isBlockedOnBond = computed(() => job.value?.game?.blockedReason === 'bond_required' && job.value?.status === 'done')
const publishStep = computed(() => job.value?.steps?.find((s: any) => s.step === 'publish'))
const publishChecks = computed<any[]>(() => publishStep.value?.output?.checks ?? [])
const gameTitle = computed(() => job.value?.game?.title ?? selectedGame.value?.title ?? form.title ?? 'Your game')
const coverEmoji = computed(() => draftRows.value[0]?.emoji || '📦')

const mintedCount = computed(() => {
  const step = job.value?.steps?.find((s: any) => s.step === 'create_item_pack')
  return step?.output?.created ?? draftRows.value.length
})
const mintedTier = computed(() => {
  const item = normalized.value[0] ?? draftRows.value[0]
  return item?.interopTier ?? 'T0'
})
const sandboxLabel = computed(() => {
  const step = job.value?.steps?.find((s: any) => s.step === 'test_purchase')
  if (step?.status !== 'done' || !step.output) return '—'
  return `${step.output.settled ? 'settled' : 'not settled'} · ${step.output.refunded ? 'refunded' : 'not refunded'}`
})

const elapsedLabel = computed(() => formatElapsed(job.value?.elapsedMs))

function formatElapsed(ms: number | null | undefined) {
  if (ms === null || ms === undefined) return '—'
  const totalSeconds = Math.max(0, Math.round(Number(ms) / 1000))
  return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`
}

/** Creator-facing name per pipeline step. The API names stay in the job; they mean nothing to a creator. */
const STEP_TITLES: Record<string, string> = {
  scan_project: 'Scan the project',
  propose_items: 'Propose items',
  map_to_schema: 'Match shared schemas',
  create_item_pack: 'Create the items',
  install_sdk: 'Install the SDK',
  test_purchase: 'Test a purchase',
  publish: 'Submit for review',
}

function stepTitle(step: string): string {
  return STEP_TITLES[step] ?? step
}

function stepStatusLabel(entry: any): string {
  switch (entry.status) {
    case 'done': return 'done'
    case 'failed': return entry.error?.message || 'failed'
    case 'running': return 'running'
    case 'skipped': return 'skipped'
    case 'pending':
      return entry.step === 'create_item_pack' && !job.value?.catalogApproved ? 'waiting for your approval' : 'pending'
    default: return entry.status
  }
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** "3 of 7 steps" reads better in a run list than the raw mode ever did. */
function progressLabel(entry: any): string {
  const steps = entry.steps ?? []
  if (!steps.length) return '—'
  const done = steps.filter((step: any) => step.status === 'done' || step.status === 'skipped').length
  const failed = steps.find((step: any) => step.status === 'failed')
  if (failed) return `${done} of ${steps.length} · ${stepTitle(failed.step)} failed`
  return `${done} of ${steps.length} steps`
}

/* ── polling ──────────────────────────────────────────── */

let pollTimer: ReturnType<typeof setInterval> | null = null

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(() => {
    if (import.meta.client && document.visibilityState === 'hidden') return
    if (!job.value?.id || !isRunning.value) {
      stopPolling()
      return
    }
    void fetchJob({ silent: true })
  }, 1500)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onBeforeUnmount(stopPolling)

/* ── helpers ──────────────────────────────────────────── */

function issuesOf(raw: any): StepIssue[] {
  const details = raw?.data?.error?.details ?? raw?.data?.details
  return Array.isArray(details) ? details.filter((d: any) => d && d.field) : []
}
function messageOf(raw: any, fallback: string): string {
  return raw?.data?.error?.message ?? raw?.data?.message ?? raw?.message ?? fallback
}
function codeOf(raw: any): string {
  return raw?.data?.error?.code ?? ''
}

function errorTitleFor(code: string) {
  switch (code) {
    case 'step_out_of_order': return 'Step out of order.'
    case 'catalog_not_approved': return 'Catalog not approved.'
    case 'not_your_job': return 'That run belongs to another studio.'
    case 'human_approval_required': return 'Human approval required.'
    case 'invalid_step_input': return 'Invalid step input.'
    case 'insufficient_funds': return 'Insufficient funds.'
    case 'game_not_submittable': return 'This game cannot be submitted.'
    default: return 'That action could not be completed.'
  }
}

function priceToSrv(units: string | number | null | undefined) {
  const number = Number(units ?? 0) / 1_000_000
  if (!Number.isFinite(number)) return ''
  return number.toString()
}

function srvToUnits(value: string): string {
  const trimmed = String(value ?? '').trim().replace(/,/g, '')
  if (!/^\d*(\.\d*)?$/.test(trimmed) || !trimmed) return '0'
  const [whole = '0', frac = ''] = trimmed.split('.')
  const fracPadded = (frac + '000000').slice(0, 6)
  return (BigInt(whole || '0') * 1_000_000n + BigInt(fracPadded || '0')).toString()
}

let rowSeq = 0

/** Row-level field errors, keyed by row uid, so the message can point at the offending input. */
type RowIssueField = 'name' | 'price' | 'art'
type RowIssue = { name?: string; price?: string; art?: string }
type RowIssues = Record<string, RowIssue>
type RowIssuesResult = { ok: boolean; issues: RowIssues; summary: string }
const rowIssues = ref<RowIssues>({})

/**
 * Mirrors the server's `draftItem` rules (name 1–80, integer priceUnits > 0, kind from ITEM_KINDS).
 * Returns human messages per row instead of one generic line, so a blank row added by mistake is
 * obvious rather than a silently unnamed "Item".
 */
function validateDraftRows(rows: any[]): { ok: boolean; issues: Record<string, { name?: string; price?: string }>; summary: string } {
  const issues: Record<string, { name?: string; price?: string }> = {}
  rows.forEach((row, index) => {
    const entry: RowIssue = {}
    const name = String(row.name ?? '').trim()
    if (!name) entry.name = `Item ${index + 1} needs a name.`
    else if (name.length > 80) entry.name = 'Name is too long — 80 characters maximum.'
    if (!barrierValidKind(row.kind)) entry.name = entry.name || 'Pick an item type.'

    const rawPrice = String(row.price ?? '').trim()
    const priceUnits = srvToUnits(rawPrice)
    if (!rawPrice) entry.price = 'Add a price.'
    else if (!/^\d*(\.\d{0,6})?$/.test(rawPrice.replace(/,/g, ''))) entry.price = 'Use digits only, up to 6 decimals.'
    else if (priceUnits === '0') entry.price = 'Price must be greater than zero.'

    /**
     * Art is optional, but a value that is not an image URL is worse than none: it would ship a broken
     * image into the store. The server stores whatever `art.url` it is given, so check it here.
     */
    const art = String(row.artUrl ?? '').trim()
    if (art && art.length > 500) entry.art = 'Image URL is too long.'
    else if (art && !/^https?:\/\/\S+$/i.test(art) && !art.startsWith('/')) {
      entry.art = 'Use an http(s) URL or a /path.'
    }

    if (entry.name || entry.price || entry.art) issues[row.uid] = entry
  })

  const count = Object.keys(issues).length
  const summary = count
    ? `${count} item${count === 1 ? '' : 's'} need${count === 1 ? 's' : ''} attention before the catalog can be approved.`
    : ''
  return { ok: count === 0, issues, summary }
}

function barrierValidKind(kind: string) {
  return ITEM_KINDS.some((entry) => entry.value === kind)
}

function rowErrorFor(uid: string, field: RowIssueField) {
  return rowIssues.value[uid]?.[field] ?? ''
}

function clearRowIssue(uid: string, field: RowIssueField) {
  // First keystroke in a fresh row: it is no longer pristine, so validation may now flag it.
  const row = draftRows.value.find((entry) => entry.uid === uid)
  if (row?.pristine) row.pristine = false
  const entry = rowIssues.value[uid]
  if (!entry?.[field]) return
  delete entry[field]
  if (!entry.name && !entry.price && !entry.art) delete rowIssues.value[uid]
}

function rowFromDraft(item: any) {
  return {
    uid: `row_${++rowSeq}`,
    name: item.name ?? '',
    price: priceToSrv(item.priceUnits ?? item.priceSrv),
    emoji: item.emoji ?? '',
    artUrl: item.art?.url ?? item.artUrl ?? '',
    schemaId: item.schemaId ?? '',
    interopTier: item.interopTier ?? 'T0',
    slot: item.slot ?? '',
    kind: item.kind ?? '',
    raw: item,
  }
}

function adoptJob(next: any, { step }: { step?: StepNumber } = {}) {
  job.value = next
  if (!next) return
  /**
   * Rebuilding rows on every poll would drop what the creator has typed and reset the DOM under the
   * cursor, which is what made the buttons appear to jump. Only take server rows when the catalog
   * actually changed, or when the creator has not started editing.
   */
  const incoming = next.draftCatalog ?? []
  const incomingKey = JSON.stringify(incoming)
  const dirty = draftRows.value.some((row) => row.dirty)
  if (incomingKey !== lastCatalogKey.value && !dirty) {
    draftRows.value = incoming.map(rowFromDraft)
    normalized.value = incoming
    lastCatalogKey.value = incomingKey
    // Rows came from the server: record their shape so the dirty-watcher does not fire on them.
    lastRowShape.value = JSON.stringify(draftRows.value.map(({ uid, dirty, pristine, artBroken, ...rest }: any) => rest))
  } else if (!lastCatalogKey.value) {
    lastCatalogKey.value = incomingKey
  }
  // Reflect the job's real mode once it has run something. Before that, the creator's pick wins.
  const hasProgress = (next.steps ?? []).some((entry: any) => entry.status !== 'pending')
  if (next.mode && hasProgress) form.mode = next.mode === 'manual' ? 'manual' : 'ai'
  if (next.game?.title) form.title = next.game.title
  if (next.game?.tokenizationLevel) form.level = next.game.tokenizationLevel
  if (step) currentStep.value = step
  if (isRunning.value) startPolling()
  else stopPolling()
}

async function fetchJob(options: { silent?: boolean } = {}) {
  if (!job.value?.id) return
  /**
   * Only a manual Refresh shows a busy state. The 1.5s poll runs silently: flipping the label and width of
   * this button on every tick made the whole action row jitter and shoved Approve sideways.
   */
  if (!options.silent) pollBusy.value = true
  try {
    adoptJob(await api.one<any>(`/api/v1/publish/jobs/${job.value.id}`))
    await loadLiveItems()
  } catch {
    // transient poll failure — keep the last good state
  } finally {
    if (!options.silent) pollBusy.value = false
  }
}

/** Reads the game's own item definitions so the page shows what is actually sellable right now. */
async function loadLiveItems() {
  const gameId = job.value?.gameId
  if (!gameId) {
    liveItems.value = []
    return
  }
  try {
    const managed = await api.one<any>(`/api/v1/games/${gameId}/manage`)
    liveItems.value = managed?.items ?? []
  } catch {
    liveItems.value = []
  }
}

/* ── step 1 actions ───────────────────────────────────── */

async function createGame() {
  if (creating.value || !canCreate.value) return
  creating.value = true
  createError.value = ''
  issues.value = []
  /**
   * Both links matter later: `build_required` used to surface only at the very end of the wizard, and a
   * missing cover leaves the store with a placeholder on the player's first impression.
   */
  const local: StepIssue[] = []
  if (!buildUrlIsValid(form.buildUrl)) local.push({ field: 'buildUrl', issue: 'Use a full http(s) URL, e.g. https://example.com/build.zip' })
  if (!String(form.coverUrl ?? '').trim()) local.push({ field: 'coverArt', issue: 'Add a cover image URL.' })
  else if (!coverUrlIsValid(form.coverUrl)) local.push({ field: 'coverArt', issue: 'Use an http(s) URL or a /path.' })
  if (local.length) {
    issues.value = local
    createError.value = 'Please fix the highlighted fields.'
    creating.value = false
    return
  }
  try {
    // Create the game only; the publish job is created in step 2, after the mode is chosen.
    const game = await api.one<any>('/api/v1/studios/me/games', {
      method: 'POST',
      body: {
        title: form.title.trim(),
        genre: form.genre,
        blurb: form.blurb.trim(),
        tokenizationLevel: form.level,
        ...(form.buildUrl.trim() ? { buildUrl: form.buildUrl.trim() } : {}),
        coverArt: { url: form.coverUrl.trim() },
      },
    })
    selectedGameId.value = game.id
    draftGame.value = game
    source.value = 'existing'
    await refreshGames()
    currentStep.value = 2
  } catch (raw: any) {
    issues.value = issuesOf(raw)
    createError.value = issues.value.length ? 'Please fix the highlighted fields.' : messageOf(raw, 'Could not create the game.')
  } finally {
    creating.value = false
  }
}

/**
 * Picking an existing game only selects it. The publish job is created in step 2, after the creator
 * chooses manual or AI — creating it here would bake in the default mode before they had a say.
 */
function startRun() {
  if (!selectedGameId.value || starting.value) return
  startError.value = ''
  currentStep.value = 2
}

/* ── step 2 actions ───────────────────────────────────── */

async function applyIntegration() {
  if (starting.value) return
  starting.value = true
  startError.value = ''
  try {
    // The job does not exist yet for a newly created game: it is created here, with the chosen mode.
    if (!job.value?.id) {
      if (!selectedGameId.value) throw new Error('Pick or create a game first.')
      const created = await api.one<any>('/api/v1/publish/jobs', {
        method: 'POST',
        body: { mode: form.mode, gameId: selectedGameId.value },
      })
      adoptJob(created, { step: 3 })
      await refreshRuns()
      return
    }

    if (form.level) {
      await api.one(`/api/v1/games/${job.value.gameId}`, { method: 'PATCH', body: { tokenizationLevel: form.level } }).catch(() => null)
    }
    if (job.value.mode !== form.mode) {
      // The mode is fixed at job creation; surface that instead of silently diverging.
      startError.value = `This run was started as ${job.value.mode === 'manual' ? 'Manual' : 'AI-assisted'}, so it cannot switch now. Use "Publish another" to start a fresh run with ${form.mode === 'manual' ? 'Manual' : 'AI-assisted'}.`
      return
    }
    currentStep.value = 3
  } catch (raw: any) {
    startError.value = messageOf(raw, 'Could not start the run.')
  } finally {
    starting.value = false
  }
}

/* ── step 3 actions ───────────────────────────────────── */

async function approveCatalog() {
  if (!job.value?.id || approving.value || !canApprove.value) return
  inlineError.value = null
  rowError.value = ''
  rowIssues.value = {}
  /**
   * Publishing needs a build URL so review can scan it. Surface that here, at the moment the creator
   * commits the catalog, rather than after they press Publish and hit build_required.
   */
  if (job.value.mode === 'manual' && !job.value.game?.buildUrl) {
    inlineError.value = {
      title: 'Build URL required',
      message: 'Add a build URL on the game page — review scans it before the game can go live.',
      code: 'build_required',
    }
    return
  }
  approving.value = true
  try {
    // Manual runs approve what the creator typed; AI runs approve the catalogue the agent already
    // wrote onto the job, so no draft is sent and the agent's schema mapping is preserved.
    let body: Record<string, unknown> = {}
    if (job.value.mode === 'manual') {
      const check = validateDraftRows(draftRows.value)
      rowIssues.value = check.issues
      if (!check.ok) {
        rowError.value = check.summary
        return
      }
      body = {
        draft: draftRows.value.map((row) => ({
          name: row.name.trim(),
          kind: row.kind || 'cosmetic',
          priceUnits: srvToUnits(row.price),
          ...(row.schemaId ? { schemaId: row.schemaId } : {}),
          ...(row.slot ? { slot: row.slot } : {}),
          ...(row.emoji || row.artUrl ? { art: { ...(row.artUrl ? { url: row.artUrl.trim() } : {}), ...(row.emoji ? { emoji: row.emoji } : {}) } } : {}),
        })),
      }
    }
    let approved = await api.one<any>(`/api/v1/publish/jobs/${job.value.id}/approve-catalog`, { method: 'POST', body })

    // Manual runs need the schema mapping too: without it every hand-written item stays T0 and never
    // interops. The AI pipeline runs this as its own step; here it is invisible to the creator.
    // Jobs created before the step existed are left alone rather than sending an unknown step.
    if (job.value.mode === 'manual') {
      const mapStep = approved.steps?.find((step: any) => step.step === 'map_to_schema')
      if (mapStep && mapStep.status !== 'done') {
        approved = await api.one<any>(`/api/v1/publish/jobs/${job.value.id}/steps/map_to_schema`, {
          method: 'POST',
          body: { overrides: {} },
        })
      }
    }

    adoptJob(approved)
    await refreshRuns()
  } catch (raw: any) {
    rowError.value = messageOf(raw, 'Could not approve the catalog.')
    inlineError.value = { title: errorTitleFor(codeOf(raw)), message: rowError.value, code: codeOf(raw) }
  } finally {
    approving.value = false
  }
}

/**
 * Manual runs publish from the console. The API needs the schema mapping and the item write before the
 * submit; that split is an implementation detail, so the creator sees one button.
 */
async function publishManual() {
  if (!job.value?.id || publishing.value) return
  publishing.value = true
  inlineError.value = null
  try {
    let current = job.value
    const hasStep = (name: string) => (current.steps ?? []).some((step: any) => step.step === name)
    const stepDone = (name: string) => (current.steps ?? []).some((step: any) => step.step === name && step.status === 'done')
    /**
     * Runs a step if the job has it and it is not done. Jobs created before manual mode gained
     * `map_to_schema` only have two steps, so a missing step is skipped rather than sent to the API.
     */
    const runIfNeeded = async (name: string, body: Record<string, unknown> = {}) => {
      if (!hasStep(name) || stepDone(name)) return
      current = await api.one<any>(`/api/v1/publish/jobs/${current.id}/steps/${name}`, { method: 'POST', body })
    }

    await runIfNeeded('map_to_schema', { overrides: {} })
    await runIfNeeded('create_item_pack')
    const published = await api.one<any>(`/api/v1/publish/jobs/${current.id}/steps/publish`, { method: 'POST', body: {} })
    adoptJob(published, { step: 4 })
    await loadLiveItems()
    await refreshRuns()
  } catch (raw: any) {
    inlineError.value = { title: errorTitleFor(codeOf(raw)), message: publishErrorMessage(raw), code: codeOf(raw) }
  } finally {
    publishing.value = false
  }
}

/** The submit endpoint rejects for reasons the creator can act on; say what to do, not the error code. */
function publishErrorMessage(raw: any): string {
  switch (codeOf(raw)) {
    case 'build_required':
      return 'Add a build URL on the game page before publishing — review scans it.'
    case 'catalog_required':
      return 'The game needs at least one item before it can be submitted.'
    case 'email_unverified':
      return 'Verify your email address before submitting a game.'
    case 'bond_required':
      return 'Stake the listing bond in Payouts before this game can go live.'
    default:
      return messageOf(raw, 'Could not publish this run.')
  }
}

/**
 * A new row carries only what the creator decides. `schemaId` and `interopTier` are deliberately
 * absent: approving runs map_to_schema, which picks the canonical schema for the kind and derives the
 * tier from it. Sending a tier here would override that with a guess.
 */
function addRow() {
  const nextRow = {
    uid: `row_${++rowSeq}`,
    name: '',
    price: '',
    emoji: '',
    artUrl: '',
    schemaId: '',
    interopTier: '',
    slot: '',
    kind: 'cosmetic',
    raw: {},
    dirty: true,
    pristine: true,
  }
  lastRowShape.value = JSON.stringify(draftRows.value.map(({ uid, dirty, pristine, artBroken, ...rest }: any) => rest))
  draftRows.value.push(nextRow)
  lastRowShape.value = JSON.stringify(draftRows.value.map(({ uid, dirty, pristine, artBroken, ...rest }: any) => rest))
}

function removeRow(index: number) {
  const [removed] = draftRows.value.splice(index, 1)
  if (removed?.uid) delete rowIssues.value[removed.uid]
  if (!draftRows.value.length) rowError.value = ''
}

/* ── navigation ───────────────────────────────────────── */

function resume(entry: any) {
  adoptJob(entry, { step: entry.status === 'done' ? 4 : 3 })
}

function resetRun() {
  stopPolling()
  job.value = null
  draftRows.value = []
  normalized.value = []
  currentStep.value = 1
  source.value = 'existing'
  selectedGameId.value = ''
  form.title = ''
  form.blurb = ''
  form.buildUrl = ''
  form.coverUrl = ''
  inlineError.value = null
  rowError.value = ''
  void router.replace({ query: {} })
}

/* ── agent prompt ─────────────────────────────────────── */

const copiedPrompt = ref(false)

/**
 * The exact instruction the assistant needs, derived from how far the job actually got. Naming the job id
 * and the stopping point is what keeps a model from guessing the tool order or approving on the creator's
 * behalf; once the catalogue is approved the prompt switches to the remaining steps instead of repeating
 * the ones already done.
 */
const agentPrompt = computed(() => {
  const jobNow = job.value
  const id = jobNow?.id ?? '<job id>'
  const game = jobNow?.game?.title ?? 'my game'
  const done = (step: string) => jobNow?.steps?.some((entry: any) => entry.step === step && entry.status === 'done')

  if (!jobNow?.catalogApproved) {
    const record = jobNow ? '' : null
    return [
      `Publish "${game}" on Sverse with the sverse MCP tools.`,
      '',
      record === null
        ? `A publish run will be created when you scan — use gameId "<the game id from sverse_whoami>".`
        : `The publish run is already created: job id ${id}.`,
      '',
      'Call the tools in this order and stop where told:',
      '1. sverse_whoami — confirm the studio and that the key can publish.',
      ...(done('scan_project') ? [] : ['2. sverse_scan_project with gameId "<the game id from sverse_whoami>".']),
      ...(done('propose_items') ? [] : [`3. sverse_propose_items for job ${id}.`]),
      ...(done('map_to_schema') ? [] : [`4. sverse_run_step ${id} step="map_to_schema".`]),
      `5. sverse_get_job ${id}. It will say "approve-in-console".`,
      '',
      'STOP THERE. Do not call create_item_pack, and do not try to approve the catalogue — the API',
      'refuses that for API keys. Tell me the console link and wait for me to approve it.',
    ].join('\n')
  }

  const remaining: string[] = []
  if (!done('create_item_pack')) remaining.push(`sverse_run_step ${id} step="create_item_pack"`)
  if (!done('install_sdk')) {
    remaining.push('sverse_preview_sdk (show me the diff; do not write files)')
    remaining.push(`sverse_run_step ${id} step="install_sdk"`)
  }
  if (!done('test_purchase')) remaining.push(`sverse_run_step ${id} step="test_purchase"`)
  if (!done('publish')) remaining.push(`sverse_publish ${id}`)

  if (!remaining.length) {
    return [
      `The publish run ${id} for "${game}" has finished — every step is done.`,
      `Call sverse_get_job ${id} and report the final job and game status. Do not re-run any step:`,
      're-running clears the later steps and the catalogue approval.',
    ].join('\n')
  }

  return [
    `Continue the Sverse publish run ${id} for "${game}".`,
    'The catalogue is already approved by me — do not ask again and do not try to approve it.',
    '',
    'Do these, in order:',
    ...remaining.map((line, index) => `${index + 1}. ${line}`),
    '',
    'Then call sverse_get_job and report the final job and game status.',
    'If sverse_publish refuses, print the exact error code and stop — do not retry.',
  ].join('\n')
})

async function copyAgentPrompt() {
  try {
    await navigator.clipboard.writeText(agentPrompt.value)
    copiedPrompt.value = true
    window.setTimeout(() => { copiedPrompt.value = false }, 1600)
  } catch {
    copiedPrompt.value = false
  }
}

/**
 * An AI run cannot be finished by hand: the mode is fixed at creation and the remaining steps wait on the
 * model. Starting a manual run for the same game is the escape hatch — the running AI job is left alone.
 */
async function startManualRun() {  if (starting.value || !job.value?.gameId) return
  starting.value = true
  inlineError.value = null
  try {
    const created = await api.one<any>('/api/v1/publish/jobs', {
      method: 'POST',
      body: { mode: 'manual', gameId: job.value.gameId },
    })
    adoptJob(created, { step: 3 })
    form.mode = 'manual'
    draftRows.value = []
    await refreshRuns()
  } catch (raw: any) {
    inlineError.value = {
      title: errorTitleFor(codeOf(raw)),
      message: messageOf(raw, 'Could not start a manual run.'),
      code: codeOf(raw),
    }
  } finally {
    starting.value = false
  }
}

/* ── deep links + resume ──────────────────────────────── */

/**
 * Where a run should open. Derived from the job itself, never from the URL alone: a run that has not
 * passed the integration step must open there, so a resume never skips work the creator has not seen.
 */
function stepForJob(loaded: any): StepNumber {
  if (loaded?.status === 'done') return 4
  const done = (name: string) => loaded?.steps?.find((s: any) => s.step === name)?.status === 'done'
  // Any step past integration means the creator already chose a mode and level for this run.
  if (done('scan_project') || done('propose_items') || done('map_to_schema')) return 3
  return 2
}

onMounted(async () => {
  const queryJob = String(route.query.job ?? '')
  const queryGame = String(route.query.game ?? '')

  // An explicit job link opens that run at the step it actually reached.
  if (queryJob) {
    try {
      const loaded = await api.one<any>(`/api/v1/publish/jobs/${queryJob}`)
      adoptJob(loaded, { step: stepForJob(loaded) })
      await loadLiveItems()
      return
    } catch {
      // fall through to a fresh start
    }
  }

  // An explicit game link preselects it and keeps the creator on step 1.
  if (queryGame) {
    selectedGameId.value = queryGame
    source.value = 'existing'
    currentStep.value = 1
    return
  }

  // Plain visits always start at step 1. Running jobs stay reachable from "Recent runs".
  currentStep.value = 1
})

/**
 * Typing into a row marks it dirty so the next poll leaves it alone. Without this, the 1.5s poll
 * replaced the row array mid-edit and the browser reset focus and scroll.
 */
watch(
  draftRows,
  (rows) => {
    const current = JSON.stringify(rows.map(({ uid, dirty, pristine, artBroken, ...rest }: any) => rest))
    if (current !== lastRowShape.value) {
      lastRowShape.value = current
      for (const row of rows) row.dirty = true
    }
    /**
     * Keep the inline errors in step with the rows. A freshly added row is marked `pristine` so it
     * stays quiet until the creator types into it, rather than showing "needs a name" on creation.
     */
    if (job.value?.mode !== 'manual') return
    const { issues } = validateDraftRows(rows)
    const next: Record<string, { name?: string; price?: string }> = {}
    for (const row of rows) {
      if (row.pristine) continue
      const issue = issues[row.uid]
      if (issue) next[row.uid] = issue
    }
    rowIssues.value = next
  },
  { deep: true },
)

watch(() => job.value?.id, (id) => {
  // Only mirror the run into the URL while this page is the active route. After the creator follows a
  // link away (e.g. "Open game editor"), job goes null on unmount and this would replace the new route.
  if (route.path !== '/studio/publish') return
  const query: Record<string, any> = { ...route.query }
  delete query.tab
  delete query.game
  if (id) query.job = id
  else delete query.job
  void router.replace({ path: '/studio/publish', query })
})
</script>

<style scoped>
.wrap { max-width: 860px; }
.wrap--wide { max-width: 1240px; }

.steps { display: flex; gap: 0; list-style: none; margin: 0 0 26px; padding: 0; }
.step {
  display: flex; align-items: center; gap: 8px; position: relative;
  flex: 1; font-size: .8rem; color: var(--text-dim); padding-right: 14px;
}
.step__n {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  display: grid; place-items: center;
  font-family: var(--mono); font-size: .7rem; font-weight: 700;
  background: var(--surface-2); border: 1px solid var(--border-2);
}
.step.now { color: var(--text); }
.step.now .step__n { background: var(--pink); border-color: var(--pink); color: #fff; }
.step.done { color: var(--text); }
.step.done .step__n { background: transparent; border-color: var(--green, #28c840); color: var(--green, #28c840); }
.step__line { position: absolute; right: 0; top: 50%; width: 10px; height: 1px; background: var(--border-2); }

.coverpreview {
  margin-top: 14px; border-radius: var(--r-md); overflow: hidden;
  border: 1px solid var(--border-2); background: var(--surface-2);
}
.coverpreview img { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; }

.catalogempty {
  padding: 18px 20px; border-radius: var(--r-md);
  background: var(--surface); border: 1px dashed var(--border-2);
}

.tw { overflow-x: auto; }
.tw table { width: 100%; border-collapse: collapse; font-size: .82rem; }
.tw th, .tw td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--border); }
.tw th { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; color: var(--text-dim); }
.tw .num { text-align: right; font-family: var(--mono); }
.tw .sku { display: block; font-size: .72rem; }
.tw .dimrow { opacity: .55; }

.crow {
  display: flex; align-items: center; gap: 16px;
  padding: 14px 16px; border-radius: var(--r-lg);
  background: var(--surface); border: 1px solid var(--border);
  transition: border-color .18s, background .18s;
}
.crow--edit {
  align-items: flex-start;
  padding: 16px 18px;
}
.crow:hover { border-color: var(--border-2); }
.crow__av {
  width: 48px; height: 48px; border-radius: var(--r-md); flex-shrink: 0;
  display: grid; place-items: center; font-size: 1.45rem; overflow: hidden;
  background: var(--bg-2); border: 1px solid var(--border-2);
}
.crow--edit .crow__av {
  width: 64px; height: 64px; font-size: 1.7rem;
  margin-top: 18px;
}
.crow__av img { width: 100%; height: 100%; object-fit: cover; display: block; }
.crow__main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.crow:not(.crow--edit) .crow__main { gap: 4px; }

.crow__top {
  display: flex; align-items: flex-start; gap: 12px;
}
.crow:not(.crow--edit) .crow__top {
  align-items: center;
}
.crow__field { display: flex; flex-direction: column; min-width: 0; }
.crow__field--name { flex: 1 1 220px; }
.crow__field--kind { flex: 0 0 156px; }
.crow__field--price { flex: 0 0 144px; }
.crow:not(.crow--edit) .crow__field--price { flex: 0 0 auto; margin-left: auto; }

.crow__lbl {
  display: block; font-size: .7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .08em;
  color: var(--text-dim); margin-bottom: 5px; line-height: 1.2;
}

.crow__name {
  display: block; width: 100%; height: 38px;
  font-weight: 600; font-size: .88rem; font-family: var(--font);
  background: var(--bg-2); border: 1px solid var(--border); border-radius: 9px;
  padding: 0 12px; color: var(--text);
  transition: border-color .16s;
}
.crow__name::placeholder { color: var(--text-dim); font-weight: 400; opacity: .75; }
.crow__name:hover:not(:disabled) { border-color: var(--border-2); }
.crow__name:focus { border-color: var(--pink); outline: none; }
.crow__name:disabled {
  height: auto; background: transparent; border-color: transparent;
  padding: 0; font-size: .92rem;
}

.crow__field--kind :deep(.sel__btn) {
  height: 38px; padding: 0 12px; border-radius: 9px;
  background: var(--bg-2); font-size: .85rem; font-weight: 500;
}

.crow__p {
  display: flex; align-items: center; height: 38px;
  border-radius: 9px; background: var(--bg-2); border: 1px solid var(--border);
  padding: 0 11px 0 4px; transition: border-color .16s;
}
.crow__p:hover:not(.is-readonly) { border-color: var(--border-2); }
.crow__p:focus-within:not(.is-readonly) { border-color: var(--pink); }
.crow__p.is-readonly {
  height: auto; background: transparent; border-color: transparent; padding: 0;
}
.crow__p input {
  flex: 1; min-width: 0; width: 100%; height: 100%;
  padding: 0 6px; border: none; background: transparent;
  color: var(--text); font-family: var(--mono); font-size: .86rem; font-weight: 600;
  text-align: right;
}
.crow__p input::placeholder { color: var(--text-dim); font-weight: 400; opacity: .65; }
.crow__p input:focus { outline: none; }
.crow__unit {
  font-family: var(--mono); font-size: .74rem; font-weight: 700;
  color: var(--text-dim); letter-spacing: .04em; flex-shrink: 0;
  padding-left: 4px;
}

.crow__del {
  width: 38px; height: 38px; border-radius: 9px; flex-shrink: 0;
  margin-top: 19px;
  display: grid; place-items: center;
  background: var(--bg-2); border: 1px solid var(--border);
  color: var(--text-dim); font-size: .85rem;
  transition: color .16s, border-color .16s, background .16s;
}
.crow__del:hover:not(:disabled) {
  color: var(--red); border-color: rgba(255, 95, 87, .45); background: rgba(255, 95, 87, .1);
}
.crow__del:disabled { opacity: .45; cursor: not-allowed; }

.crow__bottom {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}
.crow__art { flex: 1 1 260px; min-width: 0; }
.crow__artinput {
  width: 100%; height: 36px; padding: 0 12px; border-radius: 9px;
  background: var(--bg-2); border: 1px solid var(--border);
  color: var(--text); font-family: var(--font); font-size: .8rem;
  transition: border-color .16s;
}
.crow__artinput::placeholder { color: var(--text-dim); opacity: .75; }
.crow__artinput:hover:not(:disabled) { border-color: var(--border-2); }
.crow__artinput:focus { outline: none; border-color: var(--pink); }

.crow__d {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  margin: 0; line-height: 1.5;
  font-family: var(--font); font-size: .78rem; color: var(--text-dim);
}
.crow__hint {
  flex: 0 0 auto; font-size: .76rem; color: var(--text-dim);
  padding: 5px 11px; border-radius: var(--r-pill);
  background: rgba(255, 255, 255, .035); border: 1px solid var(--border);
  white-space: nowrap;
}
.crow:not(.crow--edit) .crow__hint {
  padding: 0; border: none; background: transparent; white-space: normal;
}

.crow__err { font-family: var(--font); font-size: .74rem; line-height: 1.4; color: var(--red); margin-top: 5px; }
.crow__err--right { text-align: right; }
.crow--bad { border-color: rgba(255, 95, 87, .45); }
.bad { border-color: var(--red) !important; }

.done { text-align: center; padding: 16px 0 6px; }
.done__cover {
  width: 100%; max-width: 420px; height: 220px; margin: 0 auto 22px;
  border-radius: var(--r-lg); border: 1px solid var(--border-2); box-shadow: var(--e-2);
  display: grid; place-items: center; font-size: 4rem;
  background: radial-gradient(320px 180px at 30% 10%, rgba(123, 47, 247, 0.28), transparent 70%), var(--surface-2);
}
.clock { font-family: var(--mono); font-size: 2.4rem; font-weight: 700; }

.lvlsel { display: grid; gap: 8px; }
.lvl {
  display: flex; align-items: center; gap: 12px; padding: 11px 14px;
  border-radius: 11px; background: var(--surface); border: 1px solid var(--border); cursor: pointer;
}
.lvl.on { border-color: var(--pink); background: rgba(233, 53, 193, .08); }
.lvl__cb { position: absolute; opacity: 0; width: 0; height: 0; }
.lvl__k { font-family: var(--mono); font-weight: 700; width: 26px; }

.drop {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; border: 1px dashed var(--border-2); border-radius: var(--r-lg);
  padding: 14px 18px; text-align: center; color: var(--text-dim);
  font: inherit; font-size: .86rem; font-weight: 600;
  background: var(--surface); cursor: pointer;
  transition: border-color .18s, color .18s, background .18s;
}
.drop:hover:not(:disabled) { border-color: var(--pink); color: var(--text); background: var(--surface-2); }
.drop[disabled] { opacity: .55; cursor: not-allowed; }

.pick__cb { position: absolute; opacity: 0; width: 0; height: 0; }

.mcpneed { display: block; margin-top: 8px; font-size: .78rem; color: var(--text-dim); }
.mcpneed__a { color: var(--pink); text-decoration: underline; }

.agentsteps {
  margin: 8px 0 6px; padding-left: 20px;
  font-size: .82rem; line-height: 1.65; color: var(--text);
}
.agentsteps li { list-style: decimal; }

/* Pipeline and prompt side by side: the prompt is the action, the steps are the progress. */
.agentgrid {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px; align-items: start;
}
.agentprompt {
  padding: 18px 20px; border-radius: var(--r-lg);
  background: var(--surface); border: 1px solid var(--border);
  display: flex; flex-direction: column;
}
.agentprompt__h {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 14px; margin-bottom: 12px;
}
.agentprompt .configblk { flex: 1; max-height: none; }

@media (max-width: 1100px) {
  .agentgrid { grid-template-columns: minmax(0, 1fr); }
}

.configblk {
  margin: 0; padding: 14px 16px; border-radius: var(--r-md);
  background: var(--bg-2); border: 1px solid var(--border);
  font-family: var(--mono); font-size: .74rem; line-height: 1.6;
  color: var(--text-dim); white-space: pre-wrap; word-break: break-word;
  max-height: 320px; overflow-y: auto;
}

.notelink { color: var(--pink); text-decoration: underline; font-weight: 600; cursor: pointer; }
.noteact { margin-top: 8px; position: relative; z-index: 1; }

.review-box {
  padding: 14px 18px; border-radius: var(--r-md);
  background: var(--bg-2); border: 1px solid var(--border);
}
.chk { display: flex; gap: 9px; align-items: baseline; font-size: .8rem; padding: 4px 0; }
.chk__mark { width: 16px; text-align: center; font-weight: 700; font-family: var(--mono); flex-shrink: 0; }
.chk--flagged .chk__mark { color: var(--red, #ff5f57); }
.chk--passed .chk__mark { color: var(--green, #28c840); }
.chk__name { flex-shrink: 0; min-width: 150px; font-weight: 600; }
.chk__detail { min-width: 0; word-break: break-word; }

.formacts { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }

/* "Refresh" and "Refreshing…" must not resize the button: any width change shoves the next button over. */
.btn--fixed { min-width: 132px; justify-content: center; }

@media (max-width: 768px) {
  .crow { flex-wrap: wrap; }
  .crow--edit .crow__av { margin-top: 0; width: 48px; height: 48px; font-size: 1.4rem; }
  .crow__top { flex-wrap: wrap; }
  .crow__field--name { flex: 1 1 100%; }
  .crow__field--kind { flex: 1 1 140px; }
  .crow__field--price { flex: 1 1 130px; }
  .steps { flex-direction: column; gap: 8px; }
  .step__line { display: none; }
}
</style>
