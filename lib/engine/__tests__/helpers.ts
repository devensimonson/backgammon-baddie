/**
 * Test fixtures: a small position-builder so constructed positions
 * read like the rulebook diagrams they came from.
 *
 * Point numbers are ABSOLUTE (White's perspective): White's home is
 * points 1-6, Black's home is points 19-24. See types.ts.
 */

import type {
  Board,
  CubeState,
  GameState,
  Play,
  Player,
  Point,
  Roll,
} from "../types";

type SideSpec = {
  /** absolute point number -> checker count */
  points?: Record<number, number>;
  bar?: number;
  off?: number;
};

type PositionSpec = {
  white?: SideSpec;
  black?: SideSpec;
  toMove?: Player;
  /** When given, the state is mid-turn ("moving" phase) with this roll. */
  dice?: Roll;
  cube?: Partial<CubeState>;
};

export function position(spec: PositionSpec): GameState {
  const points: Point[] = new Array(24).fill(null);
  const bar = { white: spec.white?.bar ?? 0, black: spec.black?.bar ?? 0 };
  const off = { white: spec.white?.off ?? 0, black: spec.black?.off ?? 0 };

  for (const player of ["white", "black"] as const) {
    let total = bar[player] + off[player];
    for (const [abs, count] of Object.entries(spec[player]?.points ?? {})) {
      const index = Number(abs) - 1;
      if (index < 0 || index > 23) throw new Error(`bad point ${abs}`);
      if (points[index] !== null) throw new Error(`point ${abs} given to both sides`);
      points[index] = { owner: player, count };
      total += count;
    }
    if (total > 15) throw new Error(`${player} has ${total} checkers (max 15)`);
  }

  const board: Board = { points, bar, off };
  return {
    board,
    toMove: spec.toMove ?? "white",
    phase: spec.dice ? { kind: "moving", dice: spec.dice } : { kind: "awaiting-roll" },
    cube: { value: 1, owner: "centered", ...spec.cube },
  };
}

/** Canonical string for one half-move, e.g. "8/5:3" or "bar/22:3". */
export function moveKey(move: Play[number]): string {
  return `${move.from}/${move.to}:${move.die}`;
}

/** Order-insensitive canonical string for a whole play. */
export function playKey(play: Play): string {
  return play.map(moveKey).sort().join(" ");
}

/** Does `plays` contain a play equal (as a set of half-moves) to `expected`? */
export function hasPlay(plays: readonly Play[], expected: Play): boolean {
  const want = playKey(expected);
  return plays.some((play) => playKey(play) === want);
}

/** Recursively Object.freeze -- used to prove the engine never mutates inputs. */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}
