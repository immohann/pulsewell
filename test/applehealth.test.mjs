import test from "node:test";
import assert from "node:assert/strict";
import { AppleHealthParser, appleEpoch, prettyWorkout } from "../lib/applehealth.ts";

const TZ = "-0500";
const stamp = (d, hh, mm = 0, ss = 0) => `${d} ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")} ${TZ}`;
const rec = (type, value, start, end = start, extra = "") =>
  `<Record type="${type}" sourceName="Watch" sourceVersion="11" unit="x" creationDate="${start}" startDate="${start}" endDate="${end}" value="${value}"${extra}/>`;
const cat = (value, start, end, src = "Watch") =>
  `<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="${src}" creationDate="${start}" startDate="${start}" endDate="${end}" value="HKCategoryValueSleepAnalysis${value}"/>`;

const zoneOf = (hr) => (hr >= 171 ? 5 : hr >= 152 ? 4 : hr >= 133 ? 3 : hr >= 114 ? 2 : hr >= 95 ? 1 : 0);
const mk = () => new AppleHealthParser({ maxHr: 190, today: "2026-10-12", days: 30, zoneOf, kcalPerMin: () => 10, strainFor: () => 9.9 });

function buildXml() {
  const x = [];
  x.push('<?xml version="1.0" encoding="UTF-8"?><HealthData locale="en_US"><ExportDate value="2026-10-12"/>');
  // too old: must be ignored
  x.push(rec("HKQuantityTypeIdentifierRestingHeartRate", 99, stamp("2026-01-01", 8)));
  // resting HR: later reading wins
  x.push(rec("HKQuantityTypeIdentifierRestingHeartRate", 58, stamp("2026-10-12", 6)));
  x.push(rec("HKQuantityTypeIdentifierRestingHeartRate", 54, stamp("2026-10-12", 9)));
  // HRV with a child element (real exports nest beat lists inside Record)
  x.push(`<Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" sourceName="Watch" unit="ms" creationDate="${stamp("2026-10-12", 3)}" startDate="${stamp("2026-10-12", 3)}" endDate="${stamp("2026-10-12", 3)}" value="70"><HeartRateVariabilityMetadataList><InstantaneousBeatsPerMinute bpm="60" time="3:00:00.00 AM"/></HeartRateVariabilityMetadataList></Record>`);
  x.push(rec("HKQuantityTypeIdentifierHeartRateVariabilitySDNN", 50, stamp("2026-10-12", 4)));
  x.push(rec("HKQuantityTypeIdentifierHeartRateVariabilitySDNN", 10, stamp("2026-10-12", 15))); // daytime, ignored when overnight exists
  x.push(rec("HKQuantityTypeIdentifierRespiratoryRate", 14.2, stamp("2026-10-12", 2)));
  x.push(rec("HKQuantityTypeIdentifierRespiratoryRate", 15.0, stamp("2026-10-12", 4)));
  x.push(rec("HKQuantityTypeIdentifierOxygenSaturation", 0.97, stamp("2026-10-12", 3)));
  // steps from two sources overlap: the larger source wins, not the sum
  x.push(`<Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" startDate="${stamp("2026-10-12", 8)}" endDate="${stamp("2026-10-12", 9)}" value="3000"/>`);
  x.push(`<Record type="HKQuantityTypeIdentifierStepCount" sourceName="Watch" unit="count" startDate="${stamp("2026-10-12", 8)}" endDate="${stamp("2026-10-12", 9)}" value="2500"/>`);
  x.push(`<Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" startDate="${stamp("2026-10-12", 12)}" endDate="${stamp("2026-10-12", 13)}" value="4000"/>`);
  // night: 23:00 → 06:30, crossing midnight, with an awake blip
  x.push(cat("InBed", stamp("2026-10-11", 22, 50), stamp("2026-10-12", 6, 40)));
  x.push(cat("AsleepCore", stamp("2026-10-11", 23), stamp("2026-10-12", 1)));
  x.push(cat("AsleepDeep", stamp("2026-10-12", 1), stamp("2026-10-12", 2)));
  x.push(cat("Awake", stamp("2026-10-12", 2), stamp("2026-10-12", 2, 15)));
  x.push(cat("AsleepREM", stamp("2026-10-12", 2, 15), stamp("2026-10-12", 4)));
  x.push(cat("AsleepCore", stamp("2026-10-12", 4), stamp("2026-10-12", 6, 30)));
  // a conflicting phone source for the same night (in-bed only): the staged watch night must win
  x.push(cat("InBed", stamp("2026-10-11", 23, 30), stamp("2026-10-12", 7), "iPhone"));
  // an afternoon nap
  x.push(cat("AsleepCore", stamp("2026-10-12", 14), stamp("2026-10-12", 14, 40)));
  // heart rate: a workout 17:00-17:30 (zone 3 → 4) plus sparse resting samples
  for (let m = 0; m < 30; m++) x.push(rec("HKQuantityTypeIdentifierHeartRate", m < 15 ? 140 : 160, stamp("2026-10-12", 17, m, 10)));
  for (let h = 8; h < 12; h++) for (let m = 0; m < 60; m += 5) x.push(rec("HKQuantityTypeIdentifierHeartRate", 62, stamp("2026-10-12", h, m)));
  x.push(`<Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="30" durationUnit="min" sourceName="Watch" startDate="${stamp("2026-10-12", 17)}" endDate="${stamp("2026-10-12", 17, 30)}"><WorkoutStatistics type="HKQuantityTypeIdentifierActiveEnergyBurned" sum="312" unit="Cal"/></Workout>`);
  // a workout with no heart rate data is not scoreable
  x.push(`<Workout workoutActivityType="HKWorkoutActivityTypeYoga" duration="45" durationUnit="min" startDate="${stamp("2026-10-10", 7)}" endDate="${stamp("2026-10-10", 7, 45)}"/>`);
  x.push("</HealthData>");
  return x.join("\n");
}

function parse(xml, chunk) {
  const p = mk();
  for (let i = 0; i < xml.length; i += chunk) p.feed(xml.slice(i, i + chunk));
  return p.finish();
}

test("appleEpoch honours the recorded timezone", () => {
  assert.equal(appleEpoch("2026-10-12 07:00:00 -0500"), Date.parse("2026-10-12T12:00:00Z"));
  assert.equal(appleEpoch("2026-10-12 07:00:00 +0530"), Date.parse("2026-10-12T01:30:00Z"));
});

test("prettyWorkout", () => {
  assert.equal(prettyWorkout("HKWorkoutActivityTypeRunning"), "Running");
  assert.equal(prettyWorkout("HKWorkoutActivityTypeTraditionalStrengthTraining"), "Strength training");
  assert.equal(prettyWorkout("HKWorkoutActivityTypeHighIntensityIntervalTraining"), "HIIT");
  assert.equal(prettyWorkout("HKWorkoutActivityTypeCrossCountrySkiing"), "Cross country skiing");
});

for (const chunk of [1_000_000, 4096, 37, 7]) {
  test(`full day parses identically with ${chunk}-char chunks`, () => {
    const out = parse(buildXml(), chunk);
    const d = out.days["2026-10-12"];
    assert.ok(d);
    assert.equal(d.rhr, 54, "latest resting HR wins");
    assert.equal(d.hrv, 60, "overnight HRV mean, daytime ignored");
    assert.equal(d.resp, 14.6);
    assert.equal(d.spo2, 97);
    assert.equal(d.steps, 7000, "iPhone 3000+4000, not summed with Watch");
    assert.equal(out.days["2026-01-01"], undefined, "records before the cutoff are skipped");
  });
}

test("sleep: staged watch night beats the in-bed phone estimate", () => {
  const d = parse(buildXml(), 4096).days["2026-10-12"];
  assert.ok(d.sleep);
  assert.equal(d.sleep.lightMin, 120 + 150, "core: 2h + 2.5h");
  assert.equal(d.sleep.swsMin, 60);
  assert.equal(d.sleep.remMin, 105);
  assert.equal(d.sleep.disturbances, 1);
  const bed = new Date(d.sleep.start).getTime();
  const wake = new Date(d.sleep.end).getTime();
  assert.equal(bed, appleEpoch("2026-10-11 22:50:00 -0500"), "span starts at the earliest in-bed time of that source");
  assert.equal(wake, appleEpoch("2026-10-12 06:40:00 -0500"));
  assert.equal(d.napMin, 40);
});

test("heart rate becomes hourly means and all-day zone minutes", () => {
  const d = parse(buildXml(), 4096).days["2026-10-12"];
  assert.equal(d.hourlyHr.length, 24);
  assert.equal(d.hourlyHr[17], 150);
  assert.equal(d.hourlyHr[9], 62);
  assert.equal(d.hourlyHr[3], 54, "hours without samples fall back to resting HR");
  assert.equal(d.hrZoneMin[2], 15, "15 min at 140 bpm → zone 3");
  assert.equal(d.hrZoneMin[3], 15, "15 min at 160 bpm → zone 4");
});

test("workout is scored from the heart rate inside it", () => {
  const out = parse(buildXml(), 4096);
  assert.equal(out.workouts.length, 1, "the heart-rate-less yoga session is dropped");
  const w = out.workouts[0];
  assert.equal(w.sport, "Running");
  assert.equal(w.durationMin, 30);
  assert.equal(w.avgHr, 150);
  assert.equal(w.maxHr, 160);
  assert.equal(w.kcal, 312, "energy comes from WorkoutStatistics");
  assert.equal(w.source, "import");
  assert.equal(w.strain, 9.9);
  assert.equal(w.id, `ah-${appleEpoch("2026-10-12 17:00:00 -0500")}`);
});

test("empty and unrelated input is safe", () => {
  const p = mk();
  p.feed("<HealthData><Me/><Record type='x'");
  const out = p.finish();
  assert.equal(out.counts.days, 0);
  assert.equal(out.workouts.length, 0);
});

test("phone-only night (in-bed segments, no stages) is still counted", () => {
  const p = mk();
  p.feed(cat("InBed", stamp("2026-10-11", 23), stamp("2026-10-12", 7), "iPhone"));
  const d = p.finish().days["2026-10-12"];
  assert.ok(d.sleep);
  assert.equal(d.sleep.lightMin, Math.round(8 * 60 * 0.9));
});
