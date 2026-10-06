# CHECKLIST — Whisker Edge (trimmed plan)

Tracking for the trimmed scope in `Cat Overlay Game_ Trimmed Plan.md`.
Full plan (Steam, multi-monitor, tools) is reference only.

**Pace:** part-time, 10–15 h/week. **Target:** Phases 0–4.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Phase 0 — Overlay vertical slice (1 week)

Goal: prove the overlay is trustworthy and click-through-safe.

- [x] P0.1 Scaffold project (Electron + electron-vite + TypeScript strict)
- [x] P0.2 Install deps (pixi.js, howler, zod, vitest, electron-builder)
- [x] P0.3 Shared layer: `types.ts`, `schema.ts`, `constants.ts`, `api.ts`
- [x] P0.4 Main process: single overlay window on primary display `workArea`
- [x] P0.5 Tray: quit / pause (stub)
- [x] P0.6 Preload typed bridge (`contextIsolation: true`, `nodeIntegration: false`)
- [x] P0.7 Overlay renderer: transparent canvas, 30 FPS cap
- [x] P0.8 Game loop with idle throttle
- [x] P0.9 `hitTest.ts` — bounding box then circular shape test (alpha-map hook ready)
- [x] P0.10 Click-through toggle: `setIgnoreMouseEvents(!capture, { forward: true })`, IPC only on state change
- [x] P0.11 Placeholder cat sprite + peek-in / peek / peek-out animation
- [x] P0.12 Spawn director v0 (single cat, timed)
- [x] P0.13 Click-to-collect (difficulty check, flinch, flee after 3 misses)
- [x] P0.14 `save.ts` — atomic write, `save.bak`, Zod validate, version field
- [x] P0.15 Emergency hotkey to disable capture
- [x] P0.16 `npm run typecheck` + `npm run build` pass
- [x] P0.17 Unit tests for director, capture math, hit test, placements, save schema (42 tests)
- [x] P0.18 Tray + app icons generated (`resources/icon.png`, `resources/tray.png`)
- [x] P0.19 Catdex window: roster, per-cat count, coins, captures, day streak (tray only)
- [x] P0.20 Randomised anchors + randomised position along each edge
- [x] P0.21 Capture feel: cursor auto-releases on click, flinch + toast on miss, toast on collect
- [x] P0.22 Toast placement: flips below a top-edge cat, clamps at left/right edges

**Exit criteria**
- [ ] Overlay is click-through — zero missed clicks on windows underneath *(needs human testing)*
- [x] A cat can be clicked and collected — verified by scripted mouse, save roundtrip confirmed
- [ ] Idle CPU < 1%, active < 5% *(needs measurement)*
- [x] Progress persists across restart — verified via IPC → `save.json` roundtrip
- [x] Startup to first window < 3 s — overlay booted 1920x1032 WebGL immediately

---

## Phase 1 — Core loop (3 weeks)

- [ ] P1.1 `Cat.ts` + full state machine (peek / walk / sit / hang / flee)
- [ ] P1.2 Anchor types: corner, bottom, side, top
- [ ] P1.3 State durations, transition weights, capturable flags
- [ ] P1.4 Spawn director v1 — rarity rolls, cooldowns, max-cats-on-screen
- [ ] P1.5 Traits: shyness, curiosity, clumsiness, speed (data-driven)
- [ ] P1.6 Tray: pause, quiet mode, quit
- [ ] P1.7 Vitest tests for state machine + director
- [ ] P1.8 30-minute uninterrupted playtest

**Exit criteria**
- [ ] Cats appear, can be collected, progress persists
- [ ] No focus stealing, no visible flicker

---

## Phase 2 — MVP content and UI (4 weeks)

- [ ] P2.1 Expand cat count (handful), shared body template + palette swaps
- [ ] P2.2 Catalog window ("Catdex") — silhouettes for unseen
- [ ] P2.3 Settings window — spawn rate (Chill/Normal/Busy), volume, quiet mode
- [ ] P2.4 Sound v1 — meows, purr loop, capture jingle, UI clicks (Howler)
- [ ] P2.5 Quiet mode wiring (no spawn, no audio)
- [ ] P2.6 Fish coins per capture, weighted by rarity
- [ ] P2.7 Local achievements manager + definitions
- [ ] P2.8 Save migration tests
- [ ] P2.9 Share a build with 3–5 friends

**Exit criteria**
- [ ] A friend installs it and has a good 15-minute session

---

## Phase 3 — Depth and juice (4 weeks)

- [ ] P3.1 Rarity tiers + pity timer
- [x] P3.2 Hanging behaviour (top anchor) — *scratcher descent only, see decisions log*
- [ ] P3.3 Screen-rip event (claw-tear decal, land softly, easy-catch window)
      — *the tear and the fall are in; the decal and the catchable landing are not*
- [ ] P3.4 Particles, animation polish
- [ ] P3.5 Cat room window (lounge, petting)
- [ ] P3.6 Cosmetics (hats, collars)
- [ ] P3.7 Full-session variety playtest

**Exit criteria**
- [ ] Rare moments land well in playtests

---

## Phase 4 — Hardening and QA (3 weeks)

- [ ] P4.1 Performance + memory audit
- [ ] P4.2 DPI audit (100 / 125 / 150%)
- [ ] P4.3 Crash handling + logging
- [ ] P4.4 electron-builder NSIS installer + uninstall test
- [ ] P4.5 QA matrix: taskbar auto-hide, taskbar positions, sleep/wake
- [ ] P4.6 QA matrix: browsers / IDEs / video calls underneath
- [ ] P4.7 QA matrix: borderless, windowed, exclusive fullscreen
- [ ] P4.8 Corrupted-save recovery test
- [ ] P4.9 Balance pass on spawn + capture rates
- [ ] P4.10 `CREDITS.md` and license audit

