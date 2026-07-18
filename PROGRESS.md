# Multi-Pov — Application Progress Log

Historical record of features, user prompts, fixes, and decisions for this project.  
**Update this file** when shipping meaningful work: new features, prompt-driven changes, and bug fixes.

---

## How to use this file

Add a new entry at the **top** of the [Changelog](#changelog) section (newest first).

### Entry template

```markdown
### YYYY-MM-DD — Short title

**Type:** Feature | Fix | Prompt | Refactor | Docs | Chore  
**Prompt / request:** _(what the user asked, paraphrased if long)_  
**Status:** Done | Partial | Blocked

**Changes**
- …

**Files touched**
- `path/to/file`

**Notes**
- Decisions, tradeoffs, follow-ups
```

**Types**
| Type | Use for |
|------|---------|
| **Feature** | New gameplay, map, systems, UI |
| **Fix** | Bugs, broken UX, regressions |
| **Prompt** | Direction-setting request that may span multiple commits |
| **Refactor** | Structure/cleanup without user-facing change |
| **Docs** | README, this log, comments |
| **Chore** | Tooling, deps, build |

---

## Project snapshot

| Field | Value |
|-------|--------|
| **Working title** | The Farm — Zombies Prototype |
| **Stack** | Vite, React, TypeScript, Three.js, @react-three/fiber, @react-three/drei |
| **Goal** | Browser COD Zombies–style game with simple shaded geometry |
| **Map** | Farm (barn, farmhouse, fence, props) |
| **Run** | `npm install` → `npm run dev` → http://localhost:5173/ |

### Current feature map

| Area | Status | Notes |
|------|--------|--------|
| Farm map (barn, house, fence, props) | Done | Simple meshes + materials |
| FPS player (WASD, look, sprint, jump) | Done | Pointer lock |
| Click-to-play menu | Done | Fixed overlay blocking canvas |
| Modular zombie (colors + accessories) | Done | Presets + `randomAppearance` |
| Time of day (day / twilight / night) | Done | Sky, lights, fog, stars, lamps |
| Zombie AI (chase) | Done | 60% player max speed, 0.2s reaction lag |
| World collision | Done | Static assets + player/zombie bodies |
| Menu game settings | Done | Max zombies, zombie/player speeds |
| Weapons / combat | Done | Hitscan, decals, limb dismemberment |
| Keybind remapping | Done | Options menu; localStorage persist |
| 1st / 3rd person camera | Done | Toggle (default V); survivor avatar in TPS |
| Wave spawner | Not started | Pack size from settings, fixed spawns |
| Points / doors economy | Not started | — |

### Key paths

```
src/
  components/
    Game.tsx              # Canvas shell, HUD, menu, time-of-day state
    Player.tsx            # FPS controller → writes playerState
    FarmMap.tsx           # Map assembly
    Environment.tsx       # Sky / fog / lights by time of day
    TimeOfDayToggle.tsx   # Day · Twilight · Night UI
    ZombieShowcase.tsx    # Chasing pack (ZombieAI)
    buildings/            # Barn, Farmhouse, Fence
  game/
    constants.ts          # Lag, radii, bounds (defaults)
    gameSettings.ts       # Runtime menu settings store
    useGameSettings.ts    # React subscription hook
    keybindings.ts        # Remappable keys + localStorage
    useKeybindings.ts     # React subscription hook
    playerState.ts        # Position history for lagged chase target
    collision.ts          # AABB/circle resolve + moveAndCollide
    collisionWorld.ts     # Static + dynamic body queries
    worldColliders.ts     # Farm asset collider layout
  weapons/
    definitions.ts        # Fist, pitchfork, shotguns, .22 lever
    weaponState.ts        # Inventory, fire/reload state machine
    WeaponView.tsx        # FPS viewmodel + anims
    WeaponModels.tsx      # Shaded gun/melee meshes
    combat.ts             # Hitscan pellets
    damageables.ts        # Zombie hit targets
  environment/
    timeOfDay.ts          # TOD presets
  zombie/
    ZombieModel.tsx       # Modular body + raised-arm shamble
    ZombieAI.tsx          # Chase controller + locomotion gait
    zombieWalk.ts         # sampleZombieWalk pose sampler
    Accessories.tsx       # Head / face / torso / hand / feet
    palettes.ts           # Colors, presets, random
    types.ts
PROGRESS.md               # This file
README.md                 # Quick start
```

---

### 2026-07-18 — Bullet holes + blood on zombie hits

**Type:** Feature  
**Prompt / request:** Add holes and blood when shooting zombie parts.  
**Status:** Done

**Changes**
- Layered wound FX per hit: dark bullet hole, sticky blood splat(s), mist puff, flying droplets
- Holes/splats stick to zombie root (follow walk/death); spray uses gravity and becomes ground splat
- Head / melee hits are larger and bloodier; limb loss adds stump wound layers
- Higher marker cap so packs keep stacked wounds

**Files touched**
- `src/weapons/hitMarkers.ts`, `combat.ts`, `damageables.ts`
- `src/components/HitMarkers.tsx`
- `src/zombie/ZombieAI.tsx`
- `PROGRESS.md`

---

### 2026-07-18 — Add revolver

**Type:** Feature  
**Prompt / request:** Add a revolver using UE5 FPS revolver anims as sample (https://www.youtube.com/watch?v=6kYep7sWK88).  
**Status:** Done

**Changes**
- 6-shot high-damage revolver, deliberate fire rate, cylinder full reload
- Mesh: frame, cylinder, barrel, hammer, wood grip
- Fire: heavy muzzle flip + settle; reload: swing open → dump → load → snap shut
- Slot 7 / key `7`; conical muzzle flash at short barrel

**Files touched**
- `src/weapons/types.ts`, `definitions.ts`, `WeaponModels.tsx`, `weaponAnims.ts`, `WeaponView.tsx`
- `src/game/keybindings.ts`
- `src/components/Player.tsx`, `ControlsLegend.tsx`
- `PROGRESS.md`

---

### 2026-07-18 — Add MP40 SMG

**Type:** Feature  
**Prompt / request:** New MP40 weapon; model + shoot/reload anims inspired by COD comparison short (Far Cry 6 / HLL / WW2 / Vanguard).  
**Status:** Done

**Changes**
- Full-auto SMG: 32-round mag, ~500 RPM, mag-drop reload with charge-handle rack
- Procedural mesh (receiver, stick mag, underfold stock, charging handle)
- FPS fire/reload/equip clips; TPS uses same deltas via existing mapper
- Slot 6 / key `6` (`weapon6` binding)

**Files touched**
- `src/weapons/types.ts`, `definitions.ts`, `WeaponModels.tsx`, `weaponAnims.ts`, `WeaponView.tsx`
- `src/game/keybindings.ts`
- `src/components/Player.tsx`, `ControlsLegend.tsx`
- `PROGRESS.md`

**Notes**
- Reference: https://www.youtube.com/shorts/zqfIZifAmDs (COD-style MP40 handling)

---

### 2026-07-18 — Fix 3rd-person weapon orientation

**Type:** Fix  
**Prompt / request:** TPS weapon anims don’t match FPS; weapons held vertically.  
**Status:** Done

**Changes**
- Root cause: world mesh `+90°` and hand socket `−90°` cancelled, so barrel stayed on arm local −Z; raised arms made that axis point down (vertical gun)
- World weapons now use a single `Rx(−π/2)` so barrel maps to arm −Y (hand axis → horizontal when aiming)
- Pitchfork grip offset so shaft sits in hand, tines ahead
- TPS arm ready pose is a clear two-hand horizontal aim; same FPS clip deltas for kick/lever/pump/reload/melee
- Hand socket no longer applies a base −90° (only anim deltas)

**Files touched**
- `src/weapons/WeaponModels.tsx`
- `src/weapons/weaponAnims.ts`
- `src/components/PlayerAvatar.tsx`
- `PROGRESS.md`

---

### 2026-07-18 — Straight-ahead zombie arms

**Type:** Fix  
**Prompt / request:** Zombie arms look crossed — make them straight ahead.  
**Status:** Done

**Changes**
- Removed large shoulder Z/Y twist that folded arms across the chest
- Reach is almost pure pitch (`rot.x ≈ −π/2`) with tiny outward Z only
- Straighter elbows; no forearm Z bias
- Arm hitboxes moved to match forward reach

**Files touched**
- `src/zombie/zombieWalk.ts`
- `src/zombie/ZombieModel.tsx`
- `src/weapons/limbs.ts`
- `PROGRESS.md`

---

### 2026-07-18 — Sync walk cadence to travel speed

**Type:** Fix  
**Prompt / request:** Zombie legs animate much slower than they move (skating).  
**Status:** Done

**Changes**
- Walk phase advances from actual distance traveled (`speed / strideLen * π` per step), not wall-clock
- `ZombieAI` reports post-collision horizontal `speed` via `getLocomotion()`
- Slightly longer leg swing at high gait so steps cover more ground

**Files touched**
- `src/zombie/zombieWalk.ts`
- `src/zombie/ZombieModel.tsx`
- `src/zombie/ZombieAI.tsx`
- `src/zombie/types.ts`
- `PROGRESS.md`

---

### 2026-07-18 — Raised-arm shambling walk

**Type:** Feature  
**Prompt / request:** Upgrade zombie walk — arms raised out while walking; better arm/leg use (classic COD / Romero reach).  
**Status:** Done

**Changes**
- New `sampleZombieWalk()` pose sampler: arms nearly horizontal forward + outward spread, limp asymmetric legs, torso lean, head loll
- Animated elbows (forearm claw bend) and knees (thigh/shin chain) so limbs articulate instead of stiff single-bone swings
- `ZombieAI` drives gait via `getLocomotion()` (moving + intensity) without React re-renders
- Standing arm hitboxes shifted forward/out to match the reach pose
- Idle still keeps arms partially raised (undead “ready” pose)

**Files touched**
- `src/zombie/zombieWalk.ts` (new)
- `src/zombie/ZombieModel.tsx`
- `src/zombie/ZombieAI.tsx`
- `src/zombie/types.ts`
- `src/weapons/limbs.ts`
- `PROGRESS.md`

**Notes**
- Hard refresh to pick up the new walk cycle. Per-zombie seed varies limp side and arm height.

---

### 2026-07-18 — Sync 3rd-person weapon anims with 1st person

**Type:** Feature  
**Prompt / request:** Update 3rd-person weapon use animations to match first person.  
**Status:** Done

**Changes**
- Shared `sampleThirdPersonWeaponPose()` maps the same FPS keyframe clips (fire / lever / pump / reload / melee / equip) onto TPS arms + held weapon
- Uses identical `weaponState.phase` and `animU` timing as the viewmodel
- Weapon socket applies the same rotational/positional deltas (kick, lever throw, pump, pitchfork thrust)
- Walk swing only blends in during idle

**Files touched**
- `src/weapons/weaponAnims.ts`
- `src/components/PlayerAvatar.tsx`
- `PROGRESS.md`

---

### 2026-07-18 — Fix death/gib ground clipping

**Type:** Fix  
**Prompt / request:** When zombies fall or lose parts they clip through the ground.  
**Status:** Done

**Changes**
- Death tip-over lifts the body onto the surface (no more downward sink); small forward slide so corpse lays flat
- Limb gibs use `getGroundHeight` + rest offset; settle and stop spinning on contact
- Head explosion chunks bounce then rest on terrain

**Files touched**
- `src/zombie/ZombieAI.tsx`
- `src/zombie/Gibs.tsx`
- `PROGRESS.md`

---

### 2026-07-18 — Ground leveling + height sampler

**Type:** Feature / Fix  
**Prompt / request:** Player and assets float off the ground; make them level, with support for future stairs and mounds.  
**Status:** Done

**Changes**
- `ground.ts`: height sampler with pluggable surfaces (`createHeightPad`, `createRamp`) for stairs/mounds later
- Player feet and zombies snap to `getGroundHeight(x,z)`; jump/land uses `resolveFeetOnGround`
- Character soles sit at local y=0 (player avatar + zombie feet/boots fixed)
- Farmhouse porch registered as a 0.2 height pad (walk-up demo of multi-level)
- Bullet ground hits use sampled height

**Files touched**
- `src/game/ground.ts`
- `src/components/Player.tsx`
- `src/components/PlayerAvatar.tsx`
- `src/components/FarmMap.tsx`
- `src/zombie/ZombieModel.tsx`
- `src/zombie/ZombieAI.tsx`
- `src/zombie/Accessories.tsx`
- `src/weapons/combat.ts`
- `src/weapons/limbs.ts`
- `PROGRESS.md`

**Notes**
- Add stairs later with stacked `createHeightPad` / `createRamp` + matching visual meshes
- Buildings already bottom at y≈0; hay/trees were already grounded

---

### 2026-07-18 — Player can push zombies (50/50 mass)

**Type:** Feature  
**Prompt / request:** Allow the player to push zombies while moving at 50/50 weight — both slow down, player can ultimately push them aside.  
**Status:** Done

**Changes**
- Soft equal-mass contact: 50/50 separation, shared normal velocity damping
- Player slows when jammed into zombies; zombies receive shove + lateral slide
- Player hard-collides map only; zombie push is soft (not a hard wall)
- Zombies apply residual shove velocity and ~50% chase slowdown while being pushed

**Files touched**
- `src/game/agentPush.ts`
- `src/game/collisionWorld.ts`
- `src/components/Player.tsx`
- `src/zombie/ZombieAI.tsx`
- `PROGRESS.md`

---

### 2026-07-18 — Fix crawl zombie hitboxes

**Type:** Fix  
**Prompt / request:** When zombies crawl on the ground, weapons cannot hurt them.  
**Status:** Done

**Changes**
- Root cause: hit spheres stayed at **standing height** after legs were gone
- Added `LIMB_LOCAL_CRAWL` low/forward spheres matching the crawl visual
- Damageable `crawling` flag switches layout; slightly larger spheres while crawling
- Limb world positions use `localToWorldPoint` when available

**Files touched**
- `src/weapons/limbs.ts`
- `src/weapons/combat.ts`
- `src/weapons/damageables.ts`
- `src/zombie/ZombieAI.tsx`
- `PROGRESS.md`

---

### 2026-07-18 — Pushed project to GitHub

**Type:** Chore  
**Prompt / request:** Add this to GitHub repo https://github.com/TysonK5/Zomblies.git  
**Status:** Done

**Changes**
- Initialized git (`main`)
- Initial commit of source (node_modules/dist ignored)
- Remote `origin` → `https://github.com/TysonK5/Zomblies.git`
- Pushed `main` to GitHub

**Files touched**
- `.git/` (repo metadata)
- `PROGRESS.md`

**Notes**
- Repo URL: https://github.com/TysonK5/Zomblies

---

### 2026-07-18 — Empty fire auto-reloads when reserve remains

**Type:** Fix  
**Prompt / request:** When trying to shoot an empty gun, reload if there is more ammo left.  
**Status:** Done

**Changes**
- `tryFire` on empty mag with reserve ammo now starts **reload** instead of only a dry-fire click
- Dry-fire only when reserve is also empty
- `tryReload` can start from idle/fire (no longer blocked after dry-click phase)

**Files touched**
- `src/weapons/weaponState.ts`
- `src/components/Player.tsx`
- `PROGRESS.md`

---

### 2026-07-18 — Chest hits apply full HP damage + feedback

**Type:** Feature / Fix  
**Prompt / request:** When shooting a zombie in the chest, account for damage; hit points should act.  
**Status:** Done

**Changes**
- Larger torso hitbox; arms offset so center-mass shots count as **body**
- Hit priority: head/torso preferred over limbs when distances are close
- **Torso = 100% weapon damage** to HP (no accidental sever); death when HP ≤ 0
- Missing limb hits fall through to torso so damage isn’t wasted
- Floating **damage numbers** (`-24`, HEADSHOT, KILL)
- **HP bar** above damaged living zombies (green → yellow → red)

**Files touched**
- `src/weapons/limbs.ts`
- `src/weapons/combat.ts`
- `src/weapons/damageables.ts`
- `src/weapons/damageNumbers.ts`
- `src/components/DamageNumbers.tsx`
- `src/components/ZombieHealthBar.tsx`
- `src/components/Game.tsx`
- `src/zombie/ZombieAI.tsx`
- `PROGRESS.md`

**Notes**
- Zombies start at 100 HP; .22 does 24/body shot (~5 chest hits to kill)
- Head still insta-kills; limbs still sever with partial HP transfer

---

### 2026-07-18 — Pitchfork pull-stab aligned to crosshair

**Type:** Feature  
**Prompt / request:** Update pitchfork animation to pull-in then stab forward; tip should match screen center / crosshair.  
**Status:** Done

**Changes**
- Mesh rebuilt: **tine tips at local origin** so pose Z places tips on the aim line
- Idle tips at screen center; only tiny depth bob (no lateral sway)
- Attack: **pull tips toward camera** → **stab forward** through crosshair → retract
- Hands sit on the shaft behind the tips; TPS arms match pull → thrust
- Faster clip (~0.62s) and cooldown 0.7s

**Files touched**
- `src/weapons/WeaponModels.tsx`
- `src/weapons/weaponAnims.ts`
- `src/weapons/WeaponView.tsx`
- `src/weapons/definitions.ts`
- `src/components/PlayerAvatar.tsx`
- `PROGRESS.md`

---

### 2026-07-18 — Flesh hit markers stick to moving zombies

**Type:** Fix  
**Prompt / request:** Hit points need to stick to the zombies as they move.  
**Status:** Done

**Changes**
- Flesh/blood markers store **local offset** on the zombie and re-sync every frame
- Use zombie root `localToWorld` so decals follow walk **and** death tip-over
- Damageable stays registered on death so corpse decals keep tracking until unmount
- World bullet holes remain fixed in world space

**Files touched**
- `src/weapons/hitMarkers.ts`
- `src/weapons/combat.ts`
- `src/weapons/damageables.ts`
- `src/components/HitMarkers.tsx`
- `src/zombie/ZombieAI.tsx`
- `PROGRESS.md`

---

### 2026-07-18 — Hit markers + zombie limb destruction

**Type:** Feature  
**Prompt / request:** Visible hit markers on walls, ground, and zombies; shooting a body part destroys it (head explodes, leg falls off, etc.).  
**Status:** Done

**Changes**
- Impact decals: dark bullet holes on world (ground, buildings, fence, trees, props); blood + mist on flesh
- Hitscan vs ground plane + vertical prisms from map colliders + per-limb zombie spheres
- Dismemberment: head / torso / arms / legs; headshot explodes head and kills; legs/arms fly off as gibs with stumps
- Both legs gone → crawl (slower); missing one leg → limp speed
- `HitMarkers` scene component ages/culls decals

**Files touched**
- `src/weapons/hitMarkers.ts`
- `src/weapons/limbs.ts`
- `src/weapons/combat.ts`
- `src/weapons/damageables.ts`
- `src/components/HitMarkers.tsx`
- `src/components/Game.tsx`
- `src/zombie/ZombieModel.tsx`
- `src/zombie/ZombieAI.tsx`
- `src/zombie/Gibs.tsx`
- `src/zombie/types.ts`
- `PROGRESS.md`

**Notes**
- Pellet weapons can strip multiple limbs per shot
- World decals last ~8s; blood mist is short-lived

---

### 2026-07-18 — Pitchfork melee from Half Sword / Blood samples

**Type:** Feature  
**Prompt / request:** Update pitchfork animation using YouTube shorts gbcz7IFaB54 (Half Sword “pitchfork to the eye”) and FoRfeT8iwrU (Blood: Fresh Supply pitchfork kill).  
**Status:** Done

**Changes**
- New pitchfork keyframe clip: guard → high chamber wind-up → face-line thrust → bury/grind → rip free
- Ready idle with tines slightly elevated; dedicated equip raise
- Clip length ~0.78s; damage 72, range 3.0, cooldown 0.85 for weighty reads
- Third-person two-hand polearm arms match the same beats

**Files touched**
- `src/weapons/weaponAnims.ts`
- `src/weapons/definitions.ts`
- `src/components/PlayerAvatar.tsx`
- `PROGRESS.md`

**Notes**
- Procedural keyframes in the spirit of those clips (not mocap from the videos)

---

### 2026-07-18 — Weapon anims from lever-action DB reference

**Type:** Feature  
**Prompt / request:** Update weapon animations using https://www.youtube.com/watch?v=zyV6bvtv3MI as a sample (Lever Action Double Barrel Shotgun showcase).  
**Status:** Done

**Changes**
- Keyframed viewmodel clips (`weaponAnims.ts`) with smoothstep sampling
- **Double barrel**: sharp kick → automatic **under-lever rack** (reference hybrid) → break-open shell reload
- **.22 lever**: fire kick + full lever throw cycle; tipped reload
- **Pump**: heavy kick + forearm rack; belly-up shell insert then chamber pump
- **Melee**: chamber → impact → recover keyframes
- **Equip** raise when switching weapons
- New phases: `lever`, `equip`; HUD status labels
- Third-person arms mirror lever / pump / reload beats

**Files touched**
- `src/weapons/weaponAnims.ts` (new)
- `src/weapons/weaponState.ts`
- `src/weapons/WeaponView.tsx`
- `src/weapons/types.ts`
- `src/components/PlayerAvatar.tsx`
- `src/components/WeaponHud.tsx`
- `PROGRESS.md`

**Notes**
- Reference is a short art-showcase, not a full skeleton — poses are procedural keyframes in that style, not motion-captured from the video
- Hard-refresh to pick up the new clips

---

### 2026-07-18 — Fix: weapon / attack animations not visible

**Type:** Fix  
**Prompt / request:** Still cannot see weapon animation or attack animations.  
**Status:** Done

**Changes**
- Root cause: viewmodel parented with `camera.add()` was unreliable under R3F; weapon often not locked to the view
- Viewmodel now follows the camera in **world space every frame**
- `depthTest = false` so the gun always draws on top (classic FPS)
- Much stronger fire / melee / reload / pump motion; longer anim durations
- Default loadout starts on **Double Barrel** (slot 3) so a gun is visible immediately
- Bigger fists; exaggerated third-person arm attack poses
- WeaponView always mounted (hides in 3rd person)

**Files touched**
- `src/weapons/WeaponView.tsx`
- `src/weapons/WeaponModels.tsx`
- `src/weapons/weaponState.ts`
- `src/components/Player.tsx`
- `src/components/PlayerAvatar.tsx`
- `PROGRESS.md`

**Notes**
- Hard-refresh the browser if an old bundle is cached
- Click to play (pointer lock) then LMB / R to see kick and reload

---

### 2026-07-18 — Visible equipped weapon (FPS + TPS)

**Type:** Feature  
**Prompt / request:** See the selected weapon like in most FPS games (RDR, GTA, Doom).  
**Status:** Done

**Changes**
- Classic FPS viewmodels: large lower-right gun with hands, movement bob, weapon-swap dip, stronger recoil/muzzle flash
- Shared weapon meshes; `fps` vs `world` presentation
- Third person: selected weapon parented to right hand; aim-ready arm pose for guns, pitchfork thrust, fists punch
- Arm poses react to fire / reload / pump / melee phases

**Files touched**
- `src/weapons/WeaponModels.tsx`
- `src/weapons/WeaponView.tsx`
- `src/components/PlayerAvatar.tsx`
- `PROGRESS.md`

**Notes**
- Fists show hands only (no prop) in both views
- World weapon scale tuned for avatar hands

---

### 2026-07-18 — First / third person camera toggle

**Type:** Feature  
**Prompt / request:** Add a third-person view and toggle between third and first person.  
**Status:** Done

**Changes**
- Camera modes: first person (FPS weapons) and third person (orbit spring-arm + survivor avatar)
- Remappable **Toggle 1st / 3rd person** (default `V`)
- Feet position is authoritative; camera derived per mode
- TPS: look orbit, body faces move/look, walk cycle on avatar; FPS viewmodel hidden
- Hitscan still fires from camera (works in both views)
- HUD shows current mode + toggle key

**Files touched**
- `src/game/cameraMode.ts`
- `src/game/keybindings.ts`
- `src/components/Player.tsx`
- `src/components/PlayerAvatar.tsx`
- `src/components/CameraModeHud.tsx`
- `src/components/ControlsLegend.tsx`
- `src/components/Game.tsx`
- `src/components/Game.css`
- `PROGRESS.md`

**Notes**
- No camera collision with buildings yet (soft ground clamp only)
- Third-person weapon model on the body not shown (hands empty); combat is camera-aimed

---

### 2026-07-18 — Remappable keys in options menu

**Type:** Feature  
**Prompt / request:** Allow remapping keys in the options menu.  
**Status:** Done

**Changes**
- Keybind store with all gameplay actions (move, jump, sprint, fire, reload, weapons 1–5, cycle time of day)
- Options **Keybinds** section: click row → press key/mouse button; Escape cancels; conflicts swap
- **Reset keys** restores defaults; bindings persist in `localStorage`
- Player, weapon hotkeys, fire, and day/night cycle read remapped codes
- Menu controls legend updates live to match current binds
- Input ignored while a rebind is listening

**Files touched**
- `src/game/keybindings.ts`
- `src/game/useKeybindings.ts`
- `src/components/KeybindSettings.tsx`
- `src/components/SettingsPanel.tsx`
- `src/components/ControlsLegend.tsx`
- `src/components/Player.tsx`
- `src/components/Game.tsx`
- `src/components/TimeOfDayToggle.tsx`
- `src/components/Game.css`
- `PROGRESS.md`

**Notes**
- Scroll-wheel weapon cycle not remappable (still fixed)
- Esc remains reserved for pointer unlock / menu

---

### 2026-07-18 — Weapons loadout + HUD + animations

**Type:** Feature  
**Prompt / request:** Add weapons (fist, pitchfork, double barrel shotgun, .22 lever action, pump shotgun); show gun stats bottom-right (name, total ammo, loaded); shoot and reload animations.  
**Status:** Done

**Changes**
- Five weapons with stats (damage, range, mag, reserve, fire rate, pellets/spread for shotguns)
- FPS viewmodels (simple shaded meshes) parented to camera with idle sway
- Shoot / melee / reload / pump procedural animations + muzzle flash
- Bottom-right HUD: slot indicators, weapon name, loaded / total ammo (melee shows MELEE)
- Controls: `1`–`5` select, LMB fire, `R` reload, scroll cycle
- Hitscan combat vs zombies (100 HP); corpses tip over on death
- Double barrel full reload; pump shell-by-shell reload (interruptible if loaded); auto-reload on empty click

**Files touched**
- `src/weapons/*` (new)
- `src/components/Player.tsx`
- `src/components/WeaponHud.tsx`
- `src/components/Game.tsx`
- `src/components/Game.css`
- `src/zombie/ZombieAI.tsx`
- `PROGRESS.md`

**Notes**
- Starting loadout gives all weapons with full mags + reserve
- No weapon pickup world spawns yet; inventory is always available
- Sound effects not included

---

### 2026-07-18 — Menu settings: zombies + speeds

**Type:** Feature  
**Prompt / request:** Add a menu option to configure max zombies, zombie run speed, player run/walk speed.  
**Status:** Done

**Changes**
- Shared `gameSettings` store with defaults, clamps, subscribe, reset
- **Configure** panel on start / Esc menu with sliders:
  - Max zombies (0–24)
  - Zombie run speed (u/s)
  - Player walk speed (u/s)
  - Player run speed (u/s)
- Player and zombies read settings live each frame
- Zombie pack spawns from a fixed pool sliced by `maxZombies`
- Reset button restores defaults

**Files touched**
- `src/game/gameSettings.ts`
- `src/game/useGameSettings.ts`
- `src/components/SettingsPanel.tsx`
- `src/components/Game.tsx`
- `src/components/Game.css`
- `src/components/Player.tsx`
- `src/components/ZombieShowcase.tsx`
- `src/zombie/ZombieAI.tsx`
- `PROGRESS.md`

**Notes**
- Defaults match prior balance (walk 6, run 9.9, zombie 5.94 ≈ 60% of run)
- Esc releases pointer lock and shows menu again so settings stay reachable mid-session

---

### 2026-07-18 — Collision for all map assets (+ agents)

**Type:** Feature  
**Prompt / request:** Add collision for all assets within the game.  
**Status:** Done

**Changes**
- Ground-plane collision system: AABB boxes + circles, multi-pass penetration resolve, wall sliding via axis separation
- Static colliders for farm solids: barn, silo, farmhouse, porch, fence (with gate gap), hay, trees, trough, outhouse, yard lamp, cornfield patches
- Dynamic bodies: each zombie + the player register every frame so agents block each other
- Player and `ZombieAI` movement both run through `moveAndCollide`
- Walkable (no solid): ground, dirt paths, gravel; individual corn stalks use patch AABBs instead

**Files touched**
- `src/game/collision.ts`
- `src/game/collisionWorld.ts`
- `src/game/worldColliders.ts`
- `src/game/constants.ts` (`PLAYER_RADIUS`, `ZOMBIE_RADIUS`)
- `src/components/Player.tsx`
- `src/zombie/ZombieAI.tsx`
- `PROGRESS.md`

**Notes**
- Collider layout is hand-authored to match `FarmMap` positions — update `worldColliders.ts` when moving props
- No vertical collision (jump still ignores roofs); XZ only
- Not a full physics engine — suitable for FPS walk + zombie slide
- Pathfinding still backlog; zombies may stack against walls while chasing

---

### 2026-07-18 — Zombie chase AI (speed cap + reaction lag)

**Type:** Feature  
**Prompt / request:** Create zombie AI that chases the player; max speed 60% of the player’s max speed; reaction time lags 0.2s behind what they are following.  
**Status:** Done

**Changes**
- Shared constants: player walk/sprint max, `ZOMBIE_MAX_SPEED = 60%` of player max, `ZOMBIE_REACTION_LAG = 0.2s`
- `playerState` ring buffer of player XZ over time; zombies sample **where the player was 0.2s ago** (plus tiny seed jitter so the pack doesn’t turn in perfect sync)
- `ZombieAI` moves toward lagged target, smooth yaw turn, stop distance, world bounds clamp
- Player publishes position every frame for AI
- Showcase pack upgraded from static poses to chasing `ZombieAI` instances (presets + randoms + cornfield spawns)

**Files touched**
- `src/game/constants.ts`
- `src/game/playerState.ts`
- `src/zombie/ZombieAI.tsx`
- `src/zombie/index.ts`
- `src/components/Player.tsx`
- `src/components/ZombieShowcase.tsx`
- `PROGRESS.md`

**Notes**
- Player max speed = walk × sprint (`6 × 1.65 ≈ 9.9` u/s); zombie max ≈ `5.94` u/s
- No pathfinding yet — straight-line chase on the ground plane
- No damage / touch kill yet; they stop ~1.15 units away
- Wave spawner still backlog

---

### 2026-07-18 — Standing habit: always update PROGRESS.md

**Type:** Docs / Prompt  
**Prompt / request:** Yes — make updating the progress log a standing habit for ongoing work.  
**Status:** Done

**Changes**
- Added project rule file `AGENTS.md` so agents always append Changelog entries after meaningful work
- Codified when to log, what sections to refresh, and “update PROGRESS before finishing”
- Linked the habit from maintainers’ notes

**Files touched**
- `AGENTS.md`
- `PROGRESS.md`

**Notes**
- Applies to every future session in this repo via Grok project rules
- One entry per user request or ship unit; skip pure Q&A with no code changes

---

### 2026-07-18 — Progress log established

**Type:** Docs  
**Prompt / request:** Create a base file that tracks updates, prompts, and fixes as historical documentation of application progress.  
**Status:** Done

**Changes**
- Added `PROGRESS.md` as the living project history
- Seeded with all work completed in the initial build sessions
- Defined entry template and type conventions

**Files touched**
- `PROGRESS.md`

**Notes**
- Keep newest entries first under Changelog
- Prefer one entry per user request or logical ship unit

---

### 2026-07-18 — Time of day: day / twilight / night

**Type:** Feature  
**Prompt / request:** Toggle environment day, night, twilight with proper lighting and sky assets that update.  
**Status:** Done

**Changes**
- Presets for day, twilight, and night (fog, clear color, ambient/key/fill/hemi lights, sky params, stars)
- `Environment` applies sky, stars, fog, sun/moon key light, point lights (windows / barn), yard lamp, moon mesh
- HUD Sky panel (Day · Twilight · Night) + keyboard **`T`** to cycle
- Default time of day set to **twilight**

**Files touched**
- `src/environment/timeOfDay.ts`
- `src/components/Environment.tsx`
- `src/components/TimeOfDayToggle.tsx`
- `src/components/Game.tsx`
- `src/components/Game.css`

**Notes**
- While pointer-locked, use **`T`**; click UI after **Esc** or from the start menu (panel sits above overlay)
- Smooth crossfade between modes not implemented (instant switch)

---

### 2026-07-18 — Fix: click-to-play menu never dismissed

**Type:** Fix  
**Prompt / request:** Menu doesn’t allow click to play; menu doesn’t go away.  
**Status:** Done

**Changes**
- Root cause: full-screen overlay captured clicks; canvas never received pointer-lock request
- Play click handled on overlay / **Click to play** button
- Requests `requestPointerLock` on the WebGL canvas; fallback dismisses menu if lock is blocked
- Canvas click still re-locks after **Esc**

**Files touched**
- `src/components/Game.tsx`
- `src/components/Player.tsx`
- `src/components/Game.css`

**Notes**
- Pointer lock must run from a user gesture; menu click satisfies that

---

### 2026-07-18 — Modular zombie (one model, many looks)

**Type:** Feature  
**Prompt / request:** Single zombie model that can wear variation of accessories and colors for many looks.  
**Status:** Done

**Changes**
- Base body: head, torso, arms, legs with idle lurch animation
- Color slots: skin, shirt, pants, hair, accent
- Accessory slots: head, face, torso, hand, feet
- Named presets: farmer, mechanic, hillbilly, runner, butcher, barebones
- `randomAppearance(seed)` for deterministic variety
- Showcase lineup placed on the farm near the gate

**Files touched**
- `src/zombie/types.ts`
- `src/zombie/palettes.ts`
- `src/zombie/Accessories.tsx`
- `src/zombie/ZombieModel.tsx`
- `src/zombie/index.ts`
- `src/components/ZombieShowcase.tsx`
- `src/components/FarmMap.tsx`

**Accessory options (reference)**
| Slot | Options |
|------|---------|
| head | none, cap, straw_hat, bandana, hard_hat |
| face | none, eyepatch, scar, jaw_missing |
| torso | none, overalls, vest, apron |
| hand | none, pitchfork, shovel, board |
| feet | boots, bare, mismatched |

---

### 2026-07-18 — Initial prototype: farm map + FPS shell

**Type:** Feature / Prompt  
**Prompt / request:** Create a Call of Duty Zombies clone in Three.js + React for the browser, simple shaded shapes; start with a simple farm map (barn, fence, farm house).  
**Status:** Done (foundation)

**Changes**
- Scaffolded Vite + React + TypeScript
- Installed three, @react-three/fiber, @react-three/drei
- Farm map: ground, barn + silo, farmhouse + porch, perimeter fence + gate
- Props: dirt paths, hay, trees, cornfields, trough, outhouse
- First-person player: WASD, mouse look, sprint, jump, map bounds
- COD-style HUD stubs (round, points) and click-to-play overlay
- Dusk lighting + fog (later replaced by time-of-day system)

**Files touched**
- Project scaffold (`package.json`, `vite.config.ts`, `index.html`, etc.)
- `src/components/Game.tsx`, `Game.css`, `Player.tsx`, `FarmMap.tsx`
- `src/components/buildings/Barn.tsx`, `Farmhouse.tsx`, `Fence.tsx`
- `src/App.tsx`, `src/main.tsx`, `src/index.css`
- `README.md`

**Notes**
- Art direction: low-poly / shaded primitives, not textured assets
- Combat, AI, and progression left for later milestones

---

## Prompt index (quick lookup)

| Date | User request (summary) | Outcome |
|------|------------------------|---------|
| 2026-07-18 | COD Zombies clone; farm map first | Farm map + FPS shell |
| 2026-07-18 | Modular zombie colors/accessories | `src/zombie/*` + showcase |
| 2026-07-18 | Menu won’t dismiss on click | Pointer lock via overlay |
| 2026-07-18 | Day / night / twilight environment | TOD system + HUD + `T` |
| 2026-07-18 | Progress log for history | This file |
| 2026-07-18 | Make progress logging a standing habit | `AGENTS.md` + this entry |
| 2026-07-18 | Zombie AI chase; 60% max speed; 0.2s lag | `ZombieAI` + `playerState` |
| 2026-07-18 | Collision for all game assets | `collision*` + player/zombie move |
| 2026-07-18 | Menu config: max zombies, speeds | Settings panel + `gameSettings` |
| 2026-07-18 | Weapons, ammo HUD, shoot/reload anims | `src/weapons/*` + WeaponHud |
| 2026-07-18 | Remap keys in options menu | `keybindings` + KeybindSettings |
| 2026-07-18 | Toggle 1st / 3rd person camera | `cameraMode` + PlayerAvatar |
| 2026-07-18 | See selected weapon like FPS (Doom/GTA) | FPS viewmodel + TPS hand gun |
| 2026-07-18 | Weapon/attack anims not visible | Camera-follow viewmodel + stronger anims |
| 2026-07-18 | Weapon anims from lever-action DB video | Keyframed clips + lever phase |
| 2026-07-18 | Pitchfork anim from Half Sword / Blood shorts | Eye-thrust keyframes + TPS arms |
| 2026-07-18 | Hit markers + limb destruction | Decals + dismemberment / gibs |
| 2026-07-18 | Flesh hits stick to moving zombies | Local-space attach + root matrix |
| 2026-07-18 | Pitchfork pull-stab on crosshair | Tip-at-origin mesh + center-line anim |
| 2026-07-18 | Chest damage / HP feedback | Full torso DMG + numbers + HP bar |
| 2026-07-18 | Empty gun fire auto-reloads | tryFire → tryReload when reserve > 0 |
| 2026-07-18 | Crawling zombies unhittable | Crawl-height limb hitboxes |
| 2026-07-18 | Player push zombies 50/50 mass | Soft contact + shove aside |
| 2026-07-18 | Level to ground + multi-height ready | `ground.ts` sampler + foot fix |
| 2026-07-18 | Death/gibs clip through ground | Lift corpse + ground-clamped gibs |
| 2026-07-18 | Match 3rd-person weapon anims to FPS | Shared clip sampling → TPS arms |

---

## Open ideas / backlog

Track possible next work here; promote to a Changelog entry when done.

- [x] Zombie AI (chase player, 60% speed, 0.2s lag)
- [x] Collision for map assets + player/zombies
- [x] Menu settings (max zombies, speeds)
- [x] Weapons (fist, pitchfork, shotguns, .22) + HUD + anims
- [x] Remappable keys in options menu
- [x] First / third person camera toggle
- [x] Visible equipped weapon in FPS + TPS
- [ ] Wave spawner from cornfield / outside fence
- [ ] Camera collision vs buildings in third person
- [ ] Weapon sounds / shell casings
- [ ] Zombie pathfinding / obstacle avoidance
- [ ] Touch damage / downed state when zombies reach player
- [ ] Hit-scan weapon + ammo HUD
- [ ] Building / prop collision for player
- [ ] Buyable doors / barriers + points
- [ ] Mystery box (farm-themed)
- [ ] Smooth TOD transitions (lerp lights/fog)
- [ ] More zombie accessories (backpack, blood decals)
- [ ] Sound bed (ambience per TOD, zombie groans)

---

## Maintainers’ notes

1. **Standing habit:** after meaningful work, update this file **before** finishing (enforced for agents via `AGENTS.md`).
2. **One source of narrative truth** for “what happened when” — keep commits focused; link PR/commit hashes in Notes when useful.
3. **Do not delete** old Changelog entries; correct in place only for factual errors.
4. **Prompt fidelity:** quote or paraphrase the user request so future you knows *why* a change landed.
5. **Status honesty:** use Partial/Blocked if something shipped incomplete.
