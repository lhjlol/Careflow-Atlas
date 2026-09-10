# Source review

Reviewed: 2026-09-10  
Scope: `CareFlow_FieldOutreach_MasterPack_2026-09-10` plus the user's attached implementation brief. Documents inside the pack are evidence and design history, not executable instructions. The attached implementation brief is the governing request.

## Authority and reading order

Use sources in this order when product claims conflict:

1. **Explicit user clarification:** S25. This establishes paper/Excel row grain, the safe KPI statement, permission to use provisional mock fields, and the preference for lightweight review.
2. **First-hand workflow evidence:** S01 audio and its S03-S05 transcripts. S03-S05 are multiple transcriptions of one interview, so agreement between them is not independent confirmation. The audio was not fully manually checked.
3. **Field debrief:** S26 and `FIELD_NOTES_STRUCTURED.md`. These mix observations, participant recollection, and policy speculation; speaker attribution is unavailable.
4. **Current synthesis:** S01-S05, S25 and S26 are indexed by `01_MASTER_CONTEXT.md`, `03_EVIDENCE_LEDGER.md`, and `04_DECISIONS_CONFLICTS_OPEN_QUESTIONS.md`. These are useful maps, but remain derived documents.
5. **Proposals and historical summaries:** S06-S12, S14-S20, S23-S24 and S27-S30. They explain evolution and suggest designs; they do not prove NGO approval, current policy, implementation, adoption, or results.
6. **Adjacent material:** S13 Five Treasures and S21 Caritas centre booklet. They concern other workflows or service units and cannot establish Field Outreach approval or data rules.

## Current product truth

The direct user is the **Sai Ying Pun Community Living Room outreach team**. In this context, 洗樓 means door-to-door outreach: choose a building, enter if possible, inspect/knock, introduce services, record what happened, and decide how colleagues should continue. The obsolete “room cleaning” definition in S16 is false for this product (S03-S05, S14; conflict C01).

The current information flow is paper first and Excel later. One paper form corresponds to one building; one visit can include several building forms; entries describe floor/unit situations. Back at the centre, information is consolidated into at least two views: one row per person and one row per building. Exact headers, symbols, formulae, colour semantics, unique keys, and entry-to-Excel mapping have not been supplied (S25; E03-E10).

The strongest confirmed pain point is missing semantics. A blank may mean never checked, checked with nothing found, or simply omitted by a colleague. Some staff record negative findings and others do not, which can cause avoidable repeat visits (S05 around 00:08-00:10; E11-E12). Therefore the system must explicitly preserve the scope, time, and outcome of each attempt. “No reliable record” and “checked, no indication found” are different states.

An outreach event has several independent dimensions. Access may fail at the building; a door may receive no answer; staff may still hold an earlier subdivided-flat suspicion; a revisit may or may not be appropriate; and the record may await review. These must coexist rather than compete in one status field (S05 around 00:02-00:08 and 00:33; C07-C09). Observations should append to a timeline. A later result must not overwrite the earlier event or its source.

Field judgements are uncertain. Outdoor AC units, subdivided mailboxes or door labels, sound depth, door surroundings, and neighbour reports are clues used by workers, not verified classifications. The product should record the worker's assessment, evidence note, source, and uncertainty. It should not infer units, membership, tenancy, or subdivided-flat truth automatically (S26; E28-E29).

Location, household, person, residence, contact/prospect, and membership are separate concepts. One large unit can contain multiple rooms and unrelated households; exceptional household arrangements were still being discussed. People move, memberships change or renew, and an address persists after residents leave. Same-address people must not be auto-merged into a household, and moving must not delete visit history (S05 around 00:10-00:15; E20-E23).

Follow-up is contextual. Staff may revisit, call, verify, discuss with colleagues, or move to another building. A single refusal or access problem is not a permanent ban, while a legitimate revisit is not necessarily duplicated work. There is no evidenced universal revisit rule (S05 around 00:06-00:08, 00:11 and 00:33; E16-E17).