**Exit criteria**
- [ ] All quality targets met, no known crash bugs

---

## Deferred (not scheduled)

- [ ] Steam publishing, achievements mirror, cloud saves
- [ ] Store page, trailer, capsule art, wishlist campaign
- [ ] Multi-monitor support
- [ ] Capture tools (net / fish / toy / treat jar)
- [ ] Shop / cosmetics monetization
- [ ] Localization, Workshop

---

## Current focus

**Phase 0 — Overlay vertical slice**, code complete. Remaining: human playtesting of
click-through, clicking a cat, and CPU measurement.

**Next up:** run `npm run dev`, confirm a cat peeks into a corner, hover it, click it,
and check that clicks reach the windows underneath when no cat is hovered.

## How to run

```
dev.bat              double-click it: npm run dev (installs deps + Electron on first run)
dev.bat test
dev.bat typecheck
dev.bat build
```

Or straight from npm:

```
npm.cmd install          # first time only, see notes below
npm run dev              # launches the overlay
npm run typecheck
npm.cmd test
npm run build
npm run icons            # regenerate tray + app icons
```

## Notes / decisions log

- 2026-10-04 — Decisions locked: no Steam, single monitor, one cat sprite first
  (tune placement before adding cats), click-to-collect only (no tools).
- 2026-10-04 — Project root: `C:\Users\KalanaJayaweera\Desktop\cat collector`.
- 2026-10-04 — **Top Scratcher added** (design: `whisker_edge_top_scratcher_cat.html`).
  `CatDefinition.behaviour` picks the actor: `'peeker'` keeps the old peek machine,
  `'scratcher'` gets `ScratchCat` and always rests on the top edge, whatever anchors
  the definition lists. Overlay code talks to the `CatActor` interface, so the two
  behaviours stay independent and a third is just another actor.
  - Scratch timings, descent pace and rip odds live in `SCRATCH_*` in
    `src/shared/constants.ts`; enter 500 ms, grip 800 ms, then ~140 px/s with a
    ±25 % wobble. Rip chance is `SCRATCH_RIP_CHANCE x (0.5 + clumsiness)`, rolled once
    per spawn, never in the first 200 px or the last 120 px.
  - Rips increment `stats.ripsWitnessed` and toast; there is no tear decal yet, and a
    falling cat is **not** catchable (the design says he drops off screen). Both are
    P3.3 leftovers.
  - The claw marks are their own layer pinned to the top edge, so they stay behind
    when he lets go, then fade over `SCRATCH_TRAIL_FADE_MS`.
  - `CatArt` grew `boxHeight` (tall cats), `clawX` (where the trail is drawn, kept
    equal to the paw centres by a test) and `parts` (named layers the overlay can
    rotate: `tail`, `armL`, `armR`). `paintArt` now fits and centres the box instead
    of stretching it, so the Catdex thumb shows the scratcher upright.

### Environment quirks on this machine (important)

- **Use `npm.cmd`, not `npm`** — PowerShell blocks `npm.ps1` (execution policy).
  `dev.bat` already does this for you.
- **`ELECTRON_RUN_AS_NODE=1` is set globally.** That makes `electron.exe` start as a
  plain Node process and the app dies with
  `TypeError: Cannot read properties of undefined (reading 'requestSingleInstanceLock')`.
  `npm run dev` and `npm start` go through `scripts/run.mjs`, which strips it.
  `npm run build` does not need this.
- **npm blocks install scripts by default here.** Electron's binary is not downloaded
  during `npm install`. If dev fails with `Error: Electron uninstall`, run:
  `node node_modules/electron/install.js`
- **Vite renderer root is back to the default `src/renderer`.** Both entries live under it:
  `src/renderer/index.html` (overlay) and `src/renderer/catalog/index.html` (Catdex).
- **Pixi needs `import 'pixi.js/unsafe-eval'`** (in `overlay/renderer.ts`) because the
  overlay CSP deliberately forbids `unsafe-eval`. Do not loosen the CSP to work around it.
- **The Catdex window takes ~3 s to appear on first open** because `ready-to-show` waits
  on the first paint, which competes with the overlay's WebGL init. It is not a hang.
- To regenerate the anchor sheet after editing placements: `npm run preview:anchors`.

### Where the tuning lives

| What | File |
| --- | --- |
| Where cats appear, per anchor (randomised) | `src/renderer/cats/placements.ts` |
| Which anchor a cat prefers, by shyness | `src/renderer/cats/director.ts` (`anchorWeights`) |
| Spawn timing and rarity odds | `src/renderer/cats/director.ts` |
| Peek / dwell timings, miss handling | `src/renderer/cats/Cat.ts` |
| Top scratcher timings, pace, rip odds | `src/shared/constants.ts` (`SCRATCH_*`) |
| Top scratcher descent and outcomes | `src/renderer/cats/ScratchCat.ts` |
| Which behaviour a cat uses (peeker / scratcher) | `src/renderer/cats/CatActor.ts` (`createCatActor`) |
| Shared easing + the miss shudder | `src/renderer/cats/motion.ts` |
| Clickable shape of a cat | `src/renderer/overlay/hitTest.ts` |
| Where a toast lands (flips below a top-edge cat) | `src/renderer/overlay/toast.ts` |
| Every cat's look (one shared definition per cat) | `src/shared/artwork.ts` |
| The roster's data | `src/shared/cats.ts` |
| The roster window markup and styling | `src/renderer/catalog/index.html` |