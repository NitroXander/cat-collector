# Cat Overlay Game: Full Development Plan

A calm desktop-overlay cat collector for Windows. Cats peek, walk, hang and wag their tails around the edges of your screen while you work. You catch them with a net, fish, treats and toys. Built with Electron + TypeScript, published on Steam with achievements.

**Working title:** *Whisker Edge* (placeholder) **Assumptions:** solo developer, part-time (about 10–15 h/week). Durations are calendar weeks at that pace, so roughly 6 months to a Steam release.

---

## 1. Vision and design pillars

| Pillar | Meaning | Design consequence |
| --- | --- | --- |
| **Calm** | Eases the mind, never demands attention | Slow spawn rate, soft sounds, no timers or penalties |
| **Unobtrusive** | Works alongside real work | Click-through by default, never steals focus, quiet mode, tiny CPU/RAM footprint |
| **Delightful** | Small surprises make you smile | Distinct cat personalities, rare events (screen rip), cosmetic collection |
| **Collectible** | Gentle long-term goal | Catalog with silhouettes, rarity tiers, achievements |

**Non-goals:** competitive play, multiplayer, real-money purchases, anything that punishes the player for ignoring the game.

---

## 2. Scope

### MVP (Phase 2 exit)

- Transparent click-through overlay on all monitors
- 5 cats, 2 capture tools (net, fish), spawn director, save/load
- Tray menu (pause, quiet mode, quit), basic catalog window

### v1.0 (Steam launch)

- 15–20 cats across 4 rarity tiers, 4 tools, cosmetics, cat room
- Rare screen-rip event, full sound, settings, autostart option
- 25–30 Steam achievements, Steam Cloud saves
- Store page, trailer, capsule art

### Post-launch

- Seasonal cats and events, new tools, more cats via data-only updates
- Steam Workshop or community cat packs (stretch)
- Localization

---

## 3. Technology stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Shell | Electron + `electron-vite` | Fast dev loop, HMR for renderer |
| Language | TypeScript (strict) | State machines and saves need types |
| Rendering | PixiJS (Canvas 2D fallback) | Sprite batching; `scaleMode = NEAREST` for crisp pixels |
| Audio | Howler.js | Pooled sounds, global volume and mute |
| Validation | Zod | Validate cat JSON and save files |
| Steam | `steamworks.js` | Achievements, cloud, overlay support |
| Packaging | `electron-builder` + SteamPipe | NSIS installer for testing, depot upload for Steam |
| Art tools | Aseprite (pixel) or Blender (low poly, rendered to sprites) | Export sprite sheet + JSON atlas |
| Testing | Vitest (logic), manual QA matrix (overlay) | State machine and spawn logic are pure and unit-testable |

**Decision: 2D pixel art first.** It is cheaper to animate (a 6–10 frame loop per behavior), renders cheaply, and is easier to keep consistent across 20 cats. Low poly can come later as a style variant, not a v1 goal.

---

## 4. Architecture

### 4.1 Process model

```
┌────────────────────────── Main process ──────────────────────────┐
│ Window manager │ Tray │ Steam client │ Save manager │ Settings    │
└───────┬───────────────────────────────────────────────┬──────────┘
        │ IPC (contextBridge, typed channels)           │
┌───────▼───────────────┐                     ┌─────────▼─────────┐
│ Overlay renderer      │  one per monitor    │ Catalog/Settings  │
│ game loop, cats, tools│                     │ window (on demand)│
└───────────────────────┘                     └───────────────────┘
```

- `contextIsolation: true`, `nodeIntegration: false`. The renderer only gets a small typed API from `preload.ts`.
- **One simulation, many views:** the main process owns game state (or a hidden "sim" renderer does). Each overlay renderer draws only the cats anchored to its monitor. This avoids duplicated cats across monitors.
- The catalog and settings windows are created on demand and destroyed when closed, to save memory.

### 4.2 Folder structure

