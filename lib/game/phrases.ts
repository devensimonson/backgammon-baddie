/**
 * The Baddie's voice. A pure, framework-free phrase library grouped by
 * the moment it belongs to, plus a picker that never repeats a
 * category's previous line back to back.
 *
 * A game can run 80+ moves, so each frequent group is deep. The picker
 * takes an injectable random source so its no-repeat behaviour is
 * testable deterministically; it defaults to Math.random in the app.
 *
 * Voice rules (see the project copy rules): warm, plain, cheeky, and
 * honest. The Baddie is a solid computer opponent, never "unbeatable."
 * No em dashes anywhere in this file's user-facing copy.
 */

export type PhraseCategory =
  | "yourRoll"
  | "goodMove"
  | "riskyMove"
  | "baddieTurn"
  | "baddieHit"
  | "youHit"
  | "bearOff"
  | "winYou"
  | "winYouGammon"
  | "winYouBackgammon"
  | "winBad"
  | "winBadGammon"
  | "winBadBackgammon";

export const BADDIE_PHRASES: Record<PhraseCategory, readonly string[]> = {
  yourRoll: [
    "Go on then. Show me what you've got.",
    "Your roll. Make it count.",
    "Let's see it, then.",
    "Dice are yours. Don't waste them.",
    "Roll 'em. I've got time.",
    "Whenever you're ready. No pressure.",
    "Your move to make. Or unmake.",
    "Come on, dazzle me.",
    "Big roll energy. Let's see if it lands.",
    "Tick tock. The dice won't roll themselves.",
    "Your turn. I'll be watching closely.",
    "Give the dice a good shake.",
    "Let's find out what the dice think of you.",
    "Ready when you are. No rush at all.",
    "Roll it. I promise not to peek.",
    "The board is yours for a moment.",
    "Fresh dice, fresh chances. Off you go.",
    "Show me a plan, not just a roll.",
    "Two dice, one turn. Choose well.",
    "Take your time. It won't help, but take it.",
    "Your move. I'm genuinely curious.",
    "Let's see if the dice like you today.",
    "Go ahead. Surprise me.",
    "Roll first, panic later.",
  ],
  goodMove: [
    "Hm. Didn't see that.",
    "Okay, that's annoying. Nicely done.",
    "Respect. That's a real move.",
    "Fine, fine. Good one.",
    "Ugh, that's actually clever.",
    "Alright, you've been practising.",
    "That stung a little. Well played.",
    "Cold. I like it.",
    "Didn't hate that move. Don't tell anyone.",
    "Sharp. Keep it up and I'll start trying.",
    "Neat. I'll allow it.",
    "You're thinking two rolls ahead. Cute.",
    "Solid. I have no notes.",
    "That's the move I'd have made. Show off.",
    "Textbook. Someone did their reading.",
    "Okay, okay. You can play a bit.",
    "That closed a door I was hoping to use.",
    "Fine, that was tidy.",
    "You planned that, didn't you.",
    "Good structure. I noticed.",
    "Quietly excellent. Rude, honestly.",
    "That's going to be hard to answer.",
    "Clean as anything. Nice.",
    "I felt that one. Well played.",
  ],
  riskyMove: [
    "Bold, leaving a blot like that.",
    "Brave. Or reckless. We'll find out.",
    "Ooh, living dangerously.",
    "That's a gift. I might take it.",
    "Feeling lucky, are we?",
    "Risky. I respect the confidence.",
    "You sure about that one?",
    "Careful, I bite.",
    "That checker looks lonely out there.",
    "Gambler. I can work with that.",
    "Exposed and proud, I see.",
    "You're daring me. I noticed.",
    "One good roll and that hurts you.",
    "That blot is basically waving at me.",
    "Optimist. I like optimists.",
    "Leaving that open? Interesting choice.",
    "You're betting I miss. Bold bet.",
    "A little loose, that. We'll see.",
    "Tempting. Very tempting.",
    "You do like to live on the edge.",
    "That's a lot of trust in the dice.",
    "Hope you rolled a rabbit's foot too.",
    "I see the opening. So do the dice.",
    "Daring. Let's see if it pays.",
  ],
  baddieTurn: [
    "My turn. Watch this.",
    "Step aside, let me cook.",
    "Now the fun part.",
    "Sit tight. This won't hurt. Much.",
    "My dice, my moment.",
    "Let me show you how it's done.",
    "Observe.",
    "Back in a second. Making moves.",
    "This is the part you won't like.",
    "Hold my dice.",
    "Let's tidy up the board a little.",
    "My go. Try to keep up.",
    "Here comes the interesting bit.",
    "Watch the hands, not the dice.",
    "Time to make some space.",
    "Give me a moment to be brilliant.",
    "You'll want to see this. Or not.",
    "My turn to write the story.",
    "Let's rearrange a few things.",
    "One moment. Genius takes focus.",
    "Rolling for the good stuff.",
    "Let me answer that properly.",
    "Now, where were we. Ah yes.",
    "My move. Blink and you'll miss it.",
  ],
  baddieHit: [
    "Gotcha. Back to the bar.",
    "Sent you home. Nothing personal.",
    "Oops, was that yours?",
    "Off you go. Take a lap.",
    "Blot spotted. Blot removed.",
    "Thanks for the free hit.",
    "See you at the bar.",
    "That'll cost you a few pips.",
    "Back to square one for that one.",
    "I did warn you about the blot.",
    "Collected. Come again.",
    "Straight to the naughty step.",
    "You left it open. I closed it.",
    "One checker, rehomed. You're welcome.",
    "That's going to be a long walk back.",
    "Hit and I'm not even sorry.",
    "Waved goodbye to that one for you.",
    "The bar missed you. Off you pop.",
  ],
  youHit: [
    "Rude. I'll remember that.",
    "Fine, you got me. One time.",
    "Ow. Okay, we're playing like that.",
    "Cheap shot. Effective, though.",
    "You'll pay for that later.",
    "Hmph. Lucky spot.",
    "Noted. And filed under revenge.",
    "You hit me? On this board? Bold.",
    "That one's going in my memoirs.",
    "Alright, alright. Point made.",
    "I'll allow it. Once.",
    "Enjoy it. It won't last.",
  ],
  bearOff: [
    "Getting them off already? Show off.",
    "One down. Plenty to go.",
    "Bearing off. Look at you.",
    "That's one safely home.",
    "Racing me now, are you?",
    "Tidy. Off it comes.",
    "You're in a hurry. I see it.",
    "Home free, that one.",
    "Off the board and out of my way.",
    "Nice and clean. Keep them coming.",
  ],
  winYou: [
    "You got me. Well played, genuinely.",
    "Fine, you won this one. Rematch?",
    "Beaten fair and square. I'll get you next time.",
    "Okay, that was a good game. Annoyingly.",
    "You earned it. Don't get comfortable.",
    "Well played. Run it back?",
    "Credit where it's due. Nicely done.",
    "You outplayed me. This time.",
    "A win is a win. Enjoy it.",
    "Good game. I mean that, mostly.",
    "You beat a solid opponent. Take the moment.",
    "Respect. Now go again with me warmed up.",
  ],
  winYouGammon: [
    "A gammon? Against me? Cold blooded.",
    "Double the sting and you know it. Well played.",
    "You didn't just win, you made a point.",
    "That's a gammon. I'll be quiet for a bit.",
    "Ouch. Doubled. Genuinely well done.",
    "You ran the table. I tip my hat.",
  ],
  winYouBackgammon: [
    "A backgammon. You absolute menace.",
    "Triple. I'm going to go sit in the dark.",
    "That's about as bad as it gets for me. Bravo.",
    "You didn't beat me, you erased me. Well played.",
    "Backgammon. I have no words. Have all of mine.",
  ],
  winBad: [
    "Got you this time. Good game, though.",
    "That one's mine. Close, though.",
    "Good game. Don't sulk, run it back.",
    "Told you I'd get you. Again?",
    "Mine. But you made me work for it.",
    "Better luck next roll.",
    "A win for me. You pushed me, though.",
    "That's one to me. You'll get the next.",
    "Close game. My dice, my day.",
    "Chalk it up to me. Rematch?",
    "I edged it. Genuinely well fought.",
    "That's mine. Shake it off, go again.",
  ],
  winBadGammon: [
    "A gammon, for me. Sorry about that. A bit.",
    "That counted double. Don't dwell on it.",
    "Gammon. I got a little carried away.",
    "That one really counted. Go again?",
    "Doubled up. You'll want revenge. Good.",
    "A gammon my way. The board was kind.",
  ],
  winBadBackgammon: [
    "A backgammon. Even I feel a bit bad. A bit.",
    "Triple. That one will smart. Rematch soon?",
    "That was a rout, and I'm not proud. Okay, a little.",
    "Backgammon to me. The dice were very loud.",
    "That's the big one. Come back and level it.",
  ],
};

/** A picker bound to one game's session that never repeats a line back to back. */
export type BaddieVoice = {
  pick: (category: PhraseCategory) => string;
};

/**
 * Create a voice. `rng` returns a float in [0, 1) and defaults to
 * Math.random; injecting a deterministic source makes the no-repeat
 * behaviour unit-testable.
 */
export function createBaddieVoice(rng: () => number = Math.random): BaddieVoice {
  const last: Partial<Record<PhraseCategory, string>> = {};
  return {
    pick(category) {
      const lines = BADDIE_PHRASES[category];
      if (lines.length === 1) return lines[0];
      let line = lines[Math.floor(rng() * lines.length)] ?? lines[0];
      let guard = 0;
      while (line === last[category] && guard < 24) {
        line = lines[Math.floor(rng() * lines.length)] ?? lines[0];
        guard += 1;
      }
      last[category] = line;
      return line;
    },
  };
}
