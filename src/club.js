// A club is a private board for people who know each other: a short code they share, nothing else. No accounts and
// no list of members: scores saved while a code is set carry it, and the board shows the scores with that code.

/** How a code looks: JELLY-4821. Must match _slime_club in supabase/slime_records.sql. */
export const CLUB_CODE = /^[A-Z]{3,8}-[0-9]{2,4}$/;

const WORDS = ['JELLY', 'MOCHI', 'GLOOP', 'PUFF', 'BUBBLE', 'DRIP', 'MALLOW', 'BUTTER', 'SLIME', 'SQUISH', 'WOBBLE', 'GOOEY', 'BLOB', 'JIGGLE', 'DEW', 'SPLAT'];

/** A new code to share. */
export const newClubCode = () => `${WORDS[Math.floor(Math.random() * WORDS.length)]}-${String(1000 + Math.floor(Math.random() * 9000))}`;

/** A typed code tidied up ("jelly 4821" → "JELLY-4821"), or null when it can't be one. */
export function tidyClubCode(text) {
  const code = String(text ?? '')
    .toUpperCase()
    .trim()
    .replace(/[\s_]+/g, '-');
  return CLUB_CODE.test(code) ? code : null;
}

/**
 * The club member to beat next this week: the one just above the player, or the leader when the player isn't on
 * the board yet. Null when the player leads (or the board is empty).
 */
export function nextToBeat(rows, me) {
  const mine = rows.findIndex((row) => row.name.toLowerCase() === (me ?? '').toLowerCase());
  if (mine === 0) return null;
  return (mine === -1 ? rows[0] : rows[mine - 1]) ?? null;
}

/**
 * Who moved ahead of the player since they last looked.
 * @param rows this week's club board
 * @param me the player's name
 * @param seenAhead the names that were already ahead last time
 * @returns {{ ahead: string[], passedBy: string[] }} everyone ahead now, and the new ones among them
 */
export function whoPassed(rows, me, seenAhead) {
  const mine = rows.findIndex((row) => row.name.toLowerCase() === me.toLowerCase());
  if (mine === -1) return { ahead: [], passedBy: [] };
  const ahead = rows.slice(0, mine).map((row) => row.name);
  return { ahead, passedBy: ahead.filter((name) => !seenAhead.includes(name)) };
}
