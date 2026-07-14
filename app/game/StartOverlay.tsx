"use client";

import { useEffect, useRef } from "react";
import type { Die } from "@/lib/engine";
import { diePips } from "@/lib/game/view";

/**
 * The start-of-game overlay: one rising panel over the blurred board that
 * carries every start moment (Begin, the visible opening roll-off, the tie
 * re-throw, Welcome back, and the leave-this-game confirm). It is purely
 * presentational; the controller (Game.tsx) owns the lifecycle and hands it
 * a view to render plus the handlers to call. All copy is warm, plain,
 * honest, and free of em dashes.
 */
export type StartOverlayView =
  | { kind: "begin" }
  | { kind: "welcome-back" }
  | { kind: "confirm-new" }
  | { kind: "rolling"; dice: readonly [Die, Die] | null }
  | { kind: "tie"; dice: readonly [Die, Die] }
  | { kind: "decided"; dice: readonly [Die, Die]; youWon: boolean };

type StartOverlayProps = {
  view: StartOverlayView;
  onRoll: () => void;
  onThrowAgain: () => void;
  onStart: () => void;
  onResume: () => void;
  onStartNew: () => void;
  onConfirmNew: () => void;
  onKeepPlaying: () => void;
};

const NUMBER_WORDS = ["", "one", "two", "three", "four", "five", "six"] as const;

function DieFace({ value, side, tumbling }: { value: Die; side: "you" | "bad"; tumbling: boolean }) {
  return (
    <div className={`start-die ${side}${tumbling ? " rolling" : ""}`} aria-hidden>
      {diePips(value).map((on, i) => (
        <span key={i} className="start-pip" style={{ visibility: on ? "visible" : "hidden" }} />
      ))}
    </div>
  );
}

function DiceRow({
  dice,
  tumbling,
  winner,
}: {
  dice: readonly [Die, Die];
  tumbling: boolean;
  winner: "you" | "bad" | null;
}) {
  const youClass = ["start-die-slot", "you", winner === "you" ? "winner" : winner ? "loser" : ""]
    .filter(Boolean)
    .join(" ");
  const badClass = ["start-die-slot", "bad", winner === "bad" ? "winner" : winner ? "loser" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="start-dice-row">
      <div className={youClass}>
        <span className="start-die-owner">You</span>
        <DieFace value={dice[0]} side="you" tumbling={tumbling} />
        <span className="start-die-tag">Opens</span>
      </div>
      <span className="start-vs">vs</span>
      <div className={badClass}>
        <span className="start-die-owner">The Baddie</span>
        <DieFace value={dice[1]} side="bad" tumbling={tumbling} />
        <span className="start-die-tag">Opens</span>
      </div>
    </div>
  );
}

