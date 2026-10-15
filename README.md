# NeuroTrace Basecamp

Three calm, storybook-night games for children that measure cognition without ever feeling like a test. Built from the game design document, mobile-first on a fixed 390 × 844 dp reference canvas that scales to any screen.

| # | Game | Task it is built on | What it measures (never shown to the child) |
|---|------|---------------------|---------------------------------------------|
| 1 | **Firefly Watch** | Psychomotor Vigilance Task | median reaction time, lapses, false starts |
| 2 | **Firefly Trail** | Corsi block-tapping (spatial span) | anchor accuracy, span, tap timing |
| 3 | **Night Watch** | Mackworth Clock (vigilance) | hits, misses, false alarms, reaction-time steadiness, per-quarter counts |

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npx tsx scripts/check-forms.ts    # verifies every stored session list against the design rules
npx tsx scripts/check-scoring.ts  # self-checks the scoring engine on synthetic logs
```

Art preview pages (for review only): `/dev/skins`, `/dev/fox`, `/dev/companions`, `/dev/scenes`, `/dev/ui`.

## Screens

- `/` **Welcome** — the public landing page with the download button.
- `/basecamp` **Basecamp** — the home place: the fox, the three games, the collection of rewards, the grown-ups link. First launch redirects to *Choose what you'll catch*. The installed app opens here.
- `/choose-skin` — pick one of six original stimulus skins (firefly, butterfly, friendly pup, comet, glow jelly, star spark).
- `/choose-world` — Night Watch world: Forest Friends (fox, lanterns), Space Voyagers (otter astronaut, beacons), Neon Arcade (neon lynx, windows).
- `/firefly-watch`, `/firefly-trail`, `/night-watch` — the games. Each has Ready → practice → scored play → optional unscored cooldown → All done, plus pause, interruption, and stop-early overlays.
- `/settings` — change skin / world, sound, reduced motion, text size, high contrast, read instructions aloud, gentle pace, delete all data.
- `/grown-ups` — hold-to-enter page with per-game trends against the child's own usual, reliability labels, and per-session delete. The only place numbers appear.

## How the measurement stays honest

- **Fixed lists, never run-time randomness.** Firefly Watch uses three matched 30-wait forms (same wait set, seeded order). Firefly Trail uses three matched anchor forms (3, 3, 4, 4) and a seeded generator for adaptive trails. Night Watch uses three hand-checked 90-glow forms (81 single, 9 double; 2/3/2/2 per quarter; 4–20 glows between doubles; no light twice in a row; no light carries more than two doubles). Forms rotate by session number; the form id and seed are stored with every session. `scripts/check-forms.ts` enforces all of this.
- **Timestamps from the right clocks.** Stimulus onset is the time the frame was actually presented (double `requestAnimationFrame`). Taps use the pointer event's own `timeStamp`, not when handler code ran.
- **Interruptions.** Backgrounding, focus loss, or rotation pauses everything at once. Firefly Watch and Firefly Trail drop the event in flight and give it a new wait. Night Watch marks the glow in flight and the next three as invalid and carries on from the list without restarting.
- **Encrypted local storage.** Sessions, scores, and rewards are AES-GCM encrypted with a non-extractable device key held only in IndexedDB. Nothing leaves the device. Delete one session or everything from the app.
- **Scoring engine** (`src/lib/scoring`) is pure and offline; the trend is ready well inside the 2-second budget. Every measure is labelled *experimental* until test-retest ICC reaches 0.70 and is excluded from any composite.
- **Never:** reaction times, points, ranks, streaks, red marks, green ticks, or the words score / test / wrong / fail / fast / slow / win / lose anywhere the child can see. No flashing above 3 Hz, no red flashes, no sound or text change when a stimulus appears, no difficulty change in scored events, no licensed characters.

## Project layout

```
src/
  app/                  routes (App Router); each page renders one client screen
  components/
    Stage.tsx           390×844 canvas scaled to fit; `At` positions children in dp
    ui/                 buttons, chip, pips, speech bubble, reward card, big circle button, overlay
    art/                all original vector art: scenes, Fox, Otter, Lynx, six skins, stones, lights, rewards
  games/
    firefly-watch/      Game 1 engine + screens
    firefly-trail/      Game 2 engine + screens
    night-watch/        Game 3 engine + screens (three worlds)
    basecamp/ choose/ settings/ grown-ups/
  lib/
    forms/              the stored session lists and timing constants (TUNE values live here)
    scoring/            scoring engine and trend series
    db.ts               encrypted IndexedDB (Dexie + WebCrypto)
    session.ts          finishSession, interruption hook, frame timing, timers
    settings.tsx        settings store (localStorage) and accessibility modes
    audio.ts            synthesised chime and quiet pad; voice instructions
    theme.ts            the palette from the design document
scripts/
  check-forms.ts        validates all stored lists
  check-scoring.ts      scoring engine self-check
  gen-nightwatch-forms.mjs  one-off generator used to produce the Night Watch forms
```

## Tunable constants

Every value marked TUNE in the design doc lives in `src/lib/forms/*.ts` as a named constant (`WATCH_TIMING`, `TRAIL_TIMING`, `NIGHT_WATCH_TIMING`). Change them there, never in a game file.

## Known gaps

- Voice instructions use the device's speech synthesis with the locked script; swap in the recorded clips in `src/lib/audio.ts` when they land.
- The scoring engine is a local stand-in with the same event-log format; point `finishSession` at the real engine when it is ready.
- No service worker yet, so the app needs one online load before it works offline.

## Deploying

The project is a standard Next.js app. Import the GitHub repo into Vercel with the default settings (framework: Next.js, build: `npm run build`); no environment variables are needed. The landing page is `/`, the app is `/basecamp`, and the web manifest installs the app to a phone's home screen from `/`.
