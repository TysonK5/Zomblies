# The Farm — Zombies Prototype

A browser-based Call of Duty Zombies–style prototype built with **React**, **Three.js**, and **@react-three/fiber**. Simple shaded geometry, first-person controls, and a playable farm map.

**Progress history** (features, prompts, fixes): see [`PROGRESS.md`](./PROGRESS.md).

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Click the canvas to lock the mouse and play.

## Controls

| Input | Action |
|-------|--------|
| **W A S D** | Move |
| **Mouse** | Look |
| **Shift** | Sprint |
| **Space** | Jump |
| **Click** | Capture pointer / play |
| **T** | Cycle day / twilight / night |
| **Esc** | Release mouse |

## Map: The Farm

- Red barn + silo
- Two-story farmhouse with porch
- Wooden perimeter fence and open gate
- Dirt paths, hay bales, cornfields, trees, water trough, outhouse
- Day / twilight / night sky + lighting, COD-style HUD (round / points)
- Modular zombies (colors + accessories)

## Stack

- Vite + React + TypeScript
- three / @react-three/fiber / @react-three/drei

## Project layout

```
src/
  components/
    Game.tsx              # Canvas shell, HUD, menu
    Player.tsx            # FPS movement + pointer lock
    FarmMap.tsx           # Ground, props, map assembly
    Environment.tsx       # Time-of-day sky / lights
    buildings/            # Barn, Farmhouse, Fence
  zombie/                 # Modular zombie model
  environment/            # Day / twilight / night presets
PROGRESS.md               # Historical progress log
```

## Next steps (ideas)

See the backlog in [`PROGRESS.md`](./PROGRESS.md). High level:

- Zombie AI and wave spawns from the cornfield
- Simple hit-scan gun + ammo
- Buyable doors / barriers
- Mystery box and points economy
- Collision with buildings