```
cat-overlay/
├─ src/
│  ├─ main/          index.ts, windows.ts, tray.ts, steam.ts, save.ts, ipc.ts
│  ├─ preload/       index.ts  (typed bridge)
│  ├─ shared/        types.ts, schema.ts, constants.ts
│  └─ renderer/
│     ├─ overlay/    loop.ts, world.ts, hitTest.ts, renderer.ts
│     ├─ cats/       Cat.ts, states/*.ts, director.ts, catalog.ts
│     ├─ tools/      Net.ts, Fish.ts, Toy.ts, TreatJar.ts
│     ├─ ui/         catalog/, settings/, toasts/
│     └─ achievements/ manager.ts, definitions.ts
├─ assets/           sprites/, atlases/, audio/, ui/
├─ data/             cats/*.json, tools.json, achievements.json
├─ resources/        tray icons, installer art, steam_appid.txt
└─ tests/
```

### 4.3 Key modules

| Module | Responsibility |
| --- | --- |
| `windows.ts` | Create/destroy one overlay per display, react to display add/remove/metrics changes |
| `hitTest.ts` | Decide if the cursor is over a cat or UI element (bounding box, then alpha-pixel check) |
| `director.ts` | Spawn scheduling, rarity rolls, cooldowns, max-cats-on-screen |
| `Cat.ts` | Owns position, anchor, personality, and the current state |
| `save.ts` | Atomic JSON writes, schema versioning, backups |
| `achievements/manager.ts` | Listens to game events, unlocks locally, mirrors to Steam |

---

## 5. Overlay window specification

