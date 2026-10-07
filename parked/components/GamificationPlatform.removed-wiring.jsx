// Wiring stripped from components/GamificationPlatform.jsx on 2026-07-15 (predictions/trivia/quests parked).
// Reference only — NOT valid standalone code. Restore pieces into the container alongside the parked components.

// ============ trackMission cases: prediction missions (types bets / wins / weeklyWins / winStreak) ============
          case 'bets':
            if (actionType === 'betPlaced') shouldIncrement = true;
            break;
          case 'wins':
          case 'weeklyWins':
            if (actionType === 'betWon') shouldIncrement = true;
            break;
          case 'winStreak':
            if (actionType === 'betWon') {
              incrementBy = 1;
              shouldIncrement = true;
            } else if (actionType === 'betLost') {
              setTo = 0; // reset streak
            }
            break;

// ============ trackMission cases: trivia missions ============
          case 'triviaPlay':
            if (actionType === 'triviaPlayed') shouldIncrement = true;
            break;
          case 'triviaCorrect':
            if (actionType === 'triviaCorrect') {
              incrementBy = metadata.count || 1;
              shouldIncrement = true;
            }
            break;
          case 'speedScore':
            if (actionType === 'triviaPlayed' && metadata.triviaType === 'speed' && metadata.speedScore >= mission.target) {
              setTo = metadata.speedScore;
            }
            break;
          case 'triviaStreak':
            if (actionType === 'triviaPlayed' && metadata.triviaType === 'streak' && metadata.triviaStreak >= mission.target) {
              setTo = metadata.triviaStreak;
            }
            break;
          case 'weeklyTriviaCorrect':
            if (actionType === 'triviaCorrect') {
              incrementBy = metadata.count || 1;
              shouldIncrement = true;
            }
            break;

// ============ trackQuest + claimQuest ============
  // Quest progress tracker — called alongside trackMission
  const trackQuest = useCallback((actionType, metadata = {}) => {
    setUser(prev => {
      const qp = { ...prev.questProgress };
      QUESTS.forEach(quest => {
        quest.steps.forEach(step => {
          if (prev.questsComplete.includes(quest.id)) return;
          if ((qp[step.id] || 0) >= step.target) return;
          let match = false;
          if (step.action === actionType) {
            if (step.gameId) { match = metadata.gameId === step.gameId; }
            else { match = true; }
          }
          if (match) qp[step.id] = (qp[step.id] || 0) + 1;
        });
      });
      return { ...prev, questProgress: qp };
    });
  }, []);

  // Claim quest rewards
  const claimQuest = useCallback((quest) => {
    setUser(prev => {
      if (prev.questsComplete.includes(quest.id)) return prev;
      const allDone = quest.steps.every(s => (prev.questProgress[s.id] || 0) >= s.target);
      if (!allDone) return prev;
      return {
        ...prev,
        kwacha: prev.kwacha + (quest.reward.kwacha || 0),
        gems: prev.gems + (quest.reward.gems || 0),
        diamonds: prev.diamonds + (quest.reward.diamonds || 0),
        xp: prev.xp + (quest.xp || 0),
        questsComplete: [...prev.questsComplete, quest.id],
      };
    });
    showNotif(`🏆 Quest Complete: ${quest.name}!`);
    triggerReward('big', null, { coins: quest.reward?.kwacha || 0, gems: quest.reward?.gems || 0, diamonds: quest.reward?.diamonds || 0, xp: quest.xp || 0 });
    trackQuest('questCompleted', {});
    setSelectedQuest(null);
  }, [showNotif]);

