# Grand Theft Horse

GTA, but with horses. An open-world Midtown Manhattan browser game: steal the oats, lose the mounted police, get back to the Times Square stable.

Play: [gth.max.horse](https://gth.max.horse)

This is the playable source. GitHub: https://github.com/maxfarago/grand-theft-horse. Feature work goes on a branch. A PR is required to merge to `master`. Cloudflare Pages preview-deploys every branch; merging to `master` deploys production. The Pages project is `grand-theft-horse`.

## Run locally

Use Node.js 20.6 or newer:

```sh
npm run dev
```

Open the local address printed in the terminal. No `npm install` or build step is needed. If the default port is occupied, use `npm run dev -- --port 4174`. Edit files inside `web/`, then refresh the browser.

The game needs a browser with WebGL2 and hardware acceleration. Serve it over HTTP; opening `index.html` directly as a file will not load its modules and map correctly. Google Fonts is the only optional external request.

## Controls

| Control | Action |
| --- | --- |
| W / Up | Move forward |
| S / Down | Brake, then reverse |
| A / D or Left / Right | Turn |
| Shift while moving | Faster gallop (uses horsage) |
| Space | Jump |
| E | Steal, deliver, or kick a parked car |
| Drag the scene | Look around |
| C | Cycle chase, close, and front cameras |
| M | Map |
| R | Snap to a nearby street, or surrender if wanted |
| Esc | Pause |

Touch controls appear on devices with a coarse pointer. Sound starts off.

## What is implemented

- Midtown coverage approximately from Flatiron to southern Central Park, about 3 × 3.9 km, from OpenStreetMap.
- Three jobs on that map: **The Oat Job** (Grand Central), **Unstable Cargo** (Flatiron), **The Mane Event** (Columbus Circle). Pickup → wanted chase → deliver at Times Square.
- Wanted stars, horsage, health, money, mounted police, line-of-sight escape, busted/surrender.
- Procedural façades, parked cars, a minimap, and landmark discovery. After the jobs, the city is free roam.
- Local audio synthesis for hoofbeats and quiet ambient sound.

`Grand Theft Horse.html` is the original Los Santhos grid prototype. The Midtown game takes its mission loop, HUD, and wanted rules. It does not use that toy city.

This is not a photorealistic reconstruction. Vehicles are stationary except the cops. There are no pedestrians, interiors, saved games, multiplayer, terrain elevation or live map streaming.

## Source map

| Path | Purpose |
| --- | --- |
| `web/index.html` | Game screens and HUD |
| `web/style.css` | HUD, menus and responsive styling |
| `web/game.js` | Scene, horse, cameras, markers, audio and UI |
| `web/city.js` | Map-driven geometry, chunks, props and collision |
| `web/simulation.js` | Horse movement, jumping and stamina |
| `web/missions.js` | Jobs, wanted level, interact and busted rules |
| `web/police.js` | Mounted cops, line of sight, chase reinforce |
| `web/spatial.js` | Coordinate conversion, spatial lookup and landmarks |
| `web/assets/manhattan.json` | Included map extract and license metadata |
| `web/assets/horse.glb` | Galloping horse model |
| `web/vendor/` | Three.js r170, GLTFLoader and geometry helper |
| `Grand Theft Horse.html` | Original Los Santhos prototype (reference) |
| `scripts/serve.mjs` | Local development server |
| `scripts/check-world.mjs` | CPU geometry, movement and mission checks |
| `wrangler.toml` | Cloudflare Pages project name and `web/` output dir |
| `docs/` | Map provenance and horse asset notes |

`web/` is authored source, not generated output. There is no framework, bundler, backend, account system or deployment dependency.

## Checks and verification limits

```sh
npm run check
npm test
```

The source checks cover JavaScript syntax, local HTML references, map presence and the GLB header. The world checks construct city geometry with a stubbed canvas, verify coordinate round trips, safe spawns at eight landmarks and three job drops, short movement and collision runs, jump landing, a pickup interact, and a cop step.

These are CPU checks. Browser rendering, GPU shader compilation, horse animation appearance, DOM interactions, audio, touch controls and frame rates need a real browser.

Discovery state and wanted progress are in memory and reset on reload.

## Asset terms

**The bundled horse requires noncommercial use.** It is Mirada's horse from ROME — 3 Dreams of Black, distributed by Three.js under **CC BY-NC-SA 3.0**. Keep the attribution and the same license for that asset adaptation. Replace the horse with an appropriately licensed asset before commercial use. See `docs/horse-attribution.txt` and `web/credits.html`.

Map data is © OpenStreetMap contributors under **ODbL 1.0**. Preserve the map attribution and license information. Three.js is MIT licensed; its license is included in `web/vendor/THREE-LICENSE.txt`.
