'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { albumCards, albumSets, earnedCount } from '@/lib/album/cards.mjs';
import { WORLD_CUP_OPEN } from '@/lib/season/config.mjs';
import { track, flushTrack } from '@/lib/track';
import { awardCoins } from '@/lib/cashback/rules.mjs';

// The 2026-10-19 extras in one place, so GamificationPlatform only wires it:
// bet-slip missions, souvenir album, match-day predictions, the weekly
// leaderboard, the comeback bonus and the daily gem cashback. Rewards go through `credit` (coins +
// optional XP, with a `patch` that records the claim in the user state and
// returns null when it is already recorded, so a double tap pays once).
//
// Server-checked claims (predictions, leaderboard, comeback, cashback) call the API
// first and credit only after an ok; the client-side ones (album sets) are checked against the CRM rows / derived cards here.

export function useExtras({ session, loggedIn, hydrated, tab, user, setUser, seasonRows, today, stage, league, worldCup, hustle, credit, showNotif, blocked, economy }) {
  const api = session.api;

  const busy = useRef(new Set());
  // (the daily/weekend bet-slip missions became the one-time Sports ladder in
  // lib/missions/ladder.mjs, 2026-10-20)

  // --- souvenir album (derived cards; set bonuses once) ---
  // the World Cup set shows only while the World Cup is open (lib/season/config.mjs; open since 2026-10-27)
  const cards = useMemo(() => albumCards({ stage, league, worldCup, hustle }).filter(c => WORLD_CUP_OPEN || c.set !== 'worldcup'), [stage, league, worldCup, hustle]);
  const sets = useMemo(() => albumSets(cards, user.albumClaims).filter(s => WORLD_CUP_OPEN || s.id !== 'worldcup'), [cards, user.albumClaims]);
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
    track('album_set_claimed', { amount: s.bonus, meta: { setId } }); flushTrack();
    credit({ coins: s.bonus }, el, `🃏 ${s.name} set complete!`, (u) => {
      const paid = Array.isArray(u.albumClaims) ? u.albumClaims : [];
      return paid.includes(setId) ? null : { albumClaims: [...paid, setId] };
    });
  };

  // --- predictions ---
  const [pred, setPred] = useState({ status: 'idle', matches: [], slips: [], week: { start: null, picks: 0, max: 5 }, coins: 200 });
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
      if (status === 200 && data?.ok) { track('prediction_made', { meta: { eventId, pick } }); showNotif('⚽ Prediction saved — good luck!'); await loadPredictions(); return; }
      const msg = data?.error === 'weekly_limit' ? `Your ${data.max} picks for this week are in`
        : data?.error === 'closed' ? 'Kick-off is too close — predictions are closed'
        : data?.error === 'already_picked' ? 'You already predicted this match'
        : 'Prediction failed — try again';
      showNotif(msg, 'error');
    } finally { setPickBusy(null); }
  };
  const claimPrediction = async (week, el) => {
    if (busy.current.has(`pred:${week}`)) return;
    busy.current.add(`pred:${week}`);
    const { status, data } = await api('/api/predictions/claim', { week });
    if (status === 200 && data?.ok) {
      track('prediction_claimed', { amount: data.coins, meta: { week } }); flushTrack();
      credit({ coins: data.coins }, el, '⚽ 5 out of 5!');
      setPred(p => ({ ...p, slips: p.slips.map(x => (x.week === week ? { ...x, claimed: true, claimable: false } : x)) }));
    } else {
      busy.current.delete(`pred:${week}`);
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
      track('leaderboard_claimed', { amount: data.coins, meta: { rank: data.rank, band: data.band } }); flushTrack();
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
      if (status === 200 && data?.eligible) { track('comeback_shown', { meta: { daysAway: data.daysAway } }); setComeback({ coins: data.coins, daysAway: data.daysAway }); }
    })();
  }, [loggedIn, hydrated, api]);
  const claimComeback = async (el) => {
    if (busy.current.has('comeback')) return;
    busy.current.add('comeback');
    const { status, data } = await api('/api/comeback', {});
    setComeback(null);
    if (status === 200 && data?.ok) { track('comeback_claimed', { amount: data.coins }); flushTrack(); credit({ coins: data.coins }, el, '👋 Welcome back!'); }
    else if (data?.error !== 'already_claimed') showNotif('Claim failed — try again later', 'error');
  };

  // --- daily gem cashback (owner 2026-10-23): 5% of yesterday's (UTC day)
  // net loss on bwanabet, awarded by the cron; collected here, one pop-up per
  // open listing every uncollected window. The server flips collected_at once,
  // and only then are the gems credited.
  const [cashback, setCashback] = useState(null); // [{ window, loss, cashbackKwacha, emeralds, rubies, diamonds }]
  const cbCheckedRef = useRef(false);
  useEffect(() => {
    if (!loggedIn || !hydrated || cbCheckedRef.current) return;
    cbCheckedRef.current = true;
    (async () => {
      const { status, data } = await api('/api/cashback');
      const awards = status === 200 && Array.isArray(data?.awards) ? data.awards : [];
      if (awards.length) {
        track('cashback_shown', { meta: { windows: awards.length } });
        setCashback(awards);
      }
    })();
  }, [loggedIn, hydrated, api]);
  // take = 'gems' | 'coins' (owner 2026-10-28): coins = what the gems are worth,
  // worked out by the server (the client credits what it returns).
  const collectCashback = async (el, take = 'gems') => {
    if (busy.current.has('cashback') || !cashback) return;
    busy.current.add('cashback');
    const total = { coins: 0, emeralds: 0, rubies: 0, diamonds: 0 };
    let failed = false;
    for (const a of cashback) {
      const { status, data } = await api('/api/cashback', { window: a.window, take });
      if (status === 200 && data?.ok) {
        if (data.take === 'coins') total.coins += Number(data.coins) || 0;
        else for (const k of ['emeralds', 'rubies', 'diamonds']) total[k] += data.award[k] || 0;
        track('cashback_collected', { meta: { window: a.window, take: data.take || 'gems', coins: data.coins || 0, emeralds: data.award.emeralds, rubies: data.award.rubies, diamonds: data.award.diamonds, valueCoins: data.award.valueCoins } });
      } else if (data?.error !== 'already_collected') failed = true;
    }
    setCashback(null);
    busy.current.delete('cashback');
    if (total.coins + total.emeralds + total.rubies + total.diamonds > 0) { flushTrack(); credit(total, el, take === 'coins' ? '🪙 Cashback collected!' : '💎 Cashback collected!'); }
    if (failed) showNotif('Some cashback could not be collected — it will wait for your next visit', 'error');
  };

  return {
    cashback: cashback && !blocked ? { awards: cashback, coins: cashback.reduce((s, a) => s + awardCoins(a, economy), 0), onCollect: collectCashback, onClose: () => setCashback(null) } : null, // Later = next open
    cashbackPending: !!cashback,
    album: { cards, sets, have, total: cards.length, onClaimSet: claimSet },
    predictions: { ...pred, busyId: pickBusy, onPick: makePick, onClaim: claimPrediction, loggedIn },
    board: { ...board, onClaim: claimBoard, loggedIn },
    comeback: comeback && !blocked && !cashback ? { ...comeback, onClaim: claimComeback, onClose: () => setComeback(null) } : null,
    comebackPending: !!comeback,
    badge: sets.filter(s => s.claimable).length
      + (pred.slips || []).filter(x => x.claimable).length + (board.lastWeek && !board.lastWeek.claimed ? 1 : 0),
  };
}
