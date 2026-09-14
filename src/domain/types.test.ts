import { describe, expect, it } from "vitest";
import { demoSnapshot } from "../data/demoFixture";
import { effectiveObservations, getCorrectionConflicts, getCoverageStatus, getCoverageSummary, getOpenFollowUps, supersededObservationIds, type Observation, type OutreachSnapshot } from "./types";

describe("coverage summaries", () => {
  it("does not promote one unit result to an entire building", () => {
    expect(getCoverageStatus(demoSnapshot, "bldg-yu-an")).toBe("UNVISITED");
    expect(getCoverageSummary(demoSnapshot, "bldg-yu-an").status).toBe("PARTIAL");
  });
  it("counts no-answer attempts as recorded, not completed", () => {
    const result = getCoverageSummary(demoSnapshot, "bldg-yu-an", "bldg-yu-an-f5");
    expect(result.recorded).toBe(4);
    expect(result.completed).toBe(2);
  });
  it("keeps an explicit building access result at building scope", () => {
    expect(getCoverageSummary(demoSnapshot, "bldg-duk-cheong")).toMatchObject({ total: undefined, recorded: 1, status: "INACCESSIBLE" });
  });
  it("uses occurrence time first and recorded time only as a tie-breaker", () => {
    const snapshot = structuredClone(demoSnapshot);
    const original = snapshot.observations.find(item => item.id === "observation-yu-an-5b")!;
    snapshot.observations.push({ ...original, id: "recorded-later-but-occurred-earlier", occurredAt: "2026-09-08T18:40:00+08:00", recordedAt: "2026-09-10T20:15:00+08:00", coverage: "VISITED_NO_FINDING" });
    expect(getCoverageStatus(snapshot, original.buildingId, original.unitId)).toBe("ATTEMPTED");
    snapshot.observations.push({ ...original, id: "same-occurrence-recorded-later", recordedAt: "2026-09-10T20:16:00+08:00", coverage: "VISITED_WITH_FINDING" });
    expect(getCoverageStatus(snapshot, original.buildingId, original.unitId)).toBe("VISITED_WITH_FINDING");
  });
  it("does not let stale building or floor records override newer unit work", () => {
    const snapshot = structuredClone(demoSnapshot);
    const base = snapshot.observations[0];
    snapshot.observations.push(
      { ...base, id: "stale-building", floorId: undefined, unitId: undefined, occurredAt: "2026-09-01T09:00:00+08:00", recordedAt: "2026-09-10T09:00:00+08:00", coverage: "INACCESSIBLE" },
      { ...base, id: "stale-floor", unitId: undefined, occurredAt: "2026-09-01T09:00:00+08:00", recordedAt: "2026-09-10T09:00:00+08:00", coverage: "INACCESSIBLE" },
    );
    expect(getCoverageSummary(snapshot, "bldg-yu-an").status).toBe("PARTIAL");
    expect(getCoverageSummary(snapshot, "bldg-yu-an", "bldg-yu-an-f5").status).toBe("PARTIAL");
  });
  it("counts distinct observed locations rather than repeated events", () => {
    const snapshot = structuredClone(demoSnapshot);
    const buildingEvent = snapshot.observations.find(item => item.id === "observation-duk-cheong-entry")!;
    snapshot.observations.push({ ...buildingEvent, id: "duk-cheong-repeat", recordedAt: "2026-09-08T20:15:00+08:00" });
    expect(getCoverageSummary(snapshot, "bldg-duk-cheong").recorded).toBe(1);

    const floorEvent = { ...snapshot.observations[0], id: "floor-event", unitId: undefined };
    snapshot.observations.push(floorEvent, { ...floorEvent, id: "floor-event-repeat", recordedAt: "2026-09-10T20:15:00+08:00" });
    expect(getCoverageSummary(snapshot, "bldg-yu-an", "bldg-yu-an-f5").recorded).toBe(5);
  });
});

