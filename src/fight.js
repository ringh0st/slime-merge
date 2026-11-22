// A live fight between two players who share a code. Nothing is stored: the two games talk through a Supabase
// Realtime channel named after the code, and each message is a small object with a type `t`.
//   hello  { id, name, hat, host }   who I am (sent on joining, and again in answer)
//   start  { seed, delay }           the host: both begin in `delay` ms, with the same pieces
//   state  { score, danger, jar }    how I'm doing, five times a second; `jar` is every piece in my jar
//                                    (Game.snapshot), so the other player can watch it live
//   attack { n }                     my combo sends you n rocks
//   over   { score }                 my jar overflowed: you win
//   final  { score }                 time is up: my score
//   again  {}                        I want a rematch
//   full   { to }                    the host: this fight already has two players
//   emote  { e }                     a quick reaction (one of EMOTES)
//   bye    {}                        I left
import { RealtimeClient } from '@supabase/realtime-js';
import { API_KEY, SERVER_URL } from './records.js';

export const FIGHT_MS = 180000;
export const COUNTDOWN_MS = 3500;
/** A match is the first to this many rounds. */
export const ROUNDS_TO_WIN = 2;
/** The quick reactions players can send each other during a fight. */
export const EMOTES = ['😀', '😱', '😎', '👏'];

/** A combo of n merges sends n - 1 rocks, three at most. */
export const rocksForCombo = (combo) => Math.max(0, Math.min(3, combo - 1));

/** A code to share: five digits, easy to say and to type. */
export const newFightCode = () => String(10000 + Math.floor(Math.random() * 90000));

/** A typed code tidied up, or null when it can't be one. */
export function tidyFightCode(text) {
  const digits = String(text ?? '').replace(/\D/g, '');
  return digits.length === 5 ? digits : null;
}

/**
 * Joins the channel of a fight.
 * @param onMessage called with every message from the other player
 * @param onStatus called with 'open' once connected, or 'failed'
 * @returns {{ send(message), leave() }}
 */
export function joinFight(code, onMessage, onStatus) {
  // While developing: `?localfight` links two tabs of the same browser directly, to try a fight without the server.
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('localfight')) {
    const tabs = new BroadcastChannel(`slime-fight-${code}`);
    tabs.onmessage = (event) => onMessage(event.data);
    setTimeout(() => onStatus('open'), 50);
    return { send: (message) => tabs.postMessage(message), leave: () => tabs.close() };
  }
  const client = new RealtimeClient(`${SERVER_URL}/realtime/v1`, { params: { apikey: API_KEY } });
  const channel = client.channel(`slime-fight-${code}`, { config: { broadcast: { self: false } } });
  channel.on('broadcast', { event: 'fight' }, ({ payload }) => onMessage(payload));
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') onStatus('open');
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onStatus('failed');
  });
  return {
    send: (message) => channel.send({ type: 'broadcast', event: 'fight', payload: message }).catch(() => {}),
    leave: () => {
      client.removeChannel(channel).catch(() => {});
      client.disconnect();
    },
  };
}

/** Who won, from my side: 'win' | 'lose' | 'draw'. */
export const outcomeOf = (mine, theirs) => (mine > theirs ? 'win' : mine < theirs ? 'lose' : 'draw');
