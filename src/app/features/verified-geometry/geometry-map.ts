import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import type { BoundaryAnalysis } from '../../core/campus-data.service';
import type { PolyFeature, VerifiedGeometryData } from '../../core/models/verified-geometry.models';
import { polysPath, rawPoints } from '../../shared/svg-geometry';

type Box = [number, number, number, number];

/**
 * Source-geometry plan: context, supplied envelopes, one proposal population,
 * the open boundary with its gaps and the derived hull. Wheel / drag / keys to navigate.
 */
@Component({
  selector: 'app-geometry-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './geometry-map.html',
  styleUrl: './geometry-map.css',
})
export class GeometryMap {
  readonly data = input.required<VerifiedGeometryData>();
  readonly boundary = input.required<BoundaryAnalysis>();
  readonly setKey = input.required<string>();
  readonly features = input.required<PolyFeature[]>();
  readonly selected = input<number | null>(null);
  readonly fingerprint = input('');
  /** When set, the selected footprint is drawn again shifted by [east, south] metres. */
  readonly offset = input<[number, number] | null>(null);
  readonly compact = input(false, { transform: booleanAttribute });
  readonly featureSelected = output<number>();

  protected readonly extent = computed<Box>(() => {
    const pts = this.boundary().derived.concat(this.data().boundary.lines.flat()),
      xs = pts.map((p) => p[0]),
      ys = pts.map((p) => p[1]);
    return [
      Math.min(...xs) - 50,
      Math.min(...ys) - 60,
      Math.max(...xs) - Math.min(...xs) + 100,
      Math.max(...ys) - Math.min(...ys) + 140,
    ];
  });
  protected readonly box = linkedSignal<Box>(() => this.extent());
  protected readonly viewBox = computed(() => this.box().join(' '));

  protected readonly contextPaths = computed(() =>
    this.data().context.map((f) => polysPath(f.polys)),
  );
  protected readonly envelopePaths = computed(() =>
    this.data().envelopes.map((f) => polysPath(f.polys)),
  );
  protected readonly featurePaths = computed(() =>
    this.features().map((f) => ({ d: polysPath(f.polys), title: this.setKey() + ':' + f.id })),
  );
  protected readonly derivedPath = computed(() => polysPath([[this.boundary().derived]]));
  protected readonly boundaryLines = computed(() => this.data().boundary.lines.map(rawPoints));
  protected readonly optionPath = computed(() => {
    const offset = this.offset(),
      i = this.selected(),
      f = i === null ? null : this.features()[i];
    if (!offset || !f) return null;
    const [dx, dy] = offset;
    return polysPath(f.polys.map((p) => p.map((r) => r.map((q) => [q[0] + dx, q[1] + dy]))));
  });

  private drag: [number, number] | null = null;
  /** Feature under the pointer at pointerdown; selected on release if the pointer did not pan. */
  private pressed: { index: number; x: number; y: number } | null = null;

  protected onWheel(e: WheelEvent, svg: Element): void {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.15 : 0.87,
      r = svg.getBoundingClientRect(),
      u = (e.clientX - r.left) / r.width,
      v = (e.clientY - r.top) / r.height;
    this.box.update((b) => [
      b[0] + b[2] * u * (1 - factor),
      b[1] + b[3] * v * (1 - factor),
      b[2] * factor,
      b[3] * factor,
    ]);
  }

  protected onPointerDown(e: PointerEvent, svg: Element): void {
    const hit = (e.target as Element).getAttribute('data-hi');
    this.pressed = hit === null ? null : { index: Number(hit), x: e.clientX, y: e.clientY };
    this.drag = [e.clientX, e.clientY];
    svg.setPointerCapture(e.pointerId);
  }

  protected onPointerMove(e: PointerEvent, svg: Element): void {
    const drag = this.drag;
    if (!drag) return;
    const r = svg.getBoundingClientRect();
    this.box.update((b) => [
      b[0] - ((e.clientX - drag[0]) * b[2]) / r.width,
      b[1] - ((e.clientY - drag[1]) * b[3]) / r.height,
      b[2],
      b[3],
    ]);
    this.drag = [e.clientX, e.clientY];
  }

  protected onPointerUp(e: PointerEvent): void {
    const p = this.pressed;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) <= 4) this.featureSelected.emit(p.index);
    this.pressed = null;
    this.drag = null;
  }

  protected onKeydown(e: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', '0'].includes(e.key)) return;
    e.preventDefault();
    if (e.key === '0') {
      this.box.set(this.extent());
      return;
    }
    this.box.update((b) => {
      const d = b[2] * 0.08;
      if (e.key === 'ArrowLeft') return [b[0] - d, b[1], b[2], b[3]];
      if (e.key === 'ArrowRight') return [b[0] + d, b[1], b[2], b[3]];
      if (e.key === 'ArrowUp') return [b[0], b[1] - d, b[2], b[3]];
      if (e.key === 'ArrowDown') return [b[0], b[1] + d, b[2], b[3]];
      const f = e.key === '+' ? 0.85 : 1.15;
      return [b[0], b[1], b[2] * f, b[3] * f];
    });
  }
}
