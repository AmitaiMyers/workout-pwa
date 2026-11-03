# Workout Log (PWA)

A gym workout logger that installs on your phone and works offline. You build a session as you train (or start from a template), log sets, and review history, records and progress afterwards. Every built-in movement has its own looping animation.

All data stays on your device (IndexedDB). There is no account and no server.

## Features

- **Live workouts**: start an empty session or a template, add exercises, and reorder or remove them. The in-progress workout is saved continuously, so closing the app loses nothing. The workout screen is a focused mode: the tab bar is hidden, a progress bar and per-exercise set counts show how far along you are, and the screen stays awake between sets (on browsers that support it).
- **Set logging**: weight × reps, reps only, time, or distance + time, depending on the exercise. Each set can also have an RPE (tap 6 to 10), a note and a warm-up flag, and its weight can be changed with −/+ 2.5 kg buttons.
- **Previous values**: each set shows what you did last time, and new sets are prefilled from it.
- **Rest timer**: starts automatically when you tick a set done. The default rest time is per exercise and can be changed. Buttons for −15 s, +15 s and skip. Beeps when done, and vibrates on Android.
- **Exercise library**: 39 built-in exercises across chest, back, legs, shoulders, arms, core and cardio. Each has an original SVG stick-figure animation and form cues. Filter by muscle or equipment, and add your own custom exercises.
- **Demo videos**: every built-in exercise links a YouTube demo, from CrossFit's channel where one exists. Videos play muted and looping, like a GIF, through YouTube's privacy-enhanced embed. They are never downloaded. On an exercise's page you can paste any YouTube link to change the video, remove it, or reset it to the default. During a workout, tap an exercise's thumbnail or name to watch the demo without leaving the workout. Offline, the stick-figure animation shows instead.
- **History**: workout detail (duration, sets, volume) with edit and delete. You can save any workout as a template.
- **Personal records**: estimated 1RM, heaviest weight, most reps, longest hold, longest distance and best pace. New PRs are highlighted when you finish a workout.
- **Progress charts**: per-exercise trend for each metric.
- **Calendar**: month view of completed (green), planned (orange) and missed (red) workouts. Plan a template on any future day and start it from the calendar or the home screen.
- **Diet**: log what you eat in Breakfast / Lunch / Dinner / Snacks and see calories, protein, carbs and fat against your daily targets.
  - **About 400 built-in foods**, searchable in English or Hebrew, with common servings. They come from USDA FoodData Central and work offline.
  - **Online search and barcode scanning** of brand-name products via Open Food Facts. Android Chrome scans natively; iPhone uses a bundled scanner that loads on first use. A product that isn't found can be saved as your own food from its label, and then it's found instantly, even offline.
  - **Quick add** of plain calories (e.g. a restaurant meal), **recent and favourite** foods, **saved meals** (a group of foods logged with one tap) and **recipes** (ingredients split into portions).
  - **Targets from your profile**: Mifflin-St Jeor × activity, adjusted for a weekly lose/gain pace, with a safety floor. Protein defaults to 2 g/kg, fat to 25% of calories, carbs the rest. Any value can be overridden.
  - **Body-weight log** with a trend chart; the latest weight updates your targets.
  - **Home** shows today's calories and protein. The **calendar** marks food days as on target (±10%), over or under. **Trends** charts the last 7 or 28 days.
  - An estimate of calories burned in workouts is shown for information only, and isn't added to your budget.
- **Share templates**: on Templates, ⤒ shares one template as a small file (WhatsApp, email, AirDrop), and "Export all" shares every template. A friend taps **Import** on their Templates page and picks the file. They see a preview, can rename anything that clashes with their own templates, and custom exercises used by the template are added for them. A file is used instead of a link because on iPhone a home-screen app keeps its data separate from Safari.
- **Backup**: export all data (workouts and diet) to a file, and restore it on the same or a new phone (restoring replaces what's on the phone). Find it in Settings (⚙ on Home).

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

## Data sources

- Built-in foods: [USDA FoodData Central](https://fdc.nal.usda.gov/), SR Legacy (public domain, CC0). See `scripts/food-data/` to regenerate.
- Online products: [Open Food Facts](https://world.openfoodfacts.org/), © Open Food Facts contributors, [ODbL](https://opendatacommons.org/licenses/odbl/1-0/). The app stays under its request limits.
- Demo videos: embedded from YouTube; they belong to their creators.

## Project structure

```
src/
  animation/   stick-figure kinematics (angles + 2-bone IK), animation library, SVG renderer
  domain/      types, exercise catalog, stats/records, workout factory, dates, formatting
  domain/nutrition/  food types, built-in food data, portion maths, targets, log helpers, Open Food Facts client
  storage/     IndexedDB access (idb) and React query hooks
  state/       active-workout context (persisted session + rest timer), alerts
  components/  workout editor, exercise picker, chart, modal, inputs, navigation
  pages/       one component per screen
```

## Known limitations

- The rest-timer alert only fires while the app is open. Web apps can't run timers in the background on iOS without a push server.
- Demo videos need a connection and depend on the uploader keeping the video public and embeddable. If one shows "Video unavailable", change the link on that exercise's page.
- Data lives only on this device. Clearing the browser or site data deletes it, so export a backup now and then.
- Calorie targets and workout burn are estimates from standard formulas, not medical advice.
- The calendar and trends compare past days against today's targets.
