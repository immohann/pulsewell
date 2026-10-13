import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWhoop, dateInOffset, prettySport } from "../lib/whoop-map.ts";

const MIN = 60000;
const raw = {
  profile: { first_name: "Alex" },
  body: { height_meter: 1.78, weight_kilogram: 74.2, max_heart_rate: 192 },
  sleeps: [
    {
      id: "sleep-1", start: "2026-10-12T04:10:00Z", end: "2026-10-12T12:05:00Z", timezone_offset: "-05:00", nap: false, score_state: "SCORED",
      score: { respiratory_rate: 14.6, sleep_performance_percentage: 91, stage_summary: { total_awake_time_milli: 40 * MIN, total_light_sleep_time_milli: 250 * MIN, total_slow_wave_sleep_time_milli: 80 * MIN, total_rem_sleep_time_milli: 105 * MIN, disturbance_count: 4 } },
    },
    {
      id: "nap-1", start: "2026-10-12T19:00:00Z", end: "2026-10-12T19:30:00Z", timezone_offset: "-05:00", nap: true, score_state: "SCORED",
      score: { stage_summary: { total_light_sleep_time_milli: 25 * MIN } },
    },
    { id: "unscored", start: "2026-10-11T04:00:00Z", end: "2026-10-11T11:00:00Z", timezone_offset: "-05:00", score_state: "PENDING_SCORE" },
  ],
  recoveries: [
    { cycle_id: 9, sleep_id: "sleep-1", score_state: "SCORED", score: { recovery_score: 72.4, resting_heart_rate: 53, hrv_rmssd_milli: 68.7, spo2_percentage: 96.4, skin_temp_celsius: 33.4 } },
    { cycle_id: 8, sleep_id: "missing", score_state: "SCORED", score: { recovery_score: 40 } },
  ],
  cycles: [{ id: 9, start: "2026-10-12T12:05:00Z", timezone_offset: "-05:00", score_state: "SCORED", score: { strain: 11.26, kilojoule: 9500.4, average_heart_rate: 71, max_heart_rate: 165 } }],
  workouts: [
    {
      id: "w1", start: "2026-10-12T22:30:00Z", end: "2026-10-12T23:15:00Z", timezone_offset: "-05:00", sport_name: "running", score_state: "SCORED",
      score: { strain: 10.8, average_heart_rate: 151, max_heart_rate: 178, kilojoule: 1672, zone_durations: { zone_zero_milli: 2 * MIN, zone_one_milli: 3 * MIN, zone_two_milli: 10 * MIN, zone_three_milli: 20 * MIN, zone_four_milli: 8 * MIN, zone_five_milli: 2 * MIN } },
    },
  ],
};

test("dateInOffset applies the user's timezone", () => {
  assert.equal(dateInOffset("2026-10-12T03:00:00Z", "-05:00"), "2026-10-11");
  assert.equal(dateInOffset("2026-10-12T22:00:00Z", "+05:30"), "2026-10-13");
  assert.equal(dateInOffset("2026-10-12T22:00:00Z"), "2026-10-12");
});

test("prettySport", () => {
  assert.equal(prettySport("running"), "Running");
  assert.equal(prettySport("functional-fitness"), "Functional fitness");
  assert.equal(prettySport(), "Workout");
});

test("normalizeWhoop maps a full day", () => {
  const out = normalizeWhoop(raw);
  const d = out.days["2026-10-12"];
  assert.ok(d, "day exists");
  assert.equal(d.hrv, 69);
  assert.equal(d.rhr, 53);
  assert.equal(d.resp, 14.6);
  assert.equal(d.spo2, 96.4);
  assert.equal(d.sleep.awakeMin, 40);
  assert.equal(d.sleep.lightMin, 250);
  assert.equal(d.sleep.swsMin, 80);
  assert.equal(d.sleep.remMin, 105);
  assert.equal(d.sleep.disturbances, 4);
  assert.equal(d.napMin, 25);
  assert.deepEqual(d.whoop, { sleepPerformance: 91, recovery: 72, strain: 11.3, kilojoule: 9500, avgHr: 71, maxHr: 165 });
  assert.equal(out.counts.sleeps, 1);
  assert.equal(out.counts.recoveries, 1);
});

test("unscored and orphan records are ignored", () => {
  const out = normalizeWhoop(raw);
  assert.equal(out.days["2026-10-11"], undefined);
});

test("workout zones, energy and id", () => {
  const [w] = normalizeWhoop(raw).workouts;
  assert.equal(w.id, "whoop-w1");
  assert.equal(w.date, "2026-10-12");
  assert.equal(w.sport, "Running");
  assert.deepEqual(w.zoneMin, [3, 10, 20, 8, 2]);
  assert.equal(w.durationMin, 45);
  assert.equal(w.kcal, 400);
  assert.equal(w.source, "whoop");
});

test("body measurements and name", () => {
  const out = normalizeWhoop(raw);
  assert.deepEqual(out.body, { heightCm: 178, weightKg: 74.2, maxHr: 192 });
  assert.equal(out.firstName, "Alex");
});

test("skin temperature becomes a delta vs the window mean", () => {
  const mk = (id, end) => ({ id, start: end.replace("12:", "04:"), end, timezone_offset: "+00:00", score_state: "SCORED", score: { stage_summary: { total_light_sleep_time_milli: 60 * MIN } } });
  const r = {
    cycles: [], workouts: [],
    sleeps: [mk("a", "2026-10-10T12:00:00Z"), mk("b", "2026-10-11T12:00:00Z"), mk("c", "2026-10-12T12:00:00Z")],
    recoveries: [
      { sleep_id: "a", score_state: "SCORED", score: { skin_temp_celsius: 33.0 } },
      { sleep_id: "b", score_state: "SCORED", score: { skin_temp_celsius: 33.3 } },
      { sleep_id: "c", score_state: "SCORED", score: { skin_temp_celsius: 33.6 } },
    ],
  };
  const out = normalizeWhoop(r);
  assert.equal(out.days["2026-10-10"].skinTempDelta, -0.3);
  assert.equal(out.days["2026-10-12"].skinTempDelta, 0.3);
});

test("empty input is safe", () => {
  const out = normalizeWhoop({ cycles: [], recoveries: [], sleeps: [], workouts: [] });
  assert.equal(out.counts.days, 0);
  assert.equal(out.body, undefined);
});
