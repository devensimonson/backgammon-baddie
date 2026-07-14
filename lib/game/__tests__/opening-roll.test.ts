/**
 * Opening roll-off resolution and the start-moment load decision.
 *
 * QA IDs map to the game-start-and-opening-roll PRD Success Metrics table.
 * The roll-off stays UI-side and only feeds two known dice into the
 * engine's first turn, so these pure helpers are the single tested source
 * for who-goes-first, the visible tie re-roll, and the resume-vs-begin
 * load branch.
 */
import { describe, expect, it } from "vitest";
import { applyPlay, legalPlays, newGame, roll } from "../../engine";
import type { Die, GameState } from "../../engine";
import {
  decideStartFromSaved,
  resolveOpeningRoll,
  resolveOpeningRollSequence,
} from "../view";

/** A deterministic single-die source that walks a fixed sequence. */
function dieSeq(values: Die[]): () => Die {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("opening roll-off: who goes first", () => {
  it("QA-03: each side rolls one die and the higher die moves first (White higher)", () => {
    // White 5, Black 3 -> White is higher and carries both single dice.
    const seq = resolveOpeningRollSequence(dieSeq([5, 3]));
    expect(seq.rolls).toEqual([[5, 3]]);
    expect(seq.first).toBe("white");
    expect(seq.dice).toEqual([5, 3]);
  });

  it("QA-03: the higher die moves first (Black higher)", () => {
    const seq = resolveOpeningRollSequence(dieSeq([2, 6]));
    expect(seq.first).toBe("black");
    expect(seq.dice).toEqual([2, 6]);
  });
});

describe("opening roll-off: ties re-roll visibly", () => {
  it("QA-04: a tie re-rolls until the dice differ, so the opening is never doubles", () => {
    // (4,4) ties, then (6,1) decides.
    const seq = resolveOpeningRollSequence(dieSeq([4, 4, 6, 1]));
    expect(seq.first).toBe("white");
    expect(seq.dice).toEqual([6, 1]);
    expect(seq.dice[0]).not.toBe(seq.dice[1]);
  });

  it("QA-08: the tie is a shown pair in the sequence, followed by the winner", () => {
    // Two ties in a row, then a decisive pair; every thrown pair is shown.
    const seq = resolveOpeningRollSequence(dieSeq([3, 3, 5, 5, 1, 4]));
    expect(seq.rolls).toEqual([
      [3, 3],
      [5, 5],
      [1, 4],
    ]);
    // Only the final pair decides, and it is the Baddie's win here.
    expect(seq.first).toBe("black");
    expect(seq.dice).toEqual([1, 4]);
  });

  it("QA-08: resolveOpeningRoll returns the same outcome as the sequence's final pair", () => {
    const seq = resolveOpeningRollSequence(dieSeq([2, 2, 6, 3]));
    const outcome = resolveOpeningRoll(dieSeq([2, 2, 6, 3]));
    expect(outcome.first).toBe(seq.first);
    expect(outcome.dice).toEqual(seq.dice);
  });
});

describe("opening roll-off: winner plays both dice through the engine", () => {
  it("QA-05 / QA-16: the two roll-off dice become the opening turn's dice via the public API", () => {
    const seq = resolveOpeningRollSequence(dieSeq([6, 2]));
    // Trust boundary: the opening move is built only from newGame + roll.
    const started = roll(newGame(seq.first), seq.dice);
    expect(started.toMove).toBe("white");
    expect(started.phase.kind).toBe("moving");
    if (started.phase.kind === "moving") {
      expect([...started.phase.dice]).toEqual([6, 2]);
    }
    // And a legal opening play can be committed through applyPlay.
    const plays = legalPlays(started);
    expect(plays.length).toBeGreaterThan(0);
    const after = applyPlay(started, plays[0]);
    expect(after.toMove).toBe("black");
  });

  it("QA-06: when the Baddie wins, the opening turn is the Baddie's", () => {
    const seq = resolveOpeningRollSequence(dieSeq([1, 5]));
    const started = roll(newGame(seq.first), seq.dice);
    expect(started.toMove).toBe("black");
  });
});

describe("start moment: which screen loads from persisted state", () => {
  it("QA-01 / QA-02: no saved game shows the fresh Begin moment", () => {
    expect(decideStartFromSaved(null)).toBe("begin");
  });

  it("QA-09: a saved game in progress resumes (Welcome back), not a new roll-off", () => {
    const awaiting: GameState = newGame("white");
    expect(awaiting.phase.kind).toBe("awaiting-roll");
    expect(decideStartFromSaved(awaiting)).toBe("welcome-back");

    const moving = roll(newGame("white"), [6, 2]);
    expect(moving.phase.kind).toBe("moving");
    expect(decideStartFromSaved(moving)).toBe("welcome-back");
  });

  it("QA-10: once the opening turn is committed, a reload resumes that started game", () => {
    // During the roll-off nothing is persisted, so the saved slot is null
    // and the load lands on Begin, never replaying a half-resolved roll-off.
    expect(decideStartFromSaved(null)).toBe("begin");
    // The moment the opening turn begins the started game is saved; a
    // reload then resumes it (Welcome back) with its committed dice intact.
    const seq = resolveOpeningRollSequence(dieSeq([5, 3]));
    const started = roll(newGame(seq.first), seq.dice);
    expect(decideStartFromSaved(started)).toBe("welcome-back");
    if (started.phase.kind === "moving") {
      expect([...started.phase.dice]).toEqual([5, 3]);
    }
  });

  it("QA-11: a saved finished game restores to its result, not the start moment", () => {
    // A finished GameState in the engine's public shape. It is read-only
    // classification input for the load branch, never fed back into the
    // engine, so it holds the trust boundary (no mutated play state).
    const finished: GameState = {
      ...newGame("white"),
      phase: { kind: "game-over", result: { winner: "white", kind: "single", stake: 1 } },
    };
    expect(finished.phase.kind).toBe("game-over");
    expect(decideStartFromSaved(finished)).toBe("resume-finished");
  });
});
