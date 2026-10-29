import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  type BoundaryAnalysis,
  CampusDataService,
  analyseBoundary,
} from '../../core/campus-data.service';
import type { SetKey, VerifiedGeometryData } from '../../core/models/verified-geometry.models';
import {
  VERSION,
  type Verification,
  planarHeightInvariant,
} from '../../geometry-engine/slab-check';
import type { WorkerRequest, WorkerResponse } from '../../geometry-engine/slab-check.messages';
import { ZaNumberPipe, formatZa } from '../../shared/format';
import { TrackSectionDirective } from '../../shared/section-tracking.directive';
import { buildDxf, downloadText } from './dxf-export';
import { drawExtrusions } from './extrusion-view';
import { GeometryMap } from './geometry-map';
import { REQUIRED_TRANSFORM, assertValidSource } from './source-validation';

const SET_LABELS: Record<SetKey, string> = {
  canonical: 'Canonical GIS',
  controlled: 'Retained Controlled Snapshot',
};

const ARCHIVE = { records: 90, overlaps: 47 };

/**
 * "Campus decisions backed by checked geometry": recomputes proposal/envelope
 * overlaps in a web worker and releases metrics only when every check agrees.
 */
@Component({
  selector: 'app-verified-geometry',
  imports: [GeometryMap, ZaNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './verified-geometry.html',
  styleUrl: './verified-geometry.css',
  host: { class: 'gta-card hg', id: 'verified-geometry' },
  hostDirectives: [TrackSectionDirective],
})
export class VerifiedGeometry {
  private readonly source = inject(CampusDataService).geometry;
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  /** The shipped dataset, replaced when a source JSON is reloaded. */
  protected readonly data = signal<VerifiedGeometryData | null>(null);
  protected readonly boundary = signal<BoundaryAnalysis | null>(null);
  protected readonly result = signal<Partial<Record<SetKey, Verification>>>({});
  protected readonly selected = signal<Record<SetKey, number | null>>({
    canonical: 0,
    controlled: null,
  });
  protected readonly setKey = signal<SetKey>('canonical');
  protected readonly height = signal(9);
  protected readonly angle = signal(-0.35);
  protected readonly dx = signal(0);
  protected readonly dy = signal(0);

  protected readonly status = signal('Metrics withheld until independent checks agree.');
  protected readonly error = signal<string | null>(null);
  protected readonly proof = signal('Waiting for geometry checks.');
  protected readonly optionResult = signal(
    'Source footprint retained. Option metrics require the same independent checks. Campus containment remains blocked.',
  );
  protected readonly heightCheck = signal('');
  protected readonly running = signal(false);
  protected readonly optionRunning = signal(false);
  private readonly canvasWidth = signal(0);

  protected readonly verified = computed(
    () => !!this.result().canonical && !!this.result().controlled,
  );
  protected readonly setLabels = SET_LABELS;
  protected readonly setKeys = ['canonical', 'controlled'] as const;
  protected readonly archive = ARCHIVE;

  protected readonly fingerprint = (k: keyof VerifiedGeometryData['dates']) => {
    const d = this.data();
    return d
      ? VERSION +
          ' · ' +
          (d.crs || 'CRS UNVERIFIED') +
          ' · source ' +
          (d.dates[k] || 'date UNVERIFIED') +
          ' · ' +
          d.fingerprint.slice(0, 12)
      : '';
  };

  protected readonly features = computed(() => this.data()?.sets[this.setKey()].features ?? []);

  protected readonly ledger = computed(() => {
    const d = this.data(),
      r = this.result();
    if (!d) return [];
    return (['controlled', 'canonical'] as const).map((k) => ({
      key: k,
      label: SET_LABELS[k],
      records: d.sets[k].features.length,
      overlaps: r[k]?.x.count,
      area: r[k]?.x.area,
      evidence:
        k === 'controlled' ? 'Different geometry · separate population' : 'Reopened GIS geometry',
      verified: !!r[k],
    }));
  });

  protected readonly agreement = computed(() => {
    const canonical = this.result().canonical,
      d = this.data();
    if (!canonical || !d) return 'Overlap-rate comparison withheld pending verification.';
    const a = (ARCHIVE.overlaps / ARCHIVE.records) * 100,
      c = (canonical.x.count / d.sets.canonical.features.length) * 100;
    return (
      'Reported archive overlap rate ' +
      a.toFixed(1) +
      '% vs recomputed canonical ' +
      c.toFixed(1) +
      '% — close rates do not establish equal geometry or identities. ' +
      this.fingerprint('canonical')
    );
  });

  protected readonly gates = computed(() => {
    const d = this.data(),
      b = this.boundary()?.check;
    if (!d) return [];
    const crs = !!d.crs && d.units === 'metres' && d.coordinateTransform === REQUIRED_TRANSFORM;
    const provenance = d.envelopes.length === 7 && d.envelopes.every((f) => f.source);
    const pop =
      d.sets.canonical.features.length === 109 && d.sets.controlled.features.length === 109;
    return [
      {
        name: 'Boundary closure',
        pass: b?.closed === true,
        desc: 'Odd-degree endpoint test with 0.01 m tolerance. No automatic closing segment.',
      },
      {
        name: 'CRS declaration',
        pass: crs,
        desc: 'Inherited ESRI:102488 metres and recorded reversible local transform; independent registration unverified.',
      },
      {
        name: 'Derived area sanity',
        pass: b?.areaOK === true,
        desc: 'Derived study hull must be within 0.5–500 ha; it is never an approved boundary.',
      },
      {
        name: 'Population identity',
        pass: pop,
        desc: 'Two distinct source-scoped record arrays; archive summary separate.',
      },
      {
        name: 'Envelope provenance',
        pass: provenance,
        desc: 'Seven supplied geometry records and source names retained; statutory status unverified.',
      },
      {
        name: 'Recompute confirmation',
        pass: this.verified(),
        desc: 'X-axis, Y-axis and uniform grid must agree for each feature and each union.',
      },
    ];
  });

  protected readonly boundaryText = computed(() => {
    const b = this.boundary();
    return b ? 'Boundary check: BLOCKED — ' + b.check.gaps.length + ' open ends' : '';
  });

  protected readonly boundaryMethod = computed(() => {
    const b = this.boundary();
    if (!b) return '';
    return (
      'DERIVED — NOT CADASTRAL: convex hull of the loaded campus-context geometry, ' +
      formatZa(b.derivedArea / 10000, 2, 0) +
      ' ha (study extent only). ' +
      this.fingerprint('boundary') +
      '. Drawing linework remains open. Independent CAD/GIS registration is UNVERIFIED.'
    );
  });

  protected readonly selectedText = computed(() => {
    const d = this.data(),
      k = this.setKey(),
      i = this.selected()[k];
    const f = i === null ? null : d?.sets[k].features[i];
    if (!f || i === null) return '';
    const r = this.result()[k]?.x.records[i];
    return (
      k +
      ':' +
      f.id +
      ' · ' +
      (r
        ? 'Checked footprint ' +
          r.area.toFixed(2) +
          ' m²; envelope overlap ' +
          r.overlap.toFixed(2) +
          ' m² · ' +
          this.fingerprint(k)
        : 'Area WITHHELD until verification')
    );
  });

  private worker: Worker | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.worker?.terminate());

    // First load of the shipped dataset.
    effect(() => {
      const d = this.source.value();
      if (d) untracked(() => this.open(d));
    });

    // The canvas only exists once data has loaded.
    effect((onCleanup) => {
      const el = this.canvas()?.nativeElement;
      if (!el) return;
      const ro = new ResizeObserver((es) =>
        this.canvasWidth.set(Math.round(es[0].contentRect.width)),
      );
      ro.observe(el);
      onCleanup(() => ro.disconnect());
    });

    effect(() => {
      const el = this.canvas()?.nativeElement,
        d = this.data(),
        b = this.boundary();
      this.canvasWidth();
      if (!el || !d || !b) return;
      drawExtrusions(el, d, b, this.features(), {
        angle: this.angle(),
        height: this.height(),
        fingerprint: this.fingerprint(this.setKey()),
      });
    });
  }

  /** Validates a dataset, derives its boundary status and starts verification. */
  private open(d: VerifiedGeometryData): void {
    try {
      assertValidSource(d);
      this.data.set(d);
      this.boundary.set(analyseBoundary(d));
      this.checkHeight(this.height());
      this.run();
    } catch (e) {
      this.failure((e as Error).message);
    }
  }

  private failure(message: string): void {
    this.proof.set('Verification failed; no new metric is released.');
    this.error.set(message);
    this.status.set('Verification FAILED — analytical metrics withheld.');
    this.result.set({});
    this.running.set(false);
    this.optionRunning.set(false);
  }

  protected run(): void {
    const d = this.data();
    try {
      assertValidSource(d);
      this.result.set({});
      this.proof.set('Recomputation in progress; prior results withheld.');
      this.optionResult.set('Option metrics withheld until verification.');
      this.error.set(null);
      this.running.set(true);
      this.status.set('Starting independent geometry checks…');
      this.startWorker().postMessage({ type: 'all', data: d } satisfies WorkerRequest);
    } catch (e) {
      this.failure((e as Error).message);
    }
  }

  private startWorker(): Worker {
    this.worker?.terminate();
    const worker = new Worker(new URL('../../geometry-engine/slab-check.worker', import.meta.url), {
      type: 'module',
    });
    worker.onerror = (e) => {
      e.preventDefault();
      this.failure('Worker execution error: ' + e.message);
    };
    worker.onmessage = ({ data: m }: MessageEvent<WorkerResponse>) => this.onWorkerMessage(m);
    this.worker = worker;
    return worker;
  }

  private onWorkerMessage(m: WorkerResponse): void {
    switch (m.type) {
      case 'progress':
        this.status.set(m.text);
        break;
      case 'result':
        this.result.update((r) => ({ ...r, [m.key]: m.result }));
        break;
      case 'done': {
        const r = this.result(),
          d = this.data()!;
        this.status.set(
          'PASS — X-axis, Y-axis and uniform grid agree on both snapshots. Boundary and legal checks remain blocked.',
        );
        const summary = (v: Verification) => ({
          x: v.x.area,
          y: v.y.area,
          grid: v.grid.area,
          overlaps: v.x.count,
          cell: v.grid.cell,
        });
        this.proof.set(
          JSON.stringify(
            {
              engine: VERSION,
              crs: d.crs,
              sourceFingerprint: d.fingerprint,
              canonical: summary(r.canonical!),
              controlled: summary(r.controlled!),
              tolerances: r.canonical!.tolerance,
              boundary: this.boundary()?.check,
              archive: { records: ARCHIVE.records, overlaps: ARCHIVE.overlaps, reproduced: false },
            },
            null,
            2,
          ),
        );
        this.running.set(false);
        break;
      }
      case 'failure':
        this.failure(m.error);
        break;
      case 'option':
        this.optionResult.set(
          'Verified option: footprint ' +
            m.result.x.area.toFixed(2) +
            ' m²; envelope overlap ' +
            m.result.x.overlap.toFixed(2) +
            ' m². ' +
            this.fingerprint(this.setKey()) +
            '. Campus containment BLOCKED.',
        );
        this.optionRunning.set(false);
        break;
    }
  }

  protected chooseSet(key: string): void {
    const k = key as SetKey;
    this.setKey.set(k);
    if (this.selected()[k] === null) this.selected.update((s) => ({ ...s, [k]: 0 }));
  }

  protected selectFeature(key: SetKey, index: number): void {
    this.selected.update((s) => ({ ...s, [key]: index }));
    this.setKey.set(key);
  }

  protected setHeight(value: string): void {
    const h = Number(value);
    this.height.set(h);
    this.checkHeight(h);
  }

  private checkHeight(h: number): void {
    try {
      planarHeightInvariant(this.features(), h);
      this.heightCheck.set('PASS · display height leaves XY and planar results unchanged');
    } catch (e) {
      this.failure((e as Error).message);
    }
  }

  protected setOffset(axis: 'dx' | 'dy', value: string): void {
    this[axis].set(Number(value) || 0);
    this.optionResult.set('Option changed. Metrics withheld until Verify this option completes.');
  }

  protected runOption(): void {
    try {
      const dx = this.dx(),
        dy = this.dy();
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) throw Error('Invalid option offset');
      const i = this.selected()[this.setKey()] ?? 0,
        f = this.features()[i],
        copy = {
          ...f,
          polys: f.polys.map((p) => p.map((r) => r.map((q) => [q[0] + dx, q[1] + dy]))),
        };
      this.optionRunning.set(true);
      this.worker?.postMessage({
        type: 'option',
        feature: copy,
        envelopes: this.data()!.envelopes,
      } satisfies WorkerRequest);
    } catch (e) {
      this.failure((e as Error).message);
    }
  }

  protected async reload(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 50_000_000) throw Error('Reload refused: input exceeds 50 MB');
      const text = await file.text(),
        data = JSON.parse(text) as VerifiedGeometryData;
      assertValidSource(data);
      if (!crypto.subtle) throw Error('Reload fingerprint requires a secure context or local file');
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      data.fingerprint = [...new Uint8Array(hash)]
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('');
      this.selected.set({ canonical: 0, controlled: null, [this.setKey()]: 0 });
      this.open(data);
    } catch (e) {
      this.failure((e as Error).message);
    }
  }

  protected exportDxf(): void {
    try {
      const d = this.data(),
        b = this.boundary();
      if (!d || !b || !this.verified())
        throw Error('DXF export blocked until geometry verification passes');
      downloadText(
        buildDxf(d, b, this.features(), this.fingerprint('canonical')),
        'GroundTruth_Checked_Geometry.dxf',
        'application/dxf',
      );
      this.status.set(
        'DXF download requested. Open boundary lines, detected gap circles and warning labels are included.',
      );
    } catch (e) {
      this.failure((e as Error).message);
    }
  }
}
