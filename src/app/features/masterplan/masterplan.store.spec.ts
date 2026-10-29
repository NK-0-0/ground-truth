import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CampusDataService } from '../../core/campus-data.service';
import type {
  Building,
  CampusMasterplanData,
  Plan,
} from '../../core/models/campus-masterplan.models';
import { SectionNavService } from '../../core/section-nav.service';
import { MasterplanStore } from './masterplan.store';

const building = (id: string, gfa: number, parent?: string): Building =>
  ({ id, parentProgrammeID: parent, designGFAM2: gfa, proposedEntry: [10, 20] }) as Building;

const plan = (buildings: Building[]): Plan =>
  ({ title: 'Plan', buildings, hubs: [{ id: 'P9', point: [1, 2] }] }) as unknown as Plan;

const data = {
  plans: {
    R8: plan([building('NB01', 100), building('NB02a', 40, 'NB02'), building('NB02b', 60, 'NB02')]),
    C: plan([building('NB01', 50)]),
  },
  programme: [
    { id: 'NB01', use: 'Academic', sourceBulkM2: 100 },
    { id: 'NB02', use: 'Residences', sourceBulkM2: 150 },
    { id: 'NB03', use: 'Academic', sourceBulkM2: 80 },
  ],
  cases: [{ id: 'GATE3', title: 'Gate', finding: 'F', point: [5, 5], overlay: 'road' }],
} as unknown as CampusMasterplanData;

describe('MasterplanStore', () => {
  let store: MasterplanStore;
  const scrollTo = vi.fn();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: CampusDataService, useValue: { masterplan: { value: signal(data) } } },
        { provide: SectionNavService, useValue: { scrollTo } },
      ],
    });
    store = TestBed.inject(MasterplanStore);
    store.init(data);
  });

  it('allocates wings to their parent programme entry', () => {
    const rows = store.programmeRows();
    expect(rows.map((r) => [r.id, r.placed, r.status])).toEqual([
      ['NB01', 100, 'full'],
      ['NB02', 100, 'partial'],
      ['NB03', 0, 'unsited'],
    ]);
    expect(store.kpis().gap).toBe(130);
  });

  it('keeps the selection when the new plan has the building, otherwise picks the first', () => {
    store.selectBuilding('NB01');
    store.choosePlan('C');
    expect(store.selectedId()).toBe('NB01');
    store.choosePlan('R8');
    store.selectBuilding('NB02b');
    store.choosePlan('C');
    expect(store.selectedId()).toBe('NB01');
  });

  it('steps through buildings with wrap-around', () => {
    store.stepBuilding(-1);
    expect(store.selectedId()).toBe('NB02b');
    store.stepBuilding(1);
    expect(store.selectedId()).toBe('NB01');
  });

  it('locating a case turns on its overlay and focuses the map', () => {
    store.editCase('GATE3');
    expect(store.layers().road).toBe(true);
    expect(store.camera().w).toBe(190);
    expect(store.viewStatus()).toBe('Gate · F');
    expect(scrollTo).toHaveBeenCalledWith('mp-plan', 'smooth');
  });

  it('clamps zoom', () => {
    for (let i = 0; i < 20; i++) store.zoom(0.7);
    expect(store.camera().w).toBe(70);
  });
});
