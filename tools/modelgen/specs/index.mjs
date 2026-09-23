// Every sculpted model, by name (the name matches the monster type in the game).
import ally from './ally.mjs';
import monsters from './monsters.mjs';

export const SPECS = { ally, ...monsters };
