/**
 * Generates a visual sheet of every cat anchor: where the cat rests on screen,
 * where it comes from, and what the roster currently contains.
 *
 * Reads the real placement code so the preview cannot drift from the game.
 * Run: npm run preview:anchors  ->  opens anchor-preview.svg
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')

/** Resolve the same @shared / @renderer aliases that vite and vitest use. */
const ALIASES = {
  '@shared/': path.join(root, 'src/shared'),
  '@renderer/': path.join(root, 'src/renderer')
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    let target = specifier

    for (const [prefix, dir] of Object.entries(ALIASES)) {
      if (specifier.startsWith(prefix)) {
        target = path.join(dir, specifier.slice(prefix.length))
        break
      }
    }

    // Relative imports need to hit the filesystem before we can probe extensions.
    if (!path.isAbsolute(target) && context.parentURL?.startsWith('file:')) {
      target = path.join(fileURLToPath(context.parentURL), '..', target)
    }

    // vite and vitest resolve extensionless imports; node needs the extension.
    if (target.startsWith(root) && !existsSync(target)) {
      for (const ext of ['.ts', '/index.ts']) {
        if (existsSync(target + ext)) {
          target += ext
          break
        }
      }
    }

    if (path.isAbsolute(target)) target = pathToFileURL(target).href
    return nextResolve(target, context)
  }
})

const { EDGE_MARGIN, resolvePlacement } = await import('../src/renderer/cats/placements.ts')
const { CAT_CATALOG } = await import('../src/shared/cats.ts')

const BOUNDS = { width: 1920, height: 1032 }
const SIZE = { width: 96, height: 96 }
const TASKBAR = 40

const ANCHORS = ['corner', 'bottom', 'side', 'top']

const ANCHOR_LABEL = {
  corner: 'Corner (bottom-right)',
  bottom: 'Bottom edge (centred)',
  side: 'Side edge (left, mid-height)',
  top: 'Top edge (70% across)'
}

const PALETTE = { fur: '#f3c98b', shade: '#dba76a', belly: '#ffeacb', ink: '#241c16' }

/** Same geometry as the Pixi placeholder in src/renderer/cats/sprite.ts. */
function catSvg(x, y, size, fill) {
  const u = size / 32
  const bodyTop = 14 * u
  const ears = [
    [size / 2 - 9 * u, bodyTop - 4 * u, size / 2 - 7 * u, bodyTop - 11 * u, size / 2 - 2 * u, bodyTop - 6 * u],
    [size / 2 + 9 * u, bodyTop - 4 * u, size / 2 + 7 * u, bodyTop - 11 * u, size / 2 + 2 * u, bodyTop - 6 * u]
  ]
  return `<g transform="translate(${x},${y})" fill="${fill}">
  <ellipse cx="${size / 2}" cy="${bodyTop + 9 * u}" rx="${10 * u}" ry="${8 * u}"/>
  <ellipse cx="${size / 2}" cy="${bodyTop + 11 * u}" rx="${6 * u}" ry="${5 * u}" fill="${PALETTE.belly}" opacity="0.55"/>
  <circle cx="${size / 2}" cy="${bodyTop}" r="${9 * u}"/>
  ${ears.map((e) => `<polygon points="${e[0]},${e[1]} ${e[2]},${e[3]} ${e[4]},${e[5]}" fill="${PALETTE.shade}"/>`).join('\n  ')}
  <circle cx="${size / 2 - 3.2 * u}" cy="${bodyTop - 1 * u}" r="${1.1 * u}" fill="${PALETTE.ink}"/>
  <circle cx="${size / 2 + 3.2 * u}" cy="${bodyTop - 1 * u}" r="${1.1 * u}" fill="${PALETTE.ink}"/>
  <polygon points="${size / 2},${bodyTop + 2 * u} ${size / 2 - 1 * u},${bodyTop + 3.2 * u} ${size / 2 + 1 * u},${bodyTop + 3.2 * u}" fill="${PALETTE.ink}"/>
</g>`
}

const MAP_W = 1200
const S = MAP_W / BOUNDS.width
const MAP_H = Math.round(BOUNDS.height * S)
const CARD_W = 288
const CARD_GAP = 16
const CARD_H = 264
const HEADER = 74
const ROSTER_H = 118
const TOTAL_H = HEADER + MAP_H + 28 + CARD_H + 28 + ROSTER_H

const mx = (v) => (v * S).toFixed(1)

const screenMap = [
  `<rect x="0" y="0" width="${MAP_W}" height="${MAP_H}" rx="8" fill="#211d1a" stroke="#4a4038"/>`,
  // a fake desktop window, to show the overlay sits on top of real windows
  `<rect x="${mx(120)}" y="${mx(90)}" width="${mx(620)}" height="${mx(380)}" rx="6" fill="#2f2a26" stroke="#574b41"/>`,
  `<rect x="${mx(120)}" y="${mx(90)}" width="${mx(620)}" height="${mx(30)}" rx="6" fill="#3b332d"/>`,
  `<text x="${mx(136)}" y="${mx(110)}" fill="#8d7f72" font-family="ui-sans-serif,system-ui" font-size="13">an ordinary window you are working in</text>`,
  // taskbar
  `<rect x="0" y="${mx(BOUNDS.height - TASKBAR)}" width="${MAP_W}" height="${mx(TASKBAR)}" fill="#181513"/>`,
  `<text x="10" y="${mx(BOUNDS.height - TASKBAR / 2) + 4}" fill="#6d6157" font-family="ui-sans-serif,system-ui" font-size="12">taskbar — overlay window stops here (display.workArea)</text>`
]

