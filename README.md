# Workout Log (PWA)

A gym workout logger that installs on your phone and works offline. You build a session as you train (or start from a template), log sets, and review history, records and progress afterwards. Every built-in movement has its own looping animation.

All data stays on your device (IndexedDB). There is no account and no server.

## Features

- **Live workouts**: start an empty session or a template, add exercises, and reorder or remove them. The in-progress workout is saved continuously, so closing the app loses nothing.
- **Set logging**: weight × reps, reps only, time, or distance + time, depending on the exercise. Each set can also have an RPE (1–10), a note and a warm-up flag.
- **Previous values**: each set shows what you did last time, and new sets are prefilled from it.
- **Rest timer**: starts automatically when you tick a set done. The default rest time is per exercise and can be changed. Buttons for −15 s, +15 s and skip. Beeps when done, and vibrates on Android.
- **Exercise library**: 39 built-in exercises across chest, back, legs, shoulders, arms, core and cardio. Each has an original SVG stick-figure animation and form cues. Filter by muscle or equipment, and add your own custom exercises.
- **Demo videos**: every built-in exercise links a YouTube demo, from CrossFit's channel where one exists. Videos play muted and looping, like a GIF, through YouTube's privacy-enhanced embed. They are never downloaded. On an exercise's page you can paste any YouTube link to change the video, remove it, or reset it to the default. During a workout, tap an exercise's thumbnail or name to watch the demo without leaving the workout. Offline, the stick-figure animation shows instead.
- **History**: workout detail (duration, sets, volume) with edit and delete. You can save any workout as a template.
- **Personal records**: estimated 1RM, heaviest weight, most reps, longest hold, longest distance and best pace. New PRs are highlighted when you finish a workout.
- **Progress charts**: per-exercise trend for each metric.
- **Calendar**: month view of completed (green), planned (orange) and missed (red) workouts. Plan a template on any future day and start it from the calendar or the home screen.

## Development

```bash
npm install
npm run dev        # http://localhost:5173/workout-pwa/
npm test           # unit tests (Vitest)
npm run typecheck
npm run build      # production build in dist/
npm run preview    # serve the production build
```

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` tests, builds and deploys on every push to `main`.

One-time setup: in the GitHub repo go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.

The app is then served at `https://<your-user>.github.io/workout-pwa/`. If you rename the repository, update `BASE_PATH` in `vite.config.ts`.

## Installing on your phone

- **iPhone (Safari)**: open the site, tap **Share → Add to Home Screen**. Always open the app from the home-screen icon: Safari can clear website storage for sites that aren't installed and haven't been used for a while.
- **Android (Chrome)**: open the site and accept **Install app**, or use **⋮ → Install app**.

## Project structure

```
src/
  animation/   stick-figure kinematics (angles + 2-bone IK), animation library, SVG renderer
  domain/      types, exercise catalog, stats/records, workout factory, dates, formatting
  storage/     IndexedDB access (idb) and React query hooks
  state/       active-workout context (persisted session + rest timer), alerts
  components/  workout editor, exercise picker, chart, modal, inputs, navigation
  pages/       one component per screen
```

## Known limitations

- The rest-timer alert only fires while the app is open. Web apps can't run timers in the background on iOS without a push server.
- Demo videos need a connection and depend on the uploader keeping the video public and embeddable. If one shows "Video unavailable", change the link on that exercise's page.
- Data lives only on this device. Clearing the browser or site data deletes it.
