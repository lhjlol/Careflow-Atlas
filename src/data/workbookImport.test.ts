import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseWorkbook } from "./workbookImport";

describe("workbook import", () => {
  it("parses the generated synthetic workbook in the browser-compatible parser", () => {
    const bytes = readFileSync("public/demo/careflow-field-outreach-demo.xlsx");
    const result = parseWorkbook(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    expect(result.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(result.snapshot?.buildings).toHaveLength(4);
    expect(result.snapshot?.observations.length).toBeGreaterThan(20);
  });
  it("reports duplicate ids, inconsistent references, and invalid dates deterministically", () => {
    const bytes = readFileSync("public/demo/careflow-field-outreach-demo.xlsx"); const workbook = XLSX.read(bytes, { type: "buffer" });
    const buildings = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Buildings, { defval: "" }); buildings[1].id = buildings[0].id; workbook.Sheets.Buildings = XLSX.utils.json_to_sheet(buildings);
    const observations = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Observations, { defval: "" }); observations[0].occurredAt = "2026-02-31T18:00:00+08:00"; observations[1].floorId = "bldg-hoi-king-f2"; workbook.Sheets.Observations = XLSX.utils.json_to_sheet(observations);
    const output = XLSX.write(workbook, { type: "array", bookType: "xlsx" }); const result = parseWorkbook(output);
    expect(result.snapshot).toBeUndefined(); expect(result.issues.map((issue) => issue.code)).toContain("DUPLICATE_ID"); expect(result.issues.map((issue) => issue.code)).toContain("INVALID_DATE"); expect(result.issues.map((issue) => issue.code)).toContain("INCONSISTENT_REFERENCE");
  });
});
