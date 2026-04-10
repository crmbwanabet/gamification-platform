'use client'

import React, { useState, useEffect, useCallback } from 'react';

function MinesGame({ onClose, onWin, closing }) {
  const GRID = 5, TOTAL = 25;
  const MINE_OPTIONS = [1, 3, 5, 10];
  const WAGER_OPTIONS = [1, 5, 10, 25, 50];

  const calcMult = (mines, rev) => { if (rev === 0) return 1; let m = 1; for (let i = 0; i < rev; i++) m *= (TOTAL - i) / (TOTAL - mines - i); return Math.round(m * 100) / 100; };
  const genMines = (count) => { const a = Array.from({length:TOTAL},(_,i)=>i); for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return new Set(a.slice(0,count)); };

  const [coins, setCoins] = useState(500);
  const [mineCount, setMineCount] = useState(3);
  const [wager, setWager] = useState(5);
  const [phase, setPhase] = useState('setup');
  const [mineSet, setMineSet] = useState(new Set());
  const [revealed, setRevealed] = useState(new Set());
  const [explodedTile, setExplodedTile] = useState(null);
  const [currentMult, setCurrentMult] = useState(1);
  const [lastWin, setLastWin] = useState(null);
  const [history, setHistory] = useState([]);
  const [shakeGrid, setShakeGrid] = useState(false);
  const [flashTile, setFlashTile] = useState(null);
  const [glowPulse, setGlowPulse] = useState(false);
  const [showAllMines, setShowAllMines] = useState(false);

  const safeCount = TOTAL - mineCount;
  const gemsFound = [...revealed].filter(i => !mineSet.has(i)).length;
  const potentialWin = Math.floor(wager * currentMult);
  const nextMult = phase === 'playing' ? calcMult(mineCount, gemsFound + 1) : 1;

  const startGame = useCallback(() => {
    if (coins < wager) return;
    setCoins(c => c - wager); setMineSet(genMines(mineCount)); setRevealed(new Set());
    setExplodedTile(null); setCurrentMult(1); setLastWin(null); setPhase('playing');
    setShowAllMines(false); setGlowPulse(false);
  }, [coins, wager, mineCount]);

  const revealTile = useCallback((idx) => {
    if (phase !== 'playing' || revealed.has(idx)) return;
    if (mineSet.has(idx)) {
      setExplodedTile(idx); setRevealed(p => new Set([...p, idx]));
      setShakeGrid(true); setTimeout(() => setShakeGrid(false), 600);
      setPhase('exploded'); setHistory(h => [{result:'loss',wager,mines:mineCount},...h.slice(0,14)]);
      setTimeout(() => { setShowAllMines(true); setRevealed(p => new Set([...p,...mineSet])); }, 700);
    } else {
      const nr = new Set([...revealed, idx]); setRevealed(nr);
      setFlashTile(idx); setTimeout(() => setFlashTile(null), 400);
      const ng = [...nr].filter(i => !mineSet.has(i)).length;
      const nm = calcMult(mineCount, ng); setCurrentMult(nm);
      if (nm > 2) setGlowPulse(true);
      if (ng >= safeCount) {
        const w = Math.floor(wager * nm); setCoins(c => c + w); setLastWin(w); setPhase('cashed');
        if (onWin) onWin(w - wager);
        setHistory(h => [{result:'win',wager,mult:nm,won:w},...h.slice(0,14)]);
        setTimeout(() => { setShowAllMines(true); setRevealed(p => new Set([...p,...mineSet])); }, 500);
      }
    }
  }, [phase, revealed, mineSet, mineCount, wager, safeCount, onWin]);

  const cashOut = useCallback(() => {
    if (phase !== 'playing' || gemsFound === 0) return;
    const w = Math.floor(wager * currentMult); setCoins(c => c + w); setLastWin(w); setPhase('cashed');
    if (onWin) onWin(w - wager);
    setHistory(h => [{result:'win',wager,mult:currentMult,won:w},...h.slice(0,14)]);
    setTimeout(() => { setShowAllMines(true); setRevealed(p => new Set([...p,...mineSet])); }, 400);
  }, [phase, gemsFound, wager, currentMult, mineSet, onWin]);

  useEffect(() => {
    const kd = (e) => { if (e.code==='Space'&&phase==='playing'&&gemsFound>0){e.preventDefault();cashOut();} };
    window.addEventListener('keydown',kd); return()=>window.removeEventListener('keydown',kd);
  }, [phase, gemsFound, cashOut]);

  const riskLabel = mineCount <= 1 ? 'LOW' : mineCount <= 5 ? 'MEDIUM' : 'HIGH';
  const riskColor = mineCount <= 1 ? '#22c55e' : mineCount <= 5 ? '#f59e0b' : '#ef4444';

  return (
    <div className={`fixed inset-0 bg-black/90 flex items-center justify-center z-[80] p-4 ${closing ? 'anim-backdrop-close' : 'anim-fade-in'}`} onClick={onClose}>
      <style>{`
        @keyframes mTileGem{0%{transform:scale(.5) rotateY(90deg);opacity:0}50%{transform:scale(1.15) rotateY(0)}100%{transform:scale(1);opacity:1}}
        @keyframes mTileExplode{0%{transform:scale(1)}20%{transform:scale(1.4)}40%{transform:scale(.85)}60%{transform:scale(1.15)}100%{transform:scale(1)}}
        @keyframes mGridShake{0%,100%{transform:translate(0)}10%{transform:translate(-8px,4px) rotate(-1deg)}20%{transform:translate(7px,-5px) rotate(1deg)}30%{transform:translate(-5px,3px)}40%{transform:translate(4px,-3px)}}
        @keyframes mCashPulse{0%,100%{box-shadow:0 4px 0 #047857,0 0 0 0 rgba(34,197,94,.25),inset 0 1px 0 rgba(255,255,255,.2)}50%{box-shadow:0 4px 0 #047857,0 0 28px 6px rgba(34,197,94,.2),inset 0 1px 0 rgba(255,255,255,.2)}}
        @keyframes mMultPulse{0%,100%{text-shadow:0 0 8px rgba(255,215,0,.3)}50%{text-shadow:0 0 24px rgba(255,215,0,.6),0 0 40px rgba(255,215,0,.2)}}
        @keyframes mResultSlide{0%{transform:translateY(20px) scale(.9);opacity:0}100%{transform:translateY(0) scale(1);opacity:1}}
        @keyframes mGemFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        .m-tile-h:hover:not(.m-tile-l){transform:translateY(-3px) scale(1.03);border-color:rgba(6,182,212,.35)!important;box-shadow:0 6px 20px rgba(0,0,0,.4),0 0 15px rgba(6,182,212,.12)!important}
        .m-tile-h:active:not(.m-tile-l){transform:scale(.97)}
      `}</style>

      <div className={`${closing ? 'anim-modal-close' : 'anim-scale-in'}`} onClick={e=>e.stopPropagation()} style={{background:'linear-gradient(180deg,#0a1520 0%,#030810 100%)',border:'none',borderRadius:24,maxWidth:880,width:'100%',overflow:'hidden',boxShadow:'0 0 60px rgba(6,182,212,.08),0 20px 60px rgba(0,0,0,.6)'}}>
        {/* HEADER */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 24px',borderBottom:'1px solid rgba(6,182,212,.08)'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:22,fontWeight:900,letterSpacing:1.5,background:'linear-gradient(135deg,#22D3EE,#06B6D4)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{'💎 MINES'}</span>
            {phase==='playing'&&<span style={{fontSize:10,fontWeight:800,padding:'3px 10px',borderRadius:6,background:riskColor+'15',color:riskColor,border:`1px solid ${riskColor}25`,letterSpacing:1.5,textTransform:'uppercase'}}>{riskLabel}</span>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(255,215,0,.06)',border:'1px solid rgba(255,215,0,.12)',borderRadius:10,padding:'6px 14px',fontWeight:700,fontSize:15,color:'#FFD700',fontFamily:'monospace'}}>{'🪙'} {coins.toLocaleString()}</div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><span className="text-gray-400 text-xl">{'✕'}</span></button>
          </div>
        </div>

        {/* BODY */}
        <div style={{display:'flex',gap:0,minHeight:420}}>
          {/* SIDEBAR */}
          <div style={{width:220,padding:'18px 16px',borderRight:'1px solid rgba(6,182,212,.06)',display:'flex',flexDirection:'column',gap:12,background:'rgba(0,0,0,.12)'}}>
            <div>
              <div style={{fontSize:10,fontWeight:800,color:'#556',letterSpacing:1.5,marginBottom:5,textTransform:'uppercase'}}>Mines</div>
              <div style={{display:'flex',gap:5}}>
                {MINE_OPTIONS.map(n=>(
                  <button key={n} type="button" onClick={()=>phase==='setup'&&setMineCount(n)} style={{flex:1,padding:'8px 0',borderRadius:8,fontSize:14,fontWeight:800,fontFamily:'monospace',cursor:phase==='setup'?'pointer':'default',border:mineCount===n?'1.5px solid #06B6D4':'1.5px solid rgba(255,255,255,.06)',background:mineCount===n?'rgba(6,182,212,.12)':'rgba(255,255,255,.03)',color:mineCount===n?'#22D3EE':'#777',boxShadow:mineCount===n?'0 0 12px rgba(6,182,212,.12)':'none',opacity:phase!=='setup'?0.4:1,transition:'all .15s'}}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:800,color:'#556',letterSpacing:1.5,marginBottom:5,textTransform:'uppercase'}}>Wager</div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                {WAGER_OPTIONS.map(w=>(
                  <button key={w} type="button" onClick={()=>phase==='setup'&&coins>=w&&setWager(w)} style={{flex:1,minWidth:36,padding:'8px 0',borderRadius:8,fontSize:13,fontWeight:800,fontFamily:'monospace',cursor:phase==='setup'&&coins>=w?'pointer':'default',border:wager===w?'1.5px solid #FFD700':'1.5px solid rgba(255,255,255,.06)',background:wager===w?'rgba(255,215,0,.1)':'rgba(255,255,255,.03)',color:wager===w?'#FFD700':'#777',boxShadow:wager===w?'0 0 10px rgba(255,215,0,.08)':'none',opacity:phase!=='setup'||coins<w?0.35:1,transition:'all .15s'}}>{w}</button>
                ))}
              </div>
            </div>
            <div style={{height:1,background:'linear-gradient(90deg,transparent,rgba(6,182,212,.12),transparent)'}} />
            {phase==='playing'&&<>
              <div style={{background:'rgba(255,215,0,.04)',border:'1px solid rgba(255,215,0,.1)',borderRadius:12,padding:'12px 10px',textAlign:'center'}}>
                <div style={{fontSize:26,fontWeight:900,color:'#FFD700',fontFamily:'monospace',animation:glowPulse?'mMultPulse 1.2s ease-in-out infinite':'none'}}>{currentMult.toFixed(2)}x</div>
                <div style={{fontSize:9,color:'#665',letterSpacing:1.5,marginTop:2,textTransform:'uppercase',fontWeight:700}}>Multiplier</div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <div style={{flex:1,background:'rgba(34,197,94,.05)',border:'1px solid rgba(34,197,94,.1)',borderRadius:10,padding:'9px 6px',textAlign:'center'}}>
                  <div style={{fontSize:15,fontWeight:900,color:'#22c55e',fontFamily:'monospace'}}>{potentialWin}</div>
                  <div style={{fontSize:8,color:'#555',letterSpacing:1,marginTop:1,fontWeight:700}}>WIN</div>
                </div>
                <div style={{flex:1,background:'rgba(96,165,250,.05)',border:'1px solid rgba(96,165,250,.1)',borderRadius:10,padding:'9px 6px',textAlign:'center'}}>
                  <div style={{fontSize:15,fontWeight:900,color:'#60a5fa',fontFamily:'monospace'}}>{nextMult.toFixed(1)}x</div>
                  <div style={{fontSize:8,color:'#555',letterSpacing:1,marginTop:1,fontWeight:700}}>NEXT</div>
                </div>
              </div>
            </>}
            {phase==='exploded'&&<div style={{background:'rgba(239,68,68,.06)',border:'1px solid rgba(239,68,68,.15)',borderRadius:12,padding:'12px 10px',textAlign:'center',animation:'mResultSlide .4s ease-out'}}>
              <div style={{fontSize:22,fontWeight:900,color:'#ef4444',fontFamily:'monospace'}}>-{wager} {'🪙'}</div>
              <div style={{fontSize:9,color:'#844',letterSpacing:1.5,marginTop:2,fontWeight:700}}>BUSTED</div>
            </div>}
            {phase==='cashed'&&<div style={{background:'rgba(34,197,94,.06)',border:'1px solid rgba(34,197,94,.15)',borderRadius:12,padding:'12px 10px',textAlign:'center',animation:'mResultSlide .4s ease-out'}}>
              <div style={{fontSize:22,fontWeight:900,color:'#22c55e',fontFamily:'monospace'}}>+{lastWin} {'🪙'}</div>
              <div style={{fontSize:9,color:'#485',letterSpacing:1.5,marginTop:2,fontWeight:700}}>{currentMult.toFixed(2)}x WIN</div>
            </div>}
            <div style={{marginTop:'auto'}}>
              {phase==='setup'&&<button type="button" onClick={startGame} disabled={coins<wager} className="btn-3d" style={{width:'100%',padding:'13px 0',border:'none',borderRadius:14,fontSize:13,fontWeight:900,cursor:coins>=wager?'pointer':'default',background:coins>=wager?'linear-gradient(180deg,#22D3EE 0%,#06B6D4 40%,#0891B2 100%)':'#333',color:coins>=wager?'#000':'#666',boxShadow:coins>=wager?'0 4px 0 #0E7490,0 6px 20px rgba(6,182,212,.3),inset 0 1px 0 rgba(255,255,255,.25)':'none',letterSpacing:0.5,textTransform:'uppercase',opacity:coins>=wager?1:0.4}}>{coins>=wager ? `Bet ${wager} 🪙 & Play` : 'Not enough coins'}</button>}
              {phase==='playing'&&<button type="button" onClick={cashOut} disabled={gemsFound===0} style={{width:'100%',padding:'13px 0',border:'none',borderRadius:14,fontSize:13,fontWeight:900,cursor:gemsFound>0?'pointer':'default',background:gemsFound>0?'linear-gradient(180deg,#34D399 0%,#10B981 40%,#059669 100%)':'#222',color:gemsFound>0?'#000':'#555',boxShadow:gemsFound>0?'0 4px 0 #047857,0 6px 20px rgba(16,185,129,.3),inset 0 1px 0 rgba(255,255,255,.2)':'none',letterSpacing:0.5,textTransform:'uppercase',animation:gemsFound>0?'mCashPulse 1.5s ease-in-out infinite':'none',opacity:gemsFound>0?1:0.4}}>{gemsFound===0 ? 'Pick a tile' : `Cash out ${potentialWin} 🪙`}</button>}
              {(phase==='exploded'||phase==='cashed')&&<button type="button" onClick={()=>setPhase('setup')} className="btn-3d" style={{width:'100%',padding:'13px 0',border:'none',borderRadius:14,fontSize:13,fontWeight:900,cursor:'pointer',background:'linear-gradient(180deg,#22D3EE 0%,#06B6D4 40%,#0891B2 100%)',color:'#000',letterSpacing:0.5,textTransform:'uppercase',boxShadow:'0 4px 0 #0E7490,0 6px 20px rgba(6,182,212,.3),inset 0 1px 0 rgba(255,255,255,.25)'}}>New Round</button>}
            </div>
          </div>

          {/* GRID AREA */}
          <div style={{flex:1,padding:'18px 24px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12}}>
            <div style={{display:'flex',gap:8,width:'100%',maxWidth:400}}>
              {[{icon:'💎',val:safeCount-gemsFound,label:'Gems left',color:'#22D3EE'},{icon:'💣',val:mineCount,label:'Mines',color:'#ef4444'},{icon:'✓',val:`${gemsFound}/${safeCount}`,label:'Found',color:'#60a5fa'}].map((s,i)=>(
                <div key={i} style={{flex:1,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.04)',borderRadius:10,padding:'7px 6px',textAlign:'center'}}>
                  <div style={{fontSize:14,fontWeight:900,color:s.color,fontFamily:'monospace'}}>{s.icon} {s.val}</div>
                  <div style={{fontSize:8,color:'#444',letterSpacing:1,marginTop:1,fontWeight:700,textTransform:'uppercase'}}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:7,width:'100%',maxWidth:400,animation:shakeGrid?'mGridShake .5s ease-out':'none'}}>
              {Array.from({length:TOTAL},(_,idx)=>{
                const isRev=revealed.has(idx),isM=mineSet.has(idx),isExp=idx===explodedTile,isFlash=idx===flashTile;
                const gameOver=phase==='exploded'||phase==='cashed';
                const canClick=phase==='playing'&&!isRev;
                let bg,bdr,shd,anim;
                if(!isRev){bg='linear-gradient(145deg,#162240,#0e1830)';bdr='2px solid rgba(6,182,212,.08)';shd='inset 0 2px 6px rgba(0,0,0,.4),0 1px 3px rgba(0,0,0,.3)';anim='none';}
                else if(isM&&isExp){bg='radial-gradient(circle,#7f1d1d,#450a0a)';bdr='2px solid rgba(255,60,60,.5)';shd='0 0 30px rgba(255,50,50,.35),inset 0 0 15px rgba(255,0,0,.15)';anim='mTileExplode .5s ease-out';}
                else if(isM){bg='linear-gradient(145deg,#1c1015,#150a0e)';bdr='2px solid rgba(239,68,68,.12)';shd='none';anim='none';}
                else{bg='radial-gradient(circle,#064e3b,#022c22)';bdr=`2px solid rgba(34,197,94,${isFlash?0.5:0.2})`;shd=isFlash?'0 0 25px rgba(34,197,94,.35),inset 0 0 10px rgba(34,197,94,.1)':'0 0 8px rgba(34,197,94,.08)';anim='mTileGem .35s ease-out';}
                return(
                  <div key={idx} onClick={()=>canClick&&revealTile(idx)} className={`${!isRev?'m-tile-h':''}${!canClick&&!isRev?' m-tile-l':''}`}
                    style={{aspectRatio:'1',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',cursor:canClick?'pointer':'default',background:bg,border:bdr,boxShadow:shd,animation:isRev?anim:'none',transition:'all .2s',position:'relative',fontSize:26}}>
                    {isRev&&!isM&&<span style={{animation:'mGemFloat 2s ease-in-out infinite',display:'flex'}}>💎</span>}
                    {isRev&&isM&&isExp&&<span>💥</span>}
                    {isRev&&isM&&!isExp&&<span style={{opacity:0.4,fontSize:20}}>💣</span>}
                    {!isRev&&gameOver&&!isM&&<span style={{opacity:0.08,fontSize:16}}>💎</span>}
                    {!isRev&&phase==='setup'&&<span style={{opacity:0.06,fontSize:15}}>?</span>}
                  </div>
                );
              })}
            </div>

            {phase==='exploded'&&<div style={{fontSize:15,fontWeight:900,color:'#ef4444',textAlign:'center',animation:'mResultSlide .4s ease-out',textShadow:'0 0 20px rgba(239,68,68,.3)'}}>{'💥'} Hit a mine! Lost {wager} coins</div>}
            {phase==='cashed'&&<div style={{fontSize:15,fontWeight:900,color:'#22c55e',textAlign:'center',animation:'mResultSlide .4s ease-out',textShadow:'0 0 20px rgba(34,197,94,.3)'}}>{'💰'} Cashed out {lastWin} coins at {currentMult.toFixed(2)}x!</div>}
            {phase==='setup'&&<div style={{fontSize:11,color:'#445',textAlign:'center',lineHeight:1.6,maxWidth:300}}>Pick tiles to find 💎 gems. Avoid 💣 mines. Cash out anytime.</div>}
            {phase==='playing'&&gemsFound>0&&<div style={{fontSize:10,color:'#445',textAlign:'center'}}><span style={{color:'#22D3EE',fontWeight:700}}>SPACE</span> to cash out</div>}
          </div>
        </div>

        {history.length>0&&<div style={{padding:'8px 24px 12px',borderTop:'1px solid rgba(6,182,212,.05)',display:'flex',gap:4,flexWrap:'wrap',alignItems:'center'}}>
          <span style={{fontSize:9,color:'#334',fontWeight:700,letterSpacing:1.5,marginRight:4}}>HISTORY</span>
          {history.map((h,i)=>(<span key={i} style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:5,fontFamily:'monospace',background:h.result==='win'?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)',color:h.result==='win'?'#22c55e':'#ef4444',border:`1px solid ${h.result==='win'?'rgba(34,197,94,.12)':'rgba(239,68,68,.12)'}`}}>{h.result==='win'?`+${h.won}`:`-${h.wager}`}</span>))}
        </div>}
      </div>
    </div>
  );
}

export default MinesGame;
