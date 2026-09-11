import { describe, expect, it } from 'vitest';
import { districtAdditions, districtDemo } from './districtDemo';
import { workflowDemo } from './workflowDemo';
import { workflowSheets } from './workflowFormat';
import { validateSnapshot } from '../domain/schema';
import { getCoverageSummary, getOpenFollowUps } from '../domain/types';

// Assert product invariants: the large demo must exercise uncertainty and history,
// and must never rewrite the small fixture already present in a user's workspace.
describe('district demonstration', () => {
  it('validates every relationship and preserves the entire existing mock dataset', () => {
    expect(() => validateSnapshot(districtDemo)).not.toThrow();
    expect(districtDemo.buildings).toHaveLength(20);
    for (const collection of Object.keys(districtAdditions) as (keyof typeof districtAdditions)[]) {
      expect(districtDemo[collection].slice(0, workflowDemo[collection].length)).toEqual(workflowDemo[collection]);
      expect(districtAdditions[collection].every(record => record.isSynthetic && record.provisional)).toBe(true);
    }
    expect(districtAdditions.people.length).toBeGreaterThanOrEqual(30);
    expect(districtAdditions.households.length).toBeGreaterThanOrEqual(30);
    expect(districtAdditions.people.every(person => person.phone === undefined && person.displayName.startsWith('演示街坊'))).toBe(true);
  });

  it('separates unknown layouts, no access, untouched units and completed outreach', () => {
    const unknown = districtAdditions.buildings.filter(building => !building.layoutDeclared);
    expect(unknown).toHaveLength(3);
    for (const building of unknown) {
      expect(building.floorCount).toBeUndefined();
      expect(districtDemo.units.some(unit => unit.buildingId === building.id)).toBe(false);
      expect(getCoverageSummary(districtDemo, building.id).total).toBeUndefined();
    }
    expect(getCoverageSummary(districtDemo, 'district-06').status).toBe('INACCESSIBLE');
    expect(getCoverageSummary(districtDemo, 'district-16').status).toBe('UNKNOWN');
    expect(getCoverageSummary(districtDemo, 'district-14')).toMatchObject({ completed: 0, recorded: 0, status: 'UNVISITED' });
    for (const buildingId of ['district-02', 'district-10']) {
      const summary = getCoverageSummary(districtDemo, buildingId);
      expect(summary.completed).toBe(summary.total);
    }
    expect(new Set(districtAdditions.observations.map(record => record.contactOutcome))).toEqual(new Set(['CONTACTED', 'NO_ANSWER', 'DECLINED', 'NOT_ATTEMPTED']));
    expect(districtAdditions.observations.some(record => record.assessment === 'SUSPECTED')).toBe(true);
    expect(districtAdditions.observations.some(record => record.assessment === 'NO_INDICATION')).toBe(true);
    expect(districtAdditions.units.every(unit => /^\d+樓 [A-D]室$/.test(unit.label))).toBe(true);
    for (const building of districtAdditions.buildings) {
      const labels = districtAdditions.units.filter(unit => unit.buildingId === building.id).map(unit => unit.label);
      expect(new Set(labels).size).toBe(labels.length);
    }
  });

  it('keeps paper date precision, original follow-ups and explicit resolutions', () => {
    const scopes = new Map<string, Set<string>>();
    for (const record of districtAdditions.observations) {
      expect(record.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(record.paperRef).toBeTruthy();
      expect(record.paperLine).toBeTruthy();
      const buildings = scopes.get(record.paperRef!) ?? new Set();
      buildings.add(record.buildingId);
      scopes.set(record.paperRef!, buildings);
    }
    expect([...scopes.values()].every(buildings => buildings.size === 1)).toBe(true);
    expect(new Set(districtAdditions.observations.flatMap(record => record.followUp?.category ? [record.followUp.category] : []))).toEqual(new Set(['GENERAL', 'HOUSING_CHANGE', 'HEALTH_SUPPORT', 'SERVICE_INVITATION']));
    const resolutions = districtAdditions.observations.filter(record => record.resolvesObservationId);
    expect(resolutions.length).toBeGreaterThanOrEqual(3);
    const openIds = getOpenFollowUps(districtDemo).map(task => task.observationId);
    for (const resolution of resolutions) {
      expect(districtDemo.observations.find(record => record.id === resolution.resolvesObservationId)?.followUp?.status).toBe('OPEN');
      expect(openIds).not.toContain(resolution.resolvesObservationId);
    }
    expect(districtAdditions.observations.some(record => record.followUp?.timingNote && !record.followUp.dueDate)).toBe(true);
  });

  it('retains a household move and membership history without duplicate identities', () => {
    const residences = districtDemo.householdResidences.filter(record => record.householdId === 'district-03-hh3');
    expect(residences).toHaveLength(2);
    expect(residences.filter(record => !record.endsOn)).toHaveLength(1);
    expect(residences.find(record => record.endsOn)?.endsOn).toBe('2026-04-30');
    const person = districtAdditions.people.find(record => districtAdditions.memberships.filter(membership => membership.personId === record.id).length === 2)!;
    expect(person).toBeDefined();
    const memberships = districtAdditions.memberships.filter(record => record.personId === person.id);
    expect(memberships.map(record => record.status)).toEqual(['INACTIVE', 'ACTIVE']);
    expect(memberships.find(record => record.status === 'INACTIVE')?.endsOn).toBe('2026-07-31');
    expect(memberships.at(-1)?.status).toBe('ACTIVE');
    const peopleSheet = workflowSheets(districtDemo).find(sheet => sheet.name === '個人名冊')!;
    expect(peopleSheet.rows.find(row => row[0] === person.id)?.[5]).toBe('有效');
  });
});