const legend = []
for (const [i, anchor] of ANCHORS.entries()) {
  const p = resolvePlacement(anchor, BOUNDS, SIZE)
  legend.push(
    `<g>
  <line x1="${mx(p.fromX)}" y1="${mx(p.fromY + SIZE.height / 2)}" x2="${mx(p.x + SIZE.width / 2)}" y2="${mx(p.y + SIZE.height / 2)}"
        stroke="${PALETTE.fur}" stroke-width="2" stroke-dasharray="6 5" opacity="0.75" marker-end="url(#arrow)"/>
  ${catSvg(mx(p.x), mx(p.y), SIZE.width * S, PALETTE.fur)}
  <circle cx="${mx(p.x + SIZE.width / 2)}" cy="${mx(p.y + SIZE.height / 2)}" r="16" fill="none" stroke="${PALETTE.fur}" stroke-width="1.5" opacity="0.9"/>
  <text x="${mx(p.x + SIZE.width / 2)}" y="${mx(p.y + SIZE.height / 2) - 24}" fill="${PALETTE.fur}"
        font-family="ui-sans-serif,system-ui" font-size="13" font-weight="600" text-anchor="middle">${i + 1} ${anchor}</text>
</g>`
  )
}

const cards = ANCHORS.map((anchor, i) => {
  const p = resolvePlacement(anchor, BOUNDS, SIZE)
  const cx = i * (CARD_W + CARD_GAP)
  const zoom = 1.9
  const catW = SIZE.width * zoom
  return `<g transform="translate(${cx},${HEADER + MAP_H + 28})">
  <rect x="0" y="0" width="${CARD_W}" height="${CARD_H}" rx="8" fill="#211d1a" stroke="#4a4038"/>
  <text x="14" y="26" fill="#f0e6da" font-family="ui-sans-serif,system-ui" font-size="14" font-weight="600">${i + 1}. ${ANCHOR_LABEL[anchor]}</text>
  <text x="14" y="46" fill="#8d7f72" font-family="ui-monospace,Consolas" font-size="11">anchor: "${anchor}"</text>
  ${catSvg((CARD_W - catW) / 2, 62, catW, PALETTE.fur)}
  <text x="14" y="${CARD_H - 46}" fill="#c9bcae" font-family="ui-monospace,Consolas" font-size="11">rests at  x=${p.x}  y=${p.y}</text>
  <text x="14" y="${CARD_H - 30}" fill="#8d7f72" font-family="ui-monospace,Consolas" font-size="11">enters from x=${p.fromX} y=${p.fromY}</text>
  <text x="14" y="${CARD_H - 14}" fill="#6d6157" font-family="ui-monospace,Consolas" font-size="11">edge margin ${EDGE_MARGIN}px · sprite ${SIZE.width}x${SIZE.height}</text>
</g>`
})

const rosterRows = CAT_CATALOG.map(
  (cat) => `<text x="14" y="0" fill="#c9bcae" font-family="ui-monospace,Consolas" font-size="12">${cat.id} — "${cat.name}" · ${cat.rarity} · difficulty ${cat.difficulty} · anchors: [${cat.anchors.join(', ')}]</text>`
)

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MAP_W}" height="${TOTAL_H}" viewBox="0 0 ${MAP_W} ${TOTAL_H}" font-family="ui-sans-serif,system-ui">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${PALETTE.fur}"/>
    </marker>
  </defs>
  <rect width="${MAP_W}" height="${TOTAL_H}" fill="#15120f"/>
  <text x="0" y="30" fill="#f0e6da" font-size="21" font-weight="700">Whisker Edge — cat anchors and roster</text>
  <text x="0" y="52" fill="#8d7f72" font-size="13">Generated from src/renderer/cats/placements.ts at ${BOUNDS.width}x${BOUNDS.height} (primary display workArea). Cat sprite is ${SIZE.width}x${SIZE.height}.</text>
  <text x="0" y="68" fill="#6d6157" font-size="11">Currently spawn() only uses anchors[0], so in play you see anchor 1. The rest are wired but not selected yet — that is Phase 1 (P1.2).</text>
  ${screenMap.join('\n  ')}
  ${legend.join('\n  ')}
  ${cards.join('\n  ')}
  <g transform="translate(0,${HEADER + MAP_H + 28 + CARD_H + 28})">
    <rect x="0" y="0" width="${MAP_W}" height="${ROSTER_H - 10}" rx="8" fill="#211d1a" stroke="#4a4038"/>
    <text x="14" y="26" fill="#f0e6da" font-size="14" font-weight="600">Roster (${CAT_CATALOG.length} cat${CAT_CATALOG.length === 1 ? '' : 's'})</text>
    ${rosterRows.map((row, i) => `<g transform="translate(0,${46 + i * 18})">${row}</g>`).join('\n  ')}
    ${CAT_CATALOG.length < 4 ? `<text x="14" y="${46 + CAT_CATALOG.length * 18 + 4}" fill="#6d6157" font-size="11">Add more cats in src/renderer/cats/catalog.ts — each is one data object, no code changes needed.</text>` : ''}
  </g>
</svg>`

const out = path.join(root, 'anchor-preview.svg')
mkdirSync(path.dirname(out), { recursive: true })
writeFileSync(out, svg)
console.log(`wrote anchor-preview.svg (${ANCHORS.length} anchors, ${CAT_CATALOG.length} cat(s))`)
for (const anchor of ANCHORS) {
  const p = resolvePlacement(anchor, BOUNDS, SIZE)
  console.log(`  ${anchor.padEnd(7)} rests x=${String(p.x).padStart(4)} y=${String(p.y).padStart(4)}  from x=${String(p.fromX).padStart(5)} y=${String(p.fromY).padStart(5)}`)
}
