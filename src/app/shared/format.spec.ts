import { formatZa } from './format';
import { geometryPath } from './svg-geometry';

describe('formatZa', () => {
  // en-ZA groups with a (narrow) no-break space and uses a decimal comma.
  const normalise = (s: string) => s.replace(/\s/g, ' ');

  it('formats fixed precision by default', () => {
    expect(normalise(formatZa(147547.3))).toBe('147 547');
    expect(normalise(formatZa(1105.5, 2))).toBe('1 105,50');
  });

  it('supports a lower minimum precision', () => {
    expect(formatZa(53.3, 1, 0)).toBe('53,3');
    expect(formatZa(53, 1, 0)).toBe('53');
  });
});

describe('geometryPath', () => {
  it('flips y for the SVG frame', () => {
    expect(
      geometryPath({
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 2],
            [0, 0],
          ],
        ],
      }),
    ).toBe('M0,0L1,0L1,-2L0,0Z');
    expect(
      geometryPath({
        type: 'LineString',
        coordinates: [
          [1, 1],
          [2, 3],
        ],
      }),
    ).toBe('M1,-1L2,-3');
  });

  it('returns an empty path for missing geometry', () => {
    expect(geometryPath(null)).toBe('');
  });
});
