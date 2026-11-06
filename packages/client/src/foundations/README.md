# Estera foundations documentation

Open `/foundations.html`. This is a documentation site, separate from the game and the proposal 01 gallery at `/design-system.html`.

The page body is imported directly from `docs/UI_FOUNDATIONS.md` at build time. The site provides chapter navigation, question review, source status filters, full-text search with passage links, a contents rail and a Markdown download. Confirmed, proposed and undecided material retain their source labels. The renderer supports this document's paragraphs, lists, headings, tables, emphasis, code and links; raw HTML is escaped, and executable link protocols are rejected.

The site has its own appearance and no game imports, simulation worker or persistent game settings. Language and theme live in the URL. Korean and English navigation and chapter summaries are available; the document body remains the authoritative Korean original, explicitly labeled in the English interface. The document has not been fully translated.

Reference: the rendered [Material 3 homepage](https://m3.material.io/), inspected on 2026-11-06 in headless Chrome after the text fetch returned only a JavaScript notice. Its navigation rail, editorial entry points and grouped documentation inspired the browsing structure. No Material source code, brand assets or screenshots are embedded. This site's palette and dimensions are documentation presentation, not approval of game design tokens.
