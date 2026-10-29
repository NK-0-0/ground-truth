/**
 * GroundTruth SlabCheck-1.0.0 — dependency-free planar engine.
 *
 * Exact union / overlap areas by slab integration along both axes, plus an
 * independent uniform cell-centre grid sample. Metrics are only released when
 * all three agree. Runs on the main thread or inside `slab-check.worker.ts`.
 */
import type { PolyFeature, Ring, XY } from '../core/models/verified-geometry.models';

export const VERSION = 'SlabCheck-1.0.0';
const EPS = 1e-9;

type Interval = [number, number];

interface Edge {
  a: XY;
  b: XY;
  pid: number;
  ri: number;
  group: number;
  fi: number;
  min: number;
  max: number;
  lo: number;
  hi: number;
}

interface Prepared {
  edges: Edge[];
  polys: { group: number; fi: number }[];
}

export interface AreaRecord {
  area: number;
  overlap: number;
}

export interface SlabResult {
  area: number;
  overlap: number;
  records: AreaRecord[];
  count: number;
  slabs: number;
}

export interface GridResult {
  area: number;
  overlap: number;
  records: AreaRecord[];
  count: number;
  cell: number;
}

export interface Verification {
  verified: true;
  x: SlabResult;
  y: SlabResult;
  grid: GridResult;
  version: string;
  tolerance: { exact: string; grid: string };
}

export interface BoundaryCheck {
  gaps: XY[];
  closed: boolean;
  crs: boolean;
  areaOK: boolean;
  pass: boolean;
}

function assert(ok: unknown, msg: string): asserts ok {
  if (!ok) throw Error(msg);
}

function inRing(p: XY, r: Ring): boolean {
  let hit = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[i],
      b = r[j];
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      hit = !hit;
  }
  return hit;
}

/** Validates polygon rings: closed, finite, bounded, holes inside shell. */
export function rings(polys: unknown, label: string): void {
  assert(Array.isArray(polys) && polys.length, label + ': missing polygons');
  for (const poly of polys as Ring[][]) {
    assert(poly.length, label + ': missing shell');
    for (const r of poly) {
      assert(
        r.length >= 4 &&
          r.every(
            (p) =>
              Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]),
          ),
        label + ': invalid coordinate',
      );
      assert(
        r.every((p) => Math.abs(p[0]) <= 100000 && Math.abs(p[1]) <= 100000),
        label + ': outside bounded local metre frame',
      );
      assert(
        Math.hypot(r[0][0] - r.at(-1)![0], r[0][1] - r.at(-1)![1]) < 1e-7,
        label + ': open ring',
      );
    }
    for (let h = 1; h < poly.length; h++)
      assert(inRing(poly[h][0], poly[0]), label + ': hole outside shell');
  }
}

function union(a: Interval[]): Interval[] {
  if (!a.length) return [];
  a.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const out: Interval[] = [[a[0][0], a[0][1]]];
  for (let i = 1; i < a.length; i++) {
    const p = out.at(-1)!,
      q = a[i];
    if (q[0] <= p[1] + EPS) p[1] = Math.max(p[1], q[1]);
    else out.push([q[0], q[1]]);
  }
  return out;
}

function intersection(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  let i = 0,
    j = 0;
  while (i < a.length && j < b.length) {
    const lo = Math.max(a[i][0], b[j][0]),
      hi = Math.min(a[i][1], b[j][1]);
    if (hi > lo + EPS) out.push([lo, hi]);
    if (a[i][1] < b[j][1]) i++;
    else j++;
  }
  return out;
}

const length = (a: Interval[]) => a.reduce((s, p) => s + p[1] - p[0], 0);

