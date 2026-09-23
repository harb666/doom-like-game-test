// Skeleton animations for the sculpted, skinned models.
// Each animation sets bone rotations for a pose:
//   'idle' | 'walk' | 'windup' | 'strike' | 'aim' | 'fire' | 'pain'
// t = animation phase (advances with walking distance), poseT = time in pose.

const PI = Math.PI;

function setter(B) {
  return (n, x = 0, y = 0, z = 0) => { const b = B[n]; if (b) b.rotation.set(x, y, z); };
}

/** Two-legged creatures: VEX, Husk, Rifter, Ravager, Warden. */
export function humanoid(B, pose, t, poseT, cfg = {}) {
  const R = setter(B), w = Math.sin(t), h = cfg.hunch || 0;
  if (!B.__restHipY) B.__restHipY = B.hips.position.y;
  R('hips'); R('spine', h * 0.5); R('chest', h * 0.5); R('neck', -h * 0.45); R('head', -h * 0.35 + (cfg.headTilt || 0));
  R('thL'); R('thR'); R('knL'); R('knR'); R('ftL'); R('ftR');
  R('shL', 0, 0, cfg.armRest || 0); R('shR', 0, 0, -(cfg.armRest || 0)); R('elL', -0.18); R('elR', -0.18); R('handL'); R('handR');
  R('jaw', cfg.jawIdle ?? 0.05);
  B.hips.position.y = B.__restHipY;
  const stride = cfg.stride ?? 0.6;
  if (pose === 'walk') {
    R('thL', -w * stride); R('thR', w * stride);
    R('knL', Math.max(0, -w) * 1.1 + 0.05); R('knR', Math.max(0, w) * 1.1 + 0.05);
    R('ftL', Math.max(0, w) * -0.3); R('ftR', Math.max(0, -w) * -0.3);
    if (!cfg.armsBusy) { R('shL', w * 0.45, 0, cfg.armRest || 0); R('shR', -w * 0.45, 0, -(cfg.armRest || 0)); }
    B.hips.position.y = B.__restHipY + Math.abs(Math.cos(t)) * 0.025 - 0.01;
    B.hips.rotation.y = w * 0.08; B.chest.rotation.y = -w * 0.1;
  } else if (pose === 'idle') {
    B.chest.rotation.x += Math.sin(t * 0.45) * 0.02;
    B.head.rotation.y = Math.sin(t * 0.21) * 0.15;
  }
  if (pose === 'windup') { R('shL', -2.7, 0, -0.3); R('shR', -2.7, 0, 0.3); R('elL', -0.7); R('elR', -0.7); B.spine.rotation.x = h * 0.5 - 0.2; R('jaw', 0.5); }
  if (pose === 'strike') { R('shL', -0.9, 0, 0.35); R('shR', -0.9, 0, -0.35); R('elL', -0.1); R('elR', -0.1); B.spine.rotation.x = h * 0.5 + 0.35; R('jaw', 0.35); }
  if (pose === 'aim' || pose === 'fire' || cfg.armsBusy) {
    const kick = pose === 'fire' ? 0.18 : 0;
    const k = cfg.aim || {};
    R('shR', -1.5 + kick, k.ry ?? 0, k.rz ?? -0.18); R('elR', -0.05);
    if (k.twoHanded !== false) { R('shL', -1.3 + kick, k.ly ?? 0, k.lz ?? 0.5); R('elL', -0.45); }
    B.head.rotation.x = -0.05;
  }
  if (pose === 'pain') { B.spine.rotation.x = h * 0.5 - 0.35; B.head.rotation.x -= 0.3; R('shL', -0.5, 0, -0.5); R('shR', -0.4, 0, 0.6); }
  cfg.extra?.(B, pose, t, poseT);
}

/** Bloated Bile Spitter. */
export function spitter(B, pose, t) {
  const R = setter(B), w = Math.sin(t);
  R('body', pose === 'pain' ? -0.3 : pose === 'strike' ? 0.3 : 0);
  R('legL', pose === 'walk' ? -w * 0.5 : 0); R('legR', pose === 'walk' ? w * 0.5 : 0);
  R('armL', pose === 'walk' ? w * 0.5 : -0.3, 0, -0.3); R('armR', pose === 'walk' ? -w * 0.5 : -0.3, 0, 0.3);
  R('jaw', pose === 'aim' ? 0.55 : pose === 'fire' ? 0.75 : pose === 'windup' ? 0.45 : 0.1 + Math.sin(t * 2) * 0.05);
}

/** Four-legged Maw Hound. */
export function hound(B, pose, t) {
  const R = setter(B), w = Math.sin(t);
  const legs = [['lfL', 'kfL', w], ['lfR', 'kfR', -w], ['lbL', 'kbL', -w], ['lbR', 'kbR', w]];
  for (const [hip, knee, ph] of legs) { R(hip, pose === 'walk' ? ph * 0.7 : 0); R(knee, pose === 'walk' ? Math.max(0, -ph) * 0.9 : 0); }
  R('body', pose === 'windup' ? -0.2 : pose === 'strike' ? 0.15 : pose === 'pain' ? -0.3 : 0);
  R('neck', pose === 'strike' ? 0.35 : pose === 'walk' ? Math.sin(t * 2) * 0.05 : 0);
  R('jaw', pose === 'windup' ? 0.75 : pose === 'strike' ? 0.1 : 0.06 + Math.max(0, Math.sin(t * 0.5)) * 0.15);
  R('tail0', 0, Math.sin(t * 1.3) * 0.35); R('tail1', 0, Math.sin(t * 1.3 + 0.7) * 0.4);
}

/** Floating Hellmaw with dangling tentacles. */
export function hellmaw(B, pose, t) {
  const R = setter(B);
  R('body', pose === 'pain' ? -0.35 : pose === 'strike' ? 0.3 : Math.sin(t * 0.5) * 0.05);
  B.body.position.y = (B.__restY ??= B.body.position.y) + Math.sin(t * 0.9) * 0.12;
  R('jaw', pose === 'aim' ? 0.5 : pose === 'fire' ? 0.7 : pose === 'windup' ? 0.6 : pose === 'strike' ? 0.1 : 0.12 + Math.sin(t * 1.5) * 0.06);
  for (let k = 0; k < 5; k++) for (let i = 0; i < 3; i++)
    R(`t${k}_${i}`, Math.sin(t * 1.6 + k + i * 0.8) * (0.2 + i * 0.12), 0, Math.cos(t * 1.3 + k * 2 + i) * (0.15 + i * 0.1));
}
export function hellmawDeath(B, deathT) {
  const k = Math.min(1, deathT / 0.6);
  B.body.position.y = (B.__restY ??= B.body.position.y) - k * k * 1.15;
  B.body.rotation.set(-k * 0.9, 0, k * 0.4);
  B.jaw.rotation.x = 0.9;
}

/** Cinder Wraith: floating robed spectre. */
export function wraith(B, pose, t) {
  const R = setter(B);
  B.body.position.y = (B.__restY ??= B.body.position.y) + Math.sin(t * 0.8) * 0.1;
  const cast = pose === 'aim' || pose === 'fire';
  R('shL', cast ? -1.3 : Math.sin(t * 0.6) * 0.2, 0, cast ? 0.3 : -0.2); R('shR', cast ? -1.3 : -Math.sin(t * 0.6) * 0.2, 0, cast ? -0.3 : 0.2);
  R('head', pose === 'pain' ? -0.4 : 0); R('robe', Math.sin(t * 0.7) * 0.05, 0, Math.cos(t * 0.6) * 0.05);
}
