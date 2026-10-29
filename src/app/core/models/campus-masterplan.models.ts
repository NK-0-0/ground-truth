/** Shape of `public/data/campus-masterplan.json` (local campus metres, y up). */

export type Point = [number, number];

export type Geometry =
  | { type: 'Point'; coordinates: Point }
  | { type: 'LineString'; coordinates: Point[] }
  | { type: 'MultiLineString'; coordinates: Point[][] }
  | { type: 'Polygon'; coordinates: Point[][] }
  | { type: 'MultiPolygon'; coordinates: Point[][][] }
  | { type: 'GeometryCollection'; geometries: Geometry[] };

export type PlanKey = 'R8' | 'R7' | 'A' | 'B' | 'C';

export interface Building {
  id: string;
  parentProgrammeID?: string;
  use: string;
  homePrecinct: string;
  designGFAM2: number;
  groundM2: number;
  storeys: number;
  form: string;
  proposedEntry: Point;
  conditionalReplacementDependency?: boolean;
  geometry: Geometry;
}

export interface CampusPath {
  id: string;
  kind: string;
  width: number;
  geometry: Geometry;
  surfaceGeometry?: Geometry;
}

export interface Place {
  id: string;
  name: string;
  kind: string;
  geometry: Geometry;
}

export interface DesignFeature {
  id: string;
  kind: string;
  name?: string;
  accessIntent?: string;
  geometry: Geometry;
}

export interface Hub {
  id: string;
  name: string;
  point: Point;
}

export interface PlanMetrics {
  placedGFAM2: number;
  unplacedGFAM2: number;
  fullyPlacedProgrammeEntries: number;
}

export interface Plan {
  key: PlanKey;
  title: string;
  buildings: Building[];
  paths: CampusPath[];
  places: Place[];
  urbanDesignFeatures?: DesignFeature[];
  newTrees: Point[];
  hubs: Hub[];
  integrationFeatures: DesignFeature[];
  metrics: PlanMetrics;
}

export interface ProgrammeEntry {
  id: string;
  use: string;
  sourceBulkM2: number;
}

export interface ReviewCase {
  id: string;
  title: string;
  finding: string;
  response: string;
  nextStep: string;
  suggestedOffice: string;
  source: string;
  point: Point | null;
  overlay: string | null;
}

export interface ComparisonRow {
  key: string;
  allocated: number;
  routeLength: number;
  entriesConnected: number;
  blocks: number;
  roadInterface: number;
  utilityInterface: number;
  replacementDependencies: number;
}

export interface ShortlistLocation {
  label: string;
  sourceOID: number;
  point: Point;
}

export interface CampusContext {
  buildings: Geometry[];
  conditionalReplacement: Geometry[];
  roads: Geometry[];
  walks: Geometry[];
  green: Geometry[];
  sports: Geometry[];
  agriculture: Geometry[];
  boundary: Point[][];
}

export interface CampusMasterplanData {
  title: string;
  revision: string;
  plans: Record<PlanKey, Plan>;
  programme: ProgrammeEntry[];
  context: CampusContext;
  reviews: { utility: Geometry; newStudyUtility: Geometry; road: Geometry };
  cases: ReviewCase[];
  comparison: ComparisonRow[];
  shortlist: ShortlistLocation[];
}

/** Total GFA of the printed historic source programme (m²). */
export const SOURCE_PROGRAMME_GFA_M2 = 276698.21;
