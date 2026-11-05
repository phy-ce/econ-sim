# Estera design system — proposal 01

Review at `/design-system.html` (development and production builds).
The gallery has foundations, components and compositions. Its theme, language and page are reflected in the URL; it does not modify game saves/preferences or start a simulation worker.

## Design direction

The existing game supplied the inventory: windows, tabs, construction cards, ledgers, input/output recipes, ownership, figures, meters and controls. This is a new visual proposal for those responsibilities.

- Warm paper with navy ink/chrome, green primary actions and brass accents. Semantic positive/negative/information colors have light and dark counterparts.
- Four-pixel spacing scale, one-pixel borders and six-pixel corners. Surfaces stay flat; floating windows receive a restrained shadow.
- Serif headings retain the game's setting. Body text uses the existing Korean sans font; tabular monospace replaces the pixel numeral treatment in this proposal.
- Default/compact controls are 36/32 px, ledger rows start at 44 px, meters are 8 px. Main/detail frames retain the current 420×560 / 520×640 dimensions so the proposed density can be judged against the game.
- Figures retain at most two decimal places; missing is `—`, zero remains zero. Compact figures expose the precise value through the shared tooltip. Meter fill is clamped, the figure is not.
- Ownership uses adjoining segments; profit is a signed figure rather than an invented fill percentage. Selection uses an edge/border and background, with keyboard focus independently visible.

`tokens.css` contains semantic and size tokens. `components.tsx` contains reusable visual primitives. `catalogue.tsx` exercises them with interactive specimens and compositions; sample finance/construction data is illustrative, while method recipes and artwork are read from existing game definitions.

## Review status

The game entry and its styles are unchanged by this proposal. The new entry has scoped CSS and separate state. Controls, spacing, typography and palette require user review before migrating game screens. This is not a complete replacement of every game component: charts, large research trees, nested ownership navigation and window dragging remain future applications of the agreed system.

The composition supports card/category selection, queue/pause/cancel, ownership tabs, method selection, utilization, stop/resume and closing/reopening frames. It sends no game commands. Window movement and real construction validation are intentionally outside this visual specimen.
