"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  applyPlay,
  forfeitTurn,
  newGame,
  opponentOf,
  roll,
  type Die,
  type GameResult,
  type GameState,
  type Play,
  type Player,
} from "@/lib/engine";
import { chooseMove } from "@/lib/bot";
import {
  decideStartFromSaved,
  fairRoll,
  resolveOpeningRollSequence,
  type OpeningRollSequence,
} from "@/lib/game/view";
import {
  commitStaged,
  isForfeit,
  maxPlayLength,
  resolveDie,
  stageMove,
  stagingOptions,
} from "@/lib/game/moves";
import { createBaddieVoice, type BaddieVoice, type PhraseCategory } from "@/lib/game/phrases";
import type { PlayerRecord } from "@/lib/game/persistence";
import { clearGame, loadGame, loadRecord, saveGame, saveRecord } from "./storage";
import { previewBoard } from "./board-preview";
import { Board, type Target } from "./Board";
import { Dock } from "./Dock";
import { ResultOverlay } from "./ResultOverlay";
import { StartOverlay, type StartOverlayView } from "./StartOverlay";
import { MobileGate } from "./MobileGate";
import { BaddieFace, NewGameIcon, ShareIcon, NoCubeIcon } from "./icons";

const HUMAN: Player = "white";
const BADDIE: Player = "black";
const SHIP_DATE = "July 2026";
const REPO_URL = "https://github.com/devensimonson/backgammon-game";

// Human dice-shake before the roll lands.
const ROLL_ANIM = 560;
// The Baddie's turn, broken into slow, deliberate beats (ms). Each "think"
// beat adds a randomized pause so no two are the same length and it sometimes
// mulls a move longer, like a person weighing it.
const PACE_SHAKE = 800; // dice shaking
const PACE_LAND = 1000; // roll landed, read it
const THINK_BASE = 950; // minimum pre-move deliberation
const THINK_RAND = 1150; // extra random deliberation on top
const LAND_HOLD = 1000; // hold the destination highlight so the move registers
const PREROLL_BASE = 550; // deliberation before rolling
const PREROLL_RAND = 900;
const PACE_SETTLE = 800; // after the last half-move, before handing back
const FORFEIT_PACE = 1300;

/** A deliberation pause: a base plus a random extra, so beats vary. */
function thinkPause(base: number, range: number): number {
  return base + Math.random() * range;
}

const ROLLING_LINE = "Rolling the dice...";
const READ_LINE = "Right, here we go.";
const MOVE_ORDINALS = ["first", "second", "third", "fourth"];

// The start-of-game lifecycle the controller moves through. Only "playing"
// hands control to the live board; every other value shows the start overlay
// over a blurred board and nothing is dealt or persisted until the opening
// turn begins (FR-03 / FR-19).
type StartPhase = "begin" | "welcome-back" | "confirm-new" | "rolling" | "playing";

// The Baddie's start-moment voice: cheeky but honest, no em dashes.
const START_BEGIN_LINE = "Fresh board. Let's see who throws first.";
const START_TIE_LINE = "Twins. Go again, hot shot.";
const START_YOU_WON_LINE = "Beginner's luck. Enjoy it while it lasts.";
const START_BADDIE_WON_LINE = "I'll take the opening, thanks. Watch and learn.";
const START_WELCOME_LINE = "Back for more? Your board is right where you left it.";
const START_CONFIRM_LINE = "Giving up already? Fine, fresh dice.";

// The tumble-then-settle timing of a single roll-off throw (ms). Under
// reduced motion it collapses to a near-instant reveal (NFR-03).
const ROLLOFF_SETTLE = 640;
const ROLLOFF_SETTLE_REDUCED = 80;

/** The Baddie narrating its own half-move, in order. */
function narrateMove(k: number, total: number): string {
  if (total <= 1) return "Making my move.";
  const ord = MOVE_ORDINALS[k - 1] ?? `${k}th`;
  if (k === 1) return `Moving my ${ord} checker.`;
  if (k === total) return `And my ${ord}.`;
  return `Now my ${ord}.`;
}

