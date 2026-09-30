'use client';

import React, { useState, useRef, useEffect } from 'react';
import TutorialModal from '../../modals/TutorialModal';
import CandyScreen from '../candy/CandyScreen';
import CandyButton from '../candy/CandyButton';
import CandyChip from '../candy/CandyChip';
import { CANDY, outlineShadow, textStroke } from '../candy/tokens';
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

// Side buttons: a small CSS mini-coin ("H" / "T", same gold as the big coin)
// beside the label; HEADS white / TAILS gold text, both with a dark outline.
const FACE_TEXT = { HEADS: '#fff', TAILS: CANDY.gold };
const STROKE = `${textStroke(2, CANDY.outline)}, 0 3px 0 ${CANDY.outline}`;

function MiniCoin({ face, off }) {
  return (
    <span aria-hidden style={{
      width: 28, height: 28, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center',
      background: off ? '#8A8199' : 'radial-gradient(circle at 38% 30%, #FFF3B0 0%, #FFD21F 40%, #E0A300 100%)',
      boxShadow: off ? 'inset 0 0 0 2px #6E6680' : `inset 0 0 0 2px #E9A800, inset 0 0 0 3.5px #FFE680, 0 2px 0 ${CANDY.outline}`,
      fontFamily: CANDY.display, fontSize: 15, lineHeight: 1, color: off ? '#5A5268' : '#A86A00',
      textShadow: off ? 'none' : '0 1px 0 rgba(255,244,190,.9)',
    }}>{face[0]}</span>
  );
}

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
  if (phase === 'flying') line = <span style={{ color: CANDY.sub, fontSize: 17 }}>Flipping…</span>;
  else if (won) line = <span key="win" className="anim-scale-in" style={{ fontSize: 28, color: CANDY.gold, letterSpacing: 2, textShadow: `${outlineShadow(2, CANDY.outline, 3)}, 0 0 18px rgba(255,210,31,.8)` }}>WIN</span>;
  else if (phase === 'result') line = <span key="lose" className="anim-scale-in" style={{ fontSize: 26, color: '#fff', letterSpacing: 2, textShadow: outlineShadow(2, CANDY.outline, 3) }}>LOSE</span>;
  else if (broke) line = <span style={{ fontSize: 17, color: '#FF8A80' }}>Not enough coins</span>;
  else if (!pick) line = <span style={{ fontSize: 17, color: CANDY.sub }}>Pick a side</span>;
  else line = <span style={{ fontSize: 17, color: CANDY.sub }}>Win {payoutFor(stake)} coins</span>;

  return (
    <CandyScreen title="COIN FLIP" balance={balance} closing={closing} onClose={onClose} onHelp={() => setShowTutorial(true)}
      overlay={showTutorial && <TutorialModal tutorialKey="coinflip" onClose={() => setShowTutorial(false)} />}>
      {/* coin area — takes whatever height is left; a size container so Coin can
          size itself and its toss arc from the space it actually has */}
      <div style={{ flex: 1, minHeight: 0, containerType: 'size', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Coin state={phase} face={outcome?.face ?? null} onLanded={onLanded} reduced={reduced} win={won} />
      </div>

      {/* result line — fixed, compact height (big text may overflow it) so nothing below shifts */}
      <div aria-live="polite" style={{ flex: 'none', height: 30, position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: CANDY.display, letterSpacing: .5, whiteSpace: 'nowrap' }}>
        {line}
      </div>

      <div style={{ flex: 'none' }}>
        <div role="group" aria-label="Pick a side" style={{ display: 'flex', gap: 10, marginBottom: 2 }}>
          {FACES.map(f => (
            <CandyButton key={f} color={FACE_COLORS[f]} disabled={broke}
              selected={pick === f} dim={!!pick && pick !== f} onClick={() => choosePick(f)}
              style={{ flex: 1, minWidth: 0, minHeight: 58, flexDirection: 'row', gap: 7, padding: '0 8px', fontSize: 25, borderRadius: 16 }}>
              <MiniCoin face={f} off={broke} />
              <span style={broke ? undefined : { color: FACE_TEXT[f], textShadow: STROKE }}>{f}</span>
            </CandyButton>
          ))}
        </div>

        <div role="group" aria-label="Stake" style={{ display: 'flex', gap: 7, marginBottom: 2 }}>
          {STAKES.map(s => (
            <CandyChip key={s} color={CHIP_COLORS[s]} disabled={s > balance}
              selected={stake === s} onClick={() => chooseStake(s)}>
              {s}
            </CandyChip>
          ))}
        </div>

        <CandyButton color="green" big disabled={!canFlip} onClick={flip} style={{ width: '100%', minHeight: 66, gap: 2, marginBottom: 6, borderRadius: 18 }}>
          <span style={{ fontSize: 34, textShadow: canFlip ? `${textStroke(2.5, CANDY.outline)}, 0 4px 0 ${CANDY.outline}` : 'none' }}>FLIP</span>
          <span style={{ fontSize: 14, color: canFlip ? CANDY.gold : 'inherit', textShadow: canFlip ? `${textStroke(1.5, CANDY.outline)}, 0 2px 0 ${CANDY.outline}` : 'none', letterSpacing: 1 }}>✦ WIN 1.9x ✦</span>
        </CandyButton>
      </div>
    </CandyScreen>
  );
}
