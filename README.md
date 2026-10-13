# Pulsewell

**Recovery, strain and sleep, computed on your device.**
A private, local-first performance tracker. No account, no server, no tracking.

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
| **Live strap** | Connect any Bluetooth heart-rate monitor: record workouts live, or take a 2-minute morning HRV/RHR reading |
| **Settings** | Profile, cycle tracking, JSON export/import, demo data |

Installable as a PWA. Works offline after first load.

## Privacy

All data is stored in your browser's `localStorage`. Nothing is sent to any server, and there are no analytics. Export a JSON backup from Settings at any time.

## Heart-rate hardware

Pulsewell uses the standard **Bluetooth Heart Rate Service** through Web Bluetooth. It works with chest straps, armbands and many watches that broadcast heart rate, in Chrome / Edge / Opera on desktop and Android. iPhone Safari does not support Web Bluetooth. You can always enter readings by hand or try the built-in simulated strap.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

Requires Node.js 20.9+ (Node 22 or 24 recommended).

## Project layout

```
app/            Next.js App Router pages (client-side, static)
components/     UI primitives, shell/navigation, onboarding, breathwork
lib/engine.ts   Scoring: recovery, strain, sleep need/plan, stress, healthspan, journal impacts
lib/demo.ts     Seeded synthetic data generator
lib/ble.ts      Web Bluetooth heart-rate parsing + RMSSD
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
