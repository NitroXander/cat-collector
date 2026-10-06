# Cat Overlay Game: Trimmed Plan (v1 scope)

**Working title:** *Whisker Edge* (placeholder)

The full plan lives in `Cat Overlay Game_ Full Development Plan.md`. This document is the
**executable scope** for a part-time solo build, after the five scoping decisions below.
Target pace: 10–15 h/week.

## Locked decisions

| # | Decision | Consequence |
| --- | --- | --- |
| 1 | **No Steam in the build** | `steamworks.js` is not a dependency. Achievements are local-only. Steam is a later, optional integration layer. |
| 2 | **Single monitor** | One overlay window on the primary display. No display add/remove handling, no mixed DPI. |
| 3 | **One placeholder cat sprite first** | Ship a single placement image to prove the base, then tune *where* cats appear, then add cats. Cat count is not a v1 milestone. |
| 4 | **No tools — click to collect** | No net/fish/toy/jar. The cursor *is* the tool. Capture = click a cat. |
| 5 | **Phases 0–4 are the target** | Vertical slice first, then a satisfying "base game", then polish. No Steam, no store page, no trailer. |

**Non-negotiable:** build first, ship to Steam later (if ever).

---

## 1. Vision and design pillars

| Pillar | Meaning | Design consequence |
| --- | --- | --- |
| **Calm** | Eases the mind, never demands attention | Slow spawn rate, soft sounds, no timers or penalties |
| **Unobtrusive** | Works alongside real work | Click-through by default, never steals focus, quiet mode, tiny CPU/RAM footprint |
| **Delightful** | Small surprises make you smile | Distinct cat personalities, rare events (screen rip), cosmetic collection |
| **Collectible** | Gentle long-term goal | Catalog with silhouettes, rarity tiers |

**Non-goals:** competitive play, multiplayer, real-money purchases, anything that punishes
the player for ignoring the game.

---

## 2. Scope

### The vertical slice (the real milestone)
- Transparent click-through overlay on the primary display
- One cat, one sprite, appears and disappears calmly
- Click the cat to collect it; progress persists across restarts
- Tray: pause, quiet mode, quit
- Exits when: the overlay is truly click-through, a click never hits the window underneath,
  and CPU idles near zero when no cat is on screen.

### v1.0 ("base game" done)
- Several cats (expand only after the placement/animation feels right)
- Full cat state machine (peek, walk, sit, hang, sleep) across anchors
- Spawn director with rarity + cooldowns
- Catalog window, settings window
- Sound v1, quiet mode, rarity/pity system, screen-rip event
- Local achievements, cat room

### Deferred (explicitly not now)
- Steam (publishing, achievements, cloud, store page, trailer)
- Multi-monitor
- Capture tools
- Shop / cosmetics monetization
- Localization, Workshop

---

## 3. Technology stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Shell | Electron + `electron-vite` | Fast dev loop |
| Language | TypeScript (strict) | State machines and saves need types |
| Rendering | PixiJS (Canvas 2D fallback) | `scaleMode = NEAREST` for crisp pixels |
| Audio | Howler.js | Pooled sounds, global volume and mute |
| Validation | Zod | Validate cat JSON and save files |
| Packaging | `electron-builder` | NSIS installer for local testing |
| Art tools | Aseprite (pixel) or placeholder PNGs | Export sprite sheet + JSON atlas |
| Testing | Vitest (logic) | State machine and spawn logic are pure and unit-testable |

**Steam (`steamworks.js`) is intentionally absent.** If added later, it is a thin layer that
listens to the existing achievement events.

**Decision: 2D pixel art first.** 32×32 base, scaled ×3/×4 at runtime. Cheap to animate, cheap
to render, consistent across many cats.

---

## 4. Architecture

### 4.1 Process model (single monitor)

```
┌────────────────────────── Main process ──────────────────────────┐
│ Window manager │ Tray │ Save manager │ Settings                    │
└───────┬──────────────────────────────────────────────┬────────────┘
        │ IPC (contextBridge, typed channels)           │
┌───────▼────────────────────┐              ┌──────────▼─────────┐
│ Overlay renderer (1 only)  │              │ Catalog/Settings   │
│ game loop, cats, capture  │              │ window (on demand) │
└────────────────────────────┘              └────────────────────┘
```

