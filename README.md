# MAWBREAKER

An original first-person shooter inspired by the 1990s classics — fast movement,
maze-like levels, keycards, secrets, explosive barrels and demonic monsters —
with late-90s Quake 2-style 3D graphics (3D monsters, guns and items, coloured
lighting with shadows, real-time muzzle-flash lights) and a Doom 64-style
dark ambient soundtrack.
It runs in any modern web browser, **including iPhone Safari with touch controls**.
No installs, no build step, no game engine — just open `index.html` from a web server.

All art, sounds, music, level layouts, names and monsters are original and
generated in code. Nothing is taken from any existing game.

## Playing on iPhone (one-time setup, ~2 minutes, all from your phone)

The game needs to live on a web address. GitHub Pages does this for free:

1. Open this repository on github.com in Safari (log in if asked).
2. Tap **Settings** (in the repo's top menu — scroll the menu sideways if you don't see it).
3. In the left menu, tap **Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Under **Branch**, pick the branch with the game (e.g. `main`, or `claude/doom-like-retro-fps-aaqhg1`), leave the folder as **/ (root)**, tap **Save**.
6. Wait about 1 minute, then refresh the page. A link like
   `https://YOUR-NAME.github.io/doom-like-game-test/` appears at the top. Tap it to play.
7. For full-screen: tap the **Share** button → **Add to Home Screen**. Launch it from the new icon.

> GitHub Pages is free for public repositories. If the repo is private, Pages needs a paid plan.

Turn your phone sideways. If there's no sound, turn the volume up and tap the screen once (sound works even with the silent switch on).

## Controls

| Touch | Keyboard / mouse |
|---|---|
| Left thumb: drag to move (joystick appears where you touch) | WASD / arrow keys |
| Right thumb: drag to look / aim | Mouse |
| **FIRE**: hold to shoot (you can also drag on it to aim) | Left click / Ctrl |
| **USE**: doors, lifts, secret walls | E / Space / right click |
| **WPN** or tap the weapon box: next weapon | 1-6, Q, mouse wheel |
| **MAP**: map overlay | Tab / M |
| **II**: pause | Esc / P |

Doors open automatically when you walk into them (can be turned off in Settings).

## What's in the game

- **3 levels**: *Intake Station* (tutorial-paced base with a lift, slime pit, outdoor arena),
  *The Foundry* (huge open lava hall with catwalks), *The Maw Gate* (boss arena).
- **6 weapons**: Rivet Pistol, Havoc Machinegun (Quake-style, recoil climbs as you fire), Breacher Scattergun, Buzzsaw Repeater, Ion Lancer (plasma), Hellbore Launcher (rockets with splash damage).
- **8 monsters**: Husk (clawing shambler), Rifter (armoured gunner), Bile Spitter (acid lobber),
  Maw Hound (fast charging beast), Cinder Wraith (floating fireball caster), Hellmaw (floating fanged
  head with tentacles that spits fireballs), Ravager (hulking pale brute that charges and claws),
  and **The Warden** (boss).
- **VEX**, a companion who follows you, shoots monsters and calls out in a (built-in text-to-speech) female voice. Toggle her and her voice in Settings.
- Health, armour (two strengths), ammo, keycards (red / blue / yellow), secret areas,
  explosive toxic canisters, hazard floors, lifts, stairs, sky areas.
- Title / difficulty / settings / pause / level complete / game over / victory screens.
- Saves your progress and settings automatically on the device.
- Procedural sound effects and dark ambient music with cavernous reverb (Web Audio), automatic graphics quality for phones.

## Project layout

