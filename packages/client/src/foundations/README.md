# Estera game design system

Open `/foundations.html`. The catalogue presents game UI components in five levels: foundations, elements, information patterns, game components and window compositions. User-decision, reference and proposal-01 menus have been removed.

`GameDesignSystem.tsx` provides navigation, component search, preview/anatomy/usage tabs and links to constituent components. `game-copy.ts` contains the Korean/English catalogue and game labels. `game-catalogue.ts` records composition relationships and real component props. `game-ui.tsx` exports reusable React elements; `game-examples.tsx` supplies interactive specimens and construction/market compositions using those same elements.

`game-system.css` defines game-specific semantic roles: surfaces, ink, actions, signed finance, focus and three owner categories, with matching light/dark variants. It preserves the game's serif/sans/pixel-number identity and existing atlas artwork. Compact ledgers use text-first 32px rows; illustrated rows use 56px while preserving artwork size. This is a concrete component design based on `UI_FOUNDATIONS.md` and the existing game constraints, not a reproduction of the old component gallery.

Figures round for display only, cap at two decimals, distinguish missing/zero and expose exact compact values in a single tooltip. Operation accepts utilization, crew, efficiency, input fill and optional harvest factors; stopped operation is zero. Breakdown details expand explicitly; comparisons freeze their baseline. Charts accept series data and provide a table alternative. The shared window drag utility coalesces pointer input without per-move React renders; titles support 20px arrow-key movement, detail frames resize, and closing restores focus to the workspace control.

Examples use labeled sample state and readonly game definitions for goods/building recipes. No simulation commands or game-save writes are issued. All catalogue content and specimens support Korean/English and light/dark appearance. Language/theme remain in the URL; production game entry migration is a subsequent integration task.

Design basis: the task/meaning/density/accessibility framework in `docs/UI_FOUNDATIONS.md`, with the navigation layout informed by the previously inspected Material 3 site. The catalogue itself centers on Estera's game components rather than external systems or editorial decision records. Nested tooltips are not used.