- `contextIsolation: true`, `nodeIntegration: false`. Renderer gets a small typed API from `preload.ts`.
- **One simulation, one view:** the overlay renderer owns the cat simulation directly. (With a
  single monitor there is no cross-monitor sync problem to solve.)
- Catalog and settings windows are created on demand and destroyed when closed.

### 4.2 Folder structure

```
cat-overlay/
├─ src/
│  ├─ main/          index.ts, windows.ts, tray.ts, save.ts, ipc.ts
│  ├─ preload/       index.ts  (typed bridge)
│  ├─ shared/        types.ts, schema.ts, constants.ts
│  └─ renderer/
│     ├─ overlay/    loop.ts, world.ts, hitTest.ts, renderer.ts
│     ├─ cats/       Cat.ts, states/*.ts, director.ts, catalog.ts
│     ├─ ui/         catalog/, settings/, toasts/
│     └─ achievements/ manager.ts, definitions.ts
├─ assets/           sprites/, atlases/, audio/, ui/
├─ data/             cats/*.json, achievements.json
├─ resources/        tray icons, installer art
└─ tests/
```

(No `steam.ts`, no per-display window factory, no `tools/`.)

### 4.3 Key modules

| Module | Responsibility |
| --- | --- |
| `windows.ts` | Create/destroy the single overlay; position to primary display |
| `hitTest.ts` | Decide if the cursor is over a cat or UI element (bounding box, then alpha-pixel check) |
| `director.ts` | Spawn scheduling, rarity rolls, cooldowns, max-cats-on-screen |
| `Cat.ts` | Owns position, anchor, personality, and the current state |
| `save.ts` | Atomic JSON writes, schema versioning, backups |
| `achievements/manager.ts` | Listens to game events, unlocks locally (Steam hook lives here if added later) |

---

## 5. Overlay window specification

```ts
const display = screen.getPrimaryDisplay()
const { x, y, width, height } = display.workArea  // bottom edge uses workArea
const win = new BrowserWindow({
  x, y, width, height,
  transparent: true, frame: false, hasShadow: false,
  resizable: false, skipTaskbar: true,
  alwaysOnTop: true, focusable: false,
  webPreferences: { preload, contextIsolation: true }
})
win.setAlwaysOnTop(true, 'screen-saver')
win.setIgnoreMouseEvents(true, { forward: true })
```

**Click-through protocol**

1. Window ignores mouse events by default, but `forward: true` still delivers `mousemove`.
2. On each `mousemove`, the renderer hit-tests the cursor against the cat and UI.
3. On a change (over → not over), the renderer calls `setMouseCapture(bool)`, and the main
   process calls `win.setIgnoreMouseEvents(!capture, { forward: true })`.
4. Throttle IPC: send only on state change, never per mouse move.

**Screen geometry**

- Top / left / right use `display.bounds`; the bottom edge uses `display.workArea` so cats sit
  on the taskbar line.
- Keep a **global emergency hotkey** that disables capture entirely (anti-cheat / games).
- Test at 100%, 125%, 150% scaling (single monitor is enough for now).

**Known limits (note them now, document later)**

- Exclusive-fullscreen games hide the overlay; borderless windowed works.
- Some anti-cheat systems flag overlays, so the tray "Pause" is a must.

---

## 6. Game design specification

### 6.1 Capture: click to collect

- The cursor is the only tool. Move over a cat → the window briefly captures clicks; click →
  collect.
- **Capture rule:** each cat has a catch difficulty (0–1). Success chance =
  `base × cat state modifier × (1 − difficulty)`. A miss makes the cat flinch; three misses
  make it flee. No punishment to the player.
- *(Tools — net/fish/toy/jar — are deferred; the difficulty + state-modifier math above is
  designed to slot them in later without rework.)*

### 6.2 Cat anchors and behaviors

| Anchor | Behaviors | Notes |
| --- | --- | --- |
| **Corner** | peek in, peek, look around, peek out | Shy cats |
| **Bottom edge** | walk, sit, groom, nap | Walks along the taskbar line |
| **Side edge** | peek from the side, reach paw | |
| **Top edge** | hang by claws, tail wag, swing | Rare slip → fall |

