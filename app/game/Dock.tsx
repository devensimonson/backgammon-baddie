"use client";

import type { ReactNode } from "react";
import type { Die } from "@/lib/engine";
import { diePips } from "@/lib/game/view";
import { CheckIcon, HintIcon, RollIcon, UndoIcon } from "./icons";

// Cell-centre percentages for the 3x3 pip grid, inset from the die edge.
const PIP_POS = [24, 50, 76];

function DieFace({ value, bad, spent, rolling }: { value: Die; bad: boolean; spent: boolean; rolling: boolean }) {
  const pips = diePips(value);
  return (
    <div
      className={["die", bad ? "bad" : "", spent ? "spent" : "", rolling ? "rolling" : ""]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    >
      {pips.map((on, i) =>
        on ? (
          <span
            key={i}
            className="pip"
            style={{ left: `${PIP_POS[i % 3]}%`, top: `${PIP_POS[Math.floor(i / 3)]}%` }}
          />
        ) : null,
      )}
    </div>
  );
}

type DockProps = {
  isHumanTurn: boolean;
  // While a start overlay owns the board, no side is actively playing, so the
  // player cards drop their active glow.
  neutral?: boolean;
  diceValues: Die[];
  diceSpent: boolean[];
  diceBad: boolean;
  rolling: boolean;
  diceLabel: string;
  canRoll: boolean;
  rollStatus: string | null;
  rollVariant: "you" | "bad" | "muted";
  canUndo: boolean;
  hint: ReactNode;
  onRoll: () => void;
  onUndo: () => void;
};

export function Dock({
  isHumanTurn,
  neutral,
  diceValues,
  diceSpent,
  diceBad,
  rolling,
  diceLabel,
  canRoll,
  rollStatus,
  rollVariant,
  canUndo,
  hint,
  onRoll,
  onUndo,
}: DockProps) {
  return (
    <div className="dock">
      <div className="players">
        <div className={`pcard you${!neutral && isHumanTurn ? " active" : ""}`}>
          <span className="dot you" />
          <span className="meta">
            <span className="nm">
              You <span className="tag">White</span>
            </span>
          </span>
          <span className="badge">Your turn</span>
        </div>
        <div className={`pcard bad${!neutral && !isHumanTurn ? " active" : ""}`}>
          <span className="dot bad" />
          <span className="meta">
            <span className="nm">
              Baddie <span className="tag">Black</span>
            </span>
          </span>
          <span className="badge">Playing</span>
        </div>
      </div>

      <div className="dice-wrap">
        <div className={`dice${canRoll ? " attn" : ""}`} role="img" aria-label={diceLabel}>
          {diceValues.slice(0, 2).map((value, i) => (
            <DieFace
              key={i}
              value={value}
              bad={diceBad}
              spent={diceSpent[i] ?? false}
              rolling={rolling}
            />
          ))}
        </div>
      </div>

      <div className="actions">
        {canRoll ? (
          <button type="button" className="btn primary attn" onClick={onRoll}>
            <RollIcon className="ic" />
            Roll
          </button>
        ) : (
          <div className={`btn status ${rollVariant}`} role="status">
            {rollVariant === "you" && <CheckIcon className="ic" />}
            {rollStatus}
          </div>
        )}
        {canUndo && (
          <button type="button" className="btn ghost" onClick={onUndo}>
            <UndoIcon className="ic" />
            Undo move
          </button>
        )}
      </div>

      <div className="hint">
        <HintIcon />
        <span aria-live="polite">{hint}</span>
      </div>
    </div>
  );
}
