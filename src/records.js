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
  }).catch(() => {
    throw new Error('You seem to be offline. Try again in a moment.');
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'Couldn’t reach the records. Try again in a moment.');
  return data;
}

/** The database doesn't know the newer functions yet (supabase/slime_records.sql hasn't been run again). */
const isOldServer = (error) => /could not find|schema cache|does not exist/i.test(error.message);

/**
 * The top 20 of a period, in the world or in a club: [{ place, name, score, top, hat }].
 * `top` is the biggest slime the player made and `hat` what it wears (both may be missing).
 */
export async function loadRecords(period, club = null) {
  try {
    return await call('slime_records', { p_period: period, p_club: club });
  } catch (error) {
    if (!isOldServer(error) || club) throw new Error(club ? 'Club boards aren’t ready yet. Try again later.' : error.message);
    return call('slime_records', { p_period: period });
  }
}

/** The top 20 of one daily jar, in the world or in a club. */
export async function loadDaily(day, club = null) {
  try {
    return await call('slime_daily', { p_day: day, p_club: club });
  } catch (error) {
    throw new Error(isOldServer(error) ? 'The daily board isn’t ready yet. Try again later.' : error.message);
  }
}

/**
 * Save a score under a name; returns the name as stored.
 * @param extras { club, daily, top, hat }: the club code, the daily jar's day, the biggest slime and its hat
 */
export async function saveScore(name, score, { club = null, daily = null, top = null, hat = null } = {}) {
  const base = { p_name: tidyName(name), p_score: score };
  try {
    return (await call('slime_save_score', { ...base, p_club: club, p_daily: daily, p_top: top, p_hat: hat })).name;
  } catch (error) {
    if (!isOldServer(error)) throw error;
    return (await call('slime_save_score', base)).name;
  }
}