// ============ playTrivia + handleDailyChallenge ============
  const playTrivia = (triviaId) => {
    const game = TRIVIA_GAMES.find(g => g.id === triviaId);
    if (!game) return;
    if (user.triviaPlays[triviaId] > 0) {
      setUser(u => ({
        ...u,
        triviaPlays: { ...u.triviaPlays, [triviaId]: Math.max(0, u.triviaPlays[triviaId] - 1) }
      }));
      setActiveTrivia(triviaId);
    } else if (user.kwacha >= game.cost) {
      addCoins(-game.cost);
      setActiveTrivia(triviaId);
    } else {
      showNotif('Not enough Coins!', 'error');
    }
  };

  const handleDailyChallenge = (resultsArr) => {
    // resultsArr is [bool, bool, bool] for the 3 questions
    const correctCount = resultsArr.filter(r => r).length;
    const isPerfect = correctCount === 3;
    const streak = isPerfect ? (user.dailyTriviaStreak || 0) + 1 : 0;
    const streakMult = getDailyStreakMult(streak);
    const baseCoins = resultsArr.reduce((sum, r, i) => sum + (r ? DAILY_DIFFICULTY[i].reward : 0), 0);
    const bonusCoins = isPerfect ? DAILY_PERFECT_BONUS.coins : 0;
    const totalCoins = Math.floor((baseCoins + bonusCoins) * streakMult);
    const totalGems = isPerfect ? DAILY_PERFECT_BONUS.gems : 0;
    const xpEarned = correctCount * 20 + (isPerfect ? 50 : 0);

    if (totalCoins > 0) addCoins(totalCoins);
    if (totalGems > 0) addGems(totalGems);
    if (xpEarned > 0) addXP(xpEarned);
    if (isPerfect) triggerReward('big', null, { coins: totalCoins, gems: totalGems, xp: xpEarned });
    else if (correctCount > 0) triggerReward('small', null, { coins: totalCoins });

    const msg = isPerfect
      ? `🏆 Perfect Trivia! +${totalCoins} Coins + ${totalGems} Gems${streakMult > 1 ? ` (${streakMult}x streak!)` : '!'}`
      : correctCount > 0
        ? `🎯 ${correctCount}/3 Correct — +${totalCoins} Coins`
        : '🎯 0/3 — Better luck tomorrow!';
    showNotif(msg);

    setUser(u => ({
      ...u,
      dailyChallengeAnswered: true,
      dailyChallengeCorrect: isPerfect,
      dailyTriviaProgress: { answered: 3, correct: correctCount, results: resultsArr },
      dailyTriviaStreak: streak,
      dailyTasksDone: [...new Set([...u.dailyTasksDone, 'trivia'])],
    }));
    trackMission('triviaPlayed', { triviaType: 'daily', correct: isPerfect });
    trackQuest('triviaPlayed', {});
    if (correctCount > 0) { trackMission('triviaCorrect', { count: correctCount }); trackQuest('triviaCorrect', { count: correctCount }); }
    trackQuest('xpEarned', { amount: xpEarned });
  };

