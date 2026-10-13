import type { WhoopRaw } from "./whoop-map";

const MIN = 60000;

/** Deterministic fake account for local development (WHOOP_MOCK=1). Never served in production. */
export function mockRaw(days: number): WhoopRaw {
  const raw: WhoopRaw = { cycles: [], recoveries: [], sleeps: [], workouts: [], body: { height_meter: 1.78, weight_kilogram: 74, max_heart_rate: 191 }, profile: { first_name: "Mock" } };
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const wake = new Date(now - i * 86400000);
    wake.setUTCHours(12, 0, 0, 0); // 07:00 at -05:00
    const bed = new Date(wake.getTime() - (7.4 + Math.sin(i) * 0.5) * 60 * MIN);
    const id = `mock-sleep-${i}`;
    const asleep = 7 * 60 + Math.round(Math.sin(i * 1.7) * 35);
    raw.sleeps.push({
      id,
      start: bed.toISOString(),
      end: wake.toISOString(),
      timezone_offset: "-05:00",
      nap: false,
      score_state: "SCORED",
      score: {
        respiratory_rate: 14.5 + Math.sin(i) * 0.4,
        sleep_performance_percentage: 82 + Math.round(Math.sin(i * 1.3) * 10),
        stage_summary: {
          total_awake_time_milli: 35 * MIN,
          total_light_sleep_time_milli: Math.round(asleep * 0.56) * MIN,
          total_slow_wave_sleep_time_milli: Math.round(asleep * 0.2) * MIN,
          total_rem_sleep_time_milli: Math.round(asleep * 0.24) * MIN,
          disturbance_count: 3,
        },
      },
    });
    const rec = Math.round(60 + Math.sin(i * 0.9) * 28);
    raw.recoveries.push({ cycle_id: i, sleep_id: id, score_state: "SCORED", score: { recovery_score: rec, resting_heart_rate: 55 - Math.round(Math.sin(i * 0.9) * 3), hrv_rmssd_milli: 62 + Math.sin(i * 0.9) * 14, spo2_percentage: 96.5, skin_temp_celsius: 33.4 + Math.sin(i) * 0.2 } });
    raw.cycles.push({ id: i, start: wake.toISOString(), timezone_offset: "-05:00", score_state: "SCORED", score: { strain: 9 + Math.abs(Math.sin(i * 1.1)) * 7, kilojoule: 8500 + i * 20, average_heart_rate: 70, max_heart_rate: 168 } });
    if (i % 2 === 0) {
      const s = new Date(wake.getTime() + 8 * 60 * MIN);
      raw.workouts.push({
        id: `mock-w-${i}`,
        start: s.toISOString(),
        end: new Date(s.getTime() + 50 * MIN).toISOString(),
        timezone_offset: "-05:00",
        sport_name: i % 4 === 0 ? "running" : "weightlifting",
        score_state: "SCORED",
        score: { strain: 10.5, average_heart_rate: 148, max_heart_rate: 176, kilojoule: 1900, zone_durations: { zone_zero_milli: MIN, zone_one_milli: 4 * MIN, zone_two_milli: 12 * MIN, zone_three_milli: 20 * MIN, zone_four_milli: 10 * MIN, zone_five_milli: 3 * MIN } },
      });
    }
  }
  return raw;
}
