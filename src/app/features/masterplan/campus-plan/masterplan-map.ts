import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CampusDataService } from '../../../core/campus-data.service';
import type { Geometry } from '../../../core/models/campus-masterplan.models';
import { ZaNumberPipe } from '../../../shared/format';
import { geometryPath, rawPoints } from '../../../shared/svg-geometry';
import { MasterplanStore } from '../masterplan.store';

interface Shape {
  d: string;
  fill: string;
  stroke: string;
  width: number;
  opacity?: string;
  dash?: string;
}

const USE_COLOURS: Record<string, string> = {
  Academic: '#dfd3b1',
  'Academic Support': '#becdac',
  Administration: '#c5ccd8',
  'Administration; Academic Support': '#c5ccd8',
  'Student Residences': '#dfbfae',
  'Student Shared Facilities': '#e8c979',
  'Multi-purpose': '#c6b5d4',
};

const HATCH = 'url(#mp-roof-hatch)';

function shape(
  g: Geometry | null | undefined,
  fill: string,
  stroke: string,
  width: number,
  extra: Partial<Shape> = {},
) {
  const d = geometryPath(g);
  return d ? [{ d, fill, stroke, width, ...extra }] : [];
}

/** Interactive SVG plan of the chosen design: drag to pan, +/- and arrow keys, click to select. */
@Component({
  selector: 'app-masterplan-map',
  imports: [ZaNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './masterplan-map.html',
  styleUrl: './masterplan-map.css',
})
export class MasterplanMap {
  protected readonly store = inject(MasterplanStore);
  private readonly campusData = inject(CampusDataService);
  private readonly svg = viewChild.required<ElementRef<SVGSVGElement>>('svg');
  private readonly width = signal(600);

  protected readonly viewBox = computed(() => {
    const c = this.store.camera();
    return [c.x, c.y, c.w, c.h].join(' ');
  });
  protected readonly labelSize = computed(
    () => (this.store.camera().w / Math.max(this.width(), 600)) * 10,
  );

  /** Everything drawn below the proposed buildings. */
  protected readonly baseShapes = computed<Shape[]>(() => {
    const data = this.store.data(),
      p = this.store.plan(),
      layers = this.store.layers(),
      isR8 = this.store.planKey() === 'R8';
    if (!data || !p) return [];
    const ctx = data.context,
      out: Shape[] = [];
    for (const [geoms, col] of [
      [ctx.green, '#e5ead6'],
      [ctx.agriculture, '#d4dcb3'],
      [ctx.sports, '#c7d8af'],
      [ctx.roads, '#ccd0c4'],
      [ctx.walks, '#ede6d2'],
    ] as const)
      for (const g of geoms) out.push(...shape(g, col, '#a9b39b', 0.35));
    if (layers.privacy && isR8)
      for (const f of p.integrationFeatures.filter((f) => f.kind === 'Public-private precinct')) {
        const intent = f.accessIntent ?? '';
        const col = intent.includes('Residential')
          ? '#b77e96'
          : intent.includes('Public')
            ? '#d5b265'
            : intent.includes('Shared')
              ? '#9fc38a'
              : '#83aab2';
        out.push(...shape(f.geometry, col, col, 0.6, { opacity: '.18' }));
      }
    if (layers.paths)
      for (const f of p.paths)
        out.push(
          ...(f.surfaceGeometry
            ? shape(f.surfaceGeometry, f.width === 4 ? '#cbb27f' : '#e0d0a9', '#a99673', 0.4)
            : shape(f.geometry, 'none', '#cbb27f', f.width)),
        );
    for (const f of p.places)
      out.push(...shape(f.geometry, f.kind === 'Commons' ? '#ddcca6' : '#c1d09e', '#98aa7b', 0.3));
    if (layers.integration) {
      for (const f of p.urbanDesignFeatures ?? []) {
        const col = ['Court lawn', 'Promenade planting'].includes(f.kind)
          ? '#becd9c'
          : ['Seat wall', 'Bench'].includes(f.kind)
            ? '#8a7b5e'
            : f.kind === 'Pergola'
              ? HATCH
              : f.kind === 'Wayfinding'
                ? '#526d56'
                : '#e3d9bd';
        out.push(...shape(f.geometry, col, '#9a9f83', 0.3));
      }
      if (isR8)
        for (const f of p.integrationFeatures) {
          if (f.kind === 'Vehicle framework reference')
            out.push(...shape(f.geometry, 'none', '#6e8b80', 1.1));
          else if (f.kind === 'Southern gate review marker' && f.geometry.type === 'Point') {
            const [x, y] = f.geometry.coordinates;
            // Small triangle marker, drawn as a closed path.
            out.push({
              d: `M${x},${-y - 5}L${x + 5},${-y + 4}L${x - 5},${-y + 4}Z`,
              fill: '#fff5db',
              stroke: '#9c5b43',
              width: 1,
            });
          } else if (
            ![
              'Public-private precinct',
              'Coordination parcel',
              'Existing access investigation',
            ].includes(f.kind)
          ) {
            const col =
              f.kind === 'Covered frontage study'
                ? HATCH
                : f.kind === 'Residential-sport threshold'
                  ? '#b9cc90'
                  : '#d9c194';
            out.push(...shape(f.geometry, col, '#8d855f', 0.8));
          }
        }
    }
    if (layers.parcels && isR8)
      for (const f of p.integrationFeatures.filter((f) => f.kind === 'Coordination parcel'))
        out.push(...shape(f.geometry, 'none', '#95748a', 1, { dash: '5 4' }));
    if (layers.utility) {
      out.push(...shape(data.reviews.utility, '#c47758', '#a04f3a', 0.4, { opacity: '.75' }));
      out.push(
        ...shape(data.reviews.newStudyUtility, '#b44856', '#813141', 0.8, { opacity: '.9' }),
      );
    }
    if (layers.road)
      out.push(...shape(data.reviews.road, '#dba956', '#a27733', 0.6, { opacity: '.8' }));
    if (layers.context) {
      for (const g of ctx.buildings) out.push(...shape(g, '#d7d8cb', '#727d69', 0.65));
      for (const g of ctx.conditionalReplacement)
        out.push(...shape(g, 'none', '#b17467', 0.8, { dash: '4 3' }));
    }
    return out;
  });

  protected readonly buildings = computed(() =>
    (this.store.plan()?.buildings ?? []).map((b) => ({
      id: b.id,
      d: geometryPath(b.geometry),
      use: b.use,
    })),
  );
  protected readonly useColour = (use: string) => USE_COLOURS[use] || '#d9ceb4';

  protected readonly boundaryLines = computed(() =>
    (this.store.data()?.context.boundary ?? []).map((l) =>
      geometryPath({ type: 'LineString', coordinates: l }),
    ),
  );
  protected readonly cases = computed(() =>
    (this.store.data()?.cases ?? []).filter((c) => c.point),
  );
  /** Open source boundary linework and its open ends from the checked-geometry dataset. */
  protected readonly checkedBoundary = computed(() => {
    const b = this.campusData.boundary(),
      lines = this.campusData.geometry.value()?.boundary.lines;
    return b && lines ? { lines: lines.map(rawPoints), gaps: b.check.gaps } : null;
  });

  private drag: { x: number; y: number; startX: number; startY: number } | null = null;
  private moved = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const el = this.svg().nativeElement;
      const ro = new ResizeObserver(() => this.width.set(el.getBoundingClientRect().width));
      ro.observe(el);
      destroyRef.onDestroy(() => ro.disconnect());
    });
  }

  protected onPointerDown(e: PointerEvent): void {
    this.drag = { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY };
    this.moved = false;
    this.svg().nativeElement.setPointerCapture(e.pointerId);
  }

  protected onPointerMove(e: PointerEvent): void {
    const drag = this.drag;
    if (!drag) return;
    if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 4) this.moved = true;
    const r = this.svg().nativeElement.getBoundingClientRect();
    this.store.pan(-(e.clientX - drag.x) / r.width, -(e.clientY - drag.y) / r.height);
    drag.x = e.clientX;
    drag.y = e.clientY;
  }

  protected onPointerUp(e: PointerEvent): void {
    if (this.drag && !this.moved) {
      // Pointer capture retargets the event, so hit-test the point under the pointer.
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      const building = hit?.closest<SVGElement>('[data-building]');
      const marker = hit?.closest<SVGElement>('[data-case-map]');
      if (building) this.store.selectBuilding(building.dataset['building']!);
      else if (marker) this.store.editCase(marker.dataset['caseMap']!, false);
    }
    this.drag = null;
  }

  protected onKeydown(e: KeyboardEvent): void {
    const actions: Record<string, () => void> = {
      '+': () => this.store.zoom(0.7),
      '-': () => this.store.zoom(1 / 0.7),
      ArrowLeft: () => this.store.pan(-0.1, 0),
      ArrowRight: () => this.store.pan(0.1, 0),
      ArrowUp: () => this.store.pan(0, -0.1),
      ArrowDown: () => this.store.pan(0, 0.1),
    };
    const action = actions[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  }
}
