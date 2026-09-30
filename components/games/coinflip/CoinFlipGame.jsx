'use client';

import React, { useState, useRef, useEffect } from 'react';
import TutorialModal from '../../modals/TutorialModal';
import CandyScreen from '../candy/CandyScreen';
import CandyButton from '../candy/CandyButton';
import CandyChip from '../candy/CandyChip';
import { CANDY, outlineShadow } from '../candy/tokens';
import Coin from './Coin';
import { resolveFlip, STAKES, FACES, payoutFor } from '@/lib/coinflip/engine.mjs';

// ============================================================================
// COIN FLIP — stake-only (spec: docs/superpowers/specs/2026-09-29-coin-flip-design.md).
// Pick a stake (10/20/30/50) and a side (HEADS / TAILS), tap FLIP. The result is
// decided on the device at FLIP (resolveFlip, crypto RNG) and the stake is
// charged right then via onSpend; the win is reported when the coin LANDS via
// onRound so the notification never spoils the reveal.
// Exactly-once: the resolved round waits in pendingRef; fireRound() nulls it
// before calling onRound, and unmount (close mid-flight) flushes it.
// Double-charge guard: flyingRef locks FLIP from the tap until landing.
// NOTE: STAKES are mirrored by stakeRange '10–50' in lib/data/platform.js and
// the tutorial prize lines in lib/data/tutorials.js — change all three together.
// ============================================================================

const LAST_KEY = 'coinflip:last';
const CHIP_COLORS = { 10: 'violet', 20: 'blue', 30: 'red', 50: 'green' };
const FACE_COLORS = { HEADS: 'green', TAILS: 'violet' };
const MIN_STAKE = STAKES[0];

function readLast() {
  try {
    const v = JSON.parse(window.localStorage.getItem(LAST_KEY) || 'null');
    return {
      stake: STAKES.includes(v?.stake) ? v.stake : MIN_STAKE,
      pick: FACES.includes(v?.pick) ? v.pick : null,
    };
  } catch (e) { return { stake: MIN_STAKE, pick: null }; }
}
function saveLast(stake, pick) {
  try { window.localStorage.setItem(LAST_KEY, JSON.stringify({ stake, pick })); } catch (e) { /* private mode */ }
}
// Remembered stake above the balance → highest affordable tier (else keep it; all disabled)
function affordable(stake, balance) {
  if (stake <= balance) return stake;
  const fit = STAKES.filter(s => s <= balance);
  return fit.length ? fit[fit.length - 1] : stake;
}

const label = { fontFamily: CANDY.body, fontWeight: 800, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: CANDY.sub, textAlign: 'center', margin: '0 0 6px' };

export default function CoinFlipGame({ onClose, closing, balance = 0, onSpend, onRound }) {
  const [init] = useState(readLast);
  const [stake, setStake] = useState(() => affordable(init.stake, balance));
  const [pick, setPick] = useState(init.pick);
  const [phase, setPhase] = useState('idle');   // 'idle' | 'flying' | 'result'
  const [outcome, setOutcome] = useState(null); // { face, win, payout }
  const [showTutorial, setShowTutorial] = useState(false);
  const [reduced, setReduced] = useState(false);

  const flyingRef = useRef(false);
  const pendingRef = useRef(null);
  const onRoundRef = useRef(onRound);
  onRoundRef.current = onRound;

  useEffect(() => {
    try { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* old browser */ }
  }, []);

  // After a loss the selected stake may no longer be affordable — step down
  useEffect(() => {
    if (phase !== 'flying') setStake(s => affordable(s, balance));
  }, [balance, phase]);

  // Refs only, so the unmount cleanup below never sees a stale closure.
  function fireRound() {
    const r = pendingRef.current;
    pendingRef.current = null;
    if (r) onRoundRef.current?.(r);
  }
  useEffect(() => () => fireRound(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const broke = balance < MIN_STAKE;
  const canFlip = !!pick && stake <= balance && phase !== 'flying';

  const chooseStake = (s) => { if (flyingRef.current || s > balance) return; setStake(s); saveLast(s, pick); };
  const choosePick = (f) => { if (flyingRef.current || broke) return; setPick(f); saveLast(stake, f); };

  const flip = () => {
    if (flyingRef.current || !pick || stake > balance) return;
    flyingRef.current = true;
    const out = resolveFlip(stake, pick);
    onSpend?.(stake);
    pendingRef.current = { stake, win: out.win, payout: out.payout };
    setOutcome(out);
    setPhase('flying');
  };

  const onLanded = () => {
    flyingRef.current = false;
    setPhase('result');
    fireRound();
  };

  const won = phase === 'result' && outcome?.win;
  let line;
  if (phase === 'flying') line = <span style={{ color: CANDY.sub, fontSize: 20 }}>Flipping…</span>;
  else if (won) line = (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 10 }} className="anim-scale-in">
      <span style={{ fontSize: 22, color: '#fff', textShadow: outlineShadow(2, CANDY.outline, 2) }}>YOU WIN</span>
      <span style={{ fontSize: 38, color: CANDY.gold, textShadow: `${outlineShadow(2, CANDY.outline, 3)}, 0 0 18px rgba(255,210,31,.8)` }}>+{outcome.payout}</span>
    </span>
  );
  else if (phase === 'result') line = <span style={{ fontSize: 24, color: '#fff', textShadow: outlineShadow(2, CANDY.outline, 2) }}>So close!</span>;
  else if (broke) line = <span style={{ fontSize: 20, color: '#FF8A80' }}>Not enough coins</span>;
  else if (!pick) line = <span style={{ fontSize: 20, color: CANDY.sub }}>Pick a side</span>;
  else line = <span style={{ fontSize: 20, color: CANDY.sub }}>Win {payoutFor(stake)} coins</span>;

  return (
    <CandyScreen title="COIN FLIP" balance={balance} closing={closing} onClose={onClose} onHelp={() => setShowTutorial(true)}>
      {/* coin area — takes whatever height is left */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 10 }}>
        <Coin state={phase} face={outcome?.face ?? null} onLanded={onLanded} reduced={reduced} win={won} />
      </div>

      {/* result line — fixed height so nothing below shifts */}
      <div aria-live="polite" style={{ flex: 'none', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: CANDY.display, letterSpacing: .5 }}>
        {line}
      </div>

      <div style={{ flex: 'none' }}>
        <p style={label}>Stake</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          {STAKES.map(s => (
            <CandyChip key={s} color={CHIP_COLORS[s]} disabled={s > balance}
              selected={stake === s} dim={stake !== s} onClick={() => chooseStake(s)}>
              {s}
            </CandyChip>
          ))}
        </div>

        <p style={label}>Pick a side</p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
          {FACES.map(f => (
            <CandyButton key={f} color={FACE_COLORS[f]} disabled={broke}
              selected={pick === f} dim={!!pick && pick !== f} onClick={() => choosePick(f)}
              style={{ flex: 1, fontSize: 26 }}>
              {f}
            </CandyButton>
          ))}
        </div>

        <CandyButton color="green" big disabled={!canFlip} onClick={flip} style={{ width: '100%', gap: 4 }}>
          <span>FLIP</span>
          <span style={{ fontSize: 15, color: canFlip ? CANDY.gold : 'inherit', textShadow: canFlip ? '0 2px 0 rgba(0,0,0,.35)' : 'none', letterSpacing: 1 }}>WIN 1.9x</span>
        </CandyButton>
      </div>

      {showTutorial && <TutorialModal tutorialKey="coinflip" onClose={() => setShowTutorial(false)} />}
    </CandyScreen>
  );
}
