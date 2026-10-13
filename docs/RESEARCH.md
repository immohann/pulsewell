# Pulsewell research log (living document)

> **Status:** v0.1 · last updated 2026-10-12
> This file records what we learned about the category-defining "strap + app" recovery products, how we learned it, and what Pulsewell does about it. It is updated whenever the research or the feature set changes.

## 1. Ground rules (clean-room policy)

Pulsewell is an **original product**. It borrows *ideas* (a daily recovery number, a 0–21 strain scale, sleep planning, a habit journal) that are common to the whole category and are not protectable. It does **not** reuse anyone's code, assets, copy, name, branding, API or servers.

| We do | We do not |
|---|---|
| Describe observable behavior and public metric definitions | Copy decompiled code, algorithms line-by-line, strings, layouts or images |
| Re-implement from published sports-science formulas (Edwards TRIMP, Keytel energy expenditure, Tanaka max HR, Uth VO₂max, RMSSD) | Call any vendor backend or private API, or ship vendor credentials |
| Use our own name, palette, icon and wording | Use the vendor's name, logo, or imply affiliation |
| Keep all user data on the user's device | Upload data anywhere |

Static analysis was performed on a lawfully obtained public app package for **interoperability and feature-mapping research only**. Nothing from the package is redistributed in this repository.

## 2. Method

