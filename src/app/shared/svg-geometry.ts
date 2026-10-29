import type { Geometry, Point } from '../core/models/campus-masterplan.models';
import type { Polygon, XY } from '../core/models/verified-geometry.models';

/**
 * SVG path data for masterplan geometry. Source coordinates are y-up, so y is
 * negated for the y-down SVG frame.
 */
export function geometryPath(g: Geometry | null | undefined): string {
  if (!g) return '';
  switch (g.type) {
    case 'Polygon':
      return polygonPath(g.coordinates);
    case 'MultiPolygon':
      return g.coordinates.map(polygonPath).join('');
    case 'LineString':
      return 'M' + g.coordinates.map(xy).join('L');
    case 'MultiLineString':
      return g.coordinates.map((c) => 'M' + c.map(xy).join('L')).join('');
    case 'GeometryCollection':
      return g.geometries.map(geometryPath).join('');
    default:
      return '';
  }
}

function polygonPath(rings: Point[][]): string {
  return rings.map((r) => 'M' + r.map(xy).join('L') + 'Z').join('');
}

const xy = (p: Point) => p[0] + ',' + -p[1];

/** `points` attribute for a y-up polyline. */
export function flippedPoints(line: Point[]): string {
  return line.map(xy).join(' ');
}

/** SVG path data for verified-geometry polygons (already y-down). */
export function polysPath(polys: Polygon[]): string {
  return polys
    .map((p) =>
      p.map((r) => r.map((q, i) => (i ? 'L' : 'M') + q[0] + ',' + q[1]).join(' ') + 'Z').join(' '),
    )
    .join(' ');
}

/** `points` attribute for a y-down polyline. */
export function rawPoints(line: XY[]): string {
  return line.map((p) => p.join(',')).join(' ');
}
