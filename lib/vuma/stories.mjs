// The football journey: 23 locations x 5 sub-levels, one story per sub-level,
// shown in the level-up pop-up's collapsible "Your story" box and the header
// "My story" bubble. Rewritten 2026-10-27 in very simple English (owner:
// players who do not speak English well; short sentences, no sayings) from the
// owner documents of 2026-10-24 ("BwanaBet Football Journey"). Each entry:
//   title  — 2-4 words
//   teaser — the closed story bar (max 40 characters)
//   won    — "You did it": what reaching this level achieved
//   next   — "What comes next": why the next level matters
//   when   — a story deadline tag ("Match in 3 days"); STORY ONLY, no rule
//            behind it (owner 2026-10-27), like the "Finish 3 missions" tag
// The grandmother is "Ambuya" everywhere; the hero is "you". Ids are
// "<stage>.<sub>". tests/vuma-stages.test.mjs checks all 115.
// Pure ESM (node --test).

export const SUB_LEVELS_PER_STAGE = 5;

export const STORIES = Object.freeze([
  {
    "id": "1.1",
    "title": "The Bottle Ball",
    "teaser": "You play with a bottle!",
    "won": "You did it! You score your first goals with an empty bottle. Ambuya calls you home for supper.",
    "next": "The boys from the next compound want a match. The pitch is rough. Win the game.",
    "when": "Match tomorrow"
  },
  {
    "id": "1.2",
    "title": "The Dusty Pitch",
    "teaser": "You beat the next compound!",
    "won": "You did it! You win your first village match on the dusty pitch. Your friends cheer for you!",
    "next": "The sun is going down and everyone is tired. Score the last goal.",
    "when": "Before sunset"
  },
  {
    "id": "1.3",
    "title": "Last Goal Wins",
    "teaser": "Your last goal wins the game!",
    "won": "You did it! You score the winning goal before the sun goes down. Everyone shouts your name!",
    "next": "You watch the national team on television. Show the village boys you can score again and again.",
    "when": "Next game"
  },
  {
    "id": "1.4",
    "title": "The Dream",
    "teaser": "You score on the village boys!",
    "won": "You did it! You score against the village boys again and again. Your friends stop laughing.",
    "next": "Ambuya sees how hard you work. Keep going. She wants to get you a real ball.",
    "when": "Keep working"
  },
  {
    "id": "1.5",
    "title": "Ambuya's Promise",
    "teaser": "Ambuya will find you a ball!",
    "won": "You did it! You finish your first village challenge. Ambuya is proud of you!",
    "next": "Ambuya sells groundnuts at the market. She saves a little money each day. Soon she brings you a ball.",
    "when": "Ball in 3 days"
  },
  {
    "id": "2.1",
    "title": "A Ball of Your Own",
    "teaser": "You have a real leather ball!",
    "won": "You did it! Ambuya gives you a real leather ball. It is old, but it is round. You love it!",
    "next": "The older boys play a game. They do not pass to you. Show them you can keep up.",
    "when": "Game on Saturday"
  },
  {
    "id": "2.2",
    "title": "The Older Boys",
    "teaser": "The older boys pass to you!",
    "won": "You did it! You make good passes against the older boys. They start to see you.",
    "next": "The older boys are big and fast. Learn to keep the ball. Change direction and use your head.",
    "when": "Next game"
  },
  {
    "id": "2.3",
    "title": "No Easy Goals",
    "teaser": "You can beat big boys now!",
    "won": "You did it! You protect the ball and beat the older boys. You use your head, not only your legs.",
    "next": "A teammate has the ball in a tight game. You get one chance. Make it count.",
    "when": "Tight game soon"
  },
  {
    "id": "2.4",
    "title": "Earn Their Respect",
    "teaser": "The older boys respect you!",
    "won": "You did it! Your goal wins the big game. The older boys clap for you!",
    "next": "The older boys start to call you. They need one more player. Show you are one of them.",
    "when": "Games all week"
  },
  {
    "id": "2.5",
    "title": "One of the Boys",
    "teaser": "You are one of the boys!",
    "won": "You did it! The older boys call your name when they need a player. People in other compounds know you now.",
    "next": "The village team is picking players for the new season. Many boys want a place. Do your best.",
    "when": "Trial in 5 days"
  },
  {
    "id": "3.1",
    "title": "The Selection",
    "teaser": "You are in the village team!",
    "won": "You did it! You play well in the trial. You get a place in the village team!",
    "next": "Your shirt is not yours. It is too big. Ambuya fixes it. Go to your first training.",
    "when": "Training on Monday"
  },
  {
    "id": "3.2",
    "title": "The Borrowed Shirt",
    "teaser": "Your shirt fits you now!",
    "won": "You did it! Ambuya makes the shirt fit you. You go to your first team training. You feel proud!",
    "next": "Your boots have tape on the toes. They hurt. Play well with them anyway.",
    "when": "Training this week"
  },
  {
    "id": "3.3",
    "title": "Boots That Bite",
    "teaser": "Taped boots, great control!",
    "won": "You did it! You play well in your old boots. Your control and shooting get better.",
    "next": "Your team starts to know how you move. Help your friends score. Football is not only goals.",
    "when": "Training this week"
  },
  {
    "id": "3.4",
    "title": "Training Together",
    "teaser": "You help your team score!",
    "won": "You did it! You pass well and your friends score. You learn that teams win together.",
    "next": "The coach will pick the final team soon. Show him you want a place.",
    "when": "Team list on Friday"
  },
  {
    "id": "3.5",
    "title": "A Place in the Team",
    "teaser": "You are in the first team!",
    "won": "You did it! The coach puts you in the first team. The village starts to know your name!",
    "next": "The next village has won against you for three years. Get ready for the big derby.",
    "when": "Derby in 7 days"
  },
  {
    "id": "4.1",
    "title": "The Rival Village",
    "teaser": "You are ready for the derby!",
    "won": "You did it! You train hard for the derby. Everyone in the village believes in you.",
    "next": "Drums beat and the other fans shout. Keep calm. Do not lose the ball.",
    "when": "Derby tomorrow"
  },
  {
    "id": "4.2",
    "title": "Match-Day Nerves",
    "teaser": "You stay calm in the noise!",
    "won": "You did it! You stay calm in the noisy crowd. You keep the ball well.",
    "next": "The game is tight. You see a space in their defence. Score the first goal.",
    "when": "Match is on now"
  },
  {
    "id": "4.3",
    "title": "Break the Deadlock",
    "teaser": "You score the first goal!",
    "won": "You did it! You see a gap and shoot. Your goal makes the crowd jump!",
    "next": "The other village fights back. Your team needs to keep the lead.",
    "when": "Second half"
  },
  {
    "id": "4.4",
    "title": "Village Pride",
    "teaser": "You beat the rival village!",
    "won": "You did it! Your team wins the derby. The village is so proud of you!",
    "next": "The headman has big news. The village will join the village league. Show one win is not luck.",
    "when": "League news soon"
  },
  {
    "id": "4.5",
    "title": "The Headman's Challenge",
    "teaser": "Your village joins the league!",
    "won": "You did it! You finish the derby season with wins. The headman is happy with you.",
    "next": "Teams from far villages come to the league. They are fast and strong. Play your first league game.",
    "when": "First game Saturday"
  },
  {
    "id": "5.1",
    "title": "A Bigger Competition",
    "teaser": "You play your first league game!",
    "won": "You did it! You play your first league game. The other teams are strong, but you are not afraid.",
    "next": "There is a game every Saturday. Your legs get tired. Keep playing well every week.",
    "when": "Game every Saturday"
  },
  {
    "id": "5.2",
    "title": "Saturday Football",
    "teaser": "You play well every Saturday!",
    "won": "You did it! You play well week after week. You learn to rest and stay strong.",
    "next": "Your team is going up the table. People talk about the trophy. Win more games.",
    "when": "Knockouts in 2 weeks"
  },
  {
    "id": "5.3",
    "title": "The Road to the Final",
    "teaser": "Your team reaches the knockouts!",
    "won": "You did it! Your team wins enough games. You are in the knockout games!",
    "next": "People say a coach from the Copperbelt is watching. Play your best in front of him.",
    "when": "Scout at next game"
  },
  {
    "id": "5.4",
    "title": "The Scout in the Crowd",
    "teaser": "The scout sees you play!",
    "won": "You did it! You play great in front of the scout. He writes your name down!",
    "next": "The final is coming. Win the league. Then the scout may ask you to come to the academy.",
    "when": "Final in 5 days"
  },
  {
    "id": "5.5",
    "title": "The Village Champions",
    "teaser": "Your village wins the league!",
    "won": "You did it! Your team wins the league. The whole village dances for you! The scout asks you to join the academy trials.",
    "next": "Ambuya packs nshima and dried fish. You travel far by bus. You go to the academy alone.",
    "when": "Bus leaves Monday"
  },
  {
    "id": "6.1",
    "title": "The Bus Journey",
    "teaser": "You reach the academy!",
    "won": "You did it! You travel far from home. You arrive at the Copperbelt Football Academy. Ambuya is proud of you!",
    "next": "Boys come from all over Zambia. They want to be pros. Pass the first tests.",
    "when": "Tests on Tuesday"
  },
  {
    "id": "6.2",
    "title": "New Faces",
    "teaser": "You pass the first tests!",
    "won": "You did it! You pass the first fitness and skills tests. You are not afraid of the big boys.",
    "next": "The coaches test your running, touch and shooting. Talent is not enough.",
    "when": "Trials this week"
  },
  {
    "id": "6.3",
    "title": "Trial by Fire",
    "teaser": "You pass the hard trials!",
    "won": "You did it! You pass the hard trials of the academy. The coaches see your work.",
    "next": "Every boy wants a place in the squad. Play under pressure. Work well with the team.",
    "when": "Squad list in 5 days"
  },
  {
    "id": "6.4",
    "title": "Earn Your Place",
    "teaser": "You are in the academy squad!",
    "won": "You did it! You win a place in the academy squad. You work hard every day!",
    "next": "The academy coach likes you. He tells a town club about you. Get ready for a trial.",
    "when": "Trial in 3 days"
  },
  {
    "id": "6.5",
    "title": "The Recommendation",
    "teaser": "A pro club wants to see you!",
    "won": "You did it! The coach sends your name to Junction Rovers FC. A pro life feels real now!",
    "next": "Junction Rovers FC gives you your first club shirt. Go to training for one week.",
    "when": "Training on Monday"
  },
  {
    "id": "7.1",
    "title": "A Club Badge",
    "teaser": "You wear a club badge!",
    "won": "You did it! You get your first club shirt with a real badge. It is a small club, but a big step!",
    "next": "The coach picks the team. You are on the bench. Watch and learn.",
    "when": "Team picked Friday"
  },
  {
    "id": "7.2",
    "title": "The Bench",
    "teaser": "The coach sees your work!",
    "won": "You did it! You work hard in training. The coach sees you. You listen to every word.",
    "next": "A player gets hurt in the game. The coach looks at you. Get ready to play.",
    "when": "Game on Saturday"
  },
  {
    "id": "7.3",
    "title": "Your First Minutes",
    "teaser": "You play your first game!",
    "won": "You did it! You come on and play well. You show what you can do!",
    "next": "You get a clear shot at goal. Stay calm. Score your first goal for Junction Rovers.",
    "when": "Next game"
  },
  {
    "id": "7.4",
    "title": "The First Goal",
    "teaser": "You score your first goal!",
    "won": "You did it! You score your first goal for Junction Rovers! The fans shout your name!",
    "next": "The coach trusts you now. Play well and win a place in the first eleven.",
    "when": "Keep playing well"
  },
  {
    "id": "7.5",
    "title": "A Regular Starter",
    "teaser": "You start every game now!",
    "won": "You did it! You are in the first eleven now. You are not on the bench any more!",
    "next": "Nsofu Boys FC plays in the amateur league. Here football is serious. Get ready.",
    "when": "New club soon"
  },
  {
    "id": "8.1",
    "title": "Proper Football",
    "teaser": "You play real league football!",
    "won": "You did it! You play in the amateur league now. You learn the game is serious.",
    "next": "Nsofu means elephant. The team needs a strong striker. Win the ball from big defenders.",
    "when": "Training this week"
  },
  {
    "id": "8.2",
    "title": "The Elephant's Strength",
    "teaser": "You are strong like an elephant!",
    "won": "You did it! You hold off defenders and win duels. You lead the attack!",
    "next": "The next game is far from home. The pitch is bad. The crowd is angry. Stay calm.",
    "when": "Away game Saturday"
  },
  {
    "id": "8.3",
    "title": "Away-Day Pressure",
    "teaser": "You get a result away!",
    "won": "You did it! You stay calm on a bad pitch. You get a good result away from home!",
    "next": "You learn to read defenders. A good striker is in the right place first.",
    "when": "Next 3 games"
  },
  {
    "id": "8.4",
    "title": "Finding the Net",
    "teaser": "You score game after game!",
    "won": "You did it! You score in game after game. Your name is on the list of top scorers.",
    "next": "Big clubs ask about you. Finish the season among the best scorers.",
    "when": "Last games soon"
  },
  {
    "id": "8.5",
    "title": "The Breakthrough Season",
    "teaser": "Big clubs ask about you!",
    "won": "You did it! You are one of the top scorers of the league. Bigger clubs call for you!",
    "next": "Mphamvu means strength. Mphamvu United wants more from you. Get ready for hard training.",
    "when": "Move this week"
  },
  {
    "id": "9.1",
    "title": "A Stronger Club",
    "teaser": "You join Mphamvu United!",
    "won": "You did it! You join Mphamvu United. The training is hard, but you keep up. The goalkeeper snores, but you sleep anyway!",
    "next": "The defenders in this league are well set. They leave no space. Learn to move better.",
    "when": "Games this month"
  },
  {
    "id": "9.2",
    "title": "Stronger Defenders",
    "teaser": "You beat the strong defenders!",
    "won": "You did it! You find space against strong defenders. You move well, not only fast!",
    "next": "The team needs your goals. Other teams now watch you closely. Find new ways to help.",
    "when": "Next 4 games"
  },
  {
    "id": "9.3",
    "title": "The Pressure Builds",
    "teaser": "You score when they watch you!",
    "won": "You did it! You score or help even when defenders stay close. You find new ways to win.",
    "next": "You are a top scorer, but another striker is close. Every game matters now.",
    "when": "Last 5 games"
  },
  {
    "id": "9.4",
    "title": "The Scoring Race",
    "teaser": "You keep your goal form!",
    "won": "You did it! You keep scoring at the end of the season. The race is close!",
    "next": "Win the top scorer race. Then Mulilo Stars FC in the big city may call you.",
    "when": "Season ends soon"
  },
  {
    "id": "9.5",
    "title": "Top of the Charts",
    "teaser": "You are the top scorer!",
    "won": "You did it! You are the top scorer of the league! Mulilo Stars FC asks you to a trial!",
    "next": "The city is loud and fast. Mulilo means fire. Play with fire at your new club.",
    "when": "Trial next week"
  },
  {
    "id": "10.1",
    "title": "Welcome to the City",
    "teaser": "You are a city player now!",
    "won": "You did it! You learn the big city life. You train and play with fire!",
    "next": "Thousands of fans come to the stadium. The noise is big. Stay calm and play well.",
    "when": "Big game Sunday"
  },
  {
    "id": "10.2",
    "title": "The Big Crowd",
    "teaser": "You love the big crowd!",
    "won": "You did it! You play well in front of thousands. The crowd gives you power!",
    "next": "Your team wants fast moves and fast goals. Slow plays can lose the game.",
    "when": "Next games"
  },
  {
    "id": "10.3",
    "title": "Fire in the Attack",
    "teaser": "Fast plays, fast goals!",
    "won": "You did it! You pass quick and score from open play. Your attack is on fire!",
    "next": "The club wants to go up a league. A few bad games can ruin it. Win the big games.",
    "when": "Promotion games soon"
  },
  {
    "id": "10.4",
    "title": "The Promotion Push",
    "teaser": "You help your club go up!",
    "won": "You did it! You help Mulilo Stars win the big games. Your club is going up!",
    "next": "Kalulu FC sees you play. They like what they see. Finish the season well.",
    "when": "Season ends soon"
  },
  {
    "id": "10.5",
    "title": "Ready for the Next Step",
    "teaser": "Kalulu FC wants you!",
    "won": "You did it! You finish the season strong. Kalulu FC wants you!",
    "next": "Kalulu means hare. The club likes fast players who think well. Learn to move quickly.",
    "when": "Move this week"
  },
  {
    "id": "11.1",
    "title": "The Clever Hare",
    "teaser": "You are fast like a hare!",
    "won": "You did it! You learn to move fast and think fast. You make quick plays with your team.",
    "next": "Defenders watch your runs. Change direction. Find the small gaps.",
    "when": "Next 3 games"
  },
  {
    "id": "11.2",
    "title": "Find the Space",
    "teaser": "You find space like a hare!",
    "won": "You did it! You find space and make chances. Defenders cannot catch you!",
    "next": "Scouts from Lusaka clubs sit in the stands. One great game can change your life.",
    "when": "Scouts at next game"
  },
  {
    "id": "11.3",
    "title": "The Lusaka Scouts",
    "teaser": "The Lusaka scouts see you!",
    "won": "You did it! You play a great game in front of the scouts. They clap for you!",
    "next": "A Lusaka club asks you to a trial. The level is very high. Show you belong.",
    "when": "Trial in 5 days"
  },
  {
    "id": "11.4",
    "title": "The Big Opportunity",
    "teaser": "You pass the big trial!",
    "won": "You did it! You pass the trial. The Lusaka club likes your skill and your mind.",
    "next": "Kafue Gaels FC makes you an offer. It is your first pro contract. Sign it!",
    "when": "Offer on the table"
  },
  {
    "id": "11.5",
    "title": "The Contract Offer",
    "teaser": "You sign your first contract!",
    "won": "You did it! You sign your first pro contract with Kafue Gaels FC! Remember the bottle ball in the village?",
    "next": "Your first pay comes soon. You send money to Ambuya. Start your first week as a pro.",
    "when": "Pay day this week"
  },
  {
    "id": "12.1",
    "title": "A Professional at Last",
    "teaser": "You are a real pro now!",
    "won": "You did it! You get your first pay. You send money home. Ambuya buys a radio to hear your games!",
    "next": "Pro football needs rest and good habits. Play well game after game.",
    "when": "Games every week"
  },
  {
    "id": "12.2",
    "title": "The Standard Rises",
    "teaser": "You play well every week!",
    "won": "You did it! You rest well and play well in game after game. You are a real pro!",
    "next": "Older players want your place. Show the coach you are the best for it.",
    "when": "Team picked Friday"
  },
  {
    "id": "12.3",
    "title": "Fight for the Shirt",
    "teaser": "You win your place!",
    "won": "You did it! You win your place in the team. The coach can count on you!",
    "next": "Every league point matters. Score goals, but also keep the lead when you win.",
    "when": "Next 5 games"
  },
  {
    "id": "12.4",
    "title": "Points on the Board",
    "teaser": "You win important points!",
    "won": "You did it! You help your team win vital points. You know when to attack and when to keep the lead.",
    "next": "The season ends well for you. Crimson Arrows FC sees you as a big talent.",
    "when": "Season ends soon"
  },
  {
    "id": "12.5",
    "title": "A Professional Reputation",
    "teaser": "Crimson Arrows wants you!",
    "won": "You did it! You are a first-team player. Crimson Arrows FC wants you to join them!",
    "next": "Crimson Arrows has a grass pitch and a doctor. Learn the new, higher level.",
    "when": "Move this week"
  },
  {
    "id": "13.1",
    "title": "A Bigger Stage",
    "teaser": "You join Crimson Arrows!",
    "won": "You did it! You join Crimson Arrows FC. The training is better. You keep up!",
    "next": "Strikers here have scored goals for years. Nobody gives you a place. Beat them in training.",
    "when": "Friendly in 4 days"
  },
  {
    "id": "13.2",
    "title": "The Competition",
    "teaser": "You beat the older strikers!",
    "won": "You did it! You do better than the other strikers in training. The coach sees it!",
    "next": "Work on your headers and quick shots. A small step can win a game.",
    "when": "Training this week"
  },
  {
    "id": "13.3",
    "title": "Sharpen the Finishing",
    "teaser": "Your shots are sharper now!",
    "won": "You did it! Your shots and headers are sharper. You score from hard places.",
    "next": "A big run of games comes. The club needs a striker who scores big goals.",
    "when": "Big games start soon"
  },
  {
    "id": "13.4",
    "title": "The Decisive Run",
    "teaser": "You score in the big games!",
    "won": "You did it! You score in the biggest games. The team trusts you!",
    "next": "The coach picks you as the first-choice striker. Be the best striker of the club.",
    "when": "Season ends soon"
  },
  {
    "id": "13.5",
    "title": "First Choice",
    "teaser": "You are the first-choice striker!",
    "won": "You did it! You are the first-choice striker of Crimson Arrows. All the league knows your name!",
    "next": "Energy Dynamos is one of the biggest clubs in Zambia. They want you!",
    "when": "Move this week"
  },
  {
    "id": "14.1",
    "title": "The Big Club",
    "teaser": "You join Energy Dynamos!",
    "won": "You did it! You join Energy Dynamos, a very big club. The fans want wins every week.",
    "next": "Newspapers write about you. Some words are good, some are bad. Stay calm.",
    "when": "Games every week"
  },
  {
    "id": "14.2",
    "title": "Under the Spotlight",
    "teaser": "You stay calm in the news!",
    "won": "You did it! You play well even with the news on you. You do not lose your head!",
    "next": "Energy Dynamos wants the league title. Every point matters now.",
    "when": "Title race now"
  },
  {
    "id": "14.3",
    "title": "The Title Challenge",
    "teaser": "You fight for the title!",
    "won": "You did it! You help the club stay in the title race. The pressure is big, but you are strong!",
    "next": "Men from the national team are watching you. Chipolopolo! Play a great game.",
    "when": "Big game Saturday"
  },
  {
    "id": "14.4",
    "title": "Chipolopolo Watch",
    "teaser": "The Chipolopolo watch you!",
    "won": "You did it! You play a great game in a big match. The national coaches see you!",
    "next": "The coach reads the Zambia team list. Wait for your name. ZEMCO United also wants you.",
    "when": "List out soon"
  },
  {
    "id": "14.5",
    "title": "The Call-Up",
    "teaser": "You play for Zambia!",
    "won": "You did it! Your name is on the Zambia list! You work for years for this day!",
    "next": "ZEMCO United, the champions, sign you. The dressing room is full of trophies.",
    "when": "Sign this week"
  },
  {
    "id": "15.1",
    "title": "The Champions' Dressing Room",
    "teaser": "You join the champions!",
    "won": "You did it! You join ZEMCO United, the champions. You fit in with the team.",
    "next": "You get your Zambia shirt. Ambuya and the village watch your first game on one television.",
    "when": "Debut in 5 days"
  },
  {
    "id": "15.2",
    "title": "The Zambia Shirt",
    "teaser": "You play for Zambia!",
    "won": "You did it! You wear the Zambia shirt. Ambuya and the whole village cheer you on!",
    "next": "Now you play for your country. Many fans in Zambia watch you. Play a strong game.",
    "when": "Next international"
  },
  {
    "id": "15.3",
    "title": "Carry the Flag",
    "teaser": "You carry the flag with pride!",
    "won": "You did it! You play a strong game for Zambia. All the country is proud of you!",
    "next": "Zambia wants to win in Africa. Beat the top African teams. Score or help in a big match.",
    "when": "Big match soon"
  },
  {
    "id": "15.4",
    "title": "Continental Ambitions",
    "teaser": "You shine against Africa's best!",
    "won": "You did it! You score or help in a big game against top African teams.",
    "next": "Clubs abroad see you play. One call from Shaka Chiefs in South Africa is coming.",
    "when": "Offer soon"
  },
  {
    "id": "15.5",
    "title": "Abroad Is Calling",
    "teaser": "A club abroad wants you!",
    "won": "You did it! You are so good that clubs abroad call you. Shaka Chiefs in South Africa wants you!",
    "next": "You arrive in Soweto. The people, the food, and the words are new. Settle in.",
    "when": "Fly this week"
  },
  {
    "id": "16.1",
    "title": "A New Country",
    "teaser": "You live in South Africa now!",
    "won": "You did it! You arrive in Soweto and settle in. The words are new, but your dream is the same.",
    "next": "Football is big in the streets here. A big derby comes. Play your first one.",
    "when": "Derby in 2 weeks"
  },
  {
    "id": "16.2",
    "title": "Vilakazi Street",
    "teaser": "You play your first big derby!",
    "won": "You did it! You play in your first big derby. The fans are loud and you are not afraid!",
    "next": "Your new teammates come from many places. Win their trust with hard work.",
    "when": "Training this month"
  },
  {
    "id": "16.3",
    "title": "Earn Respect",
    "teaser": "Your team trusts you now!",
    "won": "You did it! You work hard every day. Your teammates trust you!",
    "next": "A very big match comes. The crowd wants a hero. Score or help your team.",
    "when": "Big match soon"
  },
  {
    "id": "16.4",
    "title": "The Big Match",
    "teaser": "You are the hero of the match!",
    "won": "You did it! You score or help in a very big match. The crowd shouts your name!",
    "next": "A club in England likes you. Bristol Wanderers may call you soon. Finish the season well.",
    "when": "Season ends soon"
  },
  {
    "id": "16.5",
    "title": "The European Opportunity",
    "teaser": "England is calling you!",
    "won": "You did it! You have a great season. Bristol Wanderers in England wants you!",
    "next": "England is cold and rainy. The food is new. The training pitch is muddy.",
    "when": "Fly to England soon"
  },
  {
    "id": "17.1",
    "title": "Cold Rain",
    "teaser": "You live in cold England!",
    "won": "You did it! You live through the cold rain and new food. You buy a warm coat for Ambuya's worry.",
    "next": "English football is very fast. Defenders close you down. Think faster.",
    "when": "Games this week"
  },
  {
    "id": "17.2",
    "title": "The Pace of English Football",
    "teaser": "You think faster now!",
    "won": "You did it! You make quick choices on the pitch. You keep up with the fast game!",
    "next": "Many games come in winter. Your body must rest. Keep scoring.",
    "when": "Winter games now"
  },
  {
    "id": "17.3",
    "title": "Goals in Winter",
    "teaser": "You score in the cold winter!",
    "won": "You did it! You keep your form in the hard winter games. You score and score!",
    "next": "Newspapers ask if you can play in England. Show them with a great game.",
    "when": "Big match soon"
  },
  {
    "id": "17.4",
    "title": "Prove Your Value",
    "teaser": "You win the big match!",
    "won": "You did it! You win a big match against a strong team. The newspapers say good words about you!",
    "next": "Leeds Allied is a bigger club. They want you. Finish well at Bristol.",
    "when": "Season ends soon"
  },
  {
    "id": "17.5",
    "title": "A Bigger Club Calls",
    "teaser": "Leeds Allied wants you!",
    "won": "You did it! You are an important player at Bristol. Leeds Allied asks you to join them!",
    "next": "The stadium at Leeds is big and loud. Learn the way the team plays.",
    "when": "Move this week"
  },
  {
    "id": "18.1",
    "title": "A Loud Stadium",
    "teaser": "You join Leeds Allied!",
    "won": "You did it! You join Leeds Allied. The stadium is big and the fans want a lot. You are ready!",
    "next": "Leeds Allied wants to go up to the top league. One bad weekend can change the table.",
    "when": "Games every week"
  },
  {
    "id": "18.2",
    "title": "The Promotion Race",
    "teaser": "You win points for Leeds!",
    "won": "You did it! You help Leeds Allied win many points. The club is in the race to go up.",
    "next": "Teams stay deep to stop you. Find space where it is hard.",
    "when": "Next 4 games"
  },
  {
    "id": "18.3",
    "title": "The Tight Defence",
    "teaser": "You break the tight defences!",
    "won": "You did it! You find space and score hard goals. The deep defences cannot stop you!",
    "next": "The last games are here. Stay calm and play well. Leeds needs you.",
    "when": "Last games now"
  },
  {
    "id": "18.4",
    "title": "The Final Stretch",
    "teaser": "You win the last big games!",
    "won": "You did it! You play great in the last games. You stay calm and help your team!",
    "next": "Leeds Allied goes up to the top league. Aston Manor sees you and wants you.",
    "when": "Final game Sunday"
  },
  {
    "id": "18.5",
    "title": "Promotion Achieved",
    "teaser": "Leeds Allied goes up!",
    "won": "You did it! Leeds Allied goes up to the top league! Aston Manor wants you to join them!",
    "next": "In the top league, you play the stars from television. They are fast and strong.",
    "when": "Move this week"
  },
  {
    "id": "19.1",
    "title": "The Top League",
    "teaser": "You play in the top league!",
    "won": "You did it! You play against players you saw on television. You do not feel small!",
    "next": "Defenders see your runs. They stop every chance. Be sharp in the box.",
    "when": "Games this month"
  },
  {
    "id": "19.2",
    "title": "No Easy Chances",
    "teaser": "You score against the best!",
    "won": "You did it! You score against the best defenders. You are sharp in the box!",
    "next": "Now you play the biggest clubs in England. You dreamed of this as a child.",
    "when": "Big clubs next"
  },
  {
    "id": "19.3",
    "title": "The Famous Opponents",
    "teaser": "You shine against big clubs!",
    "won": "You did it! You play a big part against a big club. Your childhood dream is real!",
    "next": "Clubs that want trophies are watching you. Keep playing well against the top teams.",
    "when": "Top teams ahead"
  },
  {
    "id": "19.4",
    "title": "A Name in the League",
    "teaser": "Your name is big in England!",
    "won": "You did it! You play well against the top teams. You do not need to prove you belong!",
    "next": "Chelsea SC offers you a place. The whole world will watch you.",
    "when": "Offer this week"
  },
  {
    "id": "19.5",
    "title": "The Giant Club Calls",
    "teaser": "Chelsea SC wants you!",
    "won": "You did it! Chelsea SC asks you to join. The whole world will see you!",
    "next": "Chelsea SC has a famous shirt. The training is the best. Many players want a place.",
    "when": "Move this week"
  },
  {
    "id": "20.1",
    "title": "A World-Famous Shirt",
    "teaser": "You wear the famous shirt!",
    "won": "You did it! You wear the Chelsea SC shirt. It is famous all over the world!",
    "next": "Your teammates are stars from many countries. Earn their respect. Win your place.",
    "when": "Training this month"
  },
  {
    "id": "20.2",
    "title": "Compete with the Best",
    "teaser": "You win a place with the stars!",
    "won": "You did it! You play so well that you win a place in the team. The stars respect you!",
    "next": "The club wants trophies every year. A good game is not enough. The team must win.",
    "when": "Cup games soon"
  },
  {
    "id": "20.3",
    "title": "The Trophy Hunt",
    "teaser": "You help win the cup games!",
    "won": "You did it! You help Chelsea SC go far in a big cup. The team wants the trophy!",
    "next": "A big game is in the last minutes. One chance can win it. Be ready.",
    "when": "Final minutes ahead"
  },
  {
    "id": "20.4",
    "title": "The Decisive Goal",
    "teaser": "Your goal wins the big match!",
    "won": "You did it! You score or help in the last minutes. Your goal wins the match!",
    "next": "Manchester Union makes an offer. It is one of the most famous clubs. Zambia watches you.",
    "when": "Offer this week"
  },
  {
    "id": "20.5",
    "title": "A Move to Manchester",
    "teaser": "Manchester Union wants you!",
    "won": "You did it! Manchester Union wants you. Zambia is very proud of its son!",
    "next": "Every training here is a hard fight. Win your place in the first team.",
    "when": "Move this week"
  },
  {
    "id": "21.1",
    "title": "Among the Elite",
    "teaser": "You are with the best!",
    "won": "You did it! You win a place in a top world club!",
    "next": "The Zambia coach picks you as captain. You lead all the Chipolopolo players.",
    "when": "Captain named soon"
  },
  {
    "id": "21.2",
    "title": "Captain Zambia",
    "teaser": "You are Zambia's captain!",
    "won": "You did it! You are the captain of Zambia! You wear the Chipolopolo armband with pride.",
    "next": "Zambia wants to go to the World Cup. Win points in the qualifying games.",
    "when": "Qualifiers start soon"
  },
  {
    "id": "21.3",
    "title": "The Qualifying Campaign",
    "teaser": "You win key points for Zambia!",
    "won": "You did it! You help Zambia win key qualifying points. The country dreams of the World Cup!",
    "next": "The last qualifying games are here. All Zambia watches every result. Play your best.",
    "when": "Last games ahead"
  },
  {
    "id": "21.4",
    "title": "The Pressure of History",
    "teaser": "You lead Zambia to the finals!",
    "won": "You did it! You play great in the last qualifying games. Zambia is close to history!",
    "next": "Zambia wins its place in the World Cup! Manchester Metropolis wants you too.",
    "when": "Final qualifier soon"
  },
  {
    "id": "21.5",
    "title": "Zambia Qualifies",
    "teaser": "Zambia is going to the World Cup!",
    "won": "You did it! Zambia goes to the World Cup! Ambuya dances with the neighbours who remember the bottle ball!",
    "next": "The World Cup starts. The best teams in the world come. Zambia is ready.",
    "when": "World Cup starts soon"
  },
  {
    "id": "22.1",
    "title": "The World Stage",
    "teaser": "You play at the World Cup!",
    "won": "You did it! You play in your first World Cup game. The whole world sees you!",
    "next": "In the group, every game matters. One goal can change the table.",
    "when": "Group games now"
  },
  {
    "id": "22.2",
    "title": "The Group Stage",
    "teaser": "Zambia leaves the group!",
    "won": "You did it! You help Zambia win through the group. The team is still in the cup!",
    "next": "Now the games are knock out. If you lose, you go home.",
    "when": "Knockout game soon"
  },
  {
    "id": "22.3",
    "title": "The Knockout Rounds",
    "teaser": "Zambia wins a knockout game!",
    "won": "You did it! You help Zambia win a knockout game. The dream stays alive!",
    "next": "Zambia is close to making history. Lead your team to the final.",
    "when": "Semi-final soon"
  },
  {
    "id": "22.4",
    "title": "One Match from Glory",
    "teaser": "Zambia is in the final!",
    "won": "You did it! You lead Zambia to the World Cup final! The whole country is dancing!",
    "next": "This is the last game. Win the cup for Zambia and for Ambuya.",
    "when": "Final in 5 days"
  },
  {
    "id": "22.5",
    "title": "World Champions",
    "teaser": "Zambia wins the World Cup!",
    "won": "You did it! Zambia wins the World Cup! At home, a television is under the mango tree. Ambuya has the best seat. You are a hero!",
    "next": "Doha Dam SC offers you a big contract. Your career can slow down now.",
    "when": "Offer after the cup"
  },
  {
    "id": "23.1",
    "title": "A Legend's Contract",
    "teaser": "You sign a legend's contract!",
    "won": "You did it! You sign a big contract with Doha Dam SC. You have safe money and can choose your road.",
    "next": "Ambuya worked hard for you for years. Now you build her a new house.",
    "when": "House in 2 months"
  },
  {
    "id": "23.2",
    "title": "Give Ambuya a Home",
    "teaser": "Ambuya has a beautiful house!",
    "won": "You did it! You build Ambuya a beautiful house. She smiles in every room!",
    "next": "You go back to the village. Children are playing on the same dusty ground.",
    "when": "Trip home soon"
  },
  {
    "id": "23.3",
    "title": "Back to the Village",
    "teaser": "You are home in the village!",
    "won": "You did it! You go home. You see children play football on the same dusty ground.",
    "next": "The children need a real pitch. Build it with goalposts and a flat ground.",
    "when": "Pitch in 3 months"
  },
  {
    "id": "23.4",
    "title": "No More Tied Chickens",
    "teaser": "The village has a real pitch!",
    "won": "You did it! You build a real pitch with goalposts. The whole village can watch the games!",
    "next": "The first match on the new pitch is coming. Children will gather to play.",
    "when": "First match soon"
  },
  {
    "id": "23.5",
    "title": "A Legacy Begins",
    "teaser": "You help the next dreamers!",
    "won": "You did it! Children play on the new pitch. One child has a bottle ball and a big dream. You had the same look once!",
    "next": "Your story now helps the next children. You show them that a big dream can come true. Their journey starts today.",
    "when": "Your story lives on"
  }
].map(s => Object.freeze(s)));

const BY_ID = new Map(STORIES.map(s => [s.id, s]));

/** The story of sub-level `sub` (1..5) at `stage` (1..23), or null. */
export function storyFor(stage, sub) {
  return BY_ID.get(`${stage}.${sub}`) || null;
}
