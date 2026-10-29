import type { BoundaryAnalysis } from '../../core/campus-data.service';
import type {
  PolyFeature,
  Ring,
  VerifiedGeometryData,
  XY,
} from '../../core/models/verified-geometry.models';

const HEIGHT = 480;

/** Illustrative extrusions of the proposals with the open boundary and derived hull (display Z ×2). */
export function drawExtrusions(
  canvas: HTMLCanvasElement,
  data: VerifiedGeometryData,
  boundary: BoundaryAnalysis,
  features: PolyFeature[],
  view: { angle: number; height: number; fingerprint: string },
): void {
  const r = canvas.getBoundingClientRect();
  if (!r.width) return;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(HEIGHT * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#f6f4e9';
  ctx.fillRect(0, 0, r.width, HEIGHT);

  const pts = boundary.derived,
    x0 = pts.reduce((s, p) => s + p[0], 0) / pts.length,
    y0 = pts.reduce((s, p) => s + p[1], 0) / pts.length,
    scale = Math.min(r.width / 2400, HEIGHT / 1700),
    cos = Math.cos(view.angle),
    sin = Math.sin(view.angle);
  const project = (p: XY, z = 0): [number, number] => {
    const x = p[0] - x0,
      y = p[1] - y0,
      u = x * cos - y * sin,
      v = x * sin + y * cos;
    return [r.width / 2 + u * scale, 255 + v * scale * 0.62 - z * scale * 2];
  };
  const line = (l: Ring, color: string, dash: number[] = []) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash(dash);
    ctx.beginPath();
    l.forEach((p, i) => {
      const q = project(p);
      if (i) ctx.lineTo(...q);
      else ctx.moveTo(...q);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  };

  for (const f of features)
    for (const p of f.polys) {
      const ring = p[0];
      for (let i = 1; i < ring.length; i++) {
        const a = project(ring[i - 1]),
          b = project(ring[i]),
          u = project(ring[i], view.height),
          v = project(ring[i - 1], view.height);
        ctx.beginPath();
        ctx.moveTo(...a);
        ctx.lineTo(...b);
        ctx.lineTo(...u);
        ctx.lineTo(...v);
        ctx.closePath();
        ctx.fillStyle = '#8caaa0';
        ctx.fill();
      }
      ctx.beginPath();
      for (const ring of p) {
        ring.forEach((q, i) => {
          const a = project(q, view.height);
          if (i) ctx.lineTo(...a);
          else ctx.moveTo(...a);
        });
        ctx.closePath();
      }
      ctx.fillStyle = '#377b70';
      ctx.fill('evenodd');
    }

  line(boundary.derived, '#996417', [7, 5]);
  for (const l of data.boundary.lines) line(l, '#ad2639');
  for (const p of boundary.check.gaps) {
    const q = project(p);
    ctx.beginPath();
    ctx.arc(q[0], q[1], 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff5df';
    ctx.fill();
    ctx.strokeStyle = '#b3263b';
    ctx.stroke();
  }

  ctx.fillStyle = '#102b39';
  ctx.fillRect(0, 0, r.width, 85);
  ctx.fillStyle = '#e2eeee';
  ctx.font = 'bold 13px system-ui';
  ctx.fillText('DERIVED — NOT CADASTRAL · ' + boundary.check.gaps.length + ' open ends', 12, 22);
  ctx.font = '12px system-ui';
  ctx.fillText('HEIGHTS ARE ASSUMPTIONS · display Z exaggerated ×2 · planar XY unchanged', 12, 44);
  ctx.font = '10px system-ui';
  ctx.fillText(view.fingerprint, 12, 65);
}
