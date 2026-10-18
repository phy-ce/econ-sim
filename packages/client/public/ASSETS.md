# Pixel sprite atlas v2

Generated with the built-in ImageGen tool. Accepted art is preserved; no alpha trimming, recoloring, or post-generation pixel resizing.

All final sheets have 4 columns × 3 rows of equal 480 × 480 cells (1920 × 1440 PNG, RGBA). The renderer uses the complete cell including transparent padding. Never crop inward or use content bounding boxes as the display viewBox.

Each ordinary sheet retains its original 362 × 362 source cells with 59 transparent pixels added on every side. The ownership sheet uses a transparent 1536 × 1152 source canvas with 384 × 384 cells and 48 transparent pixels on every side. These mechanical operations preserve all original source pixels. Unused ownership cells stay transparent.

Files in `assets/`: `industry-v2.png`, `society-v2.png`, `goods-v2.png`, `symbols-v2.png`, `regions-v2.png`, `ownership-v2.png`. `sprite-manifest-v2.json` records cell order and source filenames. `src/spriteAtlas.ts` disambiguates furniture goods and buildings. Regional art is dedicated, not aliased to local buildings.

Prompt specification: transparent industrial-era pixel art; predefined 12 equal cells; generous empty padding on four sides; all artwork strictly inside its cell; strong silhouettes, thick outlines, contrasting dominant colors; no labels or visible grid. Region landmarks use blue/ivory sail, golden fields, ochre windmill plateau, turquoise marsh, emerald forest, charcoal/red mine and silver/violet gorge. Buildings use distinct roof colors and recognizable functional objects. Final ownership prompt is recorded verbatim in `docs/sprite-generation-prompts.json`; earlier exact prompt strings were lost when the tool runtime reset, so this document records their specification instead.

UI renders complete cells larger for legibility: market goods 48 px, building cards 72 px, regional headings 88 px, inspector buildings 100 px. Browser downsampling is smooth; sprites are never cropped to fake a larger size. Text and neighboring content reserve the full display box.