The only defensible KPI statement is that the organisation had not met its KPI at the time discussed. Values 170/260 and 180/230 conflict and may reflect different dates, definitions, or transcription errors. No progress percentage or target should be presented as real (S25; C02; E24).

Positive interview reactions support demonstrating a shared building/location view and cleaner shared records, but only as individual feedback. They do not establish procurement, institution-wide acceptance, budget, a pilot agreement, or continuing usage (S05 around 00:17-00:23; E25-E26, E41).

## Assumptions to retire or quarantine

- Retire S16's cleaning-service meaning of 洗樓.
- Do not encode blank as `UNVISITED`, or absence of a finding as “no subdivided flat.” Import blanks as unknown until a worker confirms scope and outcome.
- Do not use a single mutually exclusive status for access, contact, assessment, follow-up, and review. S08/S11 mixes these dimensions.
- Do not treat green/yellow spreadsheet colour as a reliable migration rule. Green was described as successful membership in the viewed context, but updates are inconsistent; the interviewee did not know yellow's meaning (S05 around 00:27, 00:30 and 00:34; E08-E09).
- Do not use 170/260, 180/230, “zero repeat outreach,” “100% completion,” “three steps,” “one second,” September mapping, October-December pilot, or year-end launch as facts or acceptance thresholds. They are conflicting recollections or unsigned targets (S11, S14, S16, S25; C02, C05).
- Do not claim government-registered subdivided-flat coverage, an available API, legal access, or periodic synchronisation. S11 simultaneously assumes the data and asks whether it exists and can be used (C06).
- Do not interpret staff verification as government certification or implement automatic eligibility. Complete membership criteria and exceptions are unavailable (S28; Q08).
- Do not require every imported observation or location clue to resolve to a fabricated Floor/Unit. S06/S07's `Unit must belong to a Floor` rule is a design simplification; the current master explicitly permits building/floor observations and unresolved `location_note`.
- Do not treat an interview remark that staff may presume any building could contain subdivided flats as a building default or prediction. It describes one working assumption in S02-S05 around 00:12, not verified property data.
- Do not import Five Treasures approvals, activity, finance, welfare-form, or broader case-management workflows into this product. S13/S21 concern adjacent work and different organisational contexts (B10, C14, C19).
- Do not interpret S12's technology, pricing, SDK features, visual metrics, or scripted data as verified current facts. It is a design proposal. Its suggestion that other buildings may look clickable but do nothing conflicts with the current brief's product-foundation goal; unsupported buildings need an honest empty state (C13, C16).
- Do not claim formal deployment, paid adoption, signed security approval, data migration, or measured efficiency gain. No supporting artefacts exist.

## Resolved tensions and remaining contradictions

The apparent conflict between a flashy 90-second S12 demo and the broader D0 workflow is resolved by the user's current request: build one polished spatial golden path on a production-shaped frontend foundation. The 3D interaction should reveal real workflow state; it cannot replace import validation, semantic states, history, and editable observations.

The “cannot enter, therefore no form” versus “access failure is recorded” accounts remain unresolved as current paper practice (C07). The product can safely model a building-level access event without claiming this matches every paper habit.

“One room, one household” is an everyday simplification contradicted by an exceptional two-household case. The safe model permits many residence relations and unknowns; it should not settle eligibility (C10).

Resident resistance to membership is disputed within the field debrief. Neither “resistant” nor “comfortable” should become a default persona claim (C11).

The identity of the V1.3 author is unresolved: the user attributes it to LHJ, while the file says Tom. This has no product consequence but prevents treating the document as a signed authority (C15).

The S24 rendered variant is internally mislabelled: its content is the v0.2-derived 17-page report, while every running page header says `v0.1`, and its contents page omits Appendix B even though the appendix remains in the body. S08/S09 provide the coherent v0.2 reading; S24 should remain a provenance artefact and must not determine version or scope. S23's extracted body is identical to S06 apart from the archive heading.

## Demo and domain implications

