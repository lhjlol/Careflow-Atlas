import { describe, expect, it } from "vitest";
import { demoSnapshot } from "../data/demoFixture";
import { snapshotSchema } from "./schema";

const copy = () => structuredClone(demoSnapshot);

describe("snapshotSchema", () => {
  it.each([
    ["households", () => ({ ...copy().households[0], isSynthetic: false })],
    ["people", () => ({ ...copy().people[0], displayName: "" })],
    ["householdMemberships", () => ({ ...copy().householdMemberships[0], personId: "missing" })],
    ["householdResidences", () => ({ ...copy().householdResidences[0], householdId: "missing" })],
    ["memberships", () => ({ ...copy().memberships[0], personId: "missing" })],
  ])("rejects malformed %s records", (collection, invalidRow) => {
    const snapshot = copy() as unknown as Record<string, unknown[]>;
    snapshot[collection] = [invalidRow()];
    expect(snapshotSchema.safeParse(snapshot).success).toBe(false);
  });

  it("rejects impossible calendar dates and date-only event times", () => {
    const impossible = copy();
    impossible.visits[0].occurredAt = "2026-02-31T18:30:00+08:00";
    expect(snapshotSchema.safeParse(impossible).success).toBe(false);

    const dateOnly = copy();
    dateOnly.observations[0].recordedAt = "2026-09-09";
    expect(snapshotSchema.safeParse(dateOnly).success).toBe(false);
  });

  it("validates parent references even when no observation uses the record", () => {
    const badFloor = copy();
    badFloor.observations = [];
    badFloor.floors[0].buildingId = "missing-building";
    expect(snapshotSchema.safeParse(badFloor).success).toBe(false);

    const badUnit = copy();
    badUnit.observations = [];
    badUnit.units[0].floorId = "bldg-hoi-king-f1";
    expect(snapshotSchema.safeParse(badUnit).success).toBe(false);
  });

  it("rejects a follow-up resolution aimed at a different location", () => {
    const snapshot = copy();
    snapshot.observations.push({
      ...snapshot.observations[0],
      id: "resolution-at-wrong-location",
      unitId: "bldg-yu-an-f5-A",
      recordedAt: "2026-09-10T12:00:00+08:00",
      followUp: { action: "合成：完成", status: "DONE" },
      resolvesObservationId: "observation-yu-an-5b",
    });
    expect(snapshotSchema.safeParse(snapshot).success).toBe(false);
  });
});