export function StartOverlay({
  view,
  onRoll,
  onThrowAgain,
  onStart,
  onResume,
  onStartNew,
  onConfirmNew,
  onKeepPlaying,
}: StartOverlayProps) {
  const primaryRef = useRef<HTMLButtonElement>(null);

  // The actionable button in each state receives focus, so the flow is fully
  // keyboard-operable. Re-focus whenever the state (or roll-off outcome)
  // changes; during the tumble there is no button, so nothing is focused.
  const focusKey =
    view.kind === "decided" ? `decided-${view.youWon}` : view.kind === "rolling" ? "rolling" : view.kind;
  useEffect(() => {
    if (view.kind === "rolling") return;
    primaryRef.current?.focus();
  }, [focusKey, view.kind]);

  let eyebrow = "Opening roll";
  let title: React.ReactNode = "Ready to play?";
  let sub = "";
  let announce = "";
  let diceRow: React.ReactNode = null;
  let cta: React.ReactNode = null;

  if (view.kind === "begin") {
    eyebrow = "Opening roll";
    title = "Ready to play?";
    sub = "One die each. Highest goes first and plays both dice. Throw to see who opens.";
    announce = "Ready to play. Throw to see who opens.";
    cta = (
      <button ref={primaryRef} type="button" className="start-btn primary" onClick={onRoll}>
        Roll to start
      </button>
    );
  } else if (view.kind === "rolling") {
    eyebrow = "Throwing";
    title = "Rolling...";
    sub = "";
    announce = "Throwing the dice.";
    diceRow = view.dice ? <DiceRow dice={view.dice} tumbling winner={null} /> : null;
  } else if (view.kind === "tie") {
    const word = NUMBER_WORDS[view.dice[0]];
    eyebrow = "Dead heat";
    title = (
      <>
        You both rolled a <span className="cyan">{word}</span>
      </>
    );
    sub = "A tie means nobody opens yet. Scoop them up and throw again.";
    announce = `You both rolled a ${word}. A tie means nobody opens yet. Throw again.`;
    diceRow = <DiceRow dice={view.dice} tumbling={false} winner={null} />;
    cta = (
      <button ref={primaryRef} type="button" className="start-btn ghost" onClick={onThrowAgain}>
        Throw again
      </button>
    );
  } else if (view.kind === "decided") {
    const [white, black] = view.dice;
    if (view.youWon) {
      eyebrow = "Opening roll";
      title = (
        <>
          You open with{" "}
          <span className="cyan">
            {white} and {black}
          </span>
        </>
      );
      sub = "Higher die goes first. Start the game and play both numbers.";
      announce = `You open with ${white} and ${black}.`;
      diceRow = <DiceRow dice={view.dice} tumbling={false} winner="you" />;
      cta = (
        <>
          <button ref={primaryRef} type="button" className="start-btn primary" onClick={onStart}>
            Start game
          </button>
          <span className="start-fineprint">
            You play {white} and {black}
          </span>
        </>
      );
    } else {
      eyebrow = "Opening roll";
      title = (
        <>
          The Baddie opens with{" "}
          <span className="accent">
            {black} and {white}
          </span>
        </>
      );
      sub = "It threw higher, so it plays first. Start when you are ready to watch it move.";
      announce = `The Baddie opens with ${black} and ${white}.`;
      diceRow = <DiceRow dice={view.dice} tumbling={false} winner="bad" />;
      cta = (
        <>
          <button ref={primaryRef} type="button" className="start-btn baddie" onClick={onStart}>
            Let The Baddie open
          </button>
          <span className="start-fineprint">
            It plays {black} and {white}
          </span>
        </>
      );
    }
  } else if (view.kind === "welcome-back") {
    eyebrow = "Welcome back";
    title = "Pick up where you left off?";
    sub = "You have a game in progress against The Baddie. Jump back in, or start a fresh one.";
    announce = "Welcome back. You have a game in progress.";
    cta = (
      <>
        <button ref={primaryRef} type="button" className="start-btn primary" onClick={onResume}>
          Resume game
        </button>
        <button type="button" className="start-btn ghost" onClick={onStartNew}>
          Start a new game
        </button>
      </>
    );
  } else {
    // confirm-new
    eyebrow = "Start over";
    title = "Leave this game behind?";
    sub =
      "Starting a new game ends the one in progress. This cannot be undone. Your win and loss record stays exactly as it is.";
    announce = "Leave this game behind?";
    cta = (
      <>
        <button ref={primaryRef} type="button" className="start-btn baddie" onClick={onConfirmNew}>
          Start a new game
        </button>
        <button type="button" className="start-btn ghost" onClick={onKeepPlaying}>
          Keep playing
        </button>
      </>
    );
  }

  return (
    <div className="overlay start-overlay">
      <div className="start-panel" role="dialog" aria-modal="true" aria-labelledby="startTitle">
        <div className="start-eyebrow">{eyebrow}</div>
        <h2 id="startTitle" className="start-title">
          {title}
        </h2>
        <p className="start-sub">{sub}</p>
        {diceRow}
        <div className="start-cta">{cta}</div>
        <p className="sr-only" role="status" aria-live="polite">
          {announce}
        </p>
      </div>
    </div>
  );
}
