/** Shape of `public/data/verified-geometry.json` (local metres, y down / SVG orientation). */

export type XY = number[];
export type Ring = XY[];
/** A polygon: shell ring followed by hole rings. */
export type Polygon = Ring[];

export interface PolyFeature {
  id?: string | number;
  polys: Polygon[];
}

export interface EnvelopeFeature extends PolyFeature {
  source: string;
  label?: string;
}

export type SetKey = 'canonical' | 'controlled';

export interface FeatureSet {
  key: string;
  label: string;
  features: PolyFeature[];
}

export interface VerifiedGeometryData {
  crs: string;
  units: string;
  coordinateTransform: string;
  dates: Record<'archive' | 'controlled' | 'canonical' | 'boundary', string>;
  fingerprint: string;
  envelopes: EnvelopeFeature[];
  context: PolyFeature[];
  boundary: { lines: Ring[] };
  sets: Record<SetKey, FeatureSet> & { archive: { features: PolyFeature[] | null } };
}
