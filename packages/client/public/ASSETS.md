# Pixel sprite atlas v2

Generated with the built-in ImageGen tool. Accepted art is preserved; no alpha trimming, recoloring, or post-generation pixel resizing.

All final sheets have 4 columns × 3 rows of equal 480 × 480 cells (1920 × 1440 PNG, RGBA). The renderer uses the complete cell including transparent padding. Never crop inward or use content bounding boxes as the display viewBox.

Each ordinary sheet retains its original 362 × 362 source cells with 59 transparent pixels added on every side. The ownership sheet uses a transparent 1536 × 1152 source canvas with 384 × 384 cells and 48 transparent pixels on every side. These mechanical operations preserve all original source pixels. Unused ownership cells stay transparent.

Files in `assets/`: `industry-v2.png`, `society-v2.png`, `goods-v2.png`, `symbols-v2.png`, `regions-v2.png`, `ownership-v2.png`. `sprite-manifest-v2.json` records cell order and source filenames. `src/spriteAtlas.ts` disambiguates furniture goods and buildings. Regional art is dedicated, not aliased to local buildings.

Prompt specification: transparent industrial-era pixel art; predefined 12 equal cells; generous empty padding on four sides; all artwork strictly inside its cell; strong silhouettes, thick outlines, contrasting dominant colors; no labels or visible grid. Region landmarks use blue/ivory sail, golden fields, ochre windmill plateau, turquoise marsh, emerald forest, charcoal/red mine and silver/violet gorge. Buildings use distinct roof colors and recognizable functional objects. Final ownership prompt is recorded verbatim in `docs/sprite-generation-prompts.json`; earlier exact prompt strings were lost when the tool runtime reset, so this document records their specification instead.

UI renders complete cells larger for legibility: market goods 48 px, building cards 72 px, regional headings 88 px, inspector buildings 100 px. Browser downsampling is smooth; sprites are never cropped to fake a larger size. Text and neighboring content reserve the full display box.


## Generated atlas map and icons — 2026-10-24

Created with the built-in OpenAI image-generation tool in this Codex conversation. The user supplied the cartoon prop reference and explicitly requested generation and game integration. The October 24 instruction supersedes the scenic watercolor description: the map is a flat, simple geographic atlas, without buildings, forests or landscape illustrations.

- Map original: `assets/map/map-base.png`; runtime: `assets/map/map-base.webp`. Generated coastline traced into `src/map/regions.svg`; shared region boundaries follow the simulation's nine neighbor pairs. Plain land continues beyond the image frame through SVG extensions. Political colors are runtime data, never baked into the image.
- Icon originals: `assets-src/icons/raw/`, 13 sheets, six equal cells per source. Final runtime atlases: `assets/icons/*.webp`, seven sheets with twelve equal 480×480 cells each. Every final cell includes at least 48px transparent padding; full cells are rendered. No simulated good, building or population class aliases another icon.
- Icon manifest and subjects: `assets-src/icons.json`; deterministic packing: `scripts/icons/pack.py` (Pillow). Generated output mapping: `src/spriteSheets.gen.ts`. Small-size visual proof: `assets/icons/readability-preview.png` (40px and 24px).
- Initial icons were generated October 22. On October 24, the incorrectly arranged four-item sheet and five sheets whose artwork touched cell edges were regenerated, and missing event/weather/new-system icons were generated. Final total: 72 icons, including liquor, distillery and trading post.
- Verification commands: `npm run assets:check -w @econ/client`, `npm run typecheck`, `npm run build -w @econ/client`.

### Generation prompts

Map final edit prompt (reference: the first flat atlas candidate):

> Edit this flat atlas map for use as a game base. Keep the upper and left coast shape exactly. Remove EVERY internal brown political boundary line; keep only the coastline outline. Remove the lake and any grey patch in the center, replace with plain uniform ivory land. Remove all rivers too. Extend the continental land down to the entire bottom edge from x=400 onward; no sea bay along southern edge. Sea is only west and northwest. Ivory land must continue out of frame to north, east and south. Flatten the colors: uniform pale desaturated blue sea #93afb3, uniform parchment ivory land #eee4cc, no textures, no vignette, no gradients, no scenery, no labels, no icons. The result should be an extremely simple blank world atlas coastline map. Landscape 1536x1024.

Icon generation template (subject lists recorded in manifest; actual artwork inspected before packing):

> Create a game icon spritesheet in EXACT same chunky cartoon painted style as attached, strong dark outlines, bold distinct saturated colors, simple silhouette readable at 24px. Transparent background. Exact canvas1536x1024. Invisible STRICT 3 COLUMNS x 2 ROWS of equal 512x512 cells. Position centers row1 (256,256),(768,256),(1280,256); row2 (256,768),(768,768),(1280,768). Each object fits entirely within CENTRAL 350x350 of its cell, at least81px transparent padding each side. Never combine all objects in one row. No labels, frames, grid, shadows outside object, background. Slots in left-to-right row-major order: [subjects]. Retain empty cells as full 512px transparent spaces.

Layout repair template (five original sheets attached individually):

> Fix this spritesheet layout ONLY, keep the same six subjects and same art style. All icons MUST be smaller with generous transparent space. EXACT canvas1536x1024. Divide into STRICT3columns x2rows equal512pixel cells, centers (256,256),(768,256),(1280,256),(256,768),(768,768),(1280,768). SHRINK each icon to maximum320px wide and320px tall. Place precisely at its own cell center. At least96px completely transparent padding on all four sides within every cell. No object may touch or cross a cell edge. No frames, labels, grid, backdrop. Subjects row-major: [subjects]. Empty slots remain completely transparent. Preserve dark contour, bold distinct colors and simplified cartoon painted style.
