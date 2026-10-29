import type { FurniturePart } from '../../core/models/smart-furniture.models';

export interface ModelView {
  theta: number;
  zoom: number;
  showRoofs: boolean;
  selected: number;
}

export interface Face {
  points: [number, number][];
  index: number;
}

const GROUP_NAMES: Record<string, string> = {
  pavilion: 'Solar study pavilion',
  site: 'Ground / concept envelope',
  route: 'Access route / concept overlay',
  games: 'Table tennis / playing envelope',
  kiosk: 'Enterprise kiosk',
  cycle: 'Cycle parking',
  sign: 'Wayfinding',
  planting: 'Planting',
  bench: 'Solar bench',
  lighting: 'Lighting',
  waste: 'Waste / recycling',
};

export function partName(o: FurniturePart, i: number): string {
  return (
    'Part ' +
    String(i + 1).padStart(3, '0') +
    ' · ' +
    (GROUP_NAMES[o.group] || o.group) +
    (o.roof ? ' / roof' : '')
  );
}

function shade(hex: string, v: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  return (
    '#' +
    m[1]
      .match(/../g)!
      .map((s) =>
        Math.round(Math.min(255, parseInt(s, 16) * v))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

/**
 * Draws the parts as extruded prisms in an oblique projection (painter's
 * algorithm). Returns the drawn faces, back to front, for hit-testing.
 */
export function drawFurnitureModel(
  canvas: HTMLCanvasElement,
  parts: FurniturePart[],
  view: ModelView,
): Face[] {
  const box = canvas.getBoundingClientRect();
  if (box.width < 1 || box.height < 1) return [];
  const w = box.width,
    h = box.height,
    dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const scale = Math.min(w / 32, h / 22) * view.zoom,
    c = Math.cos(view.theta),
    s = Math.sin(view.theta);
  const rotated = (p: [number, number], z: number) => {
    const x = p[0] - 10,
      y = p[1] - 8;
    return [x * c - y * s, x * s + y * c, z];
  };
  const project = (v: number[]): [number, number] => [
    w / 2 + v[0] * scale,
    h * 0.57 + (v[1] * 0.52 - v[2] * 0.9) * scale,
  ];

  const faces: (Face & { band: number; elevation: number; depth: number; color: string })[] = [];
  parts.forEach((o, i) => {
    if (o.roof && !view.showRoofs) return;
    const n = o.poly.length,
      top = o.poly.map((p) => rotated(p, o.z1)),
      band = o.z1 <= 0.1 ? 0 : 1;
    faces.push({
      band,
      elevation: o.z1,
      points: top.map(project),
      depth: top.reduce((s, p) => s + p[1], 0) / n + o.z1 * 0.6,
      color: o.color,
      index: i,
    });
    if (o.z1 - o.z0 > 0.025)
      for (let j = 0; j < n; j++) {
        const a = o.poly[j],
          b = o.poly[(j + 1) % n],
          q = [rotated(a, o.z0), rotated(b, o.z0), rotated(b, o.z1), rotated(a, o.z1)];
        faces.push({
          band,
          elevation: o.z1,
          points: q.map(project),
          depth: q.reduce((s, p) => s + p[1], 0) / 4 + (o.z0 + o.z1) * 0.3,
          color: shade(o.color, 0.62 + 0.12 * (j % 3)),
          index: i,
        });
      }
  });
  // Ground-level parts first (lowest on top of each other), then raised parts by depth.
  faces.sort(
    (a, b) =>
      a.band - b.band || (a.band === 0 ? a.elevation - b.elevation : 0) || a.depth - b.depth,
  );
  for (const f of faces) {
    ctx.beginPath();
    f.points.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
    ctx.closePath();
    ctx.fillStyle = f.color;
    ctx.fill();
    const selected = f.index === view.selected;
    ctx.lineWidth = selected ? 1.8 : 0.5;
    ctx.strokeStyle = selected ? '#ffe2a2' : '#23454b66';
    ctx.stroke();
  }
  ctx.fillStyle = '#bbd6db';
  ctx.font = '11px system-ui';
  ctx.fillText('20 × 16 m concept envelope', 12, h - 14);
  return faces;
}

export function pointInPolygon(p: [number, number], poly: [number, number][]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      hit = !hit;
  }
  return hit;
}
