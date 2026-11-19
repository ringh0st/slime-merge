// Records shared by everyone: scores saved under a name, best of the week, the month and all time.
// The address and key below are public by design; the database only allows the two functions used here
// (supabase/slime_records.sql).
const API_URL = 'https://wapxwfpgrijxaclsbwkq.supabase.co/rest/v1/rpc/';
const API_KEY = 'sb_publishable_P96gX4pjrmkFtvrbHGQdRg_6K1eXEtc';

export const PERIODS = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'all', label: 'All time' },
];

/** Why a name can't be used, or null when it's fine. Must match slime_save_score in supabase/slime_records.sql. */
export function nameProblem(name) {
  const tidy = tidyName(name);
  if (tidy.length < 2 || tidy.length > 16) return 'Names are 2 to 16 characters.';
  if (!/^[\p{L}\p{N} ]+$/u.test(tidy)) return 'Letters, numbers and spaces only.';
  return null;
}

export const tidyName = (name) => String(name ?? '').trim().replace(/\s+/g, ' ');

async function call(fn, body) {
  const response = await fetch(API_URL + fn, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: API_KEY, Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'Couldn’t reach the records. Try again in a moment.');
  return data;
}

/** The top 20 of a period: [{ place, name, score }]. */
export const loadRecords = (period) => call('slime_records', { p_period: period });

/** Save a score under a name; returns the name as stored. */
export async function saveScore(name, score) {
  const result = await call('slime_save_score', { p_name: tidyName(name), p_score: score });
  return result.name;
}
