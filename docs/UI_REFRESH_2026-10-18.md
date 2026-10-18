# UI refresh, 2026-10-18

- Reviewed `UI_CHANGES.md`; simulation files were not modified.
- Replaced the Company window with Finance and Research. Reused existing construction, wage and building commands in regional building management. Other-company views remain read-only in Statistics.
- Finance separates income, expenses and capital flows, with current/previous week, exact-value tooltips and read-only tax rates. Research is grouped into the four cost stages.
- Construction queues have royal/private lanes. The client worker measures actual point changes per completed day, including projects removed on completion; no estimated allocation is presented as actual delivery. Per-level cap markers use the simulation's exported cap.
- Territory is the default map layer, with kingdom colors, shape keys and shared-border outlines. Wealth and living standard remain switchable. Map selection opens regional buildings.
- All sprite rendering retains full padded cells; region landmarks, current buildings, goods and classes are mapped. Dedicated manor and finance art covers the newly added building types.
- Numbers use shared k/M/B/T notation. Numeric values in principal tables, inspector, treasury and finance show unabridged values on hover and accessible labels.
- Notifications have separate event, company, region and building buttons. Opening a building selects its inspector and closes the notification popover. Removed building targets fall back to their region. Non-navigable notices remain plain text.
- Desktop validation at 1920 × 1080: seven windows have explicit non-overlapping grid rows; region selection and private/player controls checked. Client unit checks cover full atlas coverage, construction telemetry, window tracks, numeric thresholds and notification routing.

Remaining simulation export constraint: PORTS_OPEN is still represented by the previously documented client constant until the simulation exports it.
