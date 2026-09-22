// Characters used in a level's `things` layer.
// '.' or ' ' = nothing. Everything else places something on that square.

export const THING_CODES = {
  p: { kind: 'player' },

  // monsters
  h: { kind: 'enemy', type: 'husk' },
  r: { kind: 'enemy', type: 'rifter' },
  s: { kind: 'enemy', type: 'spitter' },
  g: { kind: 'enemy', type: 'hound' },
  w: { kind: 'enemy', type: 'wraith' },
  W: { kind: 'enemy', type: 'warden' },

  // health & armour
  '+': { kind: 'item', type: 'medpatch' },
  '*': { kind: 'item', type: 'traumakit' },
  v: { kind: 'item', type: 'vitalcore' },
  a: { kind: 'item', type: 'flakvest' },
  A: { kind: 'item', type: 'aegisplate' },
  d: { kind: 'item', type: 'armorshard' },

  // ammo
  b: { kind: 'item', type: 'rivets' },
  B: { kind: 'item', type: 'rivetcrate' },
  e: { kind: 'item', type: 'shells' },
  E: { kind: 'item', type: 'shellbox' },
  c: { kind: 'item', type: 'cells' },
  C: { kind: 'item', type: 'cellpack' },
  k: { kind: 'item', type: 'rocket' },
  K: { kind: 'item', type: 'rocketcrate' },

  // weapons
  'M': { kind: 'item', type: 'w_machinegun' },
  '2': { kind: 'item', type: 'w_scattergun' },
  '3': { kind: 'item', type: 'w_repeater' },
  '4': { kind: 'item', type: 'w_lancer' },
  '5': { kind: 'item', type: 'w_hellbore' },

  // keycards
  R: { kind: 'item', type: 'key_red' },
  U: { kind: 'item', type: 'key_blue' },
  Y: { kind: 'item', type: 'key_yellow' },

  // props
  o: { kind: 'barrel' },
  i: { kind: 'decor', type: 'lamp' },
  t: { kind: 'decor', type: 'brazier' },
  x: { kind: 'decor', type: 'remains' },
};