// ============ trivia game modals + QuestDetailModal (from gameOverlays) ============
      {activeTrivia === 'classicQuiz' && (
        <ClassicQuizGame
          onClose={() => animateClose(() => setActiveTrivia(null))} closing={closingModal}
          onWin={(n, meta) => {
            addCoins(n);
            showNotif('🧠 +' + n + ' Coins!');
            triggerReward('medium', null, { coins: n });
            trackMission('triviaPlayed', { triviaType: 'classic' });
            trackQuest('triviaPlayed', {});
            if (meta?.triviaCorrect) { trackMission('triviaCorrect', { count: meta.triviaCorrect }); trackQuest('triviaCorrect', { count: meta.triviaCorrect }); }
            trackQuest('coinsEarned', { amount: n });
          }}
        />
      )}
      {activeTrivia === 'speedRound' && (
        <SpeedRoundGame
          onClose={() => animateClose(() => setActiveTrivia(null))} closing={closingModal}
          onWin={(n, meta) => {
            addCoins(n);
            showNotif('⚡ +' + n + ' Coins!');
            triggerReward('medium', null, { coins: n });
            trackMission('triviaPlayed', { triviaType: 'speed', speedScore: meta?.triviaCorrect ?? 0 });
            trackQuest('triviaPlayed', {});
            if (meta?.triviaCorrect) { trackMission('triviaCorrect', { count: meta.triviaCorrect }); trackQuest('triviaCorrect', { count: meta.triviaCorrect }); }
            trackQuest('coinsEarned', { amount: n });
          }}
        />
      )}
      {activeTrivia === 'streakTrivia' && (
        <StreakTriviaGame
          onClose={() => animateClose(() => setActiveTrivia(null))} closing={closingModal}
          onWin={(n, meta) => {
            addCoins(n);
            showNotif('🏆 +' + n + ' Coins!');
            triggerReward('medium', null, { coins: n });
            trackMission('triviaPlayed', { triviaType: 'streak', triviaStreak: meta?.triviaStreak ?? 0 });
            trackQuest('triviaPlayed', {});
            if (meta?.triviaStreak) { trackMission('triviaCorrect', { count: meta.triviaStreak }); trackQuest('triviaCorrect', { count: meta.triviaStreak }); }
            trackQuest('coinsEarned', { amount: n });
          }}
        />
      )}
      {selectedQuest && (
        <QuestDetailModal
          quest={selectedQuest}
          questProgress={user.questProgress}
          questsComplete={user.questsComplete}
          onClose={() => animateClose(() => setSelectedQuest(null))}
          onClaim={claimQuest}
          onNavigate={(tabId) => navigateTab(tabId)}
          onPlayGame={playGame}
          closing={closingModal}

// ============ placePrediction + streak-voucher check + prediction settlement ============
  const placePrediction = (m, choice, el) => {
    if (user.predictions.find(p => p.id === m.id)) return;
    const odds = choice === 'home' ? m.h : choice === 'draw' ? m.d : m.a;
    const top = !!(m.featured || m.top);
    const xp = top ? PREDICTION_PLACE_XP_TOP : PREDICTION_PLACE_XP;
    setUser(u => ({ ...u, bets: (u.bets || 0) + 1, predictions: [...u.predictions, { id: m.id, eventId: m.eventId || m.id, choice, odds, top, home: m.home, away: m.away, league: m.league, time: m.time || null, placedAt: Date.now(), status: 'pending' }] }));
    addXP(xp);
    trackMission('betPlaced');
    trackQuest('betPlaced', {});
    showNotif(`🎯 Prediction placed! +${xp} XP`);
    triggerReward('small', el || null, { xp });
  };

  // === Streak voucher (real value): every 3 correct predictions in a row
  // earns a K20 Free Bet, fulfilled MANUALLY by admins from the Telegram group
  // (same flow as wheel wins). Server-side only for SSO players — the server
  // recomputes the streak from the saved history and keeps grants idempotent.
  const checkStreakVoucher = useCallback(() => {
    session.claimVoucher?.().then((r) => {
      if (r && r.ok && r.granted > 0) {
        showNotif(`🎟️ ${r.granted > 1 ? `${r.granted}× ` : ''}${r.voucher} earned — 3 wins in a row! Our team will credit your account shortly.`);
        triggerReward('big', null, {});
      }
    }).catch(() => {});
  }, [session, showNotif, triggerReward]);
  // Catch vouchers earned but not yet granted (e.g. the save landed after the
  // last visit ended) once the SSO profile is loaded.
  useEffect(() => { if (session.status === 'ready') checkStreakVoucher(); }, [session.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // === Prediction settlement: once a predicted match has a published final
  // score (via /api/matches/settle), mark it won/lost and pay out odds-based
  // coins. Retries at most every 10 min so unpublished results don't loop.
  const lastSettleRef = useRef(0);
  const predWinCoins = (p) => predictionWinCoins(p.odds, p.top);
  useEffect(() => {
    const now = Date.now();
    if (now - lastSettleRef.current < 600000) return;
    const due = user.predictions.filter(p => p.status === 'pending' && p.eventId &&
      (Date.parse(p.time) || p.placedAt || 0) + 2 * 3600000 < now); // kickoff (or placement) >2h ago
    if (!due.length) return;
    lastSettleRef.current = now;
    fetch('/api/matches/settle', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: due.map(p => ({ eventId: p.eventId, time: p.time || new Date(p.placedAt).toISOString() })) }),
    })
      .then(r => r.json())
      .then(d => {
        const res = (d && d.results) || {};
        const settled = due.filter(p => res[String(p.eventId)]);
        if (!settled.length) return;
        const wins = settled.filter(p => res[String(p.eventId)].outcome === p.choice);
        const losses = settled.length - wins.length;
        const coins = wins.reduce((s, p) => s + predWinCoins(p), 0);
        setUser(u => ({ ...u, wins: (u.wins || 0) + wins.length, predictions: u.predictions.map(p => {
          const r = p.status === 'pending' && res[String(p.eventId)];
          if (!r) return p;
          const won = r.outcome === p.choice;
          return { ...p, status: won ? 'won' : 'lost', score: r.score, payout: won ? predWinCoins(p) : 0, settledAt: Date.now() };
        }) }));
        for (let i = 0; i < wins.length; i++) { trackMission('betWon'); trackQuest('betWon', {}); }
        for (let i = 0; i < losses; i++) trackMission('betLost');
        if (wins.length) {
          addCoins(coins);
          addXP(PREDICTION_WIN_XP * wins.length);
          trackQuest('coinsEarned', { amount: coins });
          showNotif(`⚽ ${wins.length > 1 ? `${wins.length} predictions won` : 'Prediction won'}! +${coins} Coins`);
          triggerReward('big', null, { coins, xp: PREDICTION_WIN_XP * wins.length });
          // Real-value bridge: after the debounced state save lands, let the
          // server check the updated history for a completed win streak.
          setTimeout(() => checkStreakVoucher(), 5000);
        }
      })
      .catch(() => {});
  }, [user.predictions]); // eslint-disable-line react-hooks/exhaustive-deps

// ============================================================================
// 2026-09-29: the 7 original games parked (only Njuka kept). Removed from
// components/GamificationPlatform.jsx: imports, handleWin (wheel prize handler),
// tapScore/clockClose/wheelSpins mission cases, and the 7 game overlay renders.
// ============================================================================

import WheelGame from './games/WheelGame';
import ScratchGame from './games/ScratchGame';
import DiceGame from './games/DiceGame';
import HighLowGame from './games/HighLowGame';
import PlinkoGame from './games/PlinkoGame';
import TapFrenzyGame from './games/TapFrenzyGame';
import StopClockGame from './games/StopClockGame';

// ----

  const handleWin = (prize, name) => {
    const coins = typeof prize === 'number' ? prize : (prize.kwacha || 0);
    if (typeof prize === 'number') {
      addCoins(prize);
      showNotif(`🎉 +${prize} Coins!`);
    } else {
      if (prize.kwacha) addCoins(prize.kwacha);
      if (prize.gems) addGems(prize.gems);
      if (prize.diamonds) addDiamonds(prize.diamonds);
      if (prize.xp) addXP(prize.xp);
      showNotif(`🎉 Won: ${name}!`);
    }
    setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
    setGamesPlayedToday(prev => new Set([...prev, 'wheel']));
    trackMission('gamePlayed', { gameId: 'wheel', coinsWon: coins, gamesSet: gamesPlayedToday });
    // NOTE: No triggerReward() call — the wheel renders its own self-contained
    // celebration overlay (count-up + confetti + screen flash). Calling
    // triggerReward here would fire a second confetti burst on prize claim.

// ----

          case 'tapScore':
            if (actionType === 'gamePlayed' && metadata.gameId === 'tapfrenzy' && metadata.tapScore >= mission.target) {
              setTo = metadata.tapScore;
            }
            break;
          case 'clockClose':
            if (actionType === 'gamePlayed' && metadata.gameId === 'stopclock' && metadata.clockDiff !== undefined && metadata.clockDiff <= 3) {
              setTo = 1;
            }
            break;
          case 'wheelSpins':
            if (actionType === 'gamePlayed' && metadata.gameId === 'wheel') shouldIncrement = true;
            break;

// ----

      {activeGame === 'wheel' && (
        <WheelGame
          onClose={() => animateClose(() => setActiveGame(null))} closing={closingModal}
          onWin={handleWin}
          playsLeft={user.gamePlays.wheel}
        />
      )}
      {activeGame === 'scratch' && (
        <ScratchGame
          onClose={() => animateClose(() => setActiveGame(null))} closing={closingModal}
          onWin={(n) => {
            addCoins(n);
            showNotif(`🎉 +${n} Coins!`);
            triggerReward('medium', null, { coins: n });
            setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
            setGamesPlayedToday(prev => new Set([...prev, 'scratch']));
            trackMission('gamePlayed', { gameId: 'scratch', coinsWon: n, gamesSet: gamesPlayedToday });
          }}
        />
      )}
      {activeGame === 'dice' && (
        <DiceGame
          onClose={() => animateClose(() => setActiveGame(null))} closing={closingModal}
          onReplay={() => requestReplay('dice')}
          onWin={(n) => {
            addCoins(n);
            showNotif(`🎉 +${n} Coins!`);
            triggerReward('medium', null, { coins: n });
            setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
            setGamesPlayedToday(prev => new Set([...prev, 'dice']));
            trackMission('gamePlayed', { gameId: 'dice', coinsWon: n, gamesSet: gamesPlayedToday });
          }}
        />
      )}
      {activeGame === 'highlow' && (
        <HighLowGame
          onClose={() => animateClose(() => setActiveGame(null))} closing={closingModal}
          onReplay={() => requestReplay('highlow')}
          onWin={(n) => {
            addCoins(n);
            showNotif(`🎉 +${n} Coins!`);
            triggerReward('medium', null, { coins: n });
            setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
            setGamesPlayedToday(prev => new Set([...prev, 'highlow']));
            trackMission('gamePlayed', { gameId: 'highlow', coinsWon: n, gamesSet: gamesPlayedToday });
          }}
        />
      )}
      {activeGame === 'plinko' && (
        <PlinkoGame
          onClose={() => animateClose(() => setActiveGame(null))} closing={closingModal}
          balance={user.kwacha}
          onSpend={(n) => addCoins(-n)}
          onWin={(n) => {
            addCoins(n);
            showNotif(`🎉 +${n} Coins!`);
            triggerReward('medium', null, { coins: n });
            setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
            setGamesPlayedToday(prev => new Set([...prev, 'plinko']));
            trackMission('gamePlayed', { gameId: 'plinko', coinsWon: n, gamesSet: gamesPlayedToday });
          }}
        />
      )}
      {activeGame === 'tapfrenzy' && (
        <TapFrenzyGame
          onClose={() => animateClose(() => setActiveGame(null))} closing={closingModal}
          onReplay={() => requestReplay('tapfrenzy')}
          onWin={(n, meta) => {
            addCoins(n);
            showNotif(`🎉 +${n} Coins!`);
            triggerReward('medium', null, { coins: n });
            setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
            setGamesPlayedToday(prev => new Set([...prev, 'tapfrenzy']));
            trackMission('gamePlayed', { gameId: 'tapfrenzy', coinsWon: n, tapScore: meta?.score, gamesSet: gamesPlayedToday });
          }}
        />
      )}
      {activeGame === 'stopclock' && (
        <StopClockGame
          onClose={() => animateClose(() => setActiveGame(null))} closing={closingModal}
          onReplay={() => requestReplay('stopclock')}
          onWin={(n, meta) => {
            addCoins(n);
            showNotif(`🎉 +${n} Coins!`);
            triggerReward('medium', null, { coins: n });
            setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
            setGamesPlayedToday(prev => new Set([...prev, 'stopclock']));
            trackMission('gamePlayed', { gameId: 'stopclock', coinsWon: n, clockDiff: meta?.diff, gamesSet: gamesPlayedToday });
          }}
        />
      )}


// ============================================================================
// 2026-10-07 — pre-casino missions + streak bonuses parked
// ============================================================================
// Missions became the 4 CRM-fed daily casino missions (lib/missions/casino.mjs)
// and the daily-login streak BONUSES stopped paying (the streak counter itself
// is live). Data: parked/lib/data/missions.legacy.js and
// parked/lib/data/streakRewards.legacy.js. Restore notes: parked/README.md.

// ============ GamificationPlatform.jsx: the full trackMission progress engine ============
// (activeMissions was applyMissionOverrides([...getDailyMissions(), ...PERMANENT_MISSIONS], cfg.missionOverrides);
//  navBadges.missions / missionsCount = missions not in user.missionsComplete;
//  MissionDetailModal got progress={user.missionProgress[id]} done={user.missionsComplete.includes(id)})
  // Mission tracking
  const [gamesPlayedToday, setGamesPlayedToday] = useState(new Set());
  
  const trackMission = useCallback((actionType, metadata = {}) => {
    if (actionType === 'gamePlayed') track('game_played', { gameId: metadata.gameId, amount: metadata.coinsWon || 0 });
    const allActive = applyMissionOverrides([...getDailyMissions(), ...WEEKLY_MISSIONS, ...PERMANENT_MISSIONS], cfgRef.current.missionOverrides);
    
    setUser(prev => {
      const newProgress = { ...prev.missionProgress };
      const newComplete = [...prev.missionsComplete];
      let bonusCoins = 0, bonusGems = 0, bonusXP = 0;
      let justCompleted = [];
      
      allActive.forEach(mission => {
        if (newComplete.includes(mission.id)) return; // already done
        
        let shouldIncrement = false;
        let incrementBy = 1;
        let setTo = null; // for score-type missions
        
        switch (mission.type) {
          case 'gamePlay':
            if (actionType === 'gamePlayed' && metadata.gameId === mission.gameId) shouldIncrement = true;
            break;
          // bets/wins/winStreak + trivia cases parked with their missions —
          // see parked/components/GamificationPlatform.removed-wiring.jsx
          case 'dailyClaim':
            if (actionType === 'dailyClaimed') shouldIncrement = true;
            break;
          case 'uniqueGames':
          case 'uniqueGamesWeekly':
            if (actionType === 'gamePlayed') {
              const updatedSet = new Set([...(metadata.gamesSet || []), metadata.gameId]);
              setTo = updatedSet.size;
            }
            break;
          case 'coinsWon':
            if (actionType === 'gamePlayed' && metadata.coinsWon > 0) {
              incrementBy = metadata.coinsWon;
              shouldIncrement = true;
            }
            break;
          case 'storePurchase':
          case 'coinsSpent':
            if (actionType === 'storePurchase') {
              incrementBy = metadata.amount || 1;
              shouldIncrement = true;
            }
            break;
          case 'deposits':
            if (actionType === 'deposit') shouldIncrement = true;
            break;
          case 'dailyMissionsDone':
            if (actionType === 'missionCompleted' && metadata.missionId?.startsWith('d_')) shouldIncrement = true;
            break;
          case 'weeklyXP':
            if (actionType === 'xpEarned') {
              incrementBy = metadata.amount || 0;
              shouldIncrement = true;
            }
            break;
        }
        
        if (shouldIncrement) {
          newProgress[mission.id] = (newProgress[mission.id] || 0) + incrementBy;
        } else if (setTo !== null) {
          newProgress[mission.id] = setTo;
        }
        
        // Check completion
        if (!newComplete.includes(mission.id) && (newProgress[mission.id] || 0) >= mission.target) {
          newComplete.push(mission.id);
          bonusCoins += mission.reward.kwacha || 0;
          bonusGems += mission.reward.gems || 0;
          bonusXP += mission.xp || 0;
          justCompleted.push(mission);
        }
      });
      
      // Show completion notifications (delayed so state updates first)
      if (justCompleted.length > 0) {
        setTimeout(() => {
          justCompleted.forEach(m => {
            const won = [...rewardParts(m.reward), m.xp ? amountText(m.xp, 'xp') : null].filter(Boolean);
            showNotif(`✅ Mission Complete: ${m.name}!${won.length ? ` +${won.join(' + ')}` : ''}`);
            triggerReward('small', null, { coins: m.reward?.kwacha || 0, gems: m.reward?.gems || 0, xp: m.xp || 0 });
            track('mission_completed', { meta: { missionId: m.id } });
            // Track weekly mission for daily missions completed
            if (m.id.startsWith('d_')) {
              trackMission('missionCompleted', { missionId: m.id });
            }
          });
        }, 300);
      }
      
      return {
        ...prev,
        kwacha: prev.kwacha + bonusCoins,
        gems: prev.gems + bonusGems,
        xp: prev.xp + bonusXP,
        missionProgress: newProgress,
        missionsComplete: newComplete,
      };
    });
  }, [showNotif]);


// ============ GamificationPlatform.jsx claimDailyReward: streak milestone payout (after showNotif/triggerReward) ============
    // Streak milestone bonus — credited the moment the streak reaches it.
    // Fires once per streak run (the streak passes each value exactly once);
    // rebuilding a broken streak earns the milestones again by design.
    const sb = (cfg.streakRewards || []).find(s => s.days === newStreak);
    if (sb) {
      if (sb.kwacha) addCoins(sb.kwacha);
      if (sb.gems) addGems(sb.gems);
      if (sb.diamonds) addDiamonds(sb.diamonds);
      track('streak_bonus', { amount: sb.kwacha || 0, meta: { days: sb.days } });
      setTimeout(() => {
        showNotif(`🔥 ${sb.days}-day streak bonus — +${sb.kwacha} Coins!`);
        triggerReward('big', null, { coins: sb.kwacha || undefined, gems: sb.gems, diamonds: sb.diamonds });
      }, 1400);
    }

// ============ components/redesign/EarnView.jsx: Streak Bonuses + Level Milestones section ============
// (rendered below the missions as <RewardsSection xp streak streakRewards levelRewards />;
//  Level Milestones is still live in EarnView — only the Streak Bonuses block was removed)
function MilestoneRow({ icon, title, sub, reward, reached, current }) {
  return (
    <Card style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, border: current ? `1.5px solid ${C.green}` : '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ width: 38, height: 38, flex: 'none', borderRadius: 10, background: C.track, display: 'grid', placeItems: 'center', fontSize: 20 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted }}>{sub}</div>}
      </div>
      <RewardChips r={reward} />
      <div style={{ width: 26, flex: 'none', display: 'grid', placeItems: 'center' }}>
        {reached ? <Check size={18} color={C.green} /> : <Lock size={15} color={C.muted} />}
      </div>
    </Card>
  );
}

function RewardsSection({ xp = 0, streak = 1, streakRewards = null, levelRewards = null }) {
  const curLevel = getLevel(xp).level;
  const lvlRewards = levelRewards || LEVEL_REWARDS;
  const strRewards = streakRewards || STREAK_REWARDS;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <section>
        <SectionTitle>Streak Bonuses</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {strRewards.map(s => (
            <MilestoneRow key={s.days} icon="🔥" title={`${s.days}-day streak`} sub={`Log in ${s.days} days in a row · you're on ${streak}`}
              reward={s} reached={streak >= s.days} current={false} />
          ))}
        </div>
      </section>
      <section>
        <SectionTitle>Level Milestones</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {XP_LEVELS.filter(l => lvlRewards[l.level]).map(l => (
            <MilestoneRow key={l.level} icon={l.icon} title={l.name} sub={`Reach level ${l.level} · ${l.xp.toLocaleString()} XP`}
              reward={lvlRewards[l.level]} reached={curLevel >= l.level} current={curLevel + 1 === l.level} />
          ))}
        </div>
      </section>
    </div>
  );
}


// ============ components/redesign/EarnView.jsx: old grid MissionCard (thumbnail + difficulty badge) ============
function MissionCard({ m, progress, done, onOpen, i = 0 }) {
  const pct = done ? 100 : Math.min(100, Math.round(((progress || 0) / m.target) * 100));
  const d = DIFF[m.difficulty] || DIFF.easy;
  return (
    <Card className="card-enter" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer', animationDelay: `${i * 40}ms` }}>
      <button onClick={() => onOpen && onOpen(m)} style={{ all: 'unset', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
        <div style={{ position: 'relative' }}>
          <Thumb src={IMAGES[m.image]} alt={m.name} h={78} radius={0} />
          <span style={{ position: 'absolute', top: 6, right: 6, zIndex: 2 }}><Badge bg={done ? C.green : d.c} color={done ? '#08210f' : '#08210f'}>{done ? 'Done' : d.label}</Badge></span>
        </div>
        <div style={{ padding: '10px 11px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text, marginBottom: 6, lineHeight: 1.2 }}>{m.name}</div>
          <Progress value={pct} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 800 }}>
              <span style={{ color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 4 }}><RewardIcon kind="coins" size={15} />{amountText(m.reward.kwacha, 'coins')}</span>
              {m.reward.gems ? <span style={{ color: C.teal, display: 'inline-flex', alignItems: 'center', gap: 4 }}><RewardIcon kind="gem" size={14} />{amountText(m.reward.gems, 'gems')}</span> : null}
            </span>
            <span style={{ fontSize: 11, color: C.muted }}>{done ? m.target : (progress || 0)}/{m.target}</span>
          </div>
        </div>
      </button>
    </Card>
  );
}

