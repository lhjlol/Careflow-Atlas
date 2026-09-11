# CareFlow Atlas

CareFlow Atlas is a frontend prototype for the Sai Ying Pun Community Living Room's Field Outreach workflow. It turns synthetic paper/Excel-shaped records into a spatial workbench for reviewing buildings, floors, unit observations, and follow-up work.

This repository is a polished demonstration and a frontend foundation. It is not a deployed NGO system. It has no production backend, authentication, tenant isolation, offline synchronisation, or approval system, and it must not contain real resident data.

## What works

- Parse the bundled synthetic `.xlsx` workbook in the browser and show row-level validation issues.
- Explore an expanded 20-building district mock with 123 floors, 362 units, 56 synthetic people, and multi-visit paper histories. Load **探索完整街區** to merge it while preserving existing records; see [district scenarios](./docs/DISTRICT_DEMO.md).
- Keep imported workbook rows separate from the internal domain model.
- Browse synthetic buildings on a real OpenStreetMap-based Sai Ying Pun basemap.
- Select a building, move into a pitched map view, and expand its illustrative floor stack.
- Inspect floor and unit states, including explicit negative results, uncertain assessments, contact outcomes, and follow-ups.
- Append a new observation without overwriting earlier history.
- Persist the synthetic workspace in this browser through a repository and `localStorage` adapter.
- Print an A4 building paper form; export and merge a Chinese six-sheet Excel workbook with history protection and row-level review.
- Track housing changes, health support and service invitations with an assignee and unconfirmed timing kept verbatim.
- Export the current synthetic domain snapshot as JSON.
- Continue through the building list and forms when the basemap or WebGL is unavailable.

All business records, people, addresses, floor counts, and unit layouts are synthetic. Highlighted footprints are aligned to source basemap geometry, with synthetic business identities. The map tiles and surrounding building context are real geographic data, while highlighted CareFlow targets are illustrative.

## Run locally

Verified runtime: Node.js 22.12.0 with npm 10.9.0.

```bash
npm ci
npm run demo:generate
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

Open the local URL printed by Vite. Choose **紙本與 Excel**, then **檢視 mock 範例** to review the Chinese workbook before merging. See [the paper / Excel workflow](./docs/EXCEL_WORKFLOW.md) and [the mock template](./public/demo/careflow-paper-excel-mock.xlsx). The legacy workbook remains supported. The generated file is [public/demo/careflow-field-outreach-demo.xlsx](./public/demo/careflow-field-outreach-demo.xlsx).

`npm run demo:generate` deterministically rebuilds that workbook from [src/data/demoFixture.ts](./src/data/demoFixture.ts). Use `npm run preview` after a build to inspect the production bundle locally.

## Configuration

The default basemap style is OpenFreeMap Positron. It needs network access for map tiles, glyphs, and related style assets.

To use another public MapLibre-compatible style:

```bash
VITE_MAP_STYLE_URL=https://example.org/style.json npm run dev
```

Anything prefixed with `VITE_` is exposed to the browser bundle. Do not place secrets there. See [.env.example](./.env.example).

No business record is sent to the map provider by application code. The map provider receives normal browser requests for map resources and the user's network metadata.

## Static deployment

Build the site, then serve the generated `dist` directory from the root of a static site:

```bash
npm ci
npm run demo:generate
npm run build
```

The application uses the root-relative sample path `/demo/careflow-field-outreach-demo.xlsx`, so a subdirectory deployment needs a corresponding base-path change. No runtime server or secret is required.

The repository includes `.openai/hosting.json` for owner-only Sites hosting. Publication uses the validated `dist` output and an exact source revision; public sharing is a separate access change. A private demonstration does not provide NGO authentication or production data controls.

## Project structure

- `src/domain/`: provisional domain records and derived coverage summaries.
- `src/data/`: workbook adapter, repository boundary, local persistence, and synthetic fixtures.
- `src/app/`: shared Zustand workspace state and application composition.
- `src/map/`: MapLibre scene and renderer-independent spatial view model.
- `src/components/`: import, building, observation, and history workflows.
- `scripts/generate-demo.ts`: deterministic synthetic workbook generator.
- `docs/`: source review, architecture, decisions, and demo script.

Read [docs/SOURCE_REVIEW.md](./docs/SOURCE_REVIEW.md) for evidence boundaries and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the implemented design.

## Before a real pilot

Obtain and validate the real paper form, Person-level workbook, Building-level workbook, coverage/revisit definitions, membership and household rules, device/network conditions, and the NGO's access, retention, deletion, backup, and external-provider policies. Replace synthetic adapters deliberately; do not upload real records into this prototype.

See [docs/VALIDATION.md](docs/VALIDATION.md) for automated checks, browser verification, and untested operating conditions.