function prepare(fs: PolyFeature[], es: PolyFeature[], axis: 0 | 1): Prepared {
  const edges: Edge[] = [],
    polys: Prepared['polys'] = [];
  for (const [group, features] of [
    [0, fs],
    [1, es],
  ] as const)
    features.forEach((f, fi) => {
      rings(f.polys, 'group ' + group + ' record ' + fi);
      for (const poly of f.polys) {
        const pid = polys.length;
        polys.push({ group, fi });
        poly.forEach((r, ri) => {
          for (let j = 1; j < r.length; j++) {
            const a = [r[j - 1][axis], r[j - 1][1 - axis]],
              b = [r[j][axis], r[j][1 - axis]];
            if (Math.hypot(a[0] - b[0], a[1] - b[1]) < EPS) continue;
            edges.push({
              a,
              b,
              pid,
              ri,
              group,
              fi,
              min: Math.min(a[0], b[0]),
              max: Math.max(a[0], b[0]),
              lo: Math.min(a[1], b[1]),
              hi: Math.max(a[1], b[1]),
            });
          }
        });
      }
    });
  return { edges, polys };
}

function cross(s: Edge, t: Edge): { x: number; proper: boolean } | null {
  const ax = s.b[0] - s.a[0],
    ay = s.b[1] - s.a[1],
    bx = t.b[0] - t.a[0],
    by = t.b[1] - t.a[1],
    den = ax * by - ay * bx;
  if (Math.abs(den) < 1e-14) return null;
  const dx = t.a[0] - s.a[0],
    dy = t.a[1] - s.a[1],
    u = (dx * by - dy * bx) / den,
    v = (dx * ay - dy * ax) / den;
  if (u >= -1e-10 && u <= 1 + 1e-10 && v >= -1e-10 && v <= 1 + 1e-10)
    return { x: s.a[0] + u * ax, proper: u > 1e-8 && u < 1 - 1e-8 && v > 1e-8 && v < 1 - 1e-8 };
  return null;
}

/** Slab boundaries: every edge endpoint plus every crossing between different polygons. */
function events(p: Prepared): number[] {
  const es = p.edges,
    xs = es.flatMap((e) => [e.min, e.max]),
    cells = new Map<string, number[]>(),
    seen = new Set<number>(),
    N = es.length,
    step = 24;
  for (let i = 0; i < N; i++) {
    const s = es[i];
    for (let x = Math.floor(s.min / step); x <= Math.floor(s.max / step); x++)
      for (let y = Math.floor(s.lo / step); y <= Math.floor(s.hi / step); y++) {
        const key = x + ',' + y,
          list = cells.get(key) || [];
        for (const j of list) {
          const t = es[j];
          if (s.max < t.min || t.max < s.min || s.hi < t.lo || t.hi < s.lo) continue;
          const pair = j * N + i;
          if (seen.has(pair)) continue;
          seen.add(pair);
          const c = cross(s, t);
          if (c) {
            assert(!(s.pid === t.pid && c.proper), 'Self-intersecting ring refused');
            if (s.pid !== t.pid) xs.push(c.x);
          }
        }
        list.push(i);
        cells.set(key, list);
      }
  }
  xs.sort((a, b) => a - b);
  return xs.filter((v, i) => !i || v - xs[i - 1] > 1e-10);
}

function scan(active: Set<Edge>, x: number, p: Prepared) {
  const vals = new Map<number, number[]>(),
    fa = new Map<number, Interval[]>(),
    env: Interval[] = [];
  for (const e of active) {
    if (e.max - e.min < EPS) continue;
    const y = e.a[1] + ((x - e.a[0]) * (e.b[1] - e.a[1])) / (e.b[0] - e.a[0]);
    if (!vals.has(e.pid)) vals.set(e.pid, []);
    vals.get(e.pid)!.push(y);
  }
  for (const [pid, ys] of vals) {
    ys.sort((a, b) => a - b);
    assert(ys.length % 2 === 0, 'Odd ring crossing count');
    const ints: Interval[] = [];
    for (let i = 0; i < ys.length; i += 2)
      if (ys[i + 1] - ys[i] > EPS) ints.push([ys[i], ys[i + 1]]);
    const q = p.polys[pid];
    if (q.group) env.push(...ints);
    else {
      if (!fa.has(q.fi)) fa.set(q.fi, []);
      fa.get(q.fi)!.push(...ints);
    }
  }
  const all: Interval[] = [];
  for (const [k, v] of fa) {
    const u = union(v);
    fa.set(k, u);
    all.push(...u);
  }
  return { a: union(all), e: union(env), fa };
}

