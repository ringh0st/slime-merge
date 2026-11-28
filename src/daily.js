// The daily jar: one jar a day, the same pieces for everyone, one try. A day is a UTC day, so it is the same jar
// all over the world.
const DAY_MS = 86400000;

export const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);

/** The seven days of the week that holds `today` (Monday first), as day keys. */
export function weekOf(today = new Date()) {
  const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  monday.setTime(monday.getTime() - ((monday.getUTCDay() + 6) % 7) * DAY_MS);
  return Array.from({ length: 7 }, (_, i) => dayKey(new Date(monday.getTime() + i * DAY_MS)));
}

/** The scores of the played days with a new one added, keeping only the last three weeks. */
export function withDailyScore(played, day, score) {
  const cutoff = dayKey(new Date(Date.now() - 21 * DAY_MS));
  return Object.fromEntries(Object.entries({ ...played, [day]: score }).filter(([key]) => key >= cutoff));
}

/** How many days in a row the daily jar was played, ending today (or yesterday: today can still be played). */
export function dailyStreak(played, today = dayKey()) {
  const dayBefore = (day) => dayKey(new Date(new Date(`${day}T00:00:00Z`).getTime() - DAY_MS));
  let day = played[today] != null ? today : dayBefore(today);
  let streak = 0;
  while (played[day] != null) {
    streak += 1;
    day = dayBefore(day);
  }
  return streak;
}

/** "22 Nov" for a day key. */
export const dayLabel = (day) => new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });

/**
 * Points toward new jars for playing the daily jar, every day (play-test: its only reward was a hat at 3 days):
 * 300 on the first day, 100 more for each day in a row, up to 700.
 */
export const dailyBonus = (streak) => 300 + 100 * Math.min(Math.max(streak, 1) - 1, 4);