function rollOneDie(): Die {
  return (1 + Math.floor(Math.random() * 6)) as Die;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function resultCategory(result: GameResult, youWon: boolean): PhraseCategory {
  if (youWon) {
    if (result.kind === "gammon") return "winYouGammon";
    if (result.kind === "backgammon") return "winYouBackgammon";
    return "winYou";
  }
  if (result.kind === "gammon") return "winBadGammon";
  if (result.kind === "backgammon") return "winBadBackgammon";
  return "winBad";
}

export function Game() {
  const [game, setGame] = useState<GameState | null>(null);
  const [record, setRecord] = useState<PlayerRecord>({ won: 0, lost: 0 });
  const [staged, setStaged] = useState<Play>([]);
  const [selected, setSelected] = useState<number | "bar" | null>(null);
  const [baddieLine, setBaddieLine] = useState("Go on then. Show me what you've got.");
  const [rolling, setRolling] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [resultSaid, setResultSaid] = useState("");
  const [lastDice, setLastDice] = useState<[Die, Die]>([6, 4]);

  // ---- start-of-game lifecycle (UI-only, never persisted) ----
  const [hydrated, setHydrated] = useState(false);
  const [startPhase, setStartPhase] = useState<StartPhase>("begin");
  // The resolved opening roll-off, held only while the roll-off plays.
  const [openingSeq, setOpeningSeq] = useState<OpeningRollSequence | null>(null);
  const [rollIndex, setRollIndex] = useState(-1);
  const [rollTumbling, setRollTumbling] = useState(false);

  // The Baddie's turn is animated beat by beat.
  const [baddiePlay, setBaddiePlay] = useState<Play | null>(null);
  const [baddieStep, setBaddieStep] = useState(0);
  const [baddieDice, setBaddieDice] = useState<[Die, Die] | null>(null);
  const [baddieShaking, setBaddieShaking] = useState(false);
  // The one from -> to being animated this beat (presentation-only highlight).
  const [baddieSource, setBaddieSource] = useState<number | "bar" | null>(null);
  const [baddieDest, setBaddieDest] = useState<number | "off" | null>(null);

  // Transient feedback for a tap that can't move.
  const [shakePoint, setShakePoint] = useState<number | "bar" | null>(null);
  const [hintOverride, setHintOverride] = useState<ReactNode | null>(null);

  const [voice] = useState<BaddieVoice>(() => createBaddieVoice());
  const recordRef = useRef(record);
  const recordedRef = useRef<GameState | null>(null);

  useEffect(() => {
    recordRef.current = record;
  }, [record]);

  const clearBaddieAnimation = useCallback(() => {
    setBaddiePlay(null);
    setBaddieStep(0);
    setBaddieDice(null);
    setBaddieShaking(false);
    setBaddieSource(null);
    setBaddieDest(null);
  }, []);

  // ---- central transition: save, reset staging, tally a finished game ----
  const advance = useCallback(
    (next: GameState) => {
      if (next.phase.kind === "moving") setLastDice([...next.phase.dice] as [Die, Die]);
      setStaged([]);
      setSelected(null);
      setHintOverride(null);
      setGame(next);
      saveGame(next);

      if (next.phase.kind === "game-over" && recordedRef.current !== next) {
        recordedRef.current = next;
        const youWon = next.phase.result.winner === HUMAN;
        const updated: PlayerRecord = {
          won: recordRef.current.won + (youWon ? 1 : 0),
          lost: recordRef.current.lost + (youWon ? 0 : 1),
        };
        recordRef.current = updated;
        setRecord(updated);
        saveRecord(updated);
        setResultSaid(voice.pick(resultCategory(next.phase.result, youWon)));
      }
    },
    [voice],
  );

  // ---- begin a new game's opening roll-off (fresh visit, New Game, or
  //      start-after-game-over all route through here) ----
  const startRollOff = useCallback(() => {
    // A new game supersedes any saved game. Clear it now so a reload during
    // the roll-off lands cleanly on Begin rather than resurrecting the game
    // the player just chose to discard; the started game is persisted again
    // only once the opening turn begins (FR-19).
    clearGame();
    const seq = resolveOpeningRollSequence(rollOneDie);
    recordedRef.current = null;
    clearBaddieAnimation();
    setStaged([]);
    setSelected(null);
    setShakePoint(null);
    setHintOverride(null);
    setOpeningSeq(seq);
    setRollIndex(0);
    setRollTumbling(true);
    setStartPhase("rolling");
    setBaddieLine(ROLLING_LINE);
  }, [clearBaddieAnimation]);

  // ---- throw (or re-throw after a tie) the next roll-off pair ----
  const throwNextPair = useCallback(() => {
    if (!openingSeq) return;
    setRollIndex((i) => Math.min(i + 1, openingSeq.rolls.length - 1));
    setRollTumbling(true);
    setBaddieLine(ROLLING_LINE);
  }, [openingSeq]);

  // ---- commit the opening turn: winner decided, both dice played. This is
  //      the single point where the started game is persisted (FR-19). ----
  const commitOpening = useCallback(() => {
    if (!openingSeq) return;
    const started = roll(newGame(openingSeq.first), openingSeq.dice);
    setLastDice([...openingSeq.dice] as [Die, Die]);
    recordedRef.current = null;
    setOpeningSeq(null);
    setRollIndex(-1);
    setRollTumbling(false);
    setStartPhase("playing");
    setBaddieLine(voice.pick(openingSeq.first === HUMAN ? "yourRoll" : "baddieTurn"));
    setGame(started);
    saveGame(started);
  }, [openingSeq, voice]);

  // ---- mount: decide the start moment from persisted state alone ----
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- loading persisted
       browser state is exactly the sanctioned "sync from an external system
       on mount" case; it cannot run during render without an SSR mismatch. */
    setRecord(loadRecord());
    const restored = loadGame();
    const decision = decideStartFromSaved(restored);
    if (decision === "begin") {
      // Fresh visit: show Begin, deal nothing, persist nothing (FR-01/02/03).
      setStartPhase("begin");
      setBaddieLine(START_BEGIN_LINE);
    } else if (decision === "welcome-back") {
      // A game in progress: restore it behind a Welcome-back overlay; the
      // board does not resume playing until the player chooses (FR-01/20).
      if (restored!.phase.kind === "moving") {
        setLastDice([...restored!.phase.dice] as [Die, Die]);
      }
      setGame(restored!);
      setStartPhase("welcome-back");
      setBaddieLine(START_WELCOME_LINE);
    } else {
      // A finished game: restore the board with its result (FR-21).
      recordedRef.current = restored!;
      setGame(restored!);
      setStartPhase("playing");
      setBaddieLine(voice.pick(restored!.toMove === HUMAN ? "yourRoll" : "baddieTurn"));
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- animate a single roll-off throw: tumble, then settle and narrate ----
  useEffect(() => {
    if (startPhase !== "rolling" || !rollTumbling || !openingSeq || rollIndex < 0) return;
    const reduced = prefersReducedMotion();
    const t = setTimeout(
      () => {
        setRollTumbling(false);
        const isLast = rollIndex === openingSeq.rolls.length - 1;
        if (!isLast) {
          setBaddieLine(START_TIE_LINE);
        } else {
          setBaddieLine(openingSeq.first === HUMAN ? START_YOU_WON_LINE : START_BADDIE_WON_LINE);
        }
      },
      reduced ? ROLLOFF_SETTLE_REDUCED : ROLLOFF_SETTLE,
    );
    return () => clearTimeout(t);
  }, [startPhase, rollTumbling, openingSeq, rollIndex]);

  // ---- drive the Baddie's turn as a sequence of watchable beats ----
  useEffect(() => {
    // Never play behind a start overlay: a restored Baddie-to-move game sits
    // paused under Welcome back until the player resumes, and the opening
    // roll-off has not committed a turn yet.
    if (startPhase !== "playing") return;
    if (!game || game.toMove === HUMAN || game.phase.kind === "game-over") return;

    const reduced = prefersReducedMotion();
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(setTimeout(resolve, reduced ? Math.min(ms, 40) : ms));
      });

    const run = async () => {
      let working = game;

      // Beat A: deliberate, then shake the dice (or, if restored mid-move,
      // skip straight to the roll it already made).
      if (working.phase.kind === "awaiting-roll") {
        setBaddieLine(voice.pick("baddieTurn"));
        await wait(thinkPause(PREROLL_BASE, PREROLL_RAND));
        if (cancelled) return;
        setBaddieLine(ROLLING_LINE);
        setBaddieShaking(true);
        setBaddieDice(null);
        await wait(PACE_SHAKE);
        if (cancelled) return;
        const dice = fairRoll(rollOneDie);
        working = roll(working, dice);
        setBaddieShaking(false);
        setBaddieDice([dice[0], dice[1]]);
      } else if (working.phase.kind === "moving") {
        setBaddieDice([working.phase.dice[0], working.phase.dice[1]]);
      }

      // Beat B: roll has landed, read it (and call out doubles = four moves).
      const rolledDoubles =
        working.phase.kind === "moving" && working.phase.dice[0] === working.phase.dice[1];
      setBaddieLine(rolledDoubles ? "Doubles for me. That's four moves." : READ_LINE);
      await wait(PACE_LAND);
      if (cancelled) return;

      // Beat C: play the chosen move one half-move at a time. Each move is a
      // "think" pause (source lifts) followed by the land (destination holds).
      const play = chooseMove(working);
      if (play === null) {
        setBaddieLine("No move for me this time.");
        await wait(thinkPause(THINK_BASE, THINK_RAND));
        if (cancelled) return;
        clearBaddieAnimation();
        setBaddieLine(voice.pick("yourRoll"));
        advance(forfeitTurn(working));
        return;
      }

      setBaddiePlay(play);
      for (let k = 1; k <= play.length; k++) {
        const move = play[k - 1];

        // Think: show the board before this move, lift the source, deliberate.
        setBaddieStep(k - 1);
        setBaddieDest(null);
        setBaddieSource(move.from);
        await wait(thinkPause(THINK_BASE, THINK_RAND));
        if (cancelled) return;

        // Land: relocate the checker and hold a highlight on the destination.
        const before = previewBoard(working.board, play.slice(0, k - 1), BADDIE);
        const after = previewBoard(working.board, play.slice(0, k), BADDIE);
        const hit = after.bar[HUMAN] > before.bar[HUMAN];
        setBaddieSource(null);
        setBaddieStep(k);
        setBaddieDest(move.to);
        setBaddieLine(hit ? voice.pick("baddieHit") : narrateMove(k, play.length));
        await wait(LAND_HOLD);
        if (cancelled) return;
        setBaddieDest(null);
      }

      // Beat D: settle, then commit the whole play and hand back with a quip.
      await wait(PACE_SETTLE);
      if (cancelled) return;
      const next = applyPlay(working, play);
      clearBaddieAnimation();
      if (next.phase.kind !== "game-over") {
        setBaddieLine(voice.pick("yourRoll"));
      }
      advance(next);
    };

    void run();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [game, advance, voice, clearBaddieAnimation, startPhase]);

  // ---- the human has no legal move: forfeit after a readable beat ----
  useEffect(() => {
    if (startPhase !== "playing") return;
    if (!game || game.toMove !== HUMAN || game.phase.kind !== "moving") return;
    if (!isForfeit(game)) return;
    const t = setTimeout(() => advance(forfeitTurn(game)), FORFEIT_PACE);
    return () => clearTimeout(t);
  }, [game, advance, startPhase]);

  // ---- transient shake + hint-override auto-clear ----
  useEffect(() => {
    if (shakePoint === null) return;
    const t = setTimeout(() => setShakePoint(null), 450);
    return () => clearTimeout(t);
  }, [shakePoint]);

  useEffect(() => {
    if (hintOverride === null) return;
    const t = setTimeout(() => setHintOverride(null), 3500);
    return () => clearTimeout(t);
  }, [hintOverride]);

  // ---- toast auto-dismiss ----
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- Escape closes popovers and deselects ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowReset(false);
        setSelected(null);
        // Escape dismisses the leave-this-game confirm without starting a new
        // game, dropping the player back onto the game they were protecting
        // (NFR-01). It never escapes Begin or the roll-off (nothing to undo).
        setStartPhase((p) => (p === "confirm-new" ? "playing" : p));
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // The start overlay owns the board while it is up: nothing behind it is
  // interactive, and it plays no turns until the player commits.
  const startOverlayActive = hydrated && startPhase !== "playing";
  const isHumanTurn = !!game && game.toMove === HUMAN;
  const moving = !!game && game.phase.kind === "moving";
  const gameOver = !!game && game.phase.kind === "game-over";
  const humanForfeit = !!game && isHumanTurn && moving && isForfeit(game);
  const canInteract = isHumanTurn && moving && !humanForfeit && !startOverlayActive;
  const thinking = !!game && !isHumanTurn && !gameOver && !startOverlayActive;

  const options = useMemo(
    () =>
      game && canInteract
        ? stagingOptions(game, staged)
        : new Map<number | "bar", (number | "off")[]>(),
    [game, canInteract, staged],
  );
  const movable = useMemo(() => new Set(options.keys()), [options]);

  const targets: Target[] = useMemo(() => {
    if (!game || selected === null) return [];
    const dests = options.get(selected) ?? [];
    const out: Target[] = [];
    for (const to of dests) {
      const die = resolveDie(game, staged, selected, to, HUMAN);
      if (die !== null) out.push({ to, die });
    }
    return out;
  }, [game, selected, options, staged]);

  const commitHuman = useCallback(
    (finalStaged: Play) => {
      if (!game) return;
      const committed = commitStaged(game, finalStaged);
      if (!committed) {
        setStaged([]);
        setSelected(null);
        return;
      }
      const foe = opponentOf(HUMAN);
      let next: GameState;
      try {
        next = applyPlay(game, committed);
      } catch {
        setStaged([]);
        setSelected(null);
        return;
      }
      const youHit = next.board.bar[foe] > game.board.bar[foe];
      const youBoreOff = next.board.off[HUMAN] > game.board.off[HUMAN];
      if (next.phase.kind !== "game-over") {
        setBaddieLine(voice.pick(youHit ? "youHit" : youBoreOff ? "bearOff" : "goodMove"));
      }
      advance(next);
    },
    [game, advance, voice],
  );

  // One handler for any tap on the player's own source (point or bar): select
  // it if it can move, otherwise explain kindly and shake it.
  const onTapSource = useCallback(
    (from: number | "bar") => {
      if (!game || game.toMove !== HUMAN || game.phase.kind === "game-over") return;
      if (canInteract && movable.has(from)) {
        setHintOverride(null);
        setShakePoint(null);
        setSelected((prev) => (prev === from ? null : from));
        return;
      }
      setSelected(null);
      setShakePoint(from);
      if (game.phase.kind === "awaiting-roll") {
        setHintOverride("Tap Roll first to throw the dice.");
      } else if (isForfeit(game)) {
        setHintOverride("No legal move with this roll. Your turn passes.");
      } else if (game.board.bar[HUMAN] > 0 && from !== "bar") {
        setHintOverride("Enter from the bar first, then move.");
      } else {
        setHintOverride("That checker has no legal move with this roll.");
      }
    },
    [game, canInteract, movable],
  );

  const onPickDestination = useCallback(
    (to: number | "off") => {
      if (!game || selected === null) return;
      const next = stageMove(game, staged, selected, to);
      if (!next) return;
      if (next.length >= maxPlayLength(game)) {
        // The full legal play is staged. Keep it visible until the explicit
        // End turn action commits once and hands control to The Baddie.
        setStaged(next);
        setSelected(null);
        return;
      }
      setStaged(next);
      // The turn continues. If the checker just landed on a point it can keep
      // moving from, keep it in hand so its next landing spots show at once and
      // the user can chain the move with no re-tap. Bearing off always ends the
      // selection; tapping a different checker still switches (onTapSource).
      if (typeof to === "number" && stagingOptions(game, next).has(to)) {
        setSelected(to);
      } else {
        setSelected(null);
      }
    },
    [game, selected, staged],
  );

  const onUndo = useCallback(() => {
    setStaged((prev) => prev.slice(0, -1));
    setSelected(null);
  }, []);

  const onRoll = useCallback(() => {
    if (!game || game.toMove !== HUMAN || game.phase.kind !== "awaiting-roll" || rolling) return;
    setHintOverride(null);
    setRolling(true);
    const dice = fairRoll(rollOneDie);
    setTimeout(() => {
      setRolling(false);
      setBaddieLine(voice.pick("yourRoll"));
      advance(roll(game, dice));
    }, ROLL_ANIM);
  }, [game, rolling, advance, voice]);

  const onNewGame = useCallback(() => {
    // A game in progress is protected by the leave-this-game confirm; a
    // finished game (or no game yet) goes straight to a fresh roll-off.
    if (game && game.phase.kind !== "game-over") {
      setStartPhase("confirm-new");
      setBaddieLine(START_CONFIRM_LINE);
      return;
    }
    startRollOff();
  }, [game, startRollOff]);

  const onResume = useCallback(() => {
    if (!game) return;
    setStartPhase("playing");
    setBaddieLine(voice.pick(game.toMove === HUMAN ? "yourRoll" : "baddieTurn"));
  }, [game, voice]);

  const onKeepPlaying = useCallback(() => {
    if (!game) return;
    setStartPhase("playing");
    setBaddieLine(voice.pick(game.toMove === HUMAN ? "yourRoll" : "baddieTurn"));
  }, [game, voice]);

  const onShare = useCallback(async () => {
    const url =
      typeof window !== "undefined" ? window.location.href : "https://thebackgammonbaddie.com";
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: "The Backgammon Baddie", url });
        setToast("Shared. Rematch invited.");
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setToast("Link copied. Send it to a friend.");
      } else {
        setToast("Sharing is not available here. Keep playing.");
      }
    } catch {
      setToast("Share canceled. Your game is still here.");
    }
  }, []);

  const onResetRecord = useCallback(() => {
    const cleared: PlayerRecord = { won: 0, lost: 0 };
    recordRef.current = cleared;
    setRecord(cleared);
    saveRecord(cleared);
    setShowReset(false);
    setToast("Record reset. Fresh start.");
  }, []);

  // ---- derived view values ----
  const baddieTurn = !!game && !isHumanTurn && !gameOver && !startOverlayActive;
  // A quiet standard opening layout to blur behind the Begin overlay before
  // any game is dealt. Display-only: never persisted, never fed to the engine.
  const backdropBoard = useMemo(() => newGame(HUMAN).board, []);
  const board = game
    ? baddiePlay
      ? previewBoard(game.board, baddiePlay.slice(0, baddieStep), BADDIE)
      : previewBoard(game.board, staged, HUMAN)
    : backdropBoard;

  const dice = diceView({
    game,
    isHumanTurn,
    moving,
    staged,
    rolling,
    lastDice,
    baddieTurn,
    baddieShaking,
    baddieDice,
    baddiePlay,
    baddieStep,
  });

  const canRoll =
    isHumanTurn && !!game && game.phase.kind === "awaiting-roll" && !rolling && !startOverlayActive;
  let rollStatus: string | null = null;
  let rollVariant: "you" | "bad" | "muted" = "muted";
  if (!canRoll) {
    if (startOverlayActive) {
      rollStatus = startPhase === "welcome-back" || startPhase === "confirm-new" ? "Game paused" : "Opening roll";
    } else if (!game) {
      rollStatus = "Dealing";
    } else if (gameOver) {
      rollStatus = "Game over";
    } else if (!isHumanTurn) {
      rollStatus = "The Baddie's move";
      rollVariant = "bad";
    } else {
      rollStatus = "Dice rolled, your move";
      rollVariant = "you";
    }
  }
  const diceLabel = `Dice show ${dice.values[0]} and ${dice.values[1]}${
    dice.values[0] === dice.values[1] ? ", doubles, four moves" : ""
  }`;
  // On a doubles roll the "N of 4 to go" count lives in the full-width hint
  // line (it has room there), not in a chip crammed under the dice.
  const doublesHint = computeDoublesHint({
    game,
    staged,
    isHumanTurn,
    humanForfeit,
    baddieDice,
    baddieStep,
  });
  // While a start overlay owns the board, the dock hint stays neutral and
  // matches the moment rather than narrating a game that is not playing yet.
  const startHint = startOverlayActive
    ? startPhase === "welcome-back" || startPhase === "confirm-new"
      ? "Your game is paused. Pick up where you left off, or start a new one."
      : "One die each. The higher die opens and plays both numbers."
    : null;
  const hint =
    startHint ?? hintOverride ?? doublesHint ?? computeHint(game, staged, selected, isForfeit);

  // ---- the start overlay's view, derived from the lifecycle + roll-off ----
  let startView: StartOverlayView | null = null;
  if (startOverlayActive) {
    if (startPhase === "begin") {
      startView = { kind: "begin" };
    } else if (startPhase === "welcome-back") {
      startView = { kind: "welcome-back" };
    } else if (startPhase === "confirm-new") {
      startView = { kind: "confirm-new" };
    } else if (startPhase === "rolling" && openingSeq && rollIndex >= 0) {
      const pair = openingSeq.rolls[rollIndex];
      const isLast = rollIndex === openingSeq.rolls.length - 1;
      if (rollTumbling) {
        startView = { kind: "rolling", dice: pair };
      } else if (!isLast) {
        startView = { kind: "tie", dice: pair };
      } else {
        startView = { kind: "decided", dice: openingSeq.dice, youWon: openingSeq.first === HUMAN };
      }
    }
  }

  // The persistent turn pill reflects the start moment while an overlay is up:
  // idle for setup states, the winner's colour once the roll-off decides.
  let pillClass = isHumanTurn ? "" : " baddie";
  let pillLabel = isHumanTurn ? "Your turn" : "The Baddie's turn";
  if (startView) {
    if (startView.kind === "decided") {
      pillClass = startView.youWon ? "" : " baddie";
      pillLabel = startView.youWon ? "Your move" : "Baddie's move";
    } else if (startView.kind === "tie") {
      pillClass = " idle";
      pillLabel = "Tie, throw again";
    } else if (startView.kind === "welcome-back") {
      pillClass = " idle";
      pillLabel = "Game in progress";
    } else if (startView.kind === "confirm-new") {
      pillClass = " idle";
      pillLabel = "New game?";
    } else {
      pillClass = " idle";
      pillLabel = "New game";
    }
  }

  return (
    <div className="wrap">
      <div className="topbar rise d1">
        <div className="brand">
          <div className="brand-text">
            <span className="kicker">Play now · no signup</span>
            <h1>
              The Backgammon <b>Baddie</b>
            </h1>
          </div>
        </div>
        <div className="top-right">
          <button type="button" className="icon-btn" aria-label="Copy link to share" onClick={onShare}>
            <ShareIcon />
          </button>
          <button type="button" className="top-btn" onClick={onNewGame}>
            <NewGameIcon />
            New game
          </button>
          <div
            className="record"
            role="button"
            tabIndex={0}
            aria-haspopup="dialog"
            aria-label={`Your record: ${record.won} won, ${record.lost} lost. Activate to reset.`}
            onClick={() => setShowReset((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowReset((v) => !v);
              }
            }}
          >
            <div className="rec-cell win">
              <div className="n">{record.won}</div>
              <div className="l">Won</div>
            </div>
            <div className="rec-div" />
            <div className="rec-cell loss">
              <div className="n">{record.lost}</div>
              <div className="l">Lost</div>
            </div>
          </div>
          {showReset && (
            <div className="pop" role="dialog" aria-label="Reset your record">
              <p>
                Reset your record?{" "}
                <b>
                  {record.won} won, {record.lost} lost
                </b>{" "}
                on this device. This can&rsquo;t be undone.
              </p>
              <div className="row">
                <button type="button" className="cancel" onClick={() => setShowReset(false)}>
                  Keep it
                </button>
                <button type="button" className="confirm" onClick={onResetRecord}>
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="turnbar rise d2">
        <div className={`turn-pill${pillClass}`} role="status" aria-live="polite">
          <span className="pulse" />
          <span>{pillLabel}</span>
        </div>
        <div className="say-bar">
          <div className="avatar">
            <BaddieFace />
          </div>
          <div className="say">
            <span className="who">The Baddie says</span>
            <div className="line-row">
              <span className="line" role="status" aria-live="polite">
                {baddieLine}
              </span>
              <span className={`thinking${thinking ? " on" : ""}`} aria-hidden>
                <i />
                <i />
                <i />
              </span>
            </div>
          </div>
        </div>
        <div className="mode-tag" title="This is single-game play. The doubling cube is not used.">
          <NoCubeIcon />
          No doubling cube
        </div>
      </div>

      <div className={`board-wrap rise d3${baddieTurn ? " baddie-turn" : ""}`}>
        <div className="board-stage">
          {hydrated ? (
            <Board
              board={board}
              human={HUMAN}
              humanTurn={isHumanTurn && !gameOver && !startOverlayActive}
              movable={movable}
              selected={selected}
              targets={targets}
              canInteract={canInteract}
              shakePoint={shakePoint}
              blurred={startOverlayActive}
              baddieSource={baddieSource}
              baddieDest={baddieDest}
              onTapSource={onTapSource}
              onPickDestination={onPickDestination}
            />
          ) : (
            <div className="board loading">
              <div className="dealing">Dealing a fresh board</div>
            </div>
          )}

          {gameOver && game && game.phase.kind === "game-over" && !startOverlayActive && (
            <ResultOverlay
              result={game.phase.result}
              human={HUMAN}
              said={resultSaid}
              onAgain={startRollOff}
              onShare={onShare}
            />
          )}

          {startView && (
            <StartOverlay
              view={startView}
              onRoll={startRollOff}
              onThrowAgain={throwNextPair}
              onStart={commitOpening}
              onResume={onResume}
              onStartNew={() => {
                setStartPhase("confirm-new");
                setBaddieLine(START_CONFIRM_LINE);
              }}
              onConfirmNew={startRollOff}
              onKeepPlaying={onKeepPlaying}
            />
          )}
        </div>
      </div>

      <div className="rise d4">
        <Dock
          isHumanTurn={isHumanTurn}
          neutral={startOverlayActive}
          diceValues={dice.values}
          diceSpent={dice.spent}
          diceBad={dice.bad}
          rolling={dice.rolling}
          diceLabel={diceLabel}
          canRoll={canRoll}
          canEndTurn={canInteract && staged.length >= (game ? maxPlayLength(game) : Infinity)}
          rollStatus={rollStatus}
          rollVariant={rollVariant}
          canUndo={canInteract && staged.length > 0}
          hint={hint}
          onRoll={onRoll}
          onEndTurn={() => commitHuman(staged)}
          onUndo={onUndo}
        />
      </div>

      <footer className="rise d4">
        <span className="built">
          Built with{" "}
          <a href="https://weft.build" target="_blank" rel="noopener noreferrer">
            <b>Weft</b>
          </a>{" "}
          · Shipped {SHIP_DATE}
        </span>
        <span>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            Read the engine on GitHub
          </a>
        </span>
      </footer>

      <div className={`toast${toast ? " show" : ""}`} role="status" aria-live="polite">
        <ShareIcon style={{ width: 16, height: 16 }} />
        <span>{toast}</span>
      </div>
      <MobileGate />
    </div>
  );
}

type DiceViewArgs = {
  game: GameState | null;
  isHumanTurn: boolean;
  moving: boolean;
  staged: Play;
  rolling: boolean;
  lastDice: [Die, Die];
  baddieTurn: boolean;
  baddieShaking: boolean;
  baddieDice: [Die, Die] | null;
  baddiePlay: Play | null;
  baddieStep: number;
};

/**
 * What the dice tray shows now: always the two rolled dice, which are
 * spent, colour, and shake. There is no third or fourth die; doubles and
 * the running "N of 4 to go" count are communicated in the hint line
 * (see computeDoublesHint), not in a chip under the dice.
 */
function diceView(a: DiceViewArgs): {
  values: Die[];
  spent: boolean[];
  bad: boolean;
  rolling: boolean;
} {
  const spentPair = (pair: [Die, Die], played: Play): boolean[] => {
    const used = played.map((m) => m.die);
    return pair.map((d) => {
      const i = used.indexOf(d);
      if (i >= 0) {
        used.splice(i, 1);
        return true;
      }
      return false;
    });
  };

  if (a.baddieTurn) {
    if (a.baddieShaking || a.baddieDice === null) {
      // Until the Baddie's own dice are known: while it shakes (the game is
      // still awaiting-roll) tumble the previous pair, but a freshly dealt
      // Baddie-first game is already `moving` with its own opening roll, so
      // show THAT. Reading the live game here means a new game can never
      // surface the ended game's roll, regardless of when lastDice updates.
      const shown: [Die, Die] =
        a.game && a.game.phase.kind === "moving"
          ? [a.game.phase.dice[0], a.game.phase.dice[1]]
          : a.lastDice;
      return { values: shown, spent: [false, false], bad: true, rolling: a.baddieShaking };
    }
    const played = a.baddiePlay ? a.baddiePlay.slice(0, a.baddieStep) : [];
    const doubles = a.baddieDice[0] === a.baddieDice[1];
    return {
      values: a.baddieDice,
      spent: doubles ? [false, false] : spentPair(a.baddieDice, played),
      bad: true,
      rolling: false,
    };
  }

  if (a.moving && a.game && a.game.phase.kind === "moving") {
    const pair: [Die, Die] = [a.game.phase.dice[0], a.game.phase.dice[1]];
    const played = a.isHumanTurn ? a.staged : [];
    const doubles = pair[0] === pair[1];
    return {
      values: pair,
      spent: doubles ? [false, false] : spentPair(pair, played),
      bad: !a.isHumanTurn,
      rolling: false,
    };
  }

  // Resting (awaiting-roll) or the human's own shake.
  if (a.rolling) return { values: a.lastDice, spent: [false, false], bad: false, rolling: true };
  return { values: a.lastDice, spent: [true, true], bad: false, rolling: false };
}

/**
 * The doubles indicator, folded into the full-width hint line so it reads
 * cleanly and keeps a live "N of 4 to go" count for both the human and the
 * Baddie. Returns null when the current turn is not a doubles roll in play.
 */
function computeDoublesHint(a: {
  game: GameState | null;
  staged: Play;
  isHumanTurn: boolean;
  humanForfeit: boolean;
  baddieDice: [Die, Die] | null;
  baddieStep: number;
}): ReactNode | null {
  if (!a.game || a.game.phase.kind === "game-over") return null;

  // The Baddie's doubles turn: narrate the count as it plays the four moves.
  if (!a.isHumanTurn) {
    if (a.baddieDice && a.baddieDice[0] === a.baddieDice[1]) {
      const left = Math.max(0, 4 - a.baddieStep);
      return (
        <>
          The Baddie rolled <b>doubles</b>. {left} of 4 to go.
        </>
      );
    }
    return null;
  }

  // The human's doubles turn.
  if (
    a.game.phase.kind === "moving" &&
    a.game.phase.dice[0] === a.game.phase.dice[1] &&
    !a.humanForfeit
  ) {
    const left = Math.max(0, 4 - a.staged.length);
    return (
      <>
        <b>Doubles.</b> Play that number four times. {left} of 4 to go.
      </>
    );
  }
  return null;
}

function computeHint(
  game: GameState | null,
  staged: Play,
  selected: number | "bar" | null,
  forfeit: (g: GameState) => boolean,
): ReactNode {
  if (!game) return "Dealing a fresh board.";
  if (game.phase.kind === "game-over") return "Game over. Start a new game whenever you like.";
  if (game.toMove !== HUMAN) return "The Baddie is playing its move. You are up next.";
  if (game.phase.kind === "awaiting-roll")
    return (
      <>
        Your turn. <b>Tap Roll</b> to throw the dice.
      </>
    );
  if (forfeit(game)) return "No legal move with this roll. Your turn passes.";
  // Doubles (for either side) are handled by computeDoublesHint, which owns
  // the running "N of 4 to go" count and takes precedence over this hint.
  if (staged.length > 0) {
    const remaining = remainingDiceValues(game, staged);
    const unique = [...new Set(remaining)];
    const dieText =
      unique.length === 1 ? (
        <>
          Play your <b>{unique[0]}</b>
        </>
      ) : (
        <b>Play your other die</b>
      );
    return <>Nice. {dieText}, or undo to rethink.</>;
  }
  if (selected !== null) return "Tap a glowing spot to land. The badge shows which die it uses.";
  if (game.board.bar[HUMAN] > 0)
    return (
      <>
        <b>Enter from the bar first.</b> Tap your bar checker, then a glowing point.
      </>
    );
  return (
    <>
      You are White, bearing off on the left. <b>Tap a ringed checker</b>, then tap where it lands.
    </>
  );
}

/** Die values still unspent after the staged half-moves (doubles give four). */
function remainingDiceValues(game: GameState, staged: Play): Die[] {
  if (game.phase.kind !== "moving") return [];
  const [d1, d2] = game.phase.dice;
  const pool: Die[] = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
  for (const move of staged) {
    const at = pool.indexOf(move.die);
    if (at !== -1) pool.splice(at, 1);
  }
  return pool;
}