/** Kahan-compensated accumulator. */
function acc() {
  let s = 0,
    c = 0;
  return {
    add(v: number) {
      const y = v - c,
        t = s + y;
      c = t - s - y;
      s = t;
    },
    get value() {
      return s;
    },
  };
}

export function slabArea(fs: PolyFeature[], es: PolyFeature[], axis: 0 | 1): SlabResult {
  const p = prepare(fs, es, axis),
    xs = events(p),
    starts = p.edges.filter((e) => e.max - e.min > EPS).sort((a, b) => a.min - b.min),
    active = new Set<Edge>(),
    area = acc(),
    overlap = acc(),
    per = fs.map(() => ({ area: acc(), overlap: acc() }));
  let at = 0;
  for (let i = 1; i < xs.length; i++) {
    const dx = xs[i] - xs[i - 1];
    if (dx < EPS) continue;
    const mid = (xs[i] + xs[i - 1]) / 2;
    while (at < starts.length && starts[at].min < mid) active.add(starts[at++]);
    for (const e of active) if (e.max <= mid) active.delete(e);
    if (!active.size) continue;
    const c = scan(active, mid, p);
    area.add(length(c.a) * dx);
    overlap.add(length(intersection(c.a, c.e)) * dx);
    for (const [k, v] of c.fa) {
      per[k].area.add(length(v) * dx);
      per[k].overlap.add(length(intersection(v, c.e)) * dx);
    }
  }
  const records = per.map((r) => ({ area: r.area.value, overlap: r.overlap.value }));
  return {
    area: area.value,
    overlap: overlap.value,
    records,
    count: records.filter((r) => r.overlap > 1e-6).length,
    slabs: xs.length - 1,
  };
}

// Independent uniform cell-centre raster sample, using row intervals rather than allocating pixels.
export function gridSample(fs: PolyFeature[], es: PolyFeature[], cell: number): GridResult {
  const p = prepare(fs, es, 1),
    starts = p.edges.filter((e) => e.max - e.min > EPS).sort((a, b) => a.min - b.min),
    ae = p.edges.filter((e) => !e.group),
    y0 = Math.floor(Math.min(...ae.map((e) => e.min)) / cell) * cell,
    y1 = Math.max(...ae.map((e) => e.max)),
    x0 = Math.floor(Math.min(...ae.map((e) => e.lo)) / cell) * cell,
    active = new Set<Edge>(),
    per = fs.map(() => ({ area: 0, overlap: 0 }));
  let at = 0,
    area = 0,
    overlap = 0;
  const count = (ints: Interval[]) =>
    ints.reduce(
      (s, [lo, hi]) =>
        s +
        Math.max(
          0,
          Math.ceil((hi - x0) / cell - 0.5 - 1e-10) - Math.ceil((lo - x0) / cell - 0.5 - 1e-10),
        ),
      0,
    );
  for (let y = y0 + cell / 2; y < y1; y += cell) {
    while (at < starts.length && starts[at].min <= y) active.add(starts[at++]);
    for (const e of active) if (e.max <= y) active.delete(e);
    const c = scan(active, y, p);
    area += count(c.a);
    overlap += count(intersection(c.a, c.e));
    for (const [k, v] of c.fa) {
      per[k].area += count(v);
      per[k].overlap += count(intersection(v, c.e));
    }
  }
  const records = per.map((r) => ({
    area: r.area * cell * cell,
    overlap: r.overlap * cell * cell,
  }));
  return {
    area: area * cell * cell,
    overlap: overlap * cell * cell,
    records,
    count: records.filter((r) => r.overlap > 0).length,
    cell,
  };
}

function agrees(a: number, b: number, grid = false): boolean {
  return (
    Math.abs(a - b) <=
    (grid ? Math.max(0.25, Math.abs(a) * 0.004) : Math.max(0.0001, Math.abs(a) * 1e-8))
  );
}

