import { useCallback, useEffect, useRef, useState } from 'react';
import { COUNTDOWN_MS, EMOTES, FIGHT_MS, ROUNDS_TO_WIN, joinFight, newFightCode, outcomeOf } from './fight.js';

const IDLE = { status: 'idle', code: null, isHost: false, foe: null, startAt: 0, endsAt: 0, outcome: null, reason: null, myScore: 0, wantsAgain: false, foeWantsAgain: false, problem: null, wins: { me: 0, foe: 0 }, emote: null };
/** Without a sign of life for this long, the other player is taken to have left. */
const SILENCE_MS = 9000;

/**
 * A live fight with one other player (fight.js has the messages).
 * status: 'idle' → 'connecting' → 'waiting' (for the other player) → 'countdown' → 'playing' → 'done'.
 * @param me { name, hat } shown to the other player
 * @param handlers { onGo(seed), onRocks(count), onFinish(), snapshot() }: start my game, drop rocks into it,
 *   stop it, and what my jar looks like right now
 */
export function useFight(me, handlers) {
  const [fight, setFight] = useState(IDLE);
  const link = useRef(null);
  // The other player's jar as last heard (see Game.snapshot).
  const foeJar = useRef(null);
  const live = useRef({ ...IDLE, id: Math.random().toString(36).slice(2), score: 0, danger: 0, heard: 0, sent: 0, seed: null });
  const h = useRef(handlers);
  const who = useRef(me);
  useEffect(() => {
    h.current = handlers;
    who.current = me;
  });

  /** Changes the state, keeping the copy the timers and messages read in step. */
  const set = useCallback((patch) => {
    Object.assign(live.current, patch);
    setFight((now) => ({ ...now, ...patch }));
  }, []);

  const hello = () => link.current?.send({ t: 'hello', id: live.current.id, name: who.current.name || 'Player', hat: who.current.hat, host: live.current.isHost });

  const begin = (seed, delay) => {
    const startAt = Date.now() + delay;
    live.current.seed = seed;
    // A new match starts once somebody has won the last one.
    const w = live.current.wins;
    if (w.me >= ROUNDS_TO_WIN || w.foe >= ROUNDS_TO_WIN) set({ wins: { me: 0, foe: 0 } });
    live.current.score = 0;
    live.current.danger = 0;
    live.current.heard = startAt;
    foeJar.current = null;
    live.current.foeFinal = null;
    live.current.myFinal = null;
    set({ status: 'countdown', startAt, endsAt: startAt + FIGHT_MS, outcome: null, reason: null, wantsAgain: false, foeWantsAgain: false, myScore: 0, foe: { ...live.current.foe, score: 0, danger: 0 } });
  };

  const finish = (outcome, reason) => {
    if (live.current.status === 'done') return;
    const w = live.current.wins;
    const wins = { me: w.me + (outcome === 'win' ? 1 : 0), foe: w.foe + (outcome === 'lose' ? 1 : 0) };
    set({ status: 'done', outcome, reason, myScore: live.current.score, wins });
    h.current.onFinish();
  };

  const onMessage = (m) => {
    const s = live.current;
    s.heard = Date.now();
    if (m.t === 'hello') {
      if (s.isHost && s.foe && s.foe.id !== m.id) return link.current.send({ t: 'full', to: m.id });
      const isNew = !s.foe;
      set({ foe: { id: m.id, name: m.name, hat: m.hat, score: 0, danger: 0 } });
      if (s.isHost && isNew) {
        hello();
        const seed = `fight-${s.code}-${Date.now()}`;
        link.current.send({ t: 'start', seed, delay: COUNTDOWN_MS });
        begin(seed, COUNTDOWN_MS);
      }
    } else if (m.t === 'full' && m.to === s.id) {
      set({ status: 'idle', problem: 'That fight already has two players.' });
      leaveQuietly();
    } else if (m.t === 'start' && !s.isHost) begin(m.seed, m.delay);
    else if (m.t === 'state' && s.foe) {
      // Their jar is drawn straight from this (GhostJar reads it every frame); only the numbers go through React.
      foeJar.current = m.jar ?? null;
      if (m.score !== s.foe.score || m.danger !== s.foe.danger) set({ foe: { ...s.foe, score: m.score, danger: m.danger } });
    }
    else if (m.t === 'attack' && s.status === 'playing') h.current.onRocks(m.n);
    else if (m.t === 'over' && s.status === 'playing') {
      set({ foe: { ...s.foe, score: m.score } });
      finish('win', 'overflow');
    } else if (m.t === 'final') {
      s.foeFinal = m.score;
      set({ foe: { ...s.foe, score: m.score } });
      if (s.myFinal != null) finish(outcomeOf(s.myFinal, m.score), 'time');
    } else if (m.t === 'emote' && EMOTES.includes(m.e)) {
      set({ emote: { from: 'foe', e: m.e, id: Date.now() } });
    } else if (m.t === 'again') {
      set({ foeWantsAgain: true });
      if (s.isHost && s.wantsAgain) restart();
    } else if (m.t === 'bye') {
      if (s.status === 'playing' || s.status === 'countdown') finish('win', 'left');
      else set({ foe: null, foeWantsAgain: false, status: s.status === 'done' ? 'done' : 'waiting', reason: s.status === 'done' ? s.reason : null });
    }
  };

  const restart = () => {
    const seed = `fight-${live.current.code}-${Date.now()}`;
    link.current.send({ t: 'start', seed, delay: COUNTDOWN_MS });
    begin(seed, COUNTDOWN_MS);
  };

  const leaveQuietly = () => {
    link.current?.leave();
    link.current = null;
  };

  const connect = (code, isHost) => {
    leaveQuietly();
    set({ ...IDLE, status: 'connecting', code, isHost });
    link.current = joinFight(code, onMessage, (status) => {
      if (status === 'failed') {
        set({ ...IDLE, problem: 'Couldn’t connect. Check your internet and try again.' });
        leaveQuietly();
      } else if (live.current.status === 'connecting') {
        set({ status: 'waiting' });
        hello();
      }
    });
  };

  // The clock of a fight: the countdown, a sign of life twice a second, time running out, a silent other player.
  useEffect(() => {
    if (fight.status === 'idle' || fight.status === 'connecting') return undefined;
    const timer = setInterval(() => {
      const s = live.current;
      const now = Date.now();
      // A guest keeps saying hello until the host answers (the host may have connected a moment later).
      if (s.status === 'waiting' && !s.isHost && !s.foe && now - (s.helloAt ?? 0) > 500) {
        s.helloAt = now;
        hello();
      }
      if (s.status === 'countdown' && now >= s.startAt) {
        set({ status: 'playing' });
        h.current.onGo(s.seed);
      }
      if (s.status !== 'playing') return;
      link.current?.send({ t: 'state', score: s.score, danger: s.danger, jar: h.current.snapshot() });
      if (now >= s.endsAt && s.myFinal == null) {
        s.myFinal = s.score;
        link.current?.send({ t: 'final', score: s.score });
        if (s.foeFinal != null) finish(outcomeOf(s.myFinal, s.foeFinal), 'time');
      } else if (s.myFinal != null && now >= s.endsAt + 3000) {
        // Their last word never came: go by the last score we saw.
        finish(outcomeOf(s.myFinal, s.foe?.score ?? 0), 'time');
      } else if (now - s.heard > SILENCE_MS) finish('win', 'left');
    }, 200);
    return () => clearInterval(timer);
  }, [fight.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => leaveQuietly, []);

  return {
    fight,
    foeJar,
    host: () => connect(newFightCode(), true),
    join: (code) => connect(code, false),
    /** My game reports how it's going. */
    report(score, danger) {
      live.current.score = score;
      live.current.danger = danger;
    },
    /** My combo sends rocks. */
    attack(count) {
      if (count > 0 && live.current.status === 'playing') link.current?.send({ t: 'attack', n: count });
    },
    /** A quick reaction, shown on both screens. */
    emote(e) {
      link.current?.send({ t: 'emote', e });
      set({ emote: { from: 'me', e, id: Date.now() } });
    },
    /** My jar overflowed. */
    lost(score) {
      if (live.current.status !== 'playing') return;
      live.current.score = score;
      link.current?.send({ t: 'over', score });
      finish('lose', 'overflow');
    },
    again() {
      set({ wantsAgain: true });
      link.current?.send({ t: 'again' });
      if (live.current.isHost && live.current.foeWantsAgain) restart();
    },
    leave() {
      link.current?.send({ t: 'bye' });
      leaveQuietly();
      set({ ...IDLE });
    },
  };
}
