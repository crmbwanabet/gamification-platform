'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SPORTS_MISSIONS, sportsMissionStates, recordSportsClaim } from '@/lib/missions/sports.mjs';
import { albumCards, albumSets, earnedCount } from '@/lib/album/cards.mjs';

// The 2026-10-19 extras in one place, so GamificationPlatform only wires it:
// bet-slip missions, souvenir album, match-day predictions, the weekly
// leaderboard and the comeback bonus. Rewards go through `credit` (coins +
// optional XP, with a `patch` that records the claim in the user state and
// returns null when it is already recorded, so a double tap pays once).
//
// Server-checked claims (predictions, leaderboard, comeback) call the API
// first and credit only after an ok; the client-side ones (sports missions,
// album sets) are checked against the CRM rows / derived cards here.

export function useExtras({ session, loggedIn, hydrated, tab, user, setUser, seasonRows, today, stage, league, worldCup, hustle, credit, showNotif, blocked }) {
  const api = session.api;

  // --- bet-slip missions (CRM sports_slips, already in the season rows) ---
  const sportsStates = useMemo(
    () => sportsMissionStates(SPORTS_MISSIONS, { rows: seasonRows || [], today, claims: user.sportsMissionClaims }),
    [seasonRows, today, user.sportsMissionClaims]
  );
  const busy = useRef(new Set());
  const claimSports = (missionId, el) => {
    if (!loggedIn) { showNotif('Log in on bwanabet.com to claim', 'error'); return; }
    const s = sportsStates.find(x => x.mission.id === missionId);
    const guard = `sports:${today}:${missionId}`;
    if (!s || !s.claimable || busy.current.has(guard)) return;
    busy.current.add(guard);
    credit({ coins: s.mission.reward.kwacha || 0, xp: s.mission.xp || 0 }, el, `✅ ${s.mission.name} claimed!`, (u) => {
      const next = recordSportsClaim(u.sportsMissionClaims, missionId, today, sportsMissionStates(SPORTS_MISSIONS, { rows: seasonRows || [], today, claims: u.sportsMissionClaims }));
      return next ? { sportsMissionClaims: next } : null;
    });
  };

  // --- souvenir album (derived cards; set bonuses once) ---
  const cards = useMemo(() => albumCards({ stage, league, worldCup, hustle }), [stage, league, worldCup, hustle]);
  const sets = useMemo(() => albumSets(cards, user.albumClaims), [cards, user.albumClaims]);
  const have = earnedCount(cards);
  useEffect(() => {
    if (!hydrated || !loggedIn || !seasonRows) return;
    const seen = Number(user.albumSeen);
    if (!Number.isFinite(seen)) { setUser(u => ({ ...u, albumSeen: have })); return; } // first run: silent
    if (have > seen) {
      showNotif(`🃏 New souvenir card${have - seen > 1 ? 's' : ''} in your album!`);
      setUser(u => ({ ...u, albumSeen: have }));
    }
  }, [have, hydrated, loggedIn, seasonRows]); // eslint-disable-line react-hooks/exhaustive-deps
  const claimSet = (setId, el) => {
    if (!loggedIn) { showNotif('Log in on bwanabet.com to claim', 'error'); return; }
    const s = sets.find(x => x.id === setId);
    if (!s || !s.claimable || busy.current.has(`set:${setId}`)) return;
    busy.current.add(`set:${setId}`);
    credit({ coins: s.bonus }, el, `🃏 ${s.name} set complete!`, (u) => {
      const paid = Array.isArray(u.albumClaims) ? u.albumClaims : [];
      return paid.includes(setId) ? null : { albumClaims: [...paid, setId] };
    });
  };

  // --- predictions ---
  const [pred, setPred] = useState({ status: 'idle', matches: [], mine: [], today: { picks: 0, max: 5 }, coins: 200 });
  const loadPredictions = useCallback(async () => {
    let status, data;
    if (loggedIn) ({ status, data } = await api('/api/predictions'));
    else {
      try { const r = await fetch('/api/predictions', { cache: 'no-store' }); status = r.status; data = await r.json(); } catch { status = 0; }
    }
    if (status === 200 && data) setPred({ status: 'ok', ...data });
    else setPred(p => (p.status === 'ok' ? p : { ...p, status: 'unavailable' }));
  }, [loggedIn, api]);
  useEffect(() => {
    if (tab !== 'home' && tab !== 'missions') return undefined;
    loadPredictions();
    const iv = setInterval(() => { if (document.visibilityState === 'visible') loadPredictions(); }, 300000);
    return () => clearInterval(iv);
  }, [tab, loadPredictions]);
  const [pickBusy, setPickBusy] = useState(null);
  const makePick = async (eventId, pick) => {
    if (!loggedIn) { showNotif('Log in on bwanabet.com to predict', 'error'); return; }
    if (pickBusy) return;
    setPickBusy(eventId);
    try {
      const { status, data } = await api('/api/predictions', { eventId, pick });
      if (status === 200 && data?.ok) { showNotif('⚽ Prediction saved — good luck!'); await loadPredictions(); return; }
      const msg = data?.error === 'daily_limit' ? `You can make ${data.max} predictions a day`
        : data?.error === 'closed' ? 'Kick-off is too close — predictions are closed'
        : data?.error === 'already_picked' ? 'You already predicted this match'
        : 'Prediction failed — try again';
      showNotif(msg, 'error');
    } finally { setPickBusy(null); }
  };
  const claimPrediction = async (eventId, el) => {
    if (busy.current.has(`pred:${eventId}`)) return;
    busy.current.add(`pred:${eventId}`);
    const { status, data } = await api('/api/predictions/claim', { eventId });
    if (status === 200 && data?.ok) {
      credit({ coins: data.coins }, el, '⚽ Correct prediction!');
      setPred(p => ({ ...p, mine: p.mine.map(m => (m.eventId === eventId ? { ...m, claimed: true, claimable: false } : m)) }));
    } else {
      busy.current.delete(`pred:${eventId}`);
      showNotif(data?.error === 'already_claimed' ? 'Already claimed' : 'Claim failed — try again', 'error');
    }
  };

  // --- weekly leaderboard ---
  const [board, setBoard] = useState({ status: 'idle' });
  const loadBoard = useCallback(async () => {
    let status, data;
    if (loggedIn) ({ status, data } = await api('/api/leaderboard'));
    else {
      try { const r = await fetch('/api/leaderboard', { cache: 'no-store' }); status = r.status; data = await r.json(); } catch { status = 0; }
    }
    if (status === 200 && data) setBoard({ status: 'ok', ...data });
    else setBoard(b => (b.status === 'ok' ? b : { status: 'unavailable' }));
  }, [loggedIn, api]);
  useEffect(() => { if (tab === 'missions') loadBoard(); }, [tab, loadBoard]);
  const claimBoard = async (el) => {
    if (busy.current.has('board')) return;
    busy.current.add('board');
    const { status, data } = await api('/api/leaderboard/claim', {});
    busy.current.delete('board');
    if (status === 200 && data?.ok) {
      credit({ coins: data.coins }, el, `🏆 Weekly league: #${data.rank}!`);
      setBoard(b => (b.lastWeek ? { ...b, lastWeek: { ...b.lastWeek, claimed: true } } : b));
    } else {
      showNotif(data?.error === 'already_claimed' ? 'Already claimed' : 'Claim failed — try again', 'error');
    }
  };

  // --- comeback bonus (checked once per widget open, shown when nothing else is up) ---
  const [comeback, setComeback] = useState(null); // { coins, daysAway } while offered
  const checkedRef = useRef(false);
  useEffect(() => {
    if (!loggedIn || !hydrated || checkedRef.current) return;
    checkedRef.current = true;
    (async () => {
      const { status, data } = await api('/api/comeback');
      if (status === 200 && data?.eligible) setComeback({ coins: data.coins, daysAway: data.daysAway });
    })();
  }, [loggedIn, hydrated, api]);
  const claimComeback = async (el) => {
    if (busy.current.has('comeback')) return;
    busy.current.add('comeback');
    const { status, data } = await api('/api/comeback', {});
    setComeback(null);
    if (status === 200 && data?.ok) credit({ coins: data.coins }, el, '👋 Welcome back!');
    else if (data?.error !== 'already_claimed') showNotif('Claim failed — try again later', 'error');
  };

  return {
    sports: { states: sportsStates, onClaim: claimSports, loggedIn },
    album: { cards, sets, have, total: cards.length, onClaimSet: claimSet },
    predictions: { ...pred, busyId: pickBusy, onPick: makePick, onClaim: claimPrediction, loggedIn },
    board: { ...board, onClaim: claimBoard, loggedIn },
    comeback: comeback && !blocked ? { ...comeback, onClaim: claimComeback, onClose: () => setComeback(null) } : null,
    comebackPending: !!comeback,
    badge: sportsStates.filter(s => s.claimable).length + sets.filter(s => s.claimable).length
      + (pred.mine || []).filter(m => m.claimable).length + (board.lastWeek && !board.lastWeek.claimed ? 1 : 0),
  };
}
