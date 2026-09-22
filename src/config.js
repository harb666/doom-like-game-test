// Global tuning values. Change numbers here to tweak how the game feels.

export const CELL = 2;            // size of one map square in metres
export const GRAVITY = 22;

export const PLAYER = {
  radius: 0.38,
  height: 1.6,         // used for ceiling / door clearance
  eye: 1.35,           // camera height above the floor
  step: 0.8,           // tallest ledge you can walk up without jumping
  runSpeed: 9.5,       // metres per second at full stick / keyboard
  accel: 70,
  friction: 11,
  maxHealth: 100,
  overHealth: 200,
  maxArmor: 200,
  useRange: 2.2,
};

export const DIFFICULTY = {
  easy:   { label: 'Easy',   dmgTaken: 0.55, enemyHealth: 0.8, enemySpeed: 0.9, reaction: 1.3, ammo: 1.5 },
  normal: { label: 'Normal', dmgTaken: 1.0,  enemyHealth: 1.0, enemySpeed: 1.0, reaction: 1.0, ammo: 1.0 },
  hard:   { label: 'Hard',   dmgTaken: 1.35, enemyHealth: 1.15, enemySpeed: 1.15, reaction: 0.7, ammo: 0.8 },
};

export const DEFAULT_SETTINGS = {
  lookSensitivity: 1.0,
  mouseSensitivity: 1.0,
  musicVolume: 0.5,
  sfxVolume: 0.8,
  verticalLook: true,
  aimAssist: true,
  invertY: false,
  autoOpenDoors: true,
  showFps: false,
  quality: 'auto',      // 'low' | 'medium' | 'high' | 'auto'
  screenShake: true,
  headBob: true,
  allyCompanion: true,  // VEX, the friendly companion
};

export const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
export const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
