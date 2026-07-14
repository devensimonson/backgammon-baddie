/**
 * Browser-storage persistence contract for The Backgammon Baddie.
 *
 * This module is PURE: it turns strings into values and values into
 * strings. It never touches browser storage, the global scope, or any
 * I/O, which keeps it node-testable and framework-free. The thin wrapper
 * that actually reads and writes the browser lives in the app layer and
 * calls these functions.
 *
 * Storage is data, never authority. On restore a game blob is validated
 * structurally here and then only ever advanced through the engine's
 * public API. See `pipeline/playable-board-and-launch/schema.md`.
 */

import { legalPlays } from "../engine";
import type { GameState, Player, Point } from "../engine";

export const SCHEMA_VERSION = 1;

/** Two separate keys so a corrupt game blob can never take the record down. */
export const GAME_KEY = "tbb.game.v1";
export const RECORD_KEY = "tbb.record.v1";

/** Single-player, this-browser tally. Each finished game is one win or one loss. */
export type PlayerRecord = {
  won: number;
  lost: number;
};

export const EMPTY_RECORD: PlayerRecord = { won: 0, lost: 0 };

type GameEnvelope = {
  schemaVersion: number;
  savedAt: string;
  game: GameState;
};

type RecordEnvelope = {
  schemaVersion: number;
  savedAt: string;
  record: PlayerRecord;
};

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

export function serializeGame(game: GameState, now: () => string = isoNow): string {
  const envelope: GameEnvelope = {
    schemaVersion: SCHEMA_VERSION,
    savedAt: now(),
    game,
  };
  return JSON.stringify(envelope);
}

export function serializeRecord(record: PlayerRecord, now: () => string = isoNow): string {
  const envelope: RecordEnvelope = {
    schemaVersion: SCHEMA_VERSION,
    savedAt: now(),
    record,
  };
  return JSON.stringify(envelope);
}

// ---------------------------------------------------------------------------
// Deserialize (the guard chain)
// ---------------------------------------------------------------------------

/**
 * Parse a stored game blob. Returns the restorable `GameState`, or
 * `null` when the blob is missing, unreadable, the wrong version,
 * structurally invalid, or rejected by the engine. Never throws.
 */
export function deserializeGame(raw: string | null): GameState | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed)) return null;
    if (parsed.schemaVersion !== SCHEMA_VERSION) return null;
    const game = (parsed as { game?: unknown }).game;
    if (!isValidGameState(game)) return null;
    if (!enginePasses(game)) return null;
    return game;
  } catch {
    return null;
  }
}

/**
 * Parse a stored record blob. Returns a valid `PlayerRecord`, falling
 * back to `{ won: 0, lost: 0 }` on any failure. Never throws.
 */
export function deserializeRecord(raw: string | null): PlayerRecord {
  if (raw === null) return { ...EMPTY_RECORD };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed)) return { ...EMPTY_RECORD };
    if (parsed.schemaVersion !== SCHEMA_VERSION) return { ...EMPTY_RECORD };
    const record = (parsed as { record?: unknown }).record;
    if (!isValidRecord(record)) return { ...EMPTY_RECORD };
    return { won: record.won, lost: record.lost };
  } catch {
    return { ...EMPTY_RECORD };
  }
}

// ---------------------------------------------------------------------------
// Structural guards (client-side; the engine exposes no validateState)
// ---------------------------------------------------------------------------

export function isValidRecord(value: unknown): value is PlayerRecord {
  return (
    isObject(value) &&
    isNonNegativeInt((value as PlayerRecord).won) &&
    isNonNegativeInt((value as PlayerRecord).lost)
  );
}

const PLAYERS: readonly Player[] = ["white", "black"];
const DICE = new Set([1, 2, 3, 4, 5, 6]);
const CUBE_VALUES = new Set([1, 2, 4, 8, 16, 32, 64]);
const RESULT_KINDS = new Set(["single", "gammon", "backgammon", "drop"]);

export function isValidGameState(value: unknown): value is GameState {
  if (!isObject(value)) return false;
  const state = value as Record<string, unknown>;

  if (!isPlayer(state.toMove)) return false;
  if (!isValidBoard(state.board)) return false;
  if (!isValidPhase(state.phase)) return false;
  if (!isValidCube(state.cube)) return false;

  // Conservation: each side owns exactly 15 checkers across points, bar, and off.
  const board = state.board as {
    points: Point[];
    bar: Record<Player, number>;
    off: Record<Player, number>;
  };
  for (const player of PLAYERS) {
    let total = board.bar[player] + board.off[player];
    for (const point of board.points) {
      if (point !== null && point.owner === player) total += point.count;
    }
    if (total !== 15) return false;
  }
  return true;
}

function isValidBoard(value: unknown): boolean {
  if (!isObject(value)) return false;
  const board = value as Record<string, unknown>;

  if (!Array.isArray(board.points) || board.points.length !== 24) return false;
  for (const point of board.points) {
    if (point === null) continue;
    if (!isObject(point)) return false;
    const p = point as Record<string, unknown>;
    if (!isPlayer(p.owner)) return false;
    if (!isPositiveInt(p.count)) return false;
  }
  return isSideCounts(board.bar) && isSideCounts(board.off);
}

function isSideCounts(value: unknown): boolean {
  return (
    isObject(value) &&
    isNonNegativeInt((value as Record<string, unknown>).white) &&
    isNonNegativeInt((value as Record<string, unknown>).black)
  );
}

function isValidPhase(value: unknown): boolean {
  if (!isObject(value)) return false;
  const phase = value as Record<string, unknown>;
  switch (phase.kind) {
    case "awaiting-roll":
      return true;
    case "moving": {
      const dice = phase.dice;
      return (
        Array.isArray(dice) &&
        dice.length === 2 &&
        dice.every((d) => typeof d === "number" && DICE.has(d))
      );
    }
    case "cube-offered":
      return isPlayer(phase.offeredBy);
    case "game-over": {
      const result = phase.result;
      if (!isObject(result)) return false;
      const r = result as Record<string, unknown>;
      return isPlayer(r.winner) && typeof r.kind === "string" && RESULT_KINDS.has(r.kind);
    }
    default:
      return false;
  }
}

function isValidCube(value: unknown): boolean {
  if (!isObject(value)) return false;
  const cube = value as Record<string, unknown>;
  const ownerOk = isPlayer(cube.owner) || cube.owner === "centered";
  return ownerOk && typeof cube.value === "number" && CUBE_VALUES.has(cube.value);
}

/**
 * Defensive engine smoke check: drive the restored state through the
 * public API it is about to be used with. A throw or inconsistency
 * means the blob is unrestorable.
 */
function enginePasses(game: GameState): boolean {
  try {
    if (game.phase.kind === "moving") {
      legalPlays(game);
    }
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Small type helpers
// ---------------------------------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlayer(value: unknown): value is Player {
  return value === "white" || value === "black";
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function isoNow(): string {
  return new Date().toISOString();
}
