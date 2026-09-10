import { describe, expect, it } from "vitest";
import { demoSnapshot } from "./demoFixture";
import { OutreachRepository, PersistenceError, type PersistenceAdapter } from "./repository";
import { getOpenFollowUps, type SaveObservationInput } from "../domain/types";

class MemoryAdapter implements PersistenceAdapter { value: string | null = null; fail = false; read() { return this.value; } write(_key: string, value: string) { if (this.fail) throw new Error("quota"); this.value = value; } }
const input: SaveObservationInput = { id: "new-observation", visitId: "new-visit", buildingId: "bldg-yu-an", floorId: "bldg-yu-an-f5", unitId: "bldg-yu-an-f5-B", occurredAt: "2026-09-11T18:00:00+08:00", recordedAt: "2026-09-11T19:00:00+08:00", workerName: "Test worker", coverage: "ATTEMPTED", contactOutcome: "NO_ANSWER", evidence: [] };

describe("OutreachRepository", () => {
  it("appends history, creates a missing visit, and distinguishes idempotency from collision", () => {
    const adapter = new MemoryAdapter(); const repository = new OutreachRepository(adapter); repository.replaceSnapshot(demoSnapshot);
    const saved = repository.saveObservation(input); expect(saved.visits.some((visit) => visit.id === "new-visit")).toBe(true); expect(saved.observations.filter((item) => item.id === input.id)).toHaveLength(1);
    expect(repository.saveObservation(input).observations).toHaveLength(saved.observations.length);
    expect(() => repository.saveObservation({ ...input, note: "different" })).toThrow(PersistenceError);
  });
  it("treats the same observation as idempotent regardless of object key order", () => {
    const adapter = new MemoryAdapter(); const repository = new OutreachRepository(adapter); repository.replaceSnapshot(demoSnapshot);
    const saved = repository.saveObservation(input);
    const reordered = {
      evidence: input.evidence, coverage: input.coverage, workerName: input.workerName,
      recordedAt: input.recordedAt, occurredAt: input.occurredAt, unitId: input.unitId,
      floorId: input.floorId, buildingId: input.buildingId, visitId: input.visitId,
      id: input.id, contactOutcome: input.contactOutcome,
    } satisfies SaveObservationInput;
    expect(repository.saveObservation(reordered).observations).toHaveLength(saved.observations.length);
  });
  it("rejects corrupt persisted data and write failures without reporting success", () => {
    const adapter = new MemoryAdapter(); adapter.value = JSON.stringify({ schemaVersion: "0.1-demo", isSynthetic: true, notice: "x", buildings: [{}], floors: [], units: [], households: [], people: [], householdMemberships: [], householdResidences: [], memberships: [], visits: [], observations: [] });
    expect(() => new OutreachRepository(adapter).getSnapshot()).toThrow(PersistenceError);
    const working = new MemoryAdapter(); const repository = new OutreachRepository(working); repository.replaceSnapshot(demoSnapshot); working.fail = true;
    expect(() => repository.saveObservation(input)).toThrow(PersistenceError); expect(repository.getSnapshot()?.observations.some((item) => item.id === input.id)).toBe(false);
  });
  it("keeps open follow-ups until a DONE event explicitly resolves the original observation", () => {
    const adapter = new MemoryAdapter(); const repository = new OutreachRepository(adapter); repository.replaceSnapshot(demoSnapshot);
    const openId = getOpenFollowUps(demoSnapshot)[0].observationId;
    repository.saveObservation({ ...input, id: "ordinary-new-event" }); expect(getOpenFollowUps(repository.getSnapshot()!).some((item) => item.observationId === openId)).toBe(true);
    const closed = repository.saveObservation({ ...input, id: "resolve-event", followUp: { action: "合成：已處理", status: "DONE" }, resolvesObservationId: openId }); expect(getOpenFollowUps(closed).some((item) => item.observationId === openId)).toBe(false);
  });
});
