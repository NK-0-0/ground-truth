import type { PolyFeature, Ring } from '../core/models/verified-geometry.models';
import {
  boundaryCheck,
  hull,
  insideCampus,
  planarHeightInvariant,
  rings,
  slabArea,
  verify,
} from './slab-check';

const square = (x: number, y: number, s: number): Ring => [
  [x, y],
  [x + s, y],
  [x + s, y + s],
  [x, y + s],
  [x, y],
];
const feature = (...polys: Ring[][]): PolyFeature => ({ polys });

describe('SlabCheck engine', () => {
  it('measures union area and envelope overlap exactly on both axes', () => {
    const fs = [feature([square(0, 0, 10)]), feature([square(5, 0, 10)])];
    const es = [feature([square(12, 0, 4)])];
    for (const axis of [0, 1] as const) {
      const r = slabArea(fs, es, axis);
      expect(r.area).toBeCloseTo(150, 9); // two 100 m² squares overlapping by 50 m²
      expect(r.overlap).toBeCloseTo(12, 9); // 3 × 4 inside the envelope
      expect(r.records.map((x) => x.area)).toEqual([100, 100]);
      expect(r.count).toBe(1);
    }
  });

  it('subtracts holes', () => {
    const r = slabArea([feature([square(0, 0, 10), square(2, 2, 2)])], [], 0);
    expect(r.area).toBeCloseTo(96, 9);
  });

  it('verifies only when slabs and grid agree', () => {
    const v = verify([feature([square(0, 0, 10)])], [feature([square(5, 5, 10)])]);
    expect(v.verified).toBe(true);
    expect(v.x.area).toBeCloseTo(100, 9);
    expect(v.x.overlap).toBeCloseTo(25, 9);
    expect(Math.abs(v.grid.area - 100)).toBeLessThan(0.25);
  });

  it('refuses open rings and self-intersections', () => {
    expect(() =>
      rings(
        [
          [
            square(0, 0, 1)
              .slice(0, -1)
              .concat([[0, 0.5]]),
          ],
        ],
        'x',
      ),
    ).toThrow(/open ring/);
    const bowtie: Ring = [
      [0, 0],
      [10, 10],
      [10, 0],
      [0, 10],
      [0, 0],
    ];
    expect(() => slabArea([feature([bowtie])], [], 0)).toThrow(/Self-intersecting/);
  });

  it('builds a closed convex hull', () => {
    const h = hull([
      [0, 0],
      [10, 0],
      [5, 5],
      [10, 10],
      [0, 10],
    ]);
    expect(h).toHaveLength(5);
    expect(h[0]).toEqual(h.at(-1));
    expect(h).not.toContainEqual([5, 5]);
  });

  it('reports open ends of boundary linework', () => {
    const open = boundaryCheck(
      [
        [
          [0, 0],
          [10, 0],
        ],
        [
          [10, 0],
          [10, 10],
        ],
      ],
      'ESRI:102488',
      10000,
    );
    expect(open.gaps).toEqual([
      [0, 0],
      [10, 10],
    ]);
    expect(open.closed).toBe(false);
    expect(open.pass).toBe(false);

    const closed = boundaryCheck([square(0, 0, 100)], 'ESRI:102488', 10000);
    expect(closed.closed).toBe(true);
    expect(closed.pass).toBe(true);
  });

  it('always blocks campus containment', () => {
    expect(() => insideCampus()).toThrow(/BLOCKED/);
  });

  it('keeps planar geometry unchanged by display height', () => {
    expect(planarHeightInvariant([feature([square(0, 0, 1)])], 9)).toBe(true);
    expect(() => planarHeightInvariant([], -1)).toThrow(/Invalid display height/);
  });
});
