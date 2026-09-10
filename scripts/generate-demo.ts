import * as XLSX from "xlsx";
import { mkdirSync } from "node:fs";
import * as fs from "node:fs";
import { demoSnapshot } from "../src/data/demoFixture";

const workbook = XLSX.utils.book_new();
XLSX.set_fs(fs);
const fields: Record<string, string[]> = {
  Metadata: ["key", "value"],
  Buildings: ["id", "name", "address", "lng", "lat", "floorCount", "layoutDeclared", "initialCoverage"], Floors: ["id", "buildingId", "level", "label"], Units: ["id", "buildingId", "floorId", "label", "initialCoverage"], Households: ["id", "label"], People: ["id", "displayName"], HouseholdMemberships: ["id", "householdId", "personId", "relationship"], HouseholdResidences: ["id", "householdId", "buildingId", "unitId", "startsOn", "endsOn", "locationNote"], Memberships: ["id", "personId", "status", "startsOn", "endsOn"], Visits: ["id", "occurredAt", "recordedAt", "workerName", "note"], Observations: ["id", "visitId", "buildingId", "floorId", "unitId", "occurredAt", "recordedAt", "workerName", "coverage", "assessment", "contactOutcome", "sourceType", "evidence", "note", "followUpAction", "followUpDueDate", "followUpStatus"],
};
const records: Record<string, object[]> = {
  Metadata: [{ key: "synthetic", value: "true" }, { key: "notice", value: demoSnapshot.notice }],
  Buildings: demoSnapshot.buildings.map(({ coordinates, ...item }) => ({ ...item, lng: coordinates.lng, lat: coordinates.lat })), Floors: demoSnapshot.floors, Units: demoSnapshot.units, Households: demoSnapshot.households, People: demoSnapshot.people, HouseholdMemberships: demoSnapshot.householdMemberships, HouseholdResidences: demoSnapshot.householdResidences, Memberships: demoSnapshot.memberships, Visits: demoSnapshot.visits,
  Observations: demoSnapshot.observations.map(({ evidence, followUp, ...item }) => ({ ...item, coverage: item.coverage === "UNKNOWN" ? "" : item.coverage, evidence: evidence.join(" | "), followUpAction: followUp?.action, followUpDueDate: followUp?.dueDate, followUpStatus: followUp?.status })),
};
for (const [sheetName, headers] of Object.entries(fields)) {
  const rows = records[sheetName].map((record) => Object.fromEntries(headers.map((header) => [header, (record as Record<string, unknown>)[header] ?? ""])));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows, { header: headers }), sheetName);
}
mkdirSync("public/demo", { recursive: true });
XLSX.writeFile(workbook, "public/demo/careflow-field-outreach-demo.xlsx", { compression: true });
