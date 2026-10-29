import { Injectable, computed, inject, signal } from '@angular/core';
import { CampusDataService } from '../../core/campus-data.service';
import {
  type CampusMasterplanData,
  type PlanKey,
  type Point,
  SOURCE_PROGRAMME_GFA_M2,
} from '../../core/models/campus-masterplan.models';
import { SectionNavService } from '../../core/section-nav.service';

export interface Camera {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type LayerKey =
  'context' | 'paths' | 'integration' | 'privacy' | 'parcels' | 'attention' | 'utility' | 'road';
export type Layers = Record<LayerKey, boolean>;

export type ProgrammeStatus = 'unsited' | 'partial' | 'full';

export const PLAN_OPTIONS: { key: PlanKey; label: string }[] = [
  { key: 'R8', label: 'R8 · integrated campus concept' },
  { key: 'R7', label: 'R7 · previous developed concept' },
  { key: 'A', label: 'A · learning spine' },
  { key: 'B', label: 'B · garden courts' },
  { key: 'C', label: 'C · compact neighbourhoods' },
];

const WHOLE_CAMPUS: Camera = { x: -1580, y: -505, w: 2070, h: 1165 };

/** Shared state of the masterplan: chosen design, selected building, map camera, layers and review case. */
@Injectable({ providedIn: 'root' })
export class MasterplanStore {
  private readonly nav = inject(SectionNavService);
  private readonly dataService = inject(CampusDataService);

  readonly data = computed(() => this.dataService.masterplan.value());

  readonly planKey = signal<PlanKey>('R8');
  readonly selectedId = signal('');
  readonly camera = signal<Camera>(WHOLE_CAMPUS);
  readonly layers = signal<Layers>({
    context: true,
    paths: true,
    integration: true,
    privacy: false,
    parcels: false,
    attention: true,
    utility: false,
    road: false,
  });
  readonly activeCaseId = signal('HEART');
  readonly caseFilter = signal<'all' | 'walkway' | 'design'>('all');
  readonly viewStatus = signal('');
  /** Set to a new request each time the 3D viewer should focus a building. */
  readonly focus3dRequest = signal<{ buildingId: string } | null>(null);

  readonly plan = computed(() => this.data()?.plans[this.planKey()]);
  readonly selectedBuilding = computed(() =>
    this.plan()?.buildings.find((b) => b.id === this.selectedId()),
  );
  readonly activeCase = computed(() =>
    this.data()?.cases.find((c) => c.id === this.activeCaseId()),
  );

  /** Every source programme entry with its allocation in the chosen design. */
  readonly programmeRows = computed(() => {
    const data = this.data(),
      plan = this.plan();
    if (!data || !plan) return [];
    const alloc: Record<string, number> = {};
    for (const b of plan.buildings) {
      const id = b.parentProgrammeID || b.id;
      alloc[id] = (alloc[id] || 0) + Number(b.designGFAM2);
    }
    return data.programme.map((r) => {
      const placed = alloc[r.id] || 0,
        remaining = Math.max(0, r.sourceBulkM2 - placed);
      const status: ProgrammeStatus =
        placed < 0.005 ? 'unsited' : remaining < 0.005 ? 'full' : 'partial';
      return { ...r, placed, remaining, status };
    });
  });

  readonly kpis = computed(() => {
    const rows = this.programmeRows(),
      placed = rows.reduce((s, r) => s + r.placed, 0);
    return {
      blocks: this.plan()?.buildings.length ?? 0,
      placed,
      placedShare: (placed / SOURCE_PROGRAMME_GFA_M2) * 100,
      full: rows.filter((r) => r.status === 'full').length,
      partial: rows.filter((r) => r.status === 'partial').length,
      unsited: rows.filter((r) => r.status === 'unsited').length,
      gap: rows.reduce((s, r) => s + r.remaining, 0),
    };
  });

  /** Called once data has loaded. */
  init(data: CampusMasterplanData): void {
    this.selectedId.set(data.plans.R8.buildings[0].id);
    this.choosePlan('R8');
  }

