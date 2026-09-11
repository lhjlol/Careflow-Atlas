import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { districtDemo } from './districtDemo';
import { workflowDemo } from './workflowDemo';
import { getOpenFollowUps } from '../domain/types';
import { exportWorkflowWorkbook, parseWorkflowWorkbook } from './workflowWorkbook';
import { mergeWorkflow } from './workflowMerge';

const readFixture = () => {
  const bytes = readFileSync('public/demo/careflow-district-demo.xlsx');
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

describe('expanded district workbook', () => {
  it('imports the styled six-sheet deliverable with every entity and historical link intact', () => {
    const buffer = readFixture();
    expect(XLSX.read(buffer).SheetNames).toEqual(['使用說明', '大廈總表', '個人名冊', '紙本回錄', '待跟進', '關聯封存']);
    const result = parseWorkflowWorkbook(buffer, 'district.xlsx');
    expect(result?.issues).toEqual([]);
    expect(result?.snapshot).toEqual(districtDemo);
    expect(result?.snapshot?.buildings.length).toBeGreaterThanOrEqual(20);
    expect(result?.snapshot?.people.length).toBeGreaterThanOrEqual(30);
  });

  it('can be exported again without losing closed follow-ups or uncertain timings', () => {
    const result = parseWorkflowWorkbook(exportWorkflowWorkbook(districtDemo), 're-export.xlsx');
    expect(result?.issues).toEqual([]);
    expect(result?.snapshot).toEqual(districtDemo);
    expect(getOpenFollowUps(result!.snapshot!)).toEqual(getOpenFollowUps(districtDemo));
    const relative = result!.snapshot!.observations.filter(o => o.followUp?.timingNote && !o.followUp.dueDate);
    expect(relative.length).toBeGreaterThan(0);
    expect(result!.snapshot!.observations.some(o => o.resolvesObservationId)).toBe(true);
  });

  it('adds the district to an existing workspace once and retains later local edits', () => {
    const current = structuredClone(workflowDemo);
    current.people[0].contactNote = '中心已補充的合成備註';
    const parsed = parseWorkflowWorkbook(readFixture(), 'district.xlsx')!;
    const first = mergeWorkflow(current, parsed.snapshot!, parsed.baseline);
    expect(first.issues).toEqual([]);
    expect(first.snapshot?.buildings.length).toBe(districtDemo.buildings.length);
    expect(first.snapshot?.people[0].contactNote).toBe(current.people[0].contactNote);
    expect(first.summary.added).toBeGreaterThan(0);
    const repeated = mergeWorkflow(first.snapshot, parsed.snapshot!, parsed.baseline);
    expect(repeated.issues).toEqual([]);
    expect(repeated.summary.added).toBe(0);
    expect(repeated.snapshot).toEqual(first.snapshot);
  });
});
