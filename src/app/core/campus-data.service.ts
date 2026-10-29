import { httpResource } from '@angular/common/http';
import { Injectable, computed } from '@angular/core';
import type { CampusMasterplanData } from './models/campus-masterplan.models';
import type { SmartFurnitureData } from './models/smart-furniture.models';
import type { VerifiedGeometryData } from './models/verified-geometry.models';
import { boundaryCheck, hull, slabArea } from '../geometry-engine/slab-check';

/** Loads the static datasets shipped in `public/data`. */
@Injectable({ providedIn: 'root' })
export class CampusDataService {
  readonly masterplan = httpResource<CampusMasterplanData>(() => 'data/campus-masterplan.json');
  readonly furniture = httpResource<SmartFurnitureData>(() => 'data/smart-furniture.json');
  readonly geometry = httpResource<VerifiedGeometryData>(() => 'data/verified-geometry.json');

  /** Open-boundary status of the shipped geometry, shown on every review section. */
  readonly boundary = computed(() => {
    const data = this.geometry.value();
    return data ? analyseBoundary(data) : null;
  });
}

/** Derived study hull of the campus context and the open-end check of the source boundary linework. */
export function analyseBoundary(data: VerifiedGeometryData) {
  const derived = hull(data.context.flatMap((f) => f.polys.flatMap((p) => p[0])));
  const derivedArea = slabArea([{ polys: [[derived]] }], [], 0).area;
  return { derived, derivedArea, check: boundaryCheck(data.boundary.lines, data.crs, derivedArea) };
}

export type BoundaryAnalysis = ReturnType<typeof analyseBoundary>;