  choosePlan(key: PlanKey): void {
    const plan = this.data()?.plans[key];
    if (!plan) return;
    this.planKey.set(key);
    if (!plan.buildings.some((b) => b.id === this.selectedId()))
      this.selectedId.set(plan.buildings[0].id);
    this.viewStatus.set(
      key === 'R8'
        ? 'Integrated concept: original-campus principles and mapped R8 design studies. Layer switches change display only.'
        : 'Earlier design scenario. R8 integration zones are not applied to this alternative; source investigation markers remain contextual.',
    );
  }

  inspectAlternative(key: PlanKey): void {
    this.choosePlan(key);
    this.nav.scrollTo('mp-plan');
  }

  selectBuilding(id: string): void {
    this.selectedId.set(id);
  }

  stepBuilding(dir: 1 | -1): void {
    const buildings = this.plan()?.buildings;
    if (!buildings) return;
    const i = buildings.findIndex((b) => b.id === this.selectedId());
    this.selectedId.set(buildings[(i + dir + buildings.length) % buildings.length].id);
  }

  setLayer(key: LayerKey, on: boolean): void {
    this.layers.update((l) => ({ ...l, [key]: on }));
  }

  // Camera ---------------------------------------------------------------

  fit(): void {
    this.camera.set(WHOLE_CAMPUS);
  }

  focusPoint(pt: Point, w = 300): void {
    this.camera.set({ x: pt[0] - w / 2, y: -pt[1] - w * 0.34, w, h: w * 0.68 });
  }

  zoom(k: number): void {
    this.camera.update((c) => {
      const cx = c.x + c.w / 2,
        cy = c.y + c.h / 2,
        w = Math.max(70, Math.min(5000, c.w * k)),
        h = w * 0.5628;
      return { x: cx - w / 2, y: cy - h / 2, w, h };
    });
  }

  /** Pans by a fraction of the current view. */
  pan(fx: number, fy: number): void {
    this.camera.update((c) => ({ ...c, x: c.x + c.w * fx, y: c.y + c.h * fy }));
  }

  focusSelected(): void {
    const b = this.selectedBuilding();
    if (b) this.focusPoint(b.proposedEntry, 160);
  }

  focusPrecinct(precinct: 'core' | 'south' | 'res'): void {
    if (precinct === 'core') this.focusPoint([-650, -100], 800);
    else if (precinct === 'res') this.focusPoint([30, -300], 640);
    else {
      if (this.planKey() !== 'R8') this.choosePlan('R8');
      const gate = this.data()?.plans.R8.hubs.find((h) => h.id === 'P9');
      if (gate) this.focusPoint(gate.point, 300);
    }
  }

  // Cross-section actions -------------------------------------------------

  /** Programme table "Inspect": select the building carrying a source requirement and show it on the map. */
  inspectProgramme(parentId: string): void {
    const b = this.plan()?.buildings.find((b) => (b.parentProgrammeID || b.id) === parentId);
    if (!b) return;
    this.selectedId.set(b.id);
    this.focusPoint(b.proposedEntry, 180);
    this.nav.scrollTo('mp-plan');
  }

  editCase(id: string, locate = true): void {
    const c = this.data()?.cases.find((c) => c.id === id);
    if (!c) return;
    this.activeCaseId.set(id);
    if (!locate) return;
    if (c.overlay === 'road' || c.overlay === 'privacy') this.setLayer(c.overlay, true);
    if (c.point) this.focusPoint(c.point, 190);
    else this.fit();
    this.nav.scrollTo('mp-plan', 'smooth');
    this.viewStatus.set(c.title + ' · ' + c.finding);
  }

  inspectIn3d(): void {
    if (this.planKey() !== 'R8') this.choosePlan('R8');
    this.nav.scrollTo('mp-3d');
    this.focus3dRequest.set({ buildingId: this.selectedId() });
  }

  /** A building picked inside the 3D viewer. */
  selectFromViewer(buildingId: string): void {
    if (!this.data()?.plans.R8.buildings.some((b) => b.id === buildingId)) return;
    if (this.planKey() !== 'R8') this.choosePlan('R8');
    this.selectedId.set(buildingId);
  }
}