| # | Step | Tool | Result |
|---|---|---|---|
| 1 | Read public product pages, store listings and the vendor's developer API docs | web search | Metric definitions (see §4) |
| 2 | Obtain the Android package | APKMirror bundle `whoop.apkm` (SHA-256 `b461f19d97a046f8e52432a3321763d413cb87997c5f7a58a7e823af86521acc`) | `com.whoop.android` 5.450.1, version code 472537, min SDK 28, target SDK 35 |
| 3 | Unpack `base.apk` | `unzip` | `base.apk` SHA-256 `68f730b194769ea2b666ad418f028d893eaa958cb4cf714c5b7636c6fab90092` |
| 4 | Static analysis, no execution | [REA](https://github.com/morluto/rea) 6.4.0 + `jadx-headless-mcp` 0.7.1 (SHA-256 `6e5eacf5…ff75`, verified against REA's pinned hash) | 40,350 classes, 4,663 resources; REA evidence `ev_3e1277ab…c0bc` |
| 5 | Inventory feature packages and the on-device model's data shape | `rea search-android-classes`, `rea inspect-android-class` | §3 and §5 |

Reproduce:

```bash
npm i -g rea-agents
export REA_JADX_MCP_JAR=/path/to/jadx-headless-mcp-0.7.1-all.jar
rea inspect-android-package /path/to/base.apk
rea search-android-classes /path/to/base.apk "com.whoop.analytics"
```

**Legend.** *Observed* = directly returned by the tool. *Inferred* = a reasonable reading of names, not confirmed by execution. Static analysis never shows runtime behavior.

## 3. What the app is made of (observed)

* **Server-driven UI.** The Home screen is fed by a "backend-for-frontend" response (`HomeBffFeedResponse`) and ~1,400 design-system model classes (`design.models.*`, `design.atomic.*`). Most scores and layouts are computed and composed server-side. *Inference:* a client cannot reproduce the exact scores without that backend, so Pulsewell computes its own.
* **142 top-level feature packages.** The largest by class count: `design` (1,415), `data` (486), `navigation` (300), `hormonalinsights` (262), `advancedlabs` (261), `weeklyplan` (259), `profile` (230), `membership` (211), `activation` (175), `service` (155), `weightlifting` (154), `bot` (153), `whooplabs` (131).
* **Permissions (observed):** Bluetooth scan/connect, companion-device presence, foreground services (connected device, location), location incl. background, camera, microphone, biometrics, notifications, and about 40 Health Connect read/write permissions (heart rate, resting HR, respiratory rate, SpO₂, sleep, steps, VO₂ max, weight, body fat, temperature, blood pressure, glucose, nutrition, menstruation and more).
* **Local storage:** a Room database (`data.local.room`) for offline data.
* **Integrations:** Strava (`strava`), Health Connect (`healthconnect`), OAuth partner integrations (`oauthintegration`, `integrations`).
* **Device layer:** BLE (`ble`, `connectivityCore`, `connectivityDataPackets`), pairing, strap history sync (`straphistorysync`), firmware update service, live broadcast (`whooplive`).

## 4. Feature inventory and Pulsewell status

| Feature (public name) | Evidence (package) | Pulsewell | Notes |
|---|---|---|---|
| **Recovery** 1–99%, green/yellow/red from HRV, resting HR, sleep, respiratory rate | public docs; `recoveryimpacts`, `home` | ✅ Done | Own model: weighted z-scores vs personal 30-day baseline → logistic 1–99 |
| **Strain** 0–21 | `analytics.strain.model` (see §5) | ✅ Done | Own model: zone-weighted load → saturating log-style curve |
| **Strain Target** from recovery | public docs | ✅ Done | Restore / Balanced / Push ranges |
| **Sleep performance, need, stages, consistency** | `sleep`, `lastnightsleep`, `sleep.coach` (`NeedBreakdown`) | ✅ Done | Need = baseline + strain + debt − naps |
| **Sleep Planner / goals** (peak, perform, get by) | `sleep.coach` (`SleepGoalType`) | ✅ Done | Plan bedtime from wake time and goal |
| Smart alarm / alarm schedules | `sleep.coach` (`AlarmSchedule*`, `WakeMode`) | ⛔ Not planned | A web app cannot ring reliably in the background; needs native |
| **Stress Monitor** 0–3 + breathing interventions | `stress` (`StressIntervention`, `BreathType`) | ✅ Done | Hourly stress from HR vs resting HR and HRV; 3 guided patterns |
| **Healthspan / Pace of Aging** | `healthspan` (contributors, labs impacts) | ✅ Done (simplified) | Six contributors → biological-age estimate. Wellness estimate only |
| **Journal + behavior impacts** | `journal`, `journalhometile`, `recoveryimpacts` | ✅ Done | Next-day recovery with vs without each behavior |
| **Weekly Plan** (goals, progress) | `weeklyplan` (`hubandspoke`, `customizeplan`) | ✅ Done | Six goal types, progress bars |
| **Trends** (7/30/90 days, vs previous period) | `trends` | ✅ Done | |
| Manual measurements | `trends` (`ManualMeasurement*`) | ✅ Done | Manual log of sleep, HRV, RHR, SpO₂, steps |
| **Health Monitor** (shareable PDF) | `health.monitor`, `healthmonitor` | ✅ Done | Print / save as PDF |
| **Cardio fitness / VO₂ max** | `trends` (`CardioFitnessLevel`) | ✅ Done (estimate) | Uth formula |
| **Heart-rate zones** | `hrZones` | ✅ Done | |
| **Live HR + workout recording** | `whooplive`, `startactivity`, `addactivity` | ✅ Done | Standard BLE Heart Rate Service via Web Bluetooth |
| Streaks & achievements | `streaks`, `achievements`, `milestonepill` | ✅ Done | Six local streaks/milestones |
| **AI coach** (conversational) | `bot`, `ai.chat`, `coacheverywhere`, `aiinsights` | 🟡 Partial | Rule-based coach on device; LLM coach is a roadmap item (needs a key/backend) |
| **Cycle / hormonal insights** | `hormonalinsights` (menstrual, pregnancy, postpartum) | 🟡 Partial | Period logging + phase; pregnancy/postpartum not included |
| Weightlifting tracker | `weightlifting` | ⏳ Roadmap | Exercise library, sets/reps, records |
| Personal records | `personalrecords` | ⏳ Roadmap | |
| Health Connect / Apple Health import | `healthconnect` | ⏳ Roadmap | Needs a native shell or file import (Apple Health `export.xml`) |
| Strava integration | `strava` | ⏳ Roadmap | OAuth needs a server component |
| Data export | `memberdataexport` | ✅ Done | JSON export/import |
| Widgets | `widget` | ⏳ Roadmap | Needs native |
| Teams, community, challenges, referrals, gifting | `community`, `domain.model.teams`, `challengedetails`, `referafriend`, `gifting` | ⛔ Not planned | Social graph requires a backend and moderation |
| Advanced Labs (blood tests), clinician-in-the-loop | `advancedlabs`, `clinicianintheloop` | ⛔ Not planned | Regulated, clinical partners required |
| Membership, payments, checkout, entitlements | `membership`, `payments`, `universalcheckout`, `entitlements` | ⛔ Not applicable | Pulsewell is free and local |
| Proprietary strap sensing, firmware, history sync | `ble`, `firmwareUpdateService`, `straphistorysync` | ⛔ Not possible | Proprietary encrypted hardware protocol. Pulsewell uses standard BLE HR devices instead |

## 5. The on-device strain model (observed interface only)

`com.whoop.analytics.strain.model` exposes a **data shape**, not an algorithm we reuse:

* **Inputs:** heart-rate samples with timestamps; a `UserProfile` with biological sex, birthday, height, weight, max HR, resting HR and a fitness level (`inactive`, `recreational_enthusiast`, `serious_enthusiast`, `collegiate`, `professional`, `tactical`); accelerometer carry-over state.
* **Outputs:** `StrainScore` (raw, scaled and projected score, average/max HR, kilojoules), `Calories` (kJ and kcal), a smoothing result and a workout burn rate.

Pulsewell takes the *interface idea* (HR + profile + fitness level → score + energy) and fills it with an independent, documented implementation:

* Zones are fractions of max HR (50/60/70/80/90%).
* Load is the Edwards TRIMP: Σ minutes-in-zone × zone number.
* Strain = `21 × (1 − e^(−load / L))`, with `L` depending on fitness level (150 inactive → 275 professional). Early load moves the score fast; high scores are progressively harder, which gives the familiar logarithmic feel.
* Energy uses Keytel et al. (2005); resting energy uses Harris–Benedict (revised).
* Everyday movement adds a small step-based load so a quiet day is never zero.

## 6. Pulsewell's own models

| Metric | Model |
|---|---|
| Recovery | `z_hrv` (log-RMSSD vs 30-day mean), `z_rhr` (inverted), `z_sleep` ((perf−85)/15), `z_resp` (inverted). Weights 0.50 / 0.22 / 0.22 / 0.06. Score = `100 × σ(0.35 + 1.15 × Σ)`, clamped 1–99. Green ≥ 67, yellow 34–66, red < 34. Falls back to age norms until 5+ baseline days exist |
| Sleep need | 7.75 h baseline + 0.045 h per strain point above 8 + 30% of last night's shortfall (max 1 h) − 50% of naps, clamped 6.5–10.5 h |
| Sleep performance | hours asleep ÷ need, capped at 100% |
| Consistency | 100 − 0.55 × mean σ of bed and wake times over 7 days (circular-aware) |
| Strain target | recovery ≥ 67 → 14–18; 34–66 → 10–14; < 34 → 4–10 |
| Stress (0–3) | `(hourly HR − resting HR) / 18 × (1 + HRV deficit)`, clamped; workout hours excluded |
| Healthspan | six 0–100 contributors → mean → ±8 years around chronological age; pace = `1 − (score − 60)/100` |
| Journal impact | mean next-day recovery with vs without a behavior, needs ≥ 3 days each |

All of these are **wellness estimates**, not medical results, and are explained in-app.

## 7. Known limitations

* No proprietary strap data. Heart rate comes from any standard BLE HR monitor (Chrome/Edge/Android) or manual entry.
* iOS Safari has no Web Bluetooth, so live recording is unavailable on iPhone browsers.
* Data lives in browser storage. Clearing site data erases it. Use Settings → Export.
* Scores are not clinically validated and will not match any other product's numbers.

## 8. Roadmap

1. Apple Health `export.xml` and Health Connect CSV import
2. Weightlifting log and personal records
3. Optional LLM coach (bring-your-own key, calls from the browser)
4. Native shell (Capacitor) for HealthKit / Health Connect and background BLE
5. Optional end-to-end encrypted sync
6. Accessibility audit and localization

## 9. Changelog

| Date | Change |
|---|---|
| 2026-10-12 | Research complete (public docs + static APK analysis). v0.1 shipped: Today, Sleep, Strain, Stress, Trends, Journal, Weekly Plan, Health, Coach, Live strap, Settings, PWA manifest |
