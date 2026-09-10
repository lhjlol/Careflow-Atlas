# Validation and handover

Verified 2026-09-11 HKT using Node 22.12.0, npm 10.9.0, and the Codex in-app Chromium browser.

## Automated checks

`npm run typecheck`, `npm run lint`, `npm test`, and the production build are the release checks. The 23 tests cover actual workbook parsing and row errors; relational schema, dates and follow-up closure; persistence failure and idempotency; occurrence-time ordering and scoped coverage; and floor geometry/map data isolation.

## Browser checks actually performed

- At 1440×900, parsed the generated workbook through the sample-import UI: 4 buildings, 2 people, 36 units and 25 observations; blank coverage produced an explicit warning before confirmation.
- Selected 裕安樓, verified the camera transition and fully separated eight-floor stack, selected the amber georeferenced 5F label, and opened 5B history. Native canvas extrusion picking separately selected 4F and updated the same detail state.
- Saved an explicit completed/contacted result while leaving assessment unchanged and closing the existing revisit. Completed units changed 16→17 of 32, building follow-ups 1→0, total follow-ups 2→1. Both events and the earlier suspected assessment remained visible.
- Reloaded and verified persistence. At 390×844, used list mode, selected 5F/5B and opened/cancelled the record form. Document width equalled viewport width (390px).
- Verified optional WebMCP summary/navigation and rejection of an unknown building ID. No console errors appeared in the final fresh-page log segment.

## Limits of this verification

Browser checks were interactive, not an automated E2E suite. The disk file picker, real iOS Safari/Android hardware, forced WebGL loss, offline map startup, large malicious/compressed workbooks, cross-tab writes, and remote multi-user conflicts were not independently stress-tested. Repository write/quota failure is covered with an adapter test. This prototype supports synthetic local state only; the synthetic metadata flag is not a personal-data detector.

MapLibre is the largest lazy chunk; performance on low-end field devices needs measurement. Local storage can be cleared and is not encrypted, backed up or synchronised. Production persistence requires authenticated server APIs, granular writes, concurrency handling, and migration/version policy; swapping an adapter alone does not provide these guarantees.