/** A minimal controlled subject: one unit, so a correction's effect is unambiguous. */
const event = (over: Partial<Observation>): Observation => ({
  isSynthetic: true, provisional: true, id: "o1", visitId: "v1", buildingId: "b1", floorId: "f1", unitId: "u1",
  occurredAt: "2026-09-10T10:00:00+08:00", recordedAt: "2026-09-10T12:00:00+08:00", workerName: "w", coverage: "ATTEMPTED", evidence: [], ...over,
});
const subject = (observations: Observation[]): OutreachSnapshot => ({
  schemaVersion: "0.1-demo", isSynthetic: true, notice: "test",
  buildings: [{ isSynthetic: true, provisional: true, id: "b1", name: "B", address: "A", coordinates: { lng: 0, lat: 0 }, layoutDeclared: true }],
  floors: [{ isSynthetic: true, provisional: true, id: "f1", buildingId: "b1", level: 1, label: "1" }],
  units: [{ isSynthetic: true, provisional: true, id: "u1", buildingId: "b1", floorId: "f1", label: "A" }],
  households: [], people: [], householdMemberships: [], householdResidences: [], memberships: [], visits: [], observations,
});

describe("appended corrections", () => {
  // A19: the commonest paper correction is a wrongly typed date, usually a later one.
  const wrong = event({ id: "wrong", occurredAt: "2030-05-05T10:00:00+08:00", coverage: "UNKNOWN" });
  const fix = (over: Partial<Observation> = {}) => event({ id: "fix", occurredAt: "2026-09-08T10:00:00+08:00", recordedAt: "2026-09-12T10:00:00+08:00", coverage: "VISITED_NO_FINDING", correctsObservationId: "wrong", correctionReason: "日期錯填", ...over });

  it("makes the correction the effective version for coverage, not the wrong later date", () => {
    const snapshot = subject([wrong, fix()]);
    expect(getCoverageStatus(snapshot, "b1", "u1")).toBe("VISITED_NO_FINDING");
    expect(getCoverageSummary(snapshot, "b1", "f1").status).toBe("VISITED_NO_FINDING");
    expect(getCoverageSummary(snapshot, "b1", "f1").completed).toBe(1);
  });

  it("keeps the original event untouched and traceable rather than rewriting it", () => {
    const snapshot = subject([wrong, fix()]);
    const stored = snapshot.observations.find(item => item.id === "wrong")!;
    expect(stored.occurredAt).toBe("2030-05-05T10:00:00+08:00");
    expect(stored.coverage).toBe("UNKNOWN");
    expect(supersededObservationIds(snapshot.observations)).toContain("wrong");
    expect(effectiveObservations(snapshot).map(item => item.id)).toEqual(["fix"]);
  });

  it("does not treat an identical row without the link as a correction", () => {
    // The same values, appended the way the old instruction said to. Nothing may be assumed.
    const snapshot = subject([wrong, fix({ correctsObservationId: undefined, correctionReason: undefined })]);
    expect(getCoverageStatus(snapshot, "b1", "u1")).toBe("UNKNOWN");
  });

  it("takes the tail of a correction chain", () => {
    const snapshot = subject([wrong, fix({ coverage: "PARTIAL" }), fix({ id: "fix-2", recordedAt: "2026-09-13T10:00:00+08:00", coverage: "VISITED_WITH_FINDING", correctsObservationId: "fix" })]);
    expect(getCoverageStatus(snapshot, "b1", "u1")).toBe("VISITED_WITH_FINDING");
    expect(effectiveObservations(snapshot).map(item => item.id)).toEqual(["fix-2"]);
  });

  it("drops a follow-up carried only by the superseded event", () => {
    const open = event({ id: "wrong", occurredAt: "2030-05-05T10:00:00+08:00", coverage: "UNKNOWN", followUp: { action: "跟進錯誤項目", status: "OPEN" } });
    expect(getOpenFollowUps(subject([open, fix()]))).toEqual([]);
    // The correction's own follow-up is the one that stands.
    const withTask = getOpenFollowUps(subject([open, fix({ followUp: { action: "跟進更正後事項", status: "OPEN" } })]));
    expect(withTask.map(item => item.action)).toEqual(["跟進更正後事項"]);
  });

  it("reports two live corrections for one original instead of picking by time", () => {
    const snapshot = subject([wrong, fix({ id: "fix-a" }), fix({ id: "fix-b", recordedAt: "2026-09-14T10:00:00+08:00" })]);
    expect(getCorrectionConflicts(snapshot)).toEqual([{ observationId: "wrong", correctionIds: ["fix-a", "fix-b"] }]);
    // Once one of them is itself corrected, the chain is unambiguous again.
    expect(getCorrectionConflicts(subject([wrong, fix({ id: "fix-a" }), fix({ id: "fix-b", recordedAt: "2026-09-14T10:00:00+08:00", correctsObservationId: "fix-a" })])).length).toBe(0);
  });
});