**Tune placement first:** the first milestone is getting *one* cat to appear in a satisfying
spot (which anchor, how long, how it enters/exits). Only then do we add more anchors/cats.

### 6.3 Cat state machine

```
peekIn → peeking → peekOut → (removed)
walking → sitting → walking → peekOut
hangingIdle ⇄ tailWag → (rare) slipping → falling → landed → walking
any → fled (missed too often, or lifetime expired)
```

Each state defines: animation, duration range, allowed transitions with weights, and whether
the cat is capturable.

### 6.4 Personality and traits (data-driven)

Each cat has weights 0–1: **shyness** (peek vs walk), **curiosity**, **clumsiness** (slip
chance), **speed**. Different feel without custom code.

### 6.5 Spawn director

- Default: one cat every 60–180 s, max 2 on screen, configurable (Chill / Normal / Busy).
- Rarity table: Common 60%, Uncommon 25%, Rare 12%, Legendary 3% (tunable).
- Rules: no same cat twice in a row; time-of-day cats only at certain hours; rare-cat pity
  timer guarantees one every N spawns.
- Never spawns while Quiet mode is on; pauses after idle.

### 6.6 Rare screen-rip event (hanging cats, clumsiness-weighted, ~1 in 40 hangs)

1. Cat slides with a small "uh-oh" animation.
2. A claw-tear decal appears at the top edge with a soft "rrrip" sound.
3. Cat falls with simple gravity, lands softly at the bottom, and is easy to catch for 10 s.
4. The tear fades within 5 s. Purely cosmetic; never affects the user's real windows.
5. Fires the local achievement *Oops*.

### 6.7 Progression and meta

- **Currency:** fish coins per capture (more for rare cats).
- **Catalog ("Catdex"):** silhouettes for unseen cats, then name, rarity, flavor, capture
  stats once found.
- **Cat room:** optional small window where caught cats lounge and can be petted.
- **Idle progress:** discoveries keep coming at the director's pace, no required sessions.

---

## 7. Data model

### 7.1 Cat definition (`data/cats/*.json`)

```json
{
  "id": "mochi",
  "name": "Mochi",
  "rarity": "common",
  "sprite": "mochi",
  "anchors": ["corner", "bottom"],
  "traits": { "shyness": 0.7, "curiosity": 0.4, "clumsiness": 0.1, "speed": 0.5 },
  "difficulty": 0.2,
  "timeOfDay": null,
  "flavor": "Believes every corner is a hiding spot. It is not."
}
```

### 7.2 Save file (`userData/save.json`)

```ts
interface SaveV1 {
  version: 1
  caught: Record<string, { count: number; firstCaughtAt: string }>
  inventory: { coins: number; tools: Record<string, number>; cosmetics: string[] }
  stats: { totalCaptures: number; misses: number; ripsWitnessed: number; streakDays: number; lastPlayedDay: string }
  achievements: Record<string, { unlockedAt: string }>
  settings: { spawnRate: 'chill' | 'normal' | 'busy'; volume: number; quietMode: boolean; autostart: boolean; monitors: 'all' | 'primary' }
}
```

**Rules:** atomic write (temp file + rename), keep `save.bak`, migrate by `version`, validate
with Zod on load, fall back to the backup if invalid.

---

## 8. Achievements (local only, initial set)

| Group | Achievements |
| --- | --- |
| **Getting started** | First Catch · Open the Catalog |
| **Collection** | 3 / 8 / 15 cats · Complete a rarity tier |
| **Skill** | 50 captures · 5 captures in a row · Catch a cat mid-fall |
| **Moments** | *Oops* (see a screen rip) · Catch a cat right after a rip |
| **Time** | 3-day and 7-day streaks · Night Owl · Early Bird |
| **Rarity** | First Rare · First Legendary · 10 Rares |
| **Secret** | Pet a cat 50 times · Leave a cat alone 10 minutes and it comes to you |

Each has a stable ID (e.g. `ACH_FIRST_CATCH`). Unlocked locally first; the event bus that
fires these is where a future Steam mirror would attach.

---

## 9. Art and audio pipeline

### Art

