import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CampusDataService } from '../../core/campus-data.service';
import { ReferenceNote } from '../../shared/reference-note';
import { TrackSectionDirective } from '../../shared/section-tracking.directive';
import { flippedPoints, geometryPath } from '../../shared/svg-geometry';
import { type Face, drawFurnitureModel, partName, pointInPolygon } from './furniture-model';

const DEFAULT_THETA = -0.65;

/** "Smart furniture · Student Commons concept": selectable 3D sketch and candidate-location map. */
@Component({
  selector: 'app-smart-furniture',
  imports: [ReferenceNote],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './smart-furniture.html',
  styleUrl: './smart-furniture.css',
  host: { class: 'mp-block', id: 'smart-furniture' },
  hostDirectives: [TrackSectionDirective],
})
export class SmartFurniture {
  private readonly data = inject(CampusDataService);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  protected readonly parts = computed(() => this.data.furniture.value()?.objects ?? []);
  protected readonly theta = signal(DEFAULT_THETA);
  protected readonly zoom = signal(1);
  protected readonly showRoofs = signal(true);
  protected readonly selected = signal(0);
  private readonly canvasSize = signal(0);
  private faces: Face[] = [];

  protected readonly partName = partName;
  protected readonly selectedInfo = computed(() => {
    const o = this.parts()[this.selected()];
    if (!o) return null;
    const xs = o.poly.map((p) => p[0]),
      ys = o.poly.map((p) => p[1]);
    return {
      name: partName(o, this.selected()),
      width: (Math.max(...xs) - Math.min(...xs)).toFixed(2),
      depth: (Math.max(...ys) - Math.min(...ys)).toFixed(2),
      z0: o.z0.toFixed(2),
      z1: o.z1.toFixed(2),
    };
  });

  /** Candidate locations drawn over the campus context, framed to the boundary and markers. */
  protected readonly locator = computed(() => {
    const d = this.data.masterplan.value();
    if (!d) return null;
    const context: { d: string; fill: string }[] = [];
    for (const [k, fill] of [
      ['green', '#e2e8d1'],
      ['sports', '#c9d9af'],
      ['roads', '#cbd0c3'],
      ['walks', '#e4d2ae'],
      ['buildings', '#c8cec0'],
    ] as const)
      for (const g of d.context[k] ?? []) context.push({ d: geometryPath(g), fill });
    const pts = d.context.boundary.flat().concat(d.shortlist.map((c) => c.point)),
      xs = pts.map((p) => p[0]),
      ys = pts.map((p) => -p[1]),
      x = Math.min(...xs) - 70,
      y = Math.min(...ys) - 70,
      w = Math.max(...xs) - x + 100,
      h = Math.max(...ys) - y + 70;
    return {
      viewBox: [x, y, w, h].join(' '),
      north: { x: x + w - 100, y: y + 60 },
      context,
      boundary: d.context.boundary.map(flippedPoints),
      shortlist: d.shortlist,
      summary: d.shortlist.map((c) => c.label + ' / OID ' + c.sourceOID).join(' · '),
    };
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const el = this.canvas()?.nativeElement;
      if (!el) return;
      const ro = new ResizeObserver(() => this.canvasSize.set(el.getBoundingClientRect().width));
      ro.observe(el);
      destroyRef.onDestroy(() => ro.disconnect());
    });

    effect(() => {
      const el = this.canvas()?.nativeElement,
        parts = this.parts();
      this.canvasSize();
      if (!el || !parts.length) return;
      this.faces = drawFurnitureModel(el, parts, {
        theta: this.theta(),
        zoom: this.zoom(),
        showRoofs: this.showRoofs(),
        selected: this.selected(),
      });
    });
  }

  protected rotate(delta: number): void {
    this.theta.update((t) => t + delta);
  }

  protected zoomBy(factor: number): void {
    this.zoom.update((z) => Math.max(0.4, Math.min(2.5, z * factor)));
  }

  protected reset(): void {
    this.theta.set(DEFAULT_THETA);
    this.zoom.set(1);
  }

  protected pick(ev: MouseEvent): void {
    const b = (ev.currentTarget as HTMLCanvasElement).getBoundingClientRect(),
      p: [number, number] = [ev.clientX - b.left, ev.clientY - b.top],
      face = [...this.faces].reverse().find((f) => pointInPolygon(p, f.points));
    if (face) this.selected.set(face.index);
  }

  protected onKeydown(ev: KeyboardEvent): void {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    ev.preventDefault();
    this.rotate(ev.key === 'ArrowLeft' ? -0.25 : 0.25);
  }
}
