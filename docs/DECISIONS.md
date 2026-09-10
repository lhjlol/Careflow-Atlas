# Engineering decisions

## ADR-001: Use MapLibre native extrusion for the selected building

**Status:** accepted for this prototype.

The earlier proposal suggested Mapbox plus deck.gl, with Three.js as a possible upgrade. The implementation uses MapLibre GL JS and native `fill-extrusion` layers for the city context, synthetic target buildings, and separated floors.

This keeps camera movement, depth, picking, and rendering in one engine. Floor geometry already maps cleanly to GeoJSON with animated base and height values, so deck.gl or Three.js would add a second render lifecycle without improving the current information design. It also avoids a Mapbox token requirement.

The trade-off is a lower ceiling for custom materials, shadows, and complex 3D geometry. Revisit this only if user testing shows native extrusion cannot communicate the floor workflow clearly enough.

## ADR-002: Keep demo data local and require synthetic metadata

**Status:** accepted.

The prototype has no backend. A browser workbook adapter parses the bundled `.xlsx`, then a repository stores the validated domain snapshot in `localStorage`. Imported workbooks must explicitly declare that they are synthetic.

This makes the import genuine while declaring a limited demonstration contract. The synthetic flag is a declaration, not PII detection: it cannot prevent a person from placing real information in a falsely labelled file. Real data remains outside the supported scope. Local browser storage provides persistence for the demo but does not imply offline maps, device sync, backup, or collaboration.

## ADR-003: Separate import shape from domain records

**Status:** accepted.

The current workbook sheets are a designed test contract. The adapter reports row-level workbook issues and maps valid rows into a domain snapshot rather than passing rows directly to React components. The repository then applies the shared Zod domain schema before persistence, so imported, restored, and newly appended data cross the same storage boundary.

This lets the real Person-level and Building-level workbooks receive dedicated adapters after their columns and semantics are known. Invalid values and unresolved relationships block replacement; blank coverage remains unknown. The trade-off is that this prototype does not claim compatibility with the NGO's unseen files.

## ADR-004: Derive coverage from scoped, append-only events

**Status:** accepted.

Access, coverage, contact, assessment, and follow-up are separate dimensions. Observation history is appended and summaries are derived from the latest relevant events by parsed time. A unit observation cannot mark a floor or building complete, and percentages appear only when a declared unit total exists.

This is more verbose than a single current-status column, but it preserves the central business distinction between no record and an explicit negative result. The real definition of “covered” still requires NGO confirmation.

## ADR-005: Keep one shared UI store and narrow map inputs

**Status:** accepted.

Zustand holds the imported snapshot and current building/floor/unit selection. The map receives a small view model containing spatial geometry and summaries; it does not receive person records or free-text observation history.

This prevents the renderer from becoming a second business-state store and limits accidental data exposure to map code. Production authentication and permission enforcement remain server-side work.

Native-renderer references: [MapLibre 3D floorplan example](https://maplibre.org/maplibre-gl-js/docs/examples/3d-extrusion-floorplan/), [layer specification](https://maplibre.org/maplibre-style-spec/layers/), and [OpenFreeMap setup](https://openfreemap.org/quick_start/).
