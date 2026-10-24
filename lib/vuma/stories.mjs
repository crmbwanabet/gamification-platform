// The football journey (owner documents of 2026-10-24, "BwanaBet Football
// Journey" + "115 skill unlocks"): 23 locations x 5 sub-levels. Every sub-level
// has a story, a quest (shown as "Working towards") and a skill (a badge the
// player collects; owner 2026-10-24 picked STORY ONLY: no skill changes any
// game). The grandmother is "Ambuya" everywhere (owner 2026-10-24; the
// documents say "Mbuya"). Story copy is still under owner review: edit it
// here, the test (tests/vuma-stories.test.mjs) checks every sub-level has all
// three. Ids are "<stage>.<sub>" (stage = location, 1..23).
// Pure ESM (node --test).

export const SUB_LEVELS_PER_STAGE = 5;

export const JOURNEY_END = 'From a makeshift ball in the village to World Cup glory, you have achieved the dream. But your greatest victory is giving the next generation a chance to begin their own journey.';

export const STORIES = Object.freeze([
  {
    "id": "1.1",
    "title": "The Bottle Ball",
    "story": "Your football is an empty plastic bottle, your pitch is the bush, and two pairs of shoes mark the goals. You play until Ambuya calls you home for supper.",
    "quest": "Score your first goals with whatever you can find.",
    "skill": "Bottle-Ball Control"
  },
  {
    "id": "1.2",
    "title": "The Dusty Pitch",
    "story": "The boys from the next compound have challenged your team. The pitch is rough, the ball barely rolls straight, but nobody wants to lose.",
    "quest": "Win your first informal village match.",
    "skill": "Short Passing"
  },
  {
    "id": "1.3",
    "title": "Last Goal Wins",
    "story": "The sun is going down, and everyone is tired. One last goal will decide who gets bragging rights until tomorrow.",
    "quest": "Score the winning goal before sunset.",
    "skill": "Last-Goal Focus"
  },
  {
    "id": "1.4",
    "title": "The Dream",
    "story": "You have watched the national team on television and imagined yourself wearing the Chipolopolo shirt. Your friends laugh, but you know what you want.",
    "quest": "Show that you can score consistently against the village boys.",
    "skill": "Shooting Instinct"
  },
  {
    "id": "1.5",
    "title": "Ambuya's Promise",
    "story": "Ambuya sees how serious you are about football. She tells you that if you keep working hard, she will find a way to get you a proper ball.",
    "quest": "Complete your first village football challenge and earn your first real football.",
    "skill": "First Football"
  },
  {
    "id": "2.1",
    "title": "A Ball of Your Own",
    "story": "Ambuya has been selling groundnuts at the market and saving a little at a time. She finally brings home a real leather ball, patched but round.",
    "quest": "Master your first proper football.",
    "skill": "First Touch"
  },
  {
    "id": "2.2",
    "title": "The Older Boys",
    "story": "The older boys let you join their game, but nobody passes to the newcomer. You must show them you can keep up.",
    "quest": "Complete successful passes against older opponents.",
    "skill": "Quick Feet"
  },
  {
    "id": "2.3",
    "title": "No Easy Goals",
    "story": "The older boys are stronger and faster. You learn to protect the ball, change direction and use your head instead of relying only on speed.",
    "quest": "Beat defenders and create scoring chances.",
    "skill": "Basic Dribbling"
  },
  {
    "id": "2.4",
    "title": "Earn Their Respect",
    "story": "A teammate finally passes you the ball when the match is on the line. You have one chance to prove that you belong.",
    "quest": "Score or assist in a decisive moment.",
    "skill": "Street Finishing"
  },
  {
    "id": "2.5",
    "title": "One of the Boys",
    "story": "The older boys begin calling you when they need another player. Your name is becoming known beyond your own compound.",
    "quest": "Earn a regular place in the informal team.",
    "skill": "Team Chemistry"
  },
  {
    "id": "3.1",
    "title": "The Selection",
    "story": "The village team is being selected for the coming season. Everyone wants a place, and there are more players than positions.",
    "quest": "Perform well enough to make the squad.",
    "skill": "Selection Trial"
  },
  {
    "id": "3.2",
    "title": "The Borrowed Shirt",
    "story": "Your shirt is borrowed and two sizes too big. Ambuya takes it in so that it fits properly.",
    "quest": "Complete your first team training session.",
    "skill": "Match Fitness"
  },
  {
    "id": "3.3",
    "title": "Boots That Bite",
    "story": "Your boots have tape around the toes. They are uncomfortable, but you learn to make every touch count.",
    "quest": "Improve your control and shooting accuracy.",
    "skill": "Ball Protection"
  },
  {
    "id": "3.4",
    "title": "Training Together",
    "story": "The team begins to understand each other's movements. You discover that football is not only about scoring goals.",
    "quest": "Create chances for your teammates.",
    "skill": "Team Passing"
  },
  {
    "id": "3.5",
    "title": "A Place in the Team",
    "story": "The coach announces the final squad. You have earned your place, and the village is beginning to take notice.",
    "quest": "Secure your place in the starting lineup.",
    "skill": "Starting XI"
  },
  {
    "id": "4.1",
    "title": "The Rival Village",
    "story": "The neighbouring village has beaten your team for three seasons. This time, everyone expects you to put up a fight.",
    "quest": "Prepare for the derby by completing training challenges.",
    "skill": "Match Preparation"
  },
  {
    "id": "4.2",
    "title": "Match-Day Nerves",
    "story": "The pitch is crowded, the drums are beating and the opposing supporters are making noise. You must keep your concentration.",
    "quest": "Complete the opening match without losing possession repeatedly.",
    "skill": "Nerve Control"
  },
  {
    "id": "4.3",
    "title": "Break the Deadlock",
    "story": "The match is tight, and neither team wants to give anything away. You spot a gap in the defence.",
    "quest": "Score the opening goal.",
    "skill": "Power Shot"
  },
  {
    "id": "4.4",
    "title": "Village Pride",
    "story": "The opposition fights back. Your team needs another strong performance to protect its lead.",
    "quest": "Help secure a derby victory.",
    "skill": "Clutch Finishing"
  },
  {
    "id": "4.5",
    "title": "The Headman's Challenge",
    "story": "The headman announces that the village will enter the village league. Now you must prove that the derby victory was not a one-off.",
    "quest": "Finish the derby campaign with a winning record.",
    "skill": "Derby Reputation"
  },
  {
    "id": "5.1",
    "title": "A Bigger Competition",
    "story": "Teams arrive from villages along the road. The players are faster, the tackles are harder, and every team wants the painted tin-cup trophy.",
    "quest": "Complete your first village league fixture.",
    "skill": "League Experience"
  },
  {
    "id": "5.2",
    "title": "Saturday Football",
    "story": "Every Saturday brings another match. You begin learning how to manage tired legs, difficult opponents and changing conditions.",
    "quest": "Record consecutive strong performances.",
    "skill": "Stamina Management"
  },
  {
    "id": "5.3",
    "title": "The Road to the Final",
    "story": "Your team is climbing the table. The supporters are talking about the trophy, but the remaining opponents will not make it easy.",
    "quest": "Win enough matches to reach the knockout stages.",
    "skill": "Winning Mentality"
  },
  {
    "id": "5.4",
    "title": "The Scout in the Crowd",
    "story": "People say a coach from the Copperbelt has come to watch the best players. You know this could be your chance.",
    "quest": "Deliver an outstanding performance in front of the scout.",
    "skill": "Scout Visibility"
  },
  {
    "id": "5.5",
    "title": "The Village Champions",
    "story": "Your team wins the league. The village celebrates, and the scout asks you to attend trials at a football academy.",
    "quest": "Win the village league and earn an academy trial.",
    "skill": "Academy Prospect"
  },
  {
    "id": "6.1",
    "title": "The Bus Journey",
    "story": "Ambuya packs nshima and dried fish for your journey. You have never travelled this far alone, and the academy feels like another world.",
    "quest": "Arrive at the academy and complete registration.",
    "skill": "Fitness Assessment"
  },
  {
    "id": "6.2",
    "title": "New Faces",
    "story": "Players have come from different parts of Zambia. Some are bigger, some are faster, and nearly all of them believe they will become professionals.",
    "quest": "Complete the initial fitness and skills assessments.",
    "skill": "Tactical Awareness"
  },
  {
    "id": "6.3",
    "title": "Trial by Fire",
    "story": "The coaches test your endurance, first touch, shooting and decision-making. Talent alone will not get you through.",
    "quest": "Pass the academy's technical and fitness trials.",
    "skill": "Precision Passing"
  },
  {
    "id": "6.4",
    "title": "Earn Your Place",
    "story": "The competition for squad positions is fierce. You must show that you can perform under pressure and work with the team.",
    "quest": "Win a place in the academy squad.",
    "skill": "Training Discipline"
  },
  {
    "id": "6.5",
    "title": "The First Contract",
    "story": "The academy coach recommends you for a trial with a town club. For the first time, a professional football career feels possible.",
    "quest": "Earn a trial invitation from Junction Rovers FC.",
    "skill": "Academy Graduate"
  },
  {
    "id": "7.1",
    "title": "A Club Badge",
    "story": "You receive your first club shirt with a real badge. It is a small club, but it represents a major step forward.",
    "quest": "Complete your first week of club training.",
    "skill": "Professional Ball Control"
  },
  {
    "id": "7.2",
    "title": "The Bench",
    "story": "The coach selects the starting eleven, and you are among the substitutes. You study every movement and listen to every instruction.",
    "quest": "Impress the coach during training and substitute appearances.",
    "skill": "Defensive Awareness"
  },
  {
    "id": "7.3",
    "title": "Your First Minutes",
    "story": "An injury gives you a chance to enter the match. You have limited time to show what you can do.",
    "quest": "Make a positive impact in your first senior appearance.",
    "skill": "Impact Substitute"
  },
  {
    "id": "7.4",
    "title": "The First Goal",
    "story": "You finally get a clear opportunity in front of goal. You must stay composed and finish the chance.",
    "quest": "Score your first goal for Junction Rovers.",
    "skill": "Finishing Technique"
  },
  {
    "id": "7.5",
    "title": "A Regular Starter",
    "story": "Your performances have earned the coach's trust. You are no longer just a promising youngster waiting on the bench.",
    "quest": "Establish yourself in the starting eleven.",
    "skill": "First-Team Status"
  },
  {
    "id": "8.1",
    "title": "Proper Football",
    "story": "The amateur league has referees, proper goal nets and away supporters who will boo every touch. Football has become more serious.",
    "quest": "Adapt to competitive amateur league football.",
    "skill": "Competitive Composure"
  },
  {
    "id": "8.2",
    "title": "The Elephant's Strength",
    "story": "Nsofu means elephant. The team expects its striker to hold off defenders, win duels and lead the attack.",
    "quest": "Improve your physical duels and hold-up play.",
    "skill": "Hold-Up Play"
  },
  {
    "id": "8.3",
    "title": "Away-Day Pressure",
    "story": "The away team is given no favours. The pitch is uneven, the crowd is hostile and your teammates need you to stay composed.",
    "quest": "Earn a result in an away fixture.",
    "skill": "Away-Day Focus"
  },
  {
    "id": "8.4",
    "title": "Finding the Net",
    "story": "You are learning to read defenders and anticipate rebounds. A good striker is often in the right place before anyone else notices.",
    "quest": "Score in consecutive league matches.",
    "skill": "Rebound Finishing"
  },
  {
    "id": "8.5",
    "title": "The Breakthrough Season",
    "story": "Your name is appearing on the league's scoring charts. Bigger clubs have begun asking about you.",
    "quest": "Finish the amateur league campaign among the leading scorers.",
    "skill": "Goal Poacher"
  },
  {
    "id": "9.1",
    "title": "A Stronger Club",
    "story": "Mphamvu means strength. The club expects more from you, and your new teammate, the goalkeeper, snores so loudly that sleep becomes another challenge.",
    "quest": "Adapt to the club's training standards.",
    "skill": "Strength Training"
  },
  {
    "id": "9.2",
    "title": "Stronger Defenders",
    "story": "Defenders are more organised and leave less space. You must improve your movement rather than simply rely on pace.",
    "quest": "Create and convert chances against organised defences.",
    "skill": "Off-the-Ball Movement"
  },
  {
    "id": "9.3",
    "title": "The Pressure Builds",
    "story": "The team depends on your goals. Opponents begin marking you closely, forcing you to find new ways to contribute.",
    "quest": "Score or assist when facing tight marking.",
    "skill": "Marking Escape"
  },
  {
    "id": "9.4",
    "title": "The Scoring Race",
    "story": "You are among the top scorers, but another striker is closing the gap. Every match now matters.",
    "quest": "Maintain your scoring form during the final fixtures.",
    "skill": "Consistent Finishing"
  },
  {
    "id": "9.5",
    "title": "Top of the Charts",
    "story": "You finish the season as the league's leading scorer. Your performances attract interest from clubs in the big city.",
    "quest": "Finish as top scorer and earn a trial with Mulilo Stars FC.",
    "skill": "Golden Boot Contender"
  },
  {
    "id": "10.1",
    "title": "Welcome to the City",
    "story": "The city is louder, faster and more demanding than anything you have known. Mulilo means fire, and the club expects you to play with intensity.",
    "quest": "Adapt to the city's training and match schedule.",
    "skill": "Urban Adaptation"
  },
  {
    "id": "10.2",
    "title": "The Big Crowd",
    "story": "Thousands of supporters fill the stands. The noise is intimidating, but you begin to understand how much a big crowd can lift a player.",
    "quest": "Perform confidently in front of a large crowd.",
    "skill": "Crowd Confidence"
  },
  {
    "id": "10.3",
    "title": "Fire in the Attack",
    "story": "Your teammates expect quick movement and decisive finishing. Slow decisions can destroy a promising attack.",
    "quest": "Complete attacking combinations and score from open play.",
    "skill": "One-Two Passing"
  },
  {
    "id": "10.4",
    "title": "The Promotion Push",
    "story": "The club is fighting for promotion. A few poor results could undo months of hard work.",
    "quest": "Help the team win crucial promotion matches.",
    "skill": "Promotion Specialist"
  },
  {
    "id": "10.5",
    "title": "Ready for the Next Step",
    "story": "Mulilo's campaign has brought you to the attention of Kalulu FC. Scouts see a striker capable of playing at a higher level.",
    "quest": "Complete the season strongly and earn a move to Kalulu FC.",
    "skill": "Big-Club Scout"
  },
  {
    "id": "11.1",
    "title": "The Clever Hare",
    "story": "Kalulu means hare. The club values speed, clever movement and the ability to outthink defenders.",
    "quest": "Master quick movement and attacking combinations.",
    "skill": "Acceleration"
  },
  {
    "id": "11.2",
    "title": "Find the Space",
    "story": "Defenders watch your runs carefully. You learn to change direction, time your movement and exploit small gaps.",
    "quest": "Create scoring opportunities through intelligent positioning.",
    "skill": "Deceptive Movement"
  },
  {
    "id": "11.3",
    "title": "The Lusaka Scouts",
    "story": "Scouts from Lusaka clubs have started sitting in the stands. You know that one excellent match could change your career.",
    "quest": "Deliver a standout performance in a scouted fixture.",
    "skill": "Scout Showcase"
  },
  {
    "id": "11.4",
    "title": "The Big Opportunity",
    "story": "A Lusaka club invites you for a professional trial. The opportunity is exciting, but the standard is higher than ever.",
    "quest": "Pass the professional club's technical and tactical assessment.",
    "skill": "Advanced Trial"
  },
  {
    "id": "11.5",
    "title": "The Contract Offer",
    "story": "Kafue Gaels FC offers you your first professional contract. You have come a long way from the bottle ball in the village.",
    "quest": "Sign your first professional contract.",
    "skill": "Professional Contract"
  },
  {
    "id": "12.1",
    "title": "A Professional at Last",
    "story": "Your first salary arrives. You send money home to Ambuya, who buys a new radio so she can follow your matches.",
    "quest": "Complete your first professional training week.",
    "skill": "Professional Recovery"
  },
  {
    "id": "12.2",
    "title": "The Standard Rises",
    "story": "Professional football demands consistency, discipline and recovery. You must learn to prepare properly between matches.",
    "quest": "Maintain performance across consecutive fixtures.",
    "skill": "Match Consistency"
  },
  {
    "id": "12.3",
    "title": "Fight for the Shirt",
    "story": "The club has experienced players competing for the same position. Your talent must translate into reliable performances.",
    "quest": "Earn a starting place through match performances.",
    "skill": "First-Team Competition"
  },
  {
    "id": "12.4",
    "title": "Points on the Board",
    "story": "Every league result affects the table. The team needs goals, but it also needs players who understand when to protect a lead.",
    "quest": "Help secure vital league points.",
    "skill": "Game Management"
  },
  {
    "id": "12.5",
    "title": "A Professional Reputation",
    "story": "You finish the campaign as an established first-team player. Bigger clubs are beginning to see you as a serious prospect.",
    "quest": "Complete a strong professional season and attract interest from Crimson Arrows FC.",
    "skill": "Professional Reputation"
  },
  {
    "id": "13.1",
    "title": "A Bigger Stage",
    "story": "Crimson Arrows offers better facilities, a grass training pitch and a physio. You quickly realise that professional standards have another level.",
    "quest": "Adapt to the club's advanced training programme.",
    "skill": "Elite Training"
  },
  {
    "id": "13.2",
    "title": "The Competition",
    "story": "The squad includes experienced strikers who have scored goals at this level for years. Nobody will hand you a starting place.",
    "quest": "Outperform your rivals during training and friendly matches.",
    "skill": "Advanced Finishing"
  },
  {
    "id": "13.3",
    "title": "Sharpen the Finishing",
    "story": "You work on first-time finishes, headers and shots under pressure. The smallest technical improvement can decide a match.",
    "quest": "Complete a finishing challenge with consistent accuracy.",
    "skill": "Aerial Threat"
  },
  {
    "id": "13.4",
    "title": "The Decisive Run",
    "story": "An important run of fixtures arrives. The club needs a striker who can deliver when the pressure is highest.",
    "quest": "Score in decisive matches during the campaign.",
    "skill": "Big-Match Striker"
  },
  {
    "id": "13.5",
    "title": "First Choice",
    "story": "You become Crimson Arrows' first-choice striker. Your name is now recognised across the league.",
    "quest": "Secure your place as the club's leading striker and attract national-team attention.",
    "skill": "First-Choice Striker"
  },
  {
    "id": "14.1",
    "title": "The Big Club",
    "story": "Energy Dynamos is one of the country's biggest clubs. The supporters expect victories, and the media scrutinise every performance.",
    "quest": "Adapt to the demands of elite domestic football.",
    "skill": "Elite Match Fitness"
  },
  {
    "id": "14.2",
    "title": "Under the Spotlight",
    "story": "Your name appears in newspapers and sports discussions. You must learn to handle praise and criticism without losing focus.",
    "quest": "Deliver consistent performances under media attention.",
    "skill": "Media Pressure Control"
  },
  {
    "id": "14.3",
    "title": "The Title Challenge",
    "story": "Energy Dynamos is competing for the league title. Every point matters, and the pressure grows with each round.",
    "quest": "Help the club remain in contention for the title.",
    "skill": "Title-Challenge Mentality"
  },
  {
    "id": "14.4",
    "title": "Chipolopolo Watch",
    "story": "National-team selectors are watching your performances. The dream of wearing Zambia's colours is getting closer.",
    "quest": "Deliver an outstanding performance in a high-profile fixture.",
    "skill": "International Scout Network"
  },
  {
    "id": "14.5",
    "title": "The Call-Up",
    "story": "The coach announces the national-team squad, and your name is on the list. Years of work have brought you to this moment.",
    "quest": "Earn your first Zambia national-team selection.",
    "skill": "Zambia Call-Up"
  },
  {
    "id": "15.1",
    "title": "The Champions' Dressing Room",
    "story": "ZEMCO United, the champions, sign you. The club has trophies, experienced players and a demanding winning culture.",
    "quest": "Settle into the squad and meet the club's performance standards.",
    "skill": "Champion's Training"
  },
  {
    "id": "15.2",
    "title": "The Zambia Shirt",
    "story": "You receive your national-team shirt. Back home, Ambuya and the whole village gather around one television to watch your debut.",
    "quest": "Make your first appearance for Zambia.",
    "skill": "International Debut"
  },
  {
    "id": "15.3",
    "title": "Carry the Flag",
    "story": "Playing for your country brings a different kind of pressure. You must perform for your teammates and for supporters across Zambia.",
    "quest": "Deliver a strong performance in an international fixture.",
    "skill": "National Pride"
  },
  {
    "id": "15.4",
    "title": "Continental Ambitions",
    "story": "Zambia targets success in regional and continental competition. You must prove that you can compete against top African opposition.",
    "quest": "Score or assist in a major international match.",
    "skill": "Continental Finishing"
  },
  {
    "id": "15.5",
    "title": "Europe Is Calling",
    "story": "Your performances attract international interest. An opportunity to move abroad arrives, and you prepare for the biggest change in your career so far.",
    "quest": "Earn a transfer to Shaka Chiefs in South Africa.",
    "skill": "International Transfer Market"
  },
  {
    "id": "16.1",
    "title": "A New Country",
    "story": "You arrive in Soweto, where football is part of everyday conversation. The language, lifestyle and football culture are different, but the ambition is familiar.",
    "quest": "Settle into the club and adapt to South African football.",
    "skill": "Cross-Border Adaptation"
  },
  {
    "id": "16.2",
    "title": "Vilakazi Street",
    "story": "The streets are busy, the supporters are passionate and every derby is an event. You begin to understand the scale of the local rivalry.",
    "quest": "Perform in your first major derby.",
    "skill": "Derby Specialist"
  },
  {
    "id": "16.3",
    "title": "Earn Respect",
    "story": "The dressing room contains players with different backgrounds and playing styles. Respect comes through hard work, not reputation.",
    "quest": "Earn your teammates' trust through consistent performances.",
    "skill": "Dressing-Room Leadership"
  },
  {
    "id": "16.4",
    "title": "The Big Match",
    "story": "A major fixture offers a chance to show that you can perform under intense pressure. The crowd wants a hero.",
    "quest": "Score or assist in a high-profile match.",
    "skill": "Pressure Finishing"
  },
  {
    "id": "16.5",
    "title": "The European Opportunity",
    "story": "Your performances attract interest from an English club. The move to Europe is no longer just a dream.",
    "quest": "Complete a successful season and earn a move to Bristol Wanderers.",
    "skill": "European Scouting"
  },
  {
    "id": "17.1",
    "title": "Cold Rain",
    "story": "England greets you with cold rain, unfamiliar food and training sessions in muddy conditions. Ambuya says you sound thin on the phone, so you buy a proper winter coat.",
    "quest": "Adapt to the weather, training and lifestyle.",
    "skill": "Weather Adaptation"
  },
  {
    "id": "17.2",
    "title": "The Pace of English Football",
    "story": "The game moves faster, defenders close down quickly and every mistake is punished. You must make decisions earlier.",
    "quest": "Improve your speed of decision-making under pressure.",
    "skill": "Rapid Decisions"
  },
  {
    "id": "17.3",
    "title": "Goals in Winter",
    "story": "Matches come thick and fast. Your body must recover between fixtures, and your form must survive the demanding schedule.",
    "quest": "Score consistently through a difficult run of matches.",
    "skill": "Fixture Recovery"
  },
  {
    "id": "17.4",
    "title": "Prove Your Value",
    "story": "The media question whether you can adapt to English football. Your performances, rather than your reputation, must answer them.",
    "quest": "Deliver a match-winning performance against a strong opponent.",
    "skill": "Big-Match Reputation"
  },
  {
    "id": "17.5",
    "title": "A Bigger Club Calls",
    "story": "You have adapted to English football and become an important player. Leeds Allied offers you a chance to compete at a higher level.",
    "quest": "Complete the Bristol campaign and secure the move to Leeds.",
    "skill": "English Football Experience"
  },
  {
    "id": "18.1",
    "title": "A Loud Stadium",
    "story": "The stadium is bigger, the supporters are demanding and every match feels important. You must learn to thrive under constant attention.",
    "quest": "Adapt to the club's tactical system.",
    "skill": "Tactical Versatility"
  },
  {
    "id": "18.2",
    "title": "The Promotion Race",
    "story": "Leeds Allied is chasing promotion. The schedule is demanding, and the table can change dramatically after one weekend.",
    "quest": "Help the club collect points during the promotion campaign.",
    "skill": "Promotion Campaign"
  },
  {
    "id": "18.3",
    "title": "The Tight Defence",
    "story": "Opponents defend deep to stop you scoring. You must find ways to create space when the obvious route is blocked.",
    "quest": "Break down defensive teams and convert difficult chances.",
    "skill": "Defensive Breaker"
  },
  {
    "id": "18.4",
    "title": "The Final Stretch",
    "story": "The decisive fixtures arrive. The club's ambitions depend on players who can handle pressure without losing their discipline.",
    "quest": "Deliver strong performances in the final promotion fixtures.",
    "skill": "Pressure Performance"
  },
  {
    "id": "18.5",
    "title": "Promotion Achieved",
    "story": "Leeds Allied reaches the top league. Your performances attract interest from Aston Manor, a club competing at the highest level.",
    "quest": "Complete the promotion campaign and earn a move to Aston Manor.",
    "skill": "Top-League Promotion"
  },
  {
    "id": "19.1",
    "title": "The Top League",
    "story": "You are now playing against footballers you watched on television back home. Their speed, strength and technical ability leave no room for complacency.",
    "quest": "Adapt to top-league football.",
    "skill": "Elite Opposition Experience"
  },
  {
    "id": "19.2",
    "title": "No Easy Chances",
    "story": "Defenders anticipate your runs and close down every opportunity. You must become more precise in the penalty area.",
    "quest": "Convert chances against elite defenders.",
    "skill": "Precision Finishing"
  },
  {
    "id": "19.3",
    "title": "The Famous Opponents",
    "story": "Your fixtures now include some of the biggest clubs in England. These are the matches you dreamed about as a child.",
    "quest": "Make a decisive contribution against a major opponent.",
    "skill": "Big-Club Scoring"
  },
  {
    "id": "19.4",
    "title": "A Name in the League",
    "story": "Your performances attract attention from clubs competing for trophies. You are no longer simply trying to prove that you belong.",
    "quest": "Maintain strong form against top-ranked teams.",
    "skill": "Elite Reputation"
  },
  {
    "id": "19.5",
    "title": "The Giant Club Calls",
    "story": "Chelsea SC offers you a place in its squad. The move brings global attention and a new level of expectation.",
    "quest": "Earn a transfer to Chelsea SC.",
    "skill": "Global Transfer Market"
  },
  {
    "id": "20.1",
    "title": "A World-Famous Shirt",
    "story": "You pull on a shirt recognised around the world. The training facilities are exceptional, but the competition for places is relentless.",
    "quest": "Adapt to elite-club training and tactical demands.",
    "skill": "Elite Training Ground"
  },
  {
    "id": "20.2",
    "title": "Compete with the Best",
    "story": "Your teammates include international stars. You must earn their respect and prove that your performances justify your place.",
    "quest": "Win a starting role through consistent performances.",
    "skill": "World-Class Competition"
  },
  {
    "id": "20.3",
    "title": "The Trophy Hunt",
    "story": "The club expects to compete for major trophies every season. A good performance is not enough if the team fails to win.",
    "quest": "Help Chelsea SC progress through a major cup competition.",
    "skill": "Cup Specialist"
  },
  {
    "id": "20.4",
    "title": "The Decisive Goal",
    "story": "A crucial match reaches its final minutes. One chance could decide the result and define your season.",
    "quest": "Score or assist a decisive goal in a major fixture.",
    "skill": "Decisive Goal"
  },
  {
    "id": "20.5",
    "title": "A Move to Manchester",
    "story": "Manchester Union makes an offer. It is one of the most famous clubs on earth, and Zambia is watching your next step.",
    "quest": "Earn a transfer to Manchester Union.",
    "skill": "Superstar Status"
  },
  {
    "id": "21.1",
    "title": "Among the Elite",
    "story": "You arrive at one of the world's most famous clubs. Every training session is competitive, and every match is scrutinised.",
    "quest": "Establish yourself in the starting lineup.",
    "skill": "Elite First-Team Status"
  },
  {
    "id": "21.2",
    "title": "Captain Zambia",
    "story": "You are appointed captain of the national team. It is an honour that carries responsibility for every player wearing the Chipolopolo shirt.",
    "quest": "Lead Zambia through a series of international fixtures.",
    "skill": "Captain's Authority"
  },
  {
    "id": "21.3",
    "title": "The Qualifying Campaign",
    "story": "Zambia begins its World Cup qualifying campaign. Every result affects the country's hopes of reaching the biggest tournament in football.",
    "quest": "Help Zambia collect crucial qualifying points.",
    "skill": "Qualifying Specialist"
  },
  {
    "id": "21.4",
    "title": "The Pressure of History",
    "story": "The team approaches the decisive stage of qualification. Supporters across the country follow every result, hoping to see Zambia on the world stage.",
    "quest": "Deliver a decisive performance during World Cup qualification.",
    "skill": "National-Team Clutch"
  },
  {
    "id": "21.5",
    "title": "Zambia Qualifies",
    "story": "Zambia secures its place at the World Cup. Back in the village, Ambuya celebrates with neighbours who remember the boy who played with an empty bottle.",
    "quest": "Lead Zambia into the World Cup finals.",
    "skill": "World Cup Qualification"
  },
  {
    "id": "22.1",
    "title": "The World Stage",
    "story": "The World Cup begins. The best teams in the world are gathered together, and Zambia is ready to show what it can do.",
    "quest": "Complete your first World Cup appearance.",
    "skill": "World Cup Debut"
  },
  {
    "id": "22.2",
    "title": "The Group Stage",
    "story": "Every match matters. One goal can change the table, and one mistake can send a team home.",
    "quest": "Help Zambia progress from the group stage.",
    "skill": "Tournament Composure"
  },
  {
    "id": "22.3",
    "title": "The Knockout Rounds",
    "story": "The pressure rises as the tournament moves into the knockout stages. There is no second chance if the team loses.",
    "quest": "Help Zambia win a knockout match.",
    "skill": "Knockout Specialist"
  },
  {
    "id": "22.4",
    "title": "One Match from Glory",
    "story": "Zambia reaches the final stages of the tournament. The players know they are close to making history.",
    "quest": "Lead Zambia to the World Cup final.",
    "skill": "Final-Bound Leadership"
  },
  {
    "id": "22.5",
    "title": "World Champions",
    "story": "Zambia wins the World Cup. Back home, a television has been placed beneath the mango tree, and Ambuya has the best seat in the village. The boy who dreamed of representing his country has become a national hero.",
    "quest": "Win the World Cup for Zambia.",
    "skill": "World Champion"
  },
  {
    "id": "23.1",
    "title": "A Legend's Contract",
    "story": "After a historic career, you sign a major contract with Doha Dam SC. You have earned financial security and the freedom to decide what comes next.",
    "quest": "Complete your first season at Doha Dam SC.",
    "skill": "Legend's Contract"
  },
  {
    "id": "23.2",
    "title": "Give Ambuya a Home",
    "story": "You build Ambuya a beautiful new house. She walks through every room, smiling at the comfort that years of sacrifice have finally brought her.",
    "quest": "Complete the house-building milestone.",
    "skill": "Family Fortune"
  },
  {
    "id": "23.3",
    "title": "Back to the Village",
    "story": "You return home to find the village children playing football on the same dusty ground where your journey began.",
    "quest": "Return to the village and organise a community football event.",
    "skill": "Community Leadership"
  },
  {
    "id": "23.4",
    "title": "No More Tied Chickens",
    "story": "You build a proper football pitch with real goalposts, a level playing surface and space for the whole community to watch matches.",
    "quest": "Complete the village football ground.",
    "skill": "Grassroots Football"
  },
  {
    "id": "23.5",
    "title": "A Legacy Begins",
    "story": "Children gather for the opening match on the new pitch. One of them is playing with a makeshift ball and dreaming of representing Zambia. You recognise that look because you once had it yourself.",
    "quest": "Complete the final quest and establish the village football legacy.",
    "skill": "Living Legend"
  }
].map(s => Object.freeze(s)));

const BY_ID = new Map(STORIES.map(s => [s.id, s]));

/** The story of sub-level `sub` (1..5) at `stage` (1..23), or null. */
export function storyFor(stage, sub) {
  return BY_ID.get(`${stage}.${sub}`) || null;
}