```ts
const win = new BrowserWindow({
  x, y, width, height,           // display.bounds
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
2. On each `mousemove`, the renderer hit-tests the cursor against interactive things (cats, active tool, UI toasts).
3. On a change (over → not over), the renderer calls `setMouseCapture(bool)`, and the main process calls `win.setIgnoreMouseEvents(!capture, { forward: true })`.
4. Throttle IPC: send only on state change, never per mouse move.

**Screen geometry**

- Top, left and right edges use `display.bounds`; the bottom edge uses `display.workArea` so cats sit on the taskbar line.
- Listen to `screen` events (`display-added`, `display-removed`, `display-metrics-changed`) and rebuild overlays.
- Test at 100%, 125%, 150%, and mixed-DPI monitors.

**Known limits (document these on the store page)**

- Exclusive-fullscreen games hide the overlay; borderless windowed works.
- Some anti-cheat systems flag overlays, so a tray "Pause" is a must.

---

## 6. Game design specification

### 6.1 Cat anchors and behaviors

| Anchor | Behaviors | Notes |
| --- | --- | --- |
| **Corner** | peek in, peek, look around, peek out | Shy cats |
| **Bottom edge** | walk, sit, groom, nap | Walks along the taskbar line |
| **Side edge** | peek from the side, reach paw |  |
| **Top edge** | hang by claws, tail wag, swing | Rare slip → fall |

### 6.2 Cat state machine

```
peekIn → peeking → peekOut → (removed)
walking → sitting → walking → peekOut
hangingIdle ⇄ tailWag → (rare) slipping → falling → landed → walking
any → tempted (bait nearby) → approaching → captured
any → fled (missed too often, or lifetime expired)
```

Each state defines: animation, duration range, allowed transitions with weights, and whether the cat is capturable.

### 6.3 Personality and traits (data-driven)

Each cat has weights from 0 to 1: **shyness** (peek vs walk), **curiosity** (reacts to bait), **clumsiness** (slip chance), **speed**. These make cats feel different without custom code.

### 6.4 Spawn director

- Default: one cat every 60–180 s, max 2 on screen, configurable in settings (Chill / Normal / Busy).
- Rarity table: Common 60%, Uncommon 25%, Rare 12%, Legendary 3% (tunable).
- Rules: the same cat is not spawned twice in a row, time-of-day cats (e.g. a night cat) are available only at certain hours, and a rare-cat pity timer guarantees one every N spawns.
- Never spawns while Quiet mode is on, and pauses after idle.

### 6.5 Capture tools

| Tool | How it works | Best against |
| --- | --- | --- |
| **Net** | Click, short windup, sweep area | Walking and sitting cats |
| **Fish** | Place bait on the screen; curious cats approach; click when close | Curious cats |
| **Cat food** | Same as fish, slower but calmer lure, stays longer | Shy cats |
| **Toy (feather)** | Drag to lure; cat chases; click to catch | Peeking cats |
| **Treat jar** | Consumable: boosts rare odds for 5 minutes | Rarity hunting |

**Capture rule:** each cat has a catch difficulty (0–1). Success chance = tool power × cat state modifier × (1 − difficulty). A miss makes the cat flinch, and three misses make it flee. There is no punishment to the player.

### 6.6 Rare screen-rip event

Applies to hanging cats only (clumsiness-weighted, around 1 in 40 hangs).

1. Cat slides, with a small "uh-oh" animation.
2. A claw-tear decal appears at the top edge with a soft "rrrip" sound.
3. Cat falls with simple gravity, lands softly at the bottom, and becomes easy to catch for 10 s.
4. The tear fades within 5 s. It is purely cosmetic and never affects the user's actual windows.
5. Fires the achievement *Oops*.

### 6.7 Progression and meta

- **Currency:** fish coins per capture (more for rare cats).
- **Shop:** better nets, more bait, treat jars, cosmetics (hats, collars).
- **Catalog ("Catdex"):** silhouettes for unseen cats, then name, rarity, flavor text, capture stats once found.
- **Cat room:** an optional small window where caught cats lounge and can be petted. Gives the collection a home.
- **Idle progress:** discoveries keep coming at the director's pace, with no required play sessions.

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

**Rules:** atomic write (temp file + rename), keep `save.bak`, migrate by `version`, validate with Zod on load, and fall back to the backup if invalid.

---

## 8. Achievements (initial 28)

| Group | Achievements |
| --- | --- |
| **Getting started** | First Catch · Open the Catalog · Buy a Tool |
| **Collection** | 5 / 10 / 20 cats · Complete a rarity tier · Complete the Catdex |
| **Skill** | 100 captures · Catch with each tool type · 5 captures in a row · Catch a cat mid-fall |
| **Moments** | *Oops* (see a screen rip) · Catch a cat right after a rip · Witness 10 rips |
| **Time** | 3-day and 7-day streaks · Night Owl (catch after midnight) · Early Bird |
| **Rarity** | First Rare · First Legendary · 10 Rares |
| **Cosmetics** | Dress a cat · Own 5 cosmetics |
| **Secret** | Pet a cat 50 times · Leave a cat alone for 10 minutes and it comes to you |

Each has a stable ID (e.g. `ACH_FIRST_CATCH`) matching the Steamworks entry. Unlock locally first, then mirror to Steam, so the game works offline and outside Steam.

---

## 9. Art and audio pipeline

### Art

- **Canvas size:** 32×32 base cats, scaled ×3 or ×4 at runtime (set per DPI). Palette of 24–32 colors shared across the game for cohesion.
- **Per cat sheets:** peek (6 f), walk (8 f), sit (4 f), groom (6 f), hang (4 f), tail-wag (6 f), slip/fall/land (6 f), captured (6 f), flee (4 f).
- **Reuse:** build 3 base body shapes and recolor/pattern them for commons, and hand-draw rares and legendaries.
- **Export:** Aseprite → PNG sheet + JSON atlas → loaded by name in Pixi.
- **Cost control:** commons share animation templates, so one new cat is mostly a palette swap plus 1–2 unique frames.

### Audio

- Soft meows (3–4 variants), purr loop, tool sounds, claw-tear, capture jingle, UI clicks.
- Respect system volume, add a global master slider, and mute while Quiet mode is on.
- Use only licensed or self-made audio; keep a `CREDITS.md` for every asset source.

---

## 10. Roadmap

### Phase 0: Overlay prototype (1 week)

- Electron + Vite + TS skeleton
- Transparent overlay, one placeholder sprite peeking in a corner
- Hit-test + click-capture toggle
- **Exit:** overlay is click-through, a cat can be clicked, and CPU stays idle when nothing happens.

### Phase 1: Core loop (3 weeks)

- Game loop (30 FPS cap), `Cat` + state machine, all four anchor types
- Spawn director v1, net tool, capture success/fail
- Save/load, tray (pause, quit)
- Multi-monitor windows and screen geometry handling
- **Exit:** play 30 minutes uninterrupted: cats appear, can be caught, and progress persists across restarts.

### Phase 2: MVP content and UI (4 weeks)

- 5 cats, fish tool, coins, catalog window, settings window
- Quiet mode, spawn-rate setting, sound v1
- Unit tests for the state machine, director and save migration
- **Exit:** MVP checklist in section 2 complete. Share a build with 3–5 friends.

### Phase 3: Depth and juice (4 weeks)

- Expand to 15–20 cats, toy and treat jar, rarity and pity system
- Hanging and screen-rip event, particles, animation polish
- Shop, cosmetics, cat room
- **Exit:** a full session feels varied, and the rare moments land well in playtests.

### Phase 4: Steam integration (3 weeks)

- Steamworks account, app setup, `steamworks.js` integration
- Achievement definitions in Steamworks and the in-game manager
- Cloud save configuration, Steam overlay check
- Store page draft, capsule art, screenshots, trailer
- **Exit:** achievements unlock in a Steam build, and cloud saves sync across two machines.

### Phase 5: Hardening and QA (3 weeks)

- Performance, memory, DPI and multi-monitor audit
- Crash handling and logging, installer and uninstall test
- Wider playtest (10–20 players), balance pass on spawn and capture rates
- **Exit:** budgets in section 12 met, with no known crash bugs.

### Phase 6: Release (2 weeks)

- Valve review of build and store page, release candidate
- "Coming Soon" page live **earlier** (start of Phase 4) to gather wishlists
- Launch day checklist, then a hotfix window
- **Exit:** released on Steam.

**Buffer:** add 20–25% to the total. Art and Steam review are the usual overruns.

---

## 11. Steam release checklist

1. Pay the Steam Direct fee for the app (confirm the current amount on Steamworks).
2. Complete tax and bank info, and verify identity.
3. Create the app, then set up achievements (name, description, icons for locked/unlocked).
4. Configure Steam Cloud paths and quotas.
5. Prepare store assets: header, capsule, library art, 5+ screenshots, trailer, description.
6. Publish the "Coming Soon" page and start collecting wishlists.
7. Build with `electron-builder`, upload with SteamPipe (`steamcmd`), set the default branch.
8. Submit the store page and build for review, and plan for turnaround time.
9. Add `steam_appid.txt` for dev only, never ship it in the final depot.
10. Prepare patch notes, a Steam Community hub, and a short FAQ (anti-cheat note, fullscreen limitation).

---

## 12. Quality targets

| Metric | Target |
| --- | --- |
| Idle CPU (no cat on screen) | \< 1% |
| Active CPU (2 cats animating) | \< 5% |
| RAM (overlay running) | \< 200 MB |
| Frame rate | 30 FPS, paused when hidden |
| Startup to first window | \< 3 s |
| Install size | \< 250 MB |
| Click-through | Zero missed clicks on windows underneath |

### QA matrix

- Windows 10 and 11
- 1, 2 and 3 monitors; 100–150% DPI; mixed DPI
- Games in borderless, windowed and exclusive fullscreen
- Typical apps underneath (browsers, IDEs, video calls), checking that focus is never stolen
- Sleep/wake, monitor hot-plug, taskbar auto-hide and different taskbar positions
- Fresh install, upgrade with an existing save, and corrupted save recovery

---

## 13. Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Electron RAM and CPU footprint | Users uninstall a background app | Profile from Phase 0, destroy unused windows, 30 FPS cap, pause when idle |
| Overlay conflicts with games or anti-cheat | Bad reviews | Tray Pause, quiet mode, honest store-page notes, no hooks or injection |
| Click-through bugs on Windows | Blocks users' work | Test early and often, keep a global emergency hotkey that disables capture |
| Art scope creep | Schedule slips | Shared body templates, data-driven cats, ship fewer cats with more polish |
| Steam review delays | Launch slip | Submit early, keep the build review-ready from Phase 4 |
| Crowded cute-game niche | Low visibility | Memorable hooks (screen rip, hanging cats), early wishlist campaign, short trailer |
| Asset licensing mistakes | Takedown | Track sources in `CREDITS.md`, prefer self-made or clearly licensed assets |

---

## 14. Post-launch plan

- **Weeks 1–2:** monitor crashes and reviews, ship hotfixes, adjust spawn and capture balance.
- **Month 1–3:** free content drops (new cats, a seasonal event), since cats are data-driven.
- **Later:** localization, more tools and cosmetics, community requests, possible Workshop support.

---

## 15. Definition of done (v1.0)

- All v1.0 features in section 2 shipped and playable for hours without a crash
- Quality targets in section 12 met on the QA matrix
- Achievements and cloud saves verified in a real Steam build
- Store page approved, trailer and screenshots live
- `CREDITS.md` and licenses complete
- A documented release process so a patch can ship in under a day