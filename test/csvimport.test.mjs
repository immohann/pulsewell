import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, splitCsvLine, CSV_TEMPLATE } from "../lib/csvimport.ts";

test("splitCsvLine handles quotes and commas", () => {
  assert.deepEqual(splitCsvLine('a,"b,c",d'), ["a", "b,c", "d"]);
  assert.deepEqual(splitCsvLine('"he said ""hi""",x'), ['he said "hi"', "x"]);
});

test("the shipped template parses cleanly", () => {
  const { data, errors } = parseCsv(CSV_TEMPLATE);
  assert.deepEqual(errors, []);
  assert.equal(data.counts.days, 2);
  assert.equal(data.counts.sleeps, 2);
  const d = data.days["2026-10-12"];
  assert.equal(d.hrv, 68);
  assert.equal(d.rhr, 53);
  assert.equal(d.napMin, 25);
  assert.equal(d.sleep.swsMin, 78);
  assert.equal(d.sleep.remMin, 102);
  assert.equal(d.sleep.awakeMin, 28);
  // 22:50 → 06:30 = 460 min in bed; asleep 432; light = 432 - 78 - 102
  assert.equal(d.sleep.lightMin, 252);
});

test("bedtime before midnight belongs to the previous calendar day", () => {
  const { data } = parseCsv("date,sleep_start,sleep_end\n2026-10-12,23:30,07:00");
  const s = data.days["2026-10-12"].sleep;
  assert.ok(Date.parse(s.end) - Date.parse(s.start) === 7.5 * 3600000);
});

test("missing stage columns are estimated", () => {
  const { data } = parseCsv("date,sleep_start,sleep_end,awake_min\n2026-10-12,23:00,07:00,30");
  const s = data.days["2026-10-12"].sleep;
  assert.equal(s.lightMin + s.swsMin + s.remMin, 450);
  assert.ok(s.swsMin > 0 && s.remMin > 0);
});

test("headers are case/space tolerant and bad rows are reported", () => {
  const { data, errors } = parseCsv("Date, HRV ,RHR\n2026-10-12,60,52\nnot-a-date,1,2\n");
  assert.equal(data.days["2026-10-12"].hrv, 60);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Row 3/);
});

test("rejects files without a date column", () => {
  assert.match(parseCsv("hrv,rhr\n60,52").errors[0], /date/);
  assert.match(parseCsv("").errors[0], /header/);
});
