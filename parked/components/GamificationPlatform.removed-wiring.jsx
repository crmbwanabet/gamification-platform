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
