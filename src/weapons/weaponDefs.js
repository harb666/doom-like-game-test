// Weapon and ammo definitions. Tweak damage / fire rate here.
//   cooldown  = seconds between shots
//   damage    = [min, max] per bullet / pellet / projectile
//   spread    = random aim wobble in radians

export const AMMO_TYPES = {
  rivets:  { name: 'Rivets',  max: 200 },
  shells:  { name: 'Shells',  max: 50 },
  cells:   { name: 'Cells',   max: 300 },
  rockets: { name: 'Rockets', max: 50 },
};

export const WEAPONS = [
  {
    id: 'pistol', slot: 1, name: 'Rivet Pistol',
    ammo: 'rivets', perShot: 1, cooldown: 0.3,
    kind: 'hitscan', damage: [10, 16], pellets: 1, spread: 0.018, firstShotAccurate: true,
    sound: 'pistol', kick: 10, flashTime: 0.07, lightFlash: 1.35, shake: 0.02,
  },
  {
    id: 'machinegun', slot: 2, name: 'Havoc Machinegun',
    ammo: 'rivets', perShot: 1, cooldown: 0.1,
    kind: 'hitscan', damage: [8, 12], pellets: 1, spread: 0.018, spreadGrow: 0.004, maxSpread: 0.075,
    climb: 0.012, sound: 'machinegun', kick: 7, flashTime: 0.05, lightFlash: 1.25, shake: 0.018,
  },
  {
    id: 'scattergun', slot: 3, name: 'Breacher Scattergun',
    ammo: 'shells', perShot: 1, cooldown: 0.9,
    kind: 'hitscan', damage: [7, 11], pellets: 8, spread: 0.085,
    sound: 'shotgun', kick: 22, flashTime: 0.09, lightFlash: 1.6, shake: 0.07, pump: true,
  },
  {
    id: 'repeater', slot: 4, name: 'Buzzsaw Repeater',
    ammo: 'rivets', perShot: 1, cooldown: 0.085,
    kind: 'hitscan', damage: [9, 14], pellets: 1, spread: 0.04,
    sound: 'repeater', kick: 6, flashTime: 0.05, lightFlash: 1.3, shake: 0.025, spin: true,
  },
  {
    id: 'lancer', slot: 5, name: 'Ion Lancer',
    ammo: 'cells', perShot: 1, cooldown: 0.09,
    kind: 'projectile', projectile: 'plasma', damage: [16, 24], spread: 0.012,
    sound: 'plasma', kick: 5, flashTime: 0.06, lightFlash: 1.2, shake: 0.01,
  },
  {
    id: 'hellbore', slot: 6, name: 'Hellbore Launcher',
    ammo: 'rockets', perShot: 1, cooldown: 0.75,
    kind: 'projectile', projectile: 'rocket', damage: [50, 80], spread: 0,
    sound: 'rocket', kick: 20, flashTime: 0.1, lightFlash: 1.5, shake: 0.08,
  },
];

export const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map(w => [w.id, w]));

// Projectile types shared by player weapons and monsters.
export const PROJECTILES = {
  plasma:  { speed: 42, radius: 0.18, color: 0x66ccff, size: 0.55, lightColor: 0x60b8ff, lightIntensity: 7, impact: 'plasma' },
  rocket:  { speed: 24, radius: 0.22, color: 0xffa040, size: 0.6, trail: true, lightColor: 0xff9040, lightIntensity: 10, impact: 'explosion', splash: { radius: 4.5, damage: 110 } },
  acid:    { speed: 13, radius: 0.25, color: 0x8aff40, size: 0.7, lightColor: 0x60ff30, lightIntensity: 6, impact: 'acid' },
  ember:   { speed: 16, radius: 0.25, color: 0xff7020, size: 0.8, trail: true, lightColor: 0xff7020, lightIntensity: 9, impact: 'ember' },
  mawfire: { speed: 15, radius: 0.35, color: 0xff5a18, size: 1.3, trail: true, lightColor: 0xff5a18, lightIntensity: 12, impact: 'ember' },
  hellfire:{ speed: 17, radius: 0.35, color: 0xff3010, size: 1.1, trail: true, lightColor: 0xff4010, lightIntensity: 12, impact: 'explosion', splash: { radius: 3.5, damage: 60 } },
};