export function verify(
  fs: PolyFeature[],
  es: PolyFeature[],
  progress: (step: string) => void = () => {},
): Verification {
  progress('X-axis exact slabs');
  const x = slabArea(fs, es, 0);
  progress('Y-axis exact slabs');
  const y = slabArea(fs, es, 1);
  assert(
    agrees(x.area, y.area) && agrees(x.overlap, y.overlap) && x.count === y.count,
    'FAIL: X/Y union or overlap disagreement',
  );
  for (let i = 0; i < fs.length; i++)
    assert(
      agrees(x.records[i].area, y.records[i].area) &&
        agrees(x.records[i].overlap, y.records[i].overlap),
      'FAIL: X/Y disagreement at record ' + i,
    );
  let grid!: GridResult,
    ok = false;
  for (const cell of [0.5, 0.25, 0.125, 0.0625]) {
    progress('Uniform cell-centre grid ' + cell + ' m');
    grid = gridSample(fs, es, cell);
    ok =
      agrees(x.area, grid.area, true) &&
      agrees(x.overlap, grid.overlap, true) &&
      grid.count === x.count &&
      x.records.every(
        (r, i) =>
          agrees(r.area, grid.records[i].area, true) &&
          agrees(r.overlap, grid.records[i].overlap, true),
      );
    if (ok) break;
  }
  assert(ok, 'FAIL: uniform grid disagrees; metrics withheld');
  return {
    verified: true,
    x,
    y,
    grid,
    version: VERSION,
    tolerance: {
      exact: 'max(0.0001 m², 1e−8 × area)',
      grid: 'max(0.25 m², 0.4% × area); every feature and union; counts identical',
    },
  };
}

/** Closed convex hull (monotone chain). */
export function hull(points: XY[]): Ring {
  const p = points
    .slice()
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .filter((a, i, s) => !i || a[0] !== s[i - 1][0] || a[1] !== s[i - 1][1]);
  assert(p.length >= 3, 'Insufficient points for derived hull');
  const crossZ = (o: XY, a: XY, b: XY) =>
      (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]),
    lo: XY[] = [],
    up: XY[] = [];
  for (const a of p) {
    while (lo.length > 1 && crossZ(lo.at(-2)!, lo.at(-1)!, a) <= 0) lo.pop();
    lo.push(a);
  }
  for (const a of p.slice().reverse()) {
    while (up.length > 1 && crossZ(up.at(-2)!, up.at(-1)!, a) <= 0) up.pop();
    up.push(a);
  }
  const r = lo.slice(0, -1).concat(up.slice(0, -1));
  r.push(r[0].slice());
  return r;
}

/** Odd-degree endpoint test (0.01 m tolerance). Never adds a closing segment. */
export function boundaryCheck(lines: Ring[], crs: string, area: number): BoundaryCheck {
  const nodes: { p: XY; degree: number }[] = [];
  for (const l of lines) {
    assert(l.length >= 2, 'Invalid boundary line');
    for (const p of [l[0], l.at(-1)!]) {
      let n = nodes.find((n) => Math.hypot(n.p[0] - p[0], n.p[1] - p[1]) <= 0.01);
      if (!n) {
        n = { p: p.slice(), degree: 0 };
        nodes.push(n);
      }
      n.degree++;
    }
  }
  const gaps = nodes.filter((n) => n.degree % 2).map((n) => n.p),
    closed = !!lines.length && !gaps.length && nodes.every((n) => n.degree === 2),
    areaOK = area >= 5000 && area <= 5000000;
  return { gaps, closed, crs: !!crs, areaOK, pass: closed && !!crs && areaOK };
}

export function insideCampus(): never {
  throw Error(
    'Boundary check: BLOCKED — accepted CRS, ring closure, area sanity and constructed polygon required. A convex hull is not a legal boundary.',
  );
}

export function planarHeightInvariant(fs: PolyFeature[], height: number): true {
  assert(Number.isFinite(height) && height >= 0, 'Invalid display height');
  const before = JSON.stringify(fs),
    shown = fs.map((f) => ({ ...f, displayHeight: height }));
  assert(
    shown.every((f, i) => JSON.stringify(f.polys) === JSON.stringify(fs[i].polys)) &&
      JSON.stringify(fs) === before,
    'Display height changed planar geometry',
  );
  return true;
}
