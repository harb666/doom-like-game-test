// Monster stats. The creatures of the Maw - original designs for this game.
//   speed      metres per second
//   height     world height of the sprite in metres
//   painChance chance of flinching when hurt
//   melee      close-range attack
//   ranged     shooting attack (hitscan bullets or a projectile)

export const ENEMIES = {
  husk: {
    name: 'Husk', health: 45, speed: 2.8, radius: 0.45, height: 1.85,
    painChance: 0.75, reaction: 0.7, sightRange: 34, score: 100,
    melee: { range: 1.7, damage: [7, 13], windup: 0.35, cooldown: 0.9 },
    sounds: { sight: 'huskSight', pain: 'huskPain', death: 'huskDeath', idle: 'huskIdle', attack: 'claw' },
    drop: null, blood: 0x8a0808,
  },
  rifter: {
    name: 'Rifter', health: 60, speed: 3.2, radius: 0.45, height: 1.9,
    painChance: 0.6, reaction: 0.6, sightRange: 40, score: 150,
    ranged: { kind: 'hitscan', damage: [3, 7], shots: 3, interval: 0.11, spread: 0.07, range: 36, windup: 0.45, cooldown: [1.1, 2.3] },
    sounds: { sight: 'rifterSight', pain: 'rifterPain', death: 'rifterDeath', idle: 'rifterIdle', attack: 'enemyRifle' },
    drop: 'rivets', blood: 0x8a0808,
  },
  spitter: {
    name: 'Bile Spitter', health: 90, speed: 2.5, radius: 0.55, height: 1.7,
    painChance: 0.5, reaction: 0.7, sightRange: 36, score: 200,
    melee: { range: 1.8, damage: [8, 14], windup: 0.4, cooldown: 1.0 },
    ranged: { kind: 'projectile', projectile: 'acid', damage: [10, 18], range: 40, windup: 0.5, cooldown: [1.4, 2.8] },
    sounds: { sight: 'spitterSight', pain: 'spitterPain', death: 'spitterDeath', idle: 'spitterIdle', attack: 'spit' },
    drop: null, blood: 0x6a8a10,
  },
  hound: {
    name: 'Maw Hound', health: 140, speed: 6.8, radius: 0.6, height: 1.35,
    painChance: 0.35, reaction: 0.4, sightRange: 36, score: 250,
    melee: { range: 2.0, damage: [12, 22], windup: 0.3, cooldown: 0.75, lunge: true },
    sounds: { sight: 'houndSight', pain: 'houndPain', death: 'houndDeath', idle: 'houndIdle', attack: 'bite' },
    drop: null, blood: 0x8a0808,
  },
  wraith: {
    name: 'Cinder Wraith', health: 120, speed: 3.6, radius: 0.5, height: 1.8,
    painChance: 0.45, reaction: 0.6, sightRange: 42, score: 300, float: 0.5,
    ranged: { kind: 'projectile', projectile: 'ember', damage: [14, 22], range: 42, windup: 0.5, cooldown: [1.2, 2.4] },
    sounds: { sight: 'wraithSight', pain: 'wraithPain', death: 'wraithDeath', idle: 'wraithIdle', attack: 'fireball' },
    drop: 'cells', blood: 0x3a2040,
  },
  warden: {
    name: 'The Warden', health: 1600, speed: 2.4, radius: 1.1, height: 3.6,
    painChance: 0.06, reaction: 0.3, sightRange: 60, score: 5000, boss: true,
    melee: { range: 2.8, damage: [25, 40], windup: 0.5, cooldown: 1.2 },
    ranged: { kind: 'projectile', projectile: 'hellfire', damage: [20, 30], volley: 3, volleySpread: 0.12, range: 60, windup: 0.6, cooldown: [1.2, 2.2] },
    sounds: { sight: 'wardenSight', pain: 'wardenPain', death: 'wardenDeath', idle: 'wardenIdle', attack: 'fireball' },
    drop: null, blood: 0x8a0808,
  },
};
