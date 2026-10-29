import type { VerifiedGeometryData } from '../../core/models/verified-geometry.models';
import { assertValidSource } from './source-validation';

const ring = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 0],
];
const features = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: String(i), polys: [[ring]] }));

function validSource(): VerifiedGeometryData {
  return {
    crs: 'ESRI:102488',
    units: 'metres',
    coordinateTransform: 'X=56600-nativeX;Y=nativeY-2542000',
    dates: { archive: 'UNVERIFIED', controlled: 'x', canonical: 'y', boundary: 'z' },
    fingerprint: 'abc',
    envelopes: features(7).map((f) => ({ ...f, source: 's' })),
    context: features(1),
    boundary: {
      lines: [
        [
          [0, 0],
          [1, 1],
        ],
      ],
    },
    sets: {
      canonical: { key: 'canonical', label: '', features: features(109) },
      controlled: { key: 'controlled', label: '', features: features(109) },
      archive: { features: null },
    },
  };
}

describe('assertValidSource', () => {
  it('accepts the full declared dataset', () => {
    expect(() => assertValidSource(validSource())).not.toThrow();
  });

  it('refuses an undeclared frame', () => {
    expect(() => assertValidSource({ ...validSource(), crs: 'EPSG:4326' })).toThrow(/ESRI:102488/);
  });

  it('refuses partial populations and duplicate IDs', () => {
    const partial = validSource();
    partial.sets.canonical.features.pop();
    expect(() => assertValidSource(partial)).toThrow(/full 109 records/);

    const dup = validSource();
    dup.sets.controlled.features[1].id = '0';
    expect(() => assertValidSource(dup)).toThrow(/Duplicate/);
  });

  it('requires exactly seven envelopes', () => {
    const d = validSource();
    d.envelopes.pop();
    expect(() => assertValidSource(d)).toThrow(/seven/);
  });
});
