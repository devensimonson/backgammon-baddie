"use client";

import type { CSSProperties } from "react";
import { opponentOf } from "@/lib/engine";
import type { Board as BoardState, Die, Player } from "@/lib/engine";
import { QUADRANTS, TOP_QUADRANTS, pointView, type QuadrantId, type Side } from "@/lib/game/view";
import { PlusIcon, OffIcon } from "./icons";

export type Target = { to: number | "off"; die: Die };

type BoardProps = {
  board: BoardState;
  human: Player;
  humanTurn: boolean;
  movable: ReadonlySet<number | "bar">;
  selected: number | "bar" | null;
  targets: Target[];
  canInteract: boolean;
  shakePoint: number | "bar" | null;
  // Blur the board behind a start overlay (Begin, roll-off, welcome back).
  blurred?: boolean;
  // Presentation-only highlight of the Baddie's current move (no legality).
  baddieSource: number | "bar" | null;
  baddieDest: number | "off" | null;
  onTapSource: (from: number | "bar") => void;
  onPickDestination: (to: number | "off") => void;
};

function Checkers({ side, count }: { side: Side; count: number }) {
  const shown = Math.min(count, 5);
  return (
    <>
      {count > 5 && <span className="count">{count}</span>}
      <div className="stack">
        {Array.from({ length: shown }, (_, i) => (
          <div key={i} className={`checker ${side}`} />
        ))}
      </div>
    </>
  );
}

function LegalMarker({
  die,
  label,
  onClick,
  bearOff,
}: {
  die: Die;
  label: string;
  onClick: () => void;
  bearOff?: boolean;
}) {
  return (
    <button
      type="button"
      className={bearOff ? "legal bear-off" : "legal"}
      aria-label={label}
      onClick={onClick}
    >
      <span className="die-badge">{die}</span>
      {bearOff ? <OffIcon /> : <PlusIcon />}
    </button>
  );
}

export function Board({
  board,
  human,
  humanTurn,
  movable,
  selected,
  targets,
  canInteract,
  shakePoint,
  blurred,
  baddieSource,
  baddieDest,
  onTapSource,
  onPickDestination,
}: BoardProps) {
  const targetFor = (to: number | "off") => targets.find((t) => t.to === to);
  const foe = opponentOf(human);

  const renderPoint = (id: number, quad: QuadrantId) => {
    const isTop = TOP_QUADRANTS.includes(quad);
    const view = pointView(board, id, human);
    const own = view?.side === "you";
    const isMovable = canInteract && movable.has(id);
    // Own points are tappable through the whole human turn so a tap that
    // can't move still explains itself.
    const tappable = humanTurn && own;
    const isSelected = selected === id;
    const target = targetFor(id);

    const classes = [
      "point",
      isTop ? "top" : "bottom",
      id % 2 === 0 ? "a" : "b",
      isMovable ? "movable" : "",
      tappable && !isMovable ? "tappable" : "",
      isSelected ? "selected" : "",
      shakePoint === id ? "shake" : "",
      baddieSource === id ? "bad-from" : "",
      baddieDest === id ? "bad-to" : "",
    ]
      .filter(Boolean)
      .join(" ");

    // The landing marker sits past the destination's current own stack.
    const slot = own ? view!.count : 0;
    const style = target ? ({ "--slot": slot } as CSSProperties) : undefined;

    const tapProps = tappable
      ? {
          role: "button" as const,
          tabIndex: 0,
          "aria-label": isMovable
            ? `Point ${id}, your checkers, ${describe(view)}. Activate to pick up.`
            : `Point ${id}, your checkers, ${describe(view)}. No move from here right now.`,
          onClick: () => onTapSource(id),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onTapSource(id);
            }
          },
        }
      : {};

    return (
      <div key={id} className={classes} data-point={id} style={style} {...tapProps}>
        <span className="tri" />
        <span className="pt-num">{id}</span>
        {view && <Checkers side={view.side} count={view.count} />}
        {target && (
          <LegalMarker
            die={target.die}
            label={`Move to point ${id} using a ${target.die}`}
            onClick={() => onPickDestination(id)}
          />
        )}
      </div>
    );
  };

  const youBar = board.bar[human];
  const badBar = board.bar[foe];
  const offTarget = targetFor("off");
  const barTappable = humanTurn && youBar > 0;
  const barMovable = canInteract && movable.has("bar");

  return (
    <div className={blurred ? "board blurred" : "board"} aria-hidden={blurred || undefined}>
      <div className="quad tl">{QUADRANTS.tl.map((id) => renderPoint(id, "tl"))}</div>
      <div className="quad tr">{QUADRANTS.tr.map((id) => renderPoint(id, "tr"))}</div>

      <div className="bar">
        <div className="bar-slot">
          <span className="bar-lab bad">Baddie bar</span>
          {badBar > 0 && (
            <div
              className={`bar-checkers${baddieSource === "bar" ? " bad-from" : ""}`}
              aria-label={`The Baddie has ${badBar} on the bar`}
            >
              {Array.from({ length: Math.min(badBar, 5) }, (_, i) => (
                <div key={i} className="checker bad" />
              ))}
              {badBar > 5 && <span className="count">{badBar}</span>}
            </div>
          )}
        </div>
        <div className="bar-slot">
          {youBar > 0 && (
            <div
              className={`bar-checkers${shakePoint === "bar" ? " shake" : ""}`}
              aria-label={
                barMovable
                  ? `You have ${youBar} on the bar. Activate to enter from the bar.`
                  : `You have ${youBar} on the bar.`
              }
              {...(barTappable
                ? {
                    role: "button" as const,
                    tabIndex: 0,
                    onClick: () => onTapSource("bar"),
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onTapSource("bar");
                      }
                    },
                    style: { cursor: "pointer" },
                  }
                : {})}
            >
              {Array.from({ length: Math.min(youBar, 5) }, (_, i) => (
                <div key={i} className="checker you" />
              ))}
              {youBar > 5 && <span className="count">{youBar}</span>}
            </div>
          )}
          <span className="bar-lab you">Your bar</span>
        </div>
      </div>

      <div className="quad bl">{QUADRANTS.bl.map((id) => renderPoint(id, "bl"))}</div>
      <div className="quad br">{QUADRANTS.br.map((id) => renderPoint(id, "br"))}</div>

      <div className="tray">
        <div className="off bad">
          <span className="off-name">Baddie</span>
          <div
            className={`well${baddieDest === "off" ? " bad-to" : ""}`}
            aria-label={`The Baddie has borne off ${board.off[foe]}`}
          >
            {Array.from({ length: board.off[foe] }, (_, i) => (
              <div key={i} className="chip-off" />
            ))}
          </div>
          <span className="off-n">{board.off[foe]}</span>
        </div>
        <div className="off you">
          <span className="off-name">You</span>
          <div className="well" aria-label={`You have borne off ${board.off[human]}`}>
            {Array.from({ length: board.off[human] }, (_, i) => (
              <div key={i} className="chip-off" />
            ))}
            {offTarget && (
              <LegalMarker
                die={offTarget.die}
                label={`Bear off using a ${offTarget.die}`}
                bearOff
                onClick={() => onPickDestination("off")}
              />
            )}
          </div>
          <span className="off-n">{board.off[human]}</span>
        </div>
      </div>
    </div>
  );
}

function describe(view: ReturnType<typeof pointView>): string {
  if (!view) return "empty";
  return `${view.count} checker${view.count === 1 ? "" : "s"}`;
}