```
index.html               Page shell: game canvas, HUD, touch buttons, menu container
css/style.css            All styling (HUD, touch controls, menus)
manifest.webmanifest     "Add to Home Screen" app settings
icons/                   Home-screen icons
vendor/three/            Three.js 3D library (MIT licence), stored locally
src/
  main.js                Starts the game, shows crashes on screen
  config.js              Tuning numbers: player speed, difficulty, default settings
  util.js                Small maths helpers
  core/
    Game.js              The "director": loads levels, main loop, game states, doors/keys/secrets
    Input.js             Keyboard + mouse
    TouchControls.js     Virtual joystick, look area, on-screen buttons
    Save.js              Saving settings and progress in the browser
  world/
    levels/level1-3.js   The levels, drawn as text maps (easy to edit!)
    levels/index.js      Level order
    thingCodes.js        Which letter places which monster / item
    Level.js             Turns text maps into 3D geometry; doors and lifts
    Collision.js         Walls, steps, line-of-sight and bullet tracing
    textures.js          All wall/floor/sky textures, painted in code
  player/Player.js       Movement, camera, health, armour, death
  weapons/
    weaponDefs.js        Weapon + ammo + projectile stats
    WeaponSystem.js      Firing, switching, aim assist, drawing the gun
    ViewModel.js         Draws the 3D gun in your hands
    Projectiles.js       Plasma, rockets, fireballs, acid
  allies/Ally.js         VEX the companion (following, targeting, callouts)
  enemies/
    enemyDefs.js         Monster stats
    Enemy.js             Monster AI (idle / chase / attack / pain / death)
    FlowField.js         Path-finding for all monsters at once
  items/
    Pickups.js           Health, armour, ammo, weapons, keys, barrels, lamps
  effects/Effects.js     Blood, sparks, explosions, screen flashes, shake
  world/Props.js         Furniture placed freely in a level (merged, lit, with collision)
  models/furniture.js    Desks, chairs, screens, plants... and the fake CCTV feeds
  gfx/Lighting.js        Baked coloured lighting with shadows (Quake-style lightmaps)
  gfx/DynamicLights.js   Real-time lights from muzzle flashes, rockets, fireballs
  models/common.js       Helpers for building simple 3D models (items, guns)
  models/creatures.js    Monsters + VEX: picks the sculpted model and its animation
  models/skinned.js      Loads the sculpted models (assets/models/*.bin), near/far detail
  models/rigs.js         Skeleton animations (walk, aim, fire, pain, death...)
  models/paint.js        Painted face make-up and clothing details for VEX
  models/weapons.js      3D guns (first person and pickups)
  models/items.js        3D pickups, canisters, lamps
  audio/Audio.js         Sound effects (synthesised)
  audio/Music.js         Music sequencer and songs
  audio/Voice.js         VEX's spoken lines (built-in speech voice)
  ui/HUD.js              Health / armour / ammo display
  ui/Menus.js            All menu screens
  ui/Automap.js          Map overlay
assets/models/           Sculpted, skinned character models (generated, see below)
tools/                   Automated tests (run in a headless browser; developer use)
tools/modelgen/          The character sculptor: specs/*.mjs describe each model
```

## Character models

Every character is sculpted in code from smooth blended shapes (muscles, skulls, ribs,
jaws, hair), turned into a detailed mesh (20,000–70,000 triangles), coloured with
skin, veins and grime, shaded with baked shadowing and rigged with a skeleton so it
can walk, aim and die. Each file also carries a lighter copy used when the character
is far away, which keeps iPhones running smoothly. To rebuild after editing a spec:

```
node tools/modelgen/build.mjs            # all models
node tools/modelgen/build.mjs hellmaw    # just one
node tools/modelview.mjs hellmaw three-quarter   # studio picture (needs the local server)
```

## Making changes (for the game director)

Just describe what you want in plain words, for example *"make the hounds faster"*,
*"add a purple plasma weapon"*, *"make level 2 more open"*. Most tuning lives in
`src/config.js`, `src/enemies/enemyDefs.js` and `src/weapons/weaponDefs.js`, and levels are
readable text maps in `src/world/levels/`.

## Running locally (developers)

```
npx http-server -p 8080 .
# then open http://localhost:8080
node tools/playtest.mjs     # scripted play-through checks
node tools/levelcheck.mjs   # verifies every level can be completed
node tools/touchtest.mjs    # iPhone-style multi-touch test
node tools/bosstest.mjs     # boss + heavy weapons
```
