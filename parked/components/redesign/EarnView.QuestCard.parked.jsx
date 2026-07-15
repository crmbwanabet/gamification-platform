// v2 quest list card, extracted from components/redesign/EarnView.jsx on 2026-07-15 (quests parked).
// To restore: move back into EarnView.jsx, re-add the QUESTS import + SUBS entry + earn.quests render
// branch, and the questProgress/questsComplete/onOpenQuest props threaded from GamificationPlatform.
function QuestCard({ q, questProgress, questsComplete, onOpen }) {
  const done = questsComplete?.includes(q.id);
  const prog = questProgress?.[q.id] || {};
  const stepsDone = q.steps.filter(s => (prog[s.id] || 0) >= s.target).length;
  const pct = done ? 100 : Math.round((stepsDone / q.steps.length) * 100);
  const d = DIFF[q.difficulty] || DIFF.easy;
  return (
    <Card style={{ padding: 14, display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer' }}>
      <button onClick={() => onOpen && onOpen(q)} style={{ all: 'unset', display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer', width: '100%' }}>
        <div style={{ width: 110, flex: 'none' }}><Thumb src={IMAGES[q.image]} alt={q.name} h={84} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{q.name}</span>
            <Badge bg={done ? C.green : d.c}>{done ? 'Done' : d.label}</Badge>
          </div>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>{q.desc}</div>
          <Progress value={pct} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 800 }}>
              <span style={{ color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 4 }}><RewardIcon kind="coins" size={15} />{q.reward.kwacha}</span>
              {q.reward.gems && <span style={{ color: C.teal, display: 'inline-flex', alignItems: 'center', gap: 4 }}><RewardIcon kind="gem" size={14} />{q.reward.gems}</span>}
            </span>
            <span style={{ fontSize: 11, color: C.muted }}>{stepsDone}/{q.steps.length} steps</span>
          </div>
        </div>
      </button>
    </Card>
  );
}