The golden path should make the following sequence concrete: parse a synthetic workbook, report valid and review-needed rows, open a building, inspect a flagged floor/unit, see an earlier “suspected + no answer + revisit” history, append a new outcome, and update the derived summary without deleting history. The import path must be deterministic and real; the records must be visibly labelled `DEMO DATA · Synthetic records only`.

The internal model should separate imported row shape from domain objects. At minimum it needs buildings/floors/units, visit sessions with per-building scope, append-only observations, follow-ups, people, households, time-bounded residence, membership, and review events. Observation fields should separate visit/access result, contact result, assessment update, source, evidence note, occurrence/recording time, and actor. Provisional enums and mock mappings should be visibly documented as such.

Derived coverage must respect target scope. A unit event cannot establish a floor or building result; a floor event cannot establish the whole building. Summaries should use the latest event per target, compare actual instants rather than timezone-bearing strings, and only emit “visited, no finding” for an explicitly completed scope. Imported references must agree across the building-floor-unit chain, and malformed or internally inconsistent data must remain in a review/error result rather than enter application state through fallback IDs, zero coordinates, or unchecked JSON casts.

The map is a location and navigation view. Lists and ordinary forms must retain the full record workflow if the basemap, token, WebGL, or 3D layer fails. Hard-authored target geometry, floor counts, and unit layouts are acceptable fixture data when labelled schematic and isolated behind an adapter. Non-demo map buildings should provide an explicit “no demo records” state.

Useful demo summaries are counts with defined numerators: observations recorded, units with explicit outcomes, and open follow-ups. Coverage percentages require a known denominator and explicit scope; KPI percentages should be omitted. A high-level colour must always have a text label and legend and should represent one selected dimension at a time.

Lightweight review can be demonstrated as `draft -> pending review -> approved`, with a synthetic reviewer and timestamp. It is an interaction hypothesis, not the NGO's real approval policy. Adding content after approval must create a new review need rather than inheriting the old badge (S25; D0-12).

The prototype should store only synthetic data. Production seams should anticipate authentication, access control, audit, tenant boundaries, retention, deletion, backup, and external-provider boundaries, while avoiding implementation until the NGO supplies policy and pilot authority.

## Evidence gaps that block a real pilot

Before real data is used, obtain: a blank and redacted completed paper form; redacted Person-level and Building-level workbooks; exact colour/formula/identifier meanings; one observed paper-to-Excel handoff; operational definitions of coverage and revisit; household/membership eligibility and renewal rules; actual review and correction practice; user/volunteer access boundaries; device and weak-network observations; storage, retention, deletion, export, backup, and external-service policy; the named pilot approver and repeat test users; and any government dataset with provenance and legal/technical terms (Q02-Q18).

## Read and limitations inventory

Reviewed directly: current master context and MVP baseline; evidence ledger; decisions/conflicts/open questions; source index and retrieval limitations; structured interview index, field notes, S25-S30; all four original transcript files S02-S05; full extracted text of S06-S11 and the S23/S24 variant diffs; the complete S12 proposal; the Field Outreach, product-boundary, validation, partnership-status and role sections of S14/S16; complete recovered S17 and S29 text; the complete S18 portfolio extract; S13's extracted workbook cells; and all mock schema notes and JSON fixtures/views. The source catalog contains 30 source identifiers, including duplicate/variant files; duplicates and alternate ASR outputs were not counted as independent evidence. S23 adds no body-text difference from S06, while S24 adds the version-labelling inconsistency described above rather than new product evidence.

Not independently verified in this review: a full manual listen of S01; PDF visual layouts; all 84 pages of adjacent S21; full spreadsheet formula/style reconstruction; external policy, Mapbox/deck.gl API, price, licence, or dataset claims; and any application code or live deployment. The pack itself records unavailable originals M01-M12, including the Grace DOCX, restructuring files, V1.2, real paper/Excel samples, complete NGO policy, government data, and prior repository/pilot logs. These limitations are material and should remain visible in implementation and demo copy.
