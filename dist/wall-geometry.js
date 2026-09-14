import { walls, railings, point, SCALE, HEIGHT } from './model.js';

const round = n => Math.round(n * 1e6) / 1e6;

// Architectural walls are axis aligned. Use their exact coordinate planes to
// union the solids, rather than overlaying boxes or approximating with voxels.
// Only the boundary of the union is rendered: there are no internal faces,
// coplanar overlaps, or open end caps at L/T junctions.
export function wallVolumes(source = walls, parapets = railings) {
  const volumes = [];
  const axis = w => w.a[1] === w.b[1] ? 0 : 1;
  const between = (value, a, b) => value >= Math.min(a, b) && value <= Math.max(a, b);
  const jointPadding = (wall, endpoint, extra = 0) => {
    const wallAxis = axis(wall);
    let padding = 0;
    for (const other of source) {
      if (other === wall || axis(other) === wallAxis) continue;
      const crosses = wallAxis === 0
        ? between(endpoint[0], other.a[0], other.b[0]) && endpoint[1] === other.a[1]
        : endpoint[0] === other.a[0] && between(endpoint[1], other.a[1], other.b[1]);
      if (crosses) padding = Math.max(padding, other.t / 2 + extra);
    }
    return padding;
  };
  function prism(w, s, e, y0, y1, thickness, kind = 'wall') {
    if (e <= s || y1 <= y0) return;
    const [ax, az] = point(w.a), [bx, bz] = point(w.b);
    if (ax !== bx && az !== bz) throw new Error('Wall must be axis aligned');
    const horizontal = az === bz;
    const direction = Math.sign(horizontal ? bx - ax : bz - az);
    const from = (horizontal ? ax : az) + direction * s;
    const to = (horizontal ? ax : az) + direction * e;
    const low = Math.min(from, to), high = Math.max(from, to), half = thickness / 2;
    volumes.push({
      min: (horizontal ? [low, y0, az - half] : [ax - half, y0, low]).map(round),
      max: (horizontal ? [high, y1, az + half] : [ax + half, y1, high]).map(round),
      kind,
    });
  }
  for (const w of source) {
    const length = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]) / SCALE;
    const startJoint = jointPadding(w, w.a);
    const endJoint = jointPadding(w, w.b);
    const startSkirting = jointPadding(w, w.a, .0075);
    const endSkirting = jointPadding(w, w.b, .0075);
    const add = (s, e, y0, y1) => {
      if (e <= s || y1 <= y0) return;
      // Extend only as far as the perpendicular wall that is actually met.
      // Using this wall's own half-thickness leaves visible teeth whenever two
      // differently sized walls meet; free ends must remain true butt ends.
      const start = s === 0 ? -startJoint : s;
      const end = e === length ? length + endJoint : e;
      prism(w, start, end, y0, y1, w.t);
      if (y0 === 0) {
        const skirtStart = s === 0 ? -startSkirting : s;
        const skirtEnd = e === length ? length + endSkirting : e;
        prism(w, skirtStart, skirtEnd, 0, .065, w.t + .015, 'skirting');
      }
    };
    let cursor = 0;
    for (const o of w.open ?? []) {
      const s = o.s / SCALE, e = o.e / SCALE;
      add(cursor, s, 0, HEIGHT);
      add(s, e, 0, o.sill);
      add(s, e, o.sill + o.h, HEIGHT);
      cursor = e;
    }
    add(cursor, length, 0, HEIGHT);
  }
  for (const w of parapets) {
    const length = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]) / SCALE;
    prism(w, -.05, length + .05, 0, 1.05, .10);
    prism(w, -.075, length + .075, 1.05, 1.095, .15, 'parapet-cap');
  }
  return volumes;
}

// Return triangle positions grouped by finish: plaster, skirting, top caps.
// The coordinate grid is a spatial arrangement of the original solid planes,
// not a sampled grid; even thin reveals and small joins retain their dimensions.
export function unionSurface(volumes) {
  const axes = [0, 1, 2].map(a => [...new Set(volumes.flatMap(b => [b.min[a], b.max[a]]))].sort((a,b) => a-b));
  const [nx, ny, nz] = axes.map(a => a.length - 1);
  const index = (x,y,z) => (x * ny + y) * nz + z;
  const occupied = new Uint8Array(nx * ny * nz);
  const maps = axes.map(a => new Map(a.map((v,i) => [v,i])));
  for (const b of volumes) {
    const start = b.min.map((v,a) => maps[a].get(v)), end = b.max.map((v,a) => maps[a].get(v));
    for (let x=start[0];x<end[0];x++) for (let y=start[1];y<end[1];y++) for (let z=start[2];z<end[2];z++) occupied[index(x,y,z)] = 1;
  }
  const solid = (x,y,z) => x>=0 && y>=0 && z>=0 && x<nx && y<ny && z<nz && occupied[index(x,y,z)] === 1;
  const faces = [[],[],[]];
  let surfaceArea = 0;
  for (let x=0;x<nx;x++) for (let y=0;y<ny;y++) for (let z=0;z<nz;z++) {
    if (!solid(x,y,z)) continue;
    const cell=[x,y,z];
    for (let a=0;a<3;a++) for (const sign of [-1,1]) {
      const neighbour=[x,y,z];neighbour[a]+=sign;
      if (solid(...neighbour)) continue;
      const u=(a+1)%3, v=(a+2)%3;
      const coord=axes[a][cell[a]+(sign>0?1:0)];
      const lo=axes.map((arr,d)=>arr[cell[d]]), hi=axes.map((arr,d)=>arr[cell[d]+1]);
      const corners=[[0,0],[1,0],[1,1],[0,1]].map(([i,j])=>{const p=[0,0,0];p[a]=coord;p[u]=i?hi[u]:lo[u];p[v]=j?hi[v]:lo[v];return p;});
      const material = hi[1]<=.065 ? 1 : (a===1 && sign===1 && (coord>=HEIGHT-.00001 || Math.abs(coord-1.095)<.00001)) ? 2 : 0;
      const order=sign>0?[0,1,2,0,2,3]:[0,2,1,0,3,2];
      for (const i of order) faces[material].push(...corners[i]);
      surfaceArea += (hi[u]-lo[u])*(hi[v]-lo[v]);
    }
  }
  return { faces, surfaceArea, solid, axes };
}