- **Canvas size:** 32×32 base cats, scaled ×3/×4 at runtime. Shared 24–32 color palette.
- **Per cat sheets:** peek (6 f), walk (8 f), sit (4 f), groom (6 f), hang (4 f), tail-wag
  (6 f), slip/fall/land (6 f), captured (6 f), flee (4 f).
- **Reuse:** 3 base body shapes, recolored/patterned for commons; hand-draw rares/legendaries.
- **Export:** Aseprite → PNG sheet + JSON atlas → loaded by name in Pixi.
- **Start cheap:** one placeholder cat PNG to prove the base, then expand.

### Audio

- Soft meows (3–4 variants), purr loop, capture jingle, UI clicks.
- Respect system volume; global master slider; mute in Quiet mode.
- Licensed or self-made only; keep a `CREDITS.md` for every asset source.

---

## 10. Roadmap (part-time, Phases 0–4)

### Phase 0: Overlay vertical slice (1 week)
- Electron + Vite + TS skeleton
- Transparent overlay, one placeholder sprite peeking in a corner
- Hit-test + click-capture toggle
- Save/load minimal
- **Exit:** overlay is click-through, a cat can be clicked, CPU idles when idle, progress persists.

### Phase 1: Core loop (3 weeks)
- Game loop (30 FPS cap), `Cat` + state machine, anchor types
- Spawn director v1, click-to-collect success/fail
- Tray (pause, quiet, quit)
- **Exit:** play 30 minutes: cats appear, can be collected, progress persists.

### Phase 2: MVP content and UI (4 weeks)
- Expand to a handful of cats, catalog window, settings window
- Quiet mode, spawn-rate setting, sound v1
- Unit tests for state machine, director, save migration
- **Exit:** a friend can install it and have a good 15-minute session.

### Phase 3: Depth and juice (4 weeks)
- More cats, rarity + pity system
- Hanging + screen-rip event, particles, animation polish
- Cat room, cosmetics
- **Exit:** a full session feels varied; rare moments land well in playtests.

### Phase 4: Hardening and QA (3 weeks)
- Performance, memory, DPI audit
- Crash handling/logging, installer test
- Wider playtest, balance pass on spawn/capture
- **Exit:** quality targets met, no known crash bugs.

**Buffer:** add 20–25%. Art and QA are the usual overruns.

*(Steam release phases from the full plan are deferred until after Phase 4, if ever.)*

---

## 11. Quality targets

| Metric | Target |
| --- | --- |
| Idle CPU (no cat on screen) | < 1% |
| Active CPU (2 cats animating) | < 5% |
| RAM (overlay running) | < 200 MB |
| Frame rate | 30 FPS, paused when hidden |
| Startup to first window | < 3 s |
| Install size | < 250 MB |
| Click-through | Zero missed clicks on windows underneath |

### QA matrix (trimmed)

- Windows 10 and 11
- 100–150% scaling
- Games in borderless, windowed, exclusive fullscreen
- Typical apps underneath (browsers, IDEs, video calls) — focus never stolen
- Sleep/wake, taskbar auto-hide, different taskbar positions
- Fresh install, upgrade with existing save, corrupted save recovery

---

## 12. Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Electron RAM/CPU footprint | Users uninstall a background app | Profile from Phase 0, destroy unused windows, 30 FPS cap, pause when idle |
| Overlay conflicts with games/anti-cheat | Bad reviews | Tray Pause, quiet mode, emergency hotkey, no hooks or injection |
| Click-through bugs on Windows | Blocks users' work | Test early/often, global hotkey to disable capture |
| Art scope creep | Schedule slips | Shared body templates, data-driven cats, ship fewer cats with more polish |
| Crowded cute-game niche | Low visibility (if shipped) | Memorable hooks, short trailer (later) |
| Asset licensing mistakes | Takedown | Track sources in `CREDITS.md`, prefer self-made |

---

## 13. Definition of done (v1.0 "base game")

- Vertical slice + core loop + a handful of cats, playable for hours without a crash
- Quality targets met on the QA matrix
- Catalog, settings, quiet mode, sound, screen-rip event working
- `CREDITS.md` and licenses complete
- *(Steam store page, achievements mirror, cloud saves, trailer — all deferred, optional later)*
