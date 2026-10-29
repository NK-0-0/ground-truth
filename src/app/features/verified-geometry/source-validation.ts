import type { VerifiedGeometryData } from '../../core/models/verified-geometry.models';
import { rings } from '../../geometry-engine/slab-check';

export const REQUIRED_CRS = 'ESRI:102488';
export const REQUIRED_TRANSFORM = 'X=56600-nativeX;Y=nativeY-2542000';

/** Refuses any source that is not the full, declared, closed-ring dataset. Throws with the reason. */
export function assertValidSource(
  data: VerifiedGeometryData | null | undefined,
): asserts data is VerifiedGeometryData {
  if (
    !data ||
    data.units !== 'metres' ||
    data.crs !== REQUIRED_CRS ||
    data.coordinateTransform !== REQUIRED_TRANSFORM
  )
    throw Error('Reload refused: declared ESRI:102488 metres and reversible local frame required');
  for (const k of ['canonical', 'controlled'] as const) {
    const fs = data.sets?.[k]?.features;
    if (!Array.isArray(fs) || fs.length !== 109)
      throw Error('Reload refused: ' + k + ' must contain the full 109 records');
    const ids = new Set<string>();
    fs.forEach((f, i) => {
      if (ids.has(String(f.id))) throw Error('Duplicate source-scoped ID in ' + k);
      ids.add(String(f.id));
      rings(f.polys, k + ':' + i);
    });
  }
  const archive = data.sets.archive.features;
  if (archive !== null && (!Array.isArray(archive) || archive.length !== 90))
    throw Error('Archive reload must contain 90 records or null with reproduced:false');
  archive?.forEach((f, i) => rings(f.polys, 'archive:' + i));
  if (
    !data.dates ||
    !(['archive', 'controlled', 'canonical', 'boundary'] as const).every(
      (k) => typeof data.dates[k] === 'string',
    )
  )
    throw Error(
      'Reload refused: source-date metadata required (unknown dates must say UNVERIFIED)',
    );
  if (!Array.isArray(data.context) || !data.context.length)
    throw Error('Reload refused: campus context required');
  data.context.forEach((f) => rings(f.polys, 'context'));
  if (data.envelopes.length !== 7) throw Error('Exactly seven source envelope records required');
  data.envelopes.forEach((f) => rings(f.polys, 'envelope ' + f.id));
  if (!data.boundary.lines.length) throw Error('Missing open boundary linework');
}
