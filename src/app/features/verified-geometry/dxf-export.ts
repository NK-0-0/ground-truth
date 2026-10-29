import type { BoundaryAnalysis } from '../../core/campus-data.service';
import type {
  PolyFeature,
  Ring,
  VerifiedGeometryData,
  XY,
} from '../../core/models/verified-geometry.models';

/**
 * AutoCAD 2000 (AC1015) DXF in metres: open boundary lines, gap circles with
 * warning labels, the derived study hull, proposals and supplied envelopes.
 */
export function buildDxf(
  data: VerifiedGeometryData,
  boundary: BoundaryAnalysis,
  proposals: PolyFeature[],
  fingerprint: string,
): string {
  const out = [
    '0',
    'SECTION',
    '2',
    'HEADER',
    '9',
    '$ACADVER',
    '1',
    'AC1015',
    '9',
    '$INSUNITS',
    '70',
    '6',
    '0',
    'ENDSEC',
  ];
  out.push('0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', '6');
  for (const name of [
    'BOUNDARY_OPEN',
    'BOUNDARY_GAP',
    'BOUNDARY_TAG',
    'BOUNDARY_DERIVED',
    'PROPOSAL',
    'ENVELOPE',
  ])
    out.push(
      '0',
      'LAYER',
      '2',
      name,
      '70',
      '0',
      '62',
      name === 'BOUNDARY_OPEN' ? '1' : '7',
      '6',
      'CONTINUOUS',
    );
  out.push('0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES');

  const line = (pts: Ring, layer: string, closed: boolean) => {
    const p =
      closed && pts[0][0] === pts.at(-1)![0] && pts[0][1] === pts.at(-1)![1]
        ? pts.slice(0, -1)
        : pts;
    out.push(
      '0',
      'LWPOLYLINE',
      '100',
      'AcDbEntity',
      '8',
      layer,
      '100',
      'AcDbPolyline',
      '90',
      String(p.length),
    );
    out.push('70', closed ? '1' : '0');
    for (const q of p) out.push('10', String(q[0]), '20', String(q[1]));
  };
  const tag = (p: XY, text: string) =>
    out.push(
      '0',
      'TEXT',
      '100',
      'AcDbEntity',
      '8',
      'BOUNDARY_TAG',
      '100',
      'AcDbText',
      '10',
      String(p[0]),
      '20',
      String(p[1]),
      '40',
      '3',
      '1',
      text
        .replace(/[\r\n\x00-\x1f]/g, ' ')
        .replace(
          /[\x7f-\uffff]/g,
          (c) => '\\U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'),
        ),
    );

  for (const l of data.boundary.lines) line(l, 'BOUNDARY_OPEN', false);
  for (const p of boundary.check.gaps) {
    out.push('0', 'CIRCLE', '100', 'AcDbEntity', '8', 'BOUNDARY_GAP', '100', 'AcDbCircle');
    out.push('10', String(p[0]), '20', String(p[1]), '40', '2');
    tag([p[0] + 3, p[1] + 3], 'INCOMPLETE BOUNDARY - OPEN END');
  }
  const derived = boundary.derived;
  line(derived, 'BOUNDARY_DERIVED', true);
  tag(derived[0], 'DERIVED - NOT CADASTRAL; CONTAINMENT BLOCKED');
  tag([derived[0][0], derived[0][1] + 8], fingerprint);
  tag(
    [derived[0][0], derived[0][1] + 16],
    'Local metres: nativeX=56600-X; nativeY=2542000+Y; inherited ESRI:102488',
  );
  for (const f of proposals) for (const p of f.polys) for (const r of p) line(r, 'PROPOSAL', true);
  for (const f of data.envelopes)
    for (const p of f.polys) for (const r of p) line(r, 'ENVELOPE', true);
  out.push('0', 'ENDSEC', '0', 'EOF');
  return out.join('\r\n') + '\r\n';
}

export function downloadText(text: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
