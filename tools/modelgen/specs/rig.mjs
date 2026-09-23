// Standard two-legged skeleton, sized per creature. All values are the
// rest-pose world positions of each joint (x is given for the +x side).
import { V } from './common.mjs';

export function humanRig(d) {
  const b = (name, parent, x, y, z) => ({ name, parent, pos: V(x, y, z) });
  const out = [
    b('root', null, 0, 0, 0), b('hips', 'root', 0, d.hip, 0), b('spine', 'hips', 0, d.spine, 0),
    b('chest', 'spine', 0, d.chest, 0), b('neck', 'chest', 0, d.neck, d.neckZ || 0), b('head', 'neck', 0, d.head, d.headZ || 0),
  ];
  if (d.jaw) out.push(b('jaw', 'head', 0, d.jaw[1], d.jaw[2]));
  for (const [s, k] of [[-1, 'L'], [1, 'R']]) {
    out.push(b('sh' + k, 'chest', s * d.sh[0], d.sh[1], d.sh[2]), b('el' + k, 'sh' + k, s * d.el[0], d.el[1], d.el[2]), b('hand' + k, 'el' + k, s * d.hand[0], d.hand[1], d.hand[2]));
    out.push(b('th' + k, 'hips', s * d.th[0], d.th[1], d.th[2]), b('kn' + k, 'th' + k, s * d.kn[0], d.kn[1], d.kn[2]), b('ft' + k, 'kn' + k, s * d.ft[0], d.ft[1], d.ft[2]));
  }
  return out;
}
/** Joint position for side s (-1 = L, +1 = R). */
export const J = (s, p) => V(s * p[0], p[1], p[2]);
