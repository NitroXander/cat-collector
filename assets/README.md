# Assets

## sprites/

Pixel-art sprite sheets, one PNG per cat, loaded by the `sprite` field in
`data/cats/*.json`. Each sheet is laid out as horizontal frame strips, one strip
per animation:

| Strip | Frames | Used by |
| --- | --- | --- |
| peekIn | 6 | entering from off-screen |
| peeking | 6 | idle, looking around |
| peekOut | 6 | leaving |
| walk | 8 | bottom + side anchors |
| sit | 4 | bottom anchor |
| groom | 6 | bottom anchor |
| hang | 4 | top anchor |
| tailWag | 6 | top anchor |
| slip | 6 | screen-rip event |
| captured | 6 | successful collect |
| flee | 4 | ran away |

**Base canvas is 32x32**, rendered at `SPRITE_SCALE` (3) and snapped with
`NEAREST` so pixels stay crisp at 100–150% Windows scaling.

Start with one cat and one animation set. `src/renderer/cats/sprite.ts` currently
draws a vector placeholder; real sheets implement the same `CatSprite` interface
so `Cat` and the director do not change.

## atlases/

JSON atlas files (Aseprite "Export Sprite Sheet") for Pixi to load by frame name.

## audio/

Soft meows, purr loop, capture jingle, UI clicks. Must be self-made or clearly
licensed — record the source in `CREDITS.md`.

## ui/

Catalog and settings window assets.
