import { describe, expect, it } from "vitest";
import { demoSnapshot } from "../data/demoFixture";
import { getCoverageStatus, getCoverageSummary } from "./types";

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
