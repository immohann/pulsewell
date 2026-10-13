# Pulsewell

**Recovery, strain and sleep, computed on your device. No subscription, no special hardware.**
A private, local-first performance tracker that works with the data you already have: an Apple Watch or iPhone (Apple Health export), any other device that can export a CSV, a cheap Bluetooth heart-rate strap, or manual entry.

**Live app: https://pulsewell-tau.vercel.app**

Pulsewell turns heart rate, heart-rate variability (HRV) and sleep into three daily numbers:

* **Recovery** (1–99%, green / yellow / red): how ready your body is
* **Strain** (0–21): how hard you've worked your cardiovascular system
* **Sleep** (% of need): how well you slept against what your body asked for

## Features

| | |
|---|---|
| **Today** | Three rings, strain target, what shaped your recovery, vitals, activity, stress and journal at a glance |
| **Sleep** | Performance, stages, efficiency, consistency, need breakdown, **Sleep Planner** (bedtime for your wake time and goal) |
| **Strain** | Day strain, workouts with zone breakdown, manual entry, heart-rate zones, 14-day history |
| **Stress** | Hourly 0–3 stress from heart rate and HRV, guided **breathwork** (resonant, box, 4-7-8) |
| **Trends** | 7 / 30 / 90-day charts vs the previous period for recovery, HRV, resting HR, sleep, strain, respiration, steps |
| **Journal** | Log habits; see each habit's effect on next-day recovery |
| **Weekly plan** | Goals with live progress, streaks and milestones |
| **Health** | Healthspan / pace-of-aging estimate, VO₂ max estimate, printable **health monitor** report |
| **Coach** | Ask questions about your own data. Answered on-device, rule-based |
| **Live strap** | Connect any Bluetooth heart-rate monitor (including a WHOOP strap with HR Broadcast on): record workouts live, or take a 2-minute morning HRV/RHR reading |
| **Import data** | Apple Health `export.zip` (read in your browser, never uploaded), any CSV, or optionally a WHOOP account |
| **Settings** | Profile, cycle tracking, JSON export/import, demo data |

Installable as a PWA. Works offline after first load.

## Privacy

All data is stored in your browser's `localStorage`. There are no analytics. Export a JSON backup from Settings at any time.

If you connect a WHOOP account, a small stateless server function on this deployment holds your WHOOP client secret and talks to WHOOP's API for you. Your WHOOP tokens live in `httpOnly` cookies in your browser, and the fetched data is returned straight to your browser. The server stores nothing.

## Bring your own data (no subscription needed)

Open **Import data** (in the app's menu).

**Apple Health (iPhone / Apple Watch).** In the Health app tap your picture → **Export All Health Data**, then choose the resulting `export.zip` (or `export.xml`) in Pulsewell. It is streamed and parsed inside your browser, so multi-hundred-MB exports work and nothing is uploaded. You get sleep stages, HRV, resting heart rate, respiration, SpO₂, steps, all-day heart rate (which drives Strain and the hourly Stress chart) and workouts scored from the heart rate recorded during them. With an iPhone alone you get steps and sleep estimates. Apple records HRV as SDNN; Pulsewell compares it only with your own baseline.

**CSV (Garmin, Fitbit, Oura, Samsung, spreadsheets).** One row per day with any of `date, sleep_start, sleep_end, awake_min, deep_min, rem_min, hrv, rhr, resp, spo2, steps, nap_min`. The page offers a template.

**Heart-rate strap.** Any Bluetooth chest strap or armband (roughly $25–50) records live workouts and a 2-minute morning HRV reading on the **Live strap** page.

## Optional: a WHOOP account

Only useful if you have an **active WHOOP membership** (WHOOP's developer API requires one). With one, Pulsewell can import your real data through WHOOP's official API.

**1. Import your WHOOP history (official developer API, read-only).** WHOOP requires every app to be registered, so deploying your own copy needs a one-time setup:

1. Sign in at [developer-dashboard.whoop.com](https://developer-dashboard.whoop.com) and create an app.
2. Add the redirect URI `https://<your-domain>/api/whoop/callback` (Settings in Pulsewell shows the exact value to copy).
3. Enable scopes `offline read:profile read:body_measurement read:cycles read:recovery read:sleep read:workout`.
4. Set the credentials on the server:

   ```bash
   vercel env add WHOOP_CLIENT_ID production
   vercel env add WHOOP_CLIENT_SECRET production
   vercel deploy --prod
   ```

   For local development copy `.env.example` to `.env.local`. Setting `WHOOP_MOCK=1` there serves a fake account so you can try the sync UI without credentials (never active in production).

Then open **Import data → Connect WHOOP**. Pulsewell imports sleep stages, HRV, resting heart rate, respiration, SpO₂, recovery, strain, workouts with heart-rate zones, and your body measurements, and refreshes the last week every time you open the app. WHOOP's own recovery, strain and sleep scores are shown next to Pulsewell's.

**2. Live heart rate from the strap.** In the WHOOP app go to Device Settings and turn on **HR Broadcast**. The strap then appears on Pulsewell's **Live strap** page as a standard Bluetooth heart-rate monitor (Chrome or Edge on desktop or Android). It broadcasts to one device at a time.

WHOOP's API provides summaries, not raw second-by-second heart rate, so days imported from WHOOP have no hourly Stress chart. Strain for those days uses WHOOP's all-day figure.

## Heart-rate hardware

Pulsewell uses the standard **Bluetooth Heart Rate Service** through Web Bluetooth. It works with chest straps, armbands and many watches that broadcast heart rate, in Chrome / Edge / Opera on desktop and Android. iPhone Safari does not support Web Bluetooth. You can always enter readings by hand or try the built-in simulated strap.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
npm test         # unit tests for the WHOOP data mapping
```

Requires Node.js 20.9+ (Node 22 or 24 recommended).

## Project layout

```
app/            Next.js App Router pages (client-side, static)
components/     UI primitives, shell/navigation, onboarding, breathwork
lib/engine.ts   Scoring: recovery, strain, sleep need/plan, stress, healthspan, journal impacts
lib/demo.ts     Seeded synthetic data generator
lib/ble.ts      Web Bluetooth heart-rate parsing + RMSSD
lib/applehealth.ts  Streaming Apple Health parser (tested)
lib/healthfile.ts   Reads export.zip/xml in chunks (fflate)
lib/csvimport.ts    Generic daily CSV importer (tested)
lib/whoop-*.ts  WHOOP API: pure mapping (tested), OAuth + fetch (server-only), dev mock
app/api/whoop/  OAuth login/callback, sync proxy, status, disconnect
lib/coach.ts    On-device rule-based coach
lib/store.tsx   localStorage-backed state
docs/RESEARCH.md  Living research + design document
```

## How the scores work

See [docs/RESEARCH.md](docs/RESEARCH.md) for the models, references and limitations. In short: Recovery compares today's HRV, resting HR, sleep and respiration with *your own* 30-day baseline; Strain is a zone-weighted heart-rate load mapped onto 0–21; Sleep need is a baseline plus the previous day's strain and recent sleep debt.

## Disclaimer

Pulsewell is an independent, open-source project. It is **not affiliated with, endorsed by, or derived from any wearable company's code or assets**. Product ideas in the recovery-tracking category (daily readiness, strain scales, sleep planning, habit journals) are common; this implementation, name, design and models are original. Scores are wellness estimates built from published sports-science methods. They are not medical advice and not clinically validated. See a professional if something feels wrong.

## License

MIT. See [LICENSE](LICENSE).
