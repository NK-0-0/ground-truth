import type {
  PolyFeature,
  SetKey,
  VerifiedGeometryData,
} from '../core/models/verified-geometry.models';
import type { Verification } from './slab-check';

/** Messages sent to `slab-check.worker.ts`. */
export type WorkerRequest =
  | { type: 'all'; data: VerifiedGeometryData }
  | { type: 'option'; feature: PolyFeature; envelopes: PolyFeature[] };

/** Messages posted back by `slab-check.worker.ts`. */
export type WorkerResponse =
  | { type: 'progress'; text: string }
  | { type: 'result'; key: SetKey; result: Verification }
  | { type: 'done' }
  | { type: 'option'; result: Verification }
  | { type: 'failure'; error: string };
