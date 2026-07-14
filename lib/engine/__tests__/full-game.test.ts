import { describe, expect, it } from "vitest";
import { checkersAt } from "../board";
import { offerDouble, takeDouble } from "../cube";
import { createRoller } from "../dice";
import { legalPlays, movesFrom } from "../plays";
import { newGame } from "../setup";
import { applyPlay, forfeitTurn, roll } from "../turn";
import type { Board, GameState, Player } from "../types";
import { position } from "./helpers";

function totalCheckers(board: Board, player: Player): number {
  let total = board.bar[player] + board.off[player];
  for (let abs = 1; abs <= 24; abs++) total += checkersAt(board, player, abs);
  return total;
}

describe("a full game, end to end", () => {
  it("plays from the opening to a scored result with checkers conserved throughout", () => {
    const rollDice = createRoller(20260713); // fixed seed: fully deterministic
    let state: GameState = newGame("white");

    // An early double and take: the game plays out with the cube at 2.
    state = takeDouble(offerDouble(state));
    expect(state.cube).toEqual({ value: 2, owner: "black" });

    let turns = 0;
    while (state.phase.kind !== "game-over") {
      expect(++turns).toBeLessThan(2000);
      state = roll(state, rollDice());
      const plays = legalPlays(state);
      state = plays.length > 0 ? applyPlay(state, plays[0]) : forfeitTurn(state);

      // Invariant: 15 checkers per side, always, everywhere.
      expect(totalCheckers(state.board, "white")).toBe(15);
      expect(totalCheckers(state.board, "black")).toBe(15);
    }

    const { result } = state.phase;
    expect(state.board.off[result.winner]).toBe(15);
    expect(["single", "gammon", "backgammon"]).toContain(result.kind);
    const multiplier = { single: 1, gammon: 2, backgammon: 3 }[
      result.kind as "single" | "gammon" | "backgammon"
    ];
    expect(result.stake).toBe(2 * multiplier);
  });

  it("movesFrom only offers destinations that complete to a legal play", () => {
    // Opening 6-1 for White: from the 13-point only the 6 plays (to 7);
    // the 1 would land on 12, which Black holds. From 24 both dice play.
    const state = roll(newGame("white"), [6, 1]);
    expect(new Set(movesFrom(state, 13))).toEqual(new Set([7]));
    expect(new Set(movesFrom(state, 24))).toEqual(new Set([18, 23]));

    // After 13/7 with the 6, the checker on 8 may finish the bar-point with the 1.
    const played = [{ from: 13, to: 7, die: 6 as const }];
    expect(movesFrom(state, 8, played)).toContain(7);
  });

  it("movesFrom never offers a half-move that would strand the other die", () => {
    // The QA-08 forcing position: 8/4 is locally legal but dead-ends the 3,
    // so the checker on 8 has nowhere to go at all this turn.
    const forcing = position({
      white: { points: { 8: 1, 24: 1 } },
      black: { points: { 1: 2, 5: 2, 21: 2 } },
      dice: [4, 3],
    });
    expect(movesFrom(forcing, 8)).toEqual([]);
    expect(movesFrom(forcing, 24)).toEqual([20]);
  });
});
