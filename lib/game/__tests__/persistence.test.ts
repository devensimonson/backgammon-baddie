import { describe, expect, it } from "vitest";
import { newGame, roll } from "../../engine";
import {
  EMPTY_RECORD,
  GAME_KEY,
  RECORD_KEY,
  SCHEMA_VERSION,
  deserializeGame,
  deserializeRecord,
  isValidGameState,
  serializeGame,
  serializeRecord,
} from "../persistence";

const fixedNow = () => "2026-07-13T00:00:00.000Z";

describe("persistence: game round-trip and guard chain", () => {
  it("QA-20: a real GameState round-trips through serialize and deserialize", () => {
    const game = roll(newGame("white"), [6, 4]);
    const restored = deserializeGame(serializeGame(game, fixedNow));
    expect(restored).toEqual(game);
  });

  it("QA-20: an awaiting-roll fresh game round-trips", () => {
    const game = newGame("black");
    const restored = deserializeGame(serializeGame(game, fixedNow));
    expect(restored).toEqual(game);
  });

  it("QA-21: a missing key yields a fresh game (null), not a crash", () => {
    expect(deserializeGame(null)).toBeNull();
  });

  it("QA-21: unparseable JSON is discarded without throwing", () => {
    expect(deserializeGame("{not valid json")).toBeNull();
  });

  it("QA-21: a non-object or missing schemaVersion is discarded", () => {
    expect(deserializeGame(JSON.stringify(42))).toBeNull();
    expect(deserializeGame(JSON.stringify({ game: newGame("white") }))).toBeNull();
  });

  it("QA-21: a wrong schemaVersion is discarded (no blind migration)", () => {
    const blob = JSON.stringify({
      schemaVersion: SCHEMA_VERSION + 1,
      savedAt: fixedNow(),
      game: newGame("white"),
    });
    expect(deserializeGame(blob)).toBeNull();
  });

  it("QA-21: a structurally invalid board (wrong checker total) is discarded", () => {
    const game = newGame("white");
    // Drop a checker so white no longer conserves 15.
    const broken = {
      ...game,
      board: {
        ...game.board,
        points: game.board.points.map((p, i) =>
          i === 0 && p ? { ...p, count: p.count - 1 } : p,
        ),
      },
    };
    const blob = JSON.stringify({ schemaVersion: 1, savedAt: fixedNow(), game: broken });
    expect(deserializeGame(blob)).toBeNull();
  });

  it("QA-21: a moving phase with malformed dice is discarded", () => {
    const game = newGame("white");
    const blob = JSON.stringify({
      schemaVersion: 1,
      savedAt: fixedNow(),
      game: { ...game, phase: { kind: "moving", dice: [7, 4] } },
    });
    expect(deserializeGame(blob)).toBeNull();
  });

  it("QA-03: isValidGameState accepts the standard start and rejects junk", () => {
    expect(isValidGameState(newGame("white"))).toBe(true);
    expect(isValidGameState(null)).toBe(false);
    expect(isValidGameState({ board: {}, toMove: "white" })).toBe(false);
  });
});

describe("persistence: record survives independently of the game", () => {
  it("QA-19: a record round-trips through serialize and deserialize", () => {
    const record = { won: 3, lost: 4 };
    expect(deserializeRecord(serializeRecord(record, fixedNow))).toEqual(record);
  });

  it("QA-21: a missing or corrupt record falls back to an empty record", () => {
    expect(deserializeRecord(null)).toEqual(EMPTY_RECORD);
    expect(deserializeRecord("garbage")).toEqual(EMPTY_RECORD);
    expect(deserializeRecord(JSON.stringify({ schemaVersion: 1, record: { won: -1, lost: 0 } }))).toEqual(
      EMPTY_RECORD,
    );
  });

  it("QA-21: the record parses even when the game blob is corrupt (separate keys)", () => {
    // Simulates a corrupt game key next to a valid record key.
    const badGame = "{corrupt";
    const goodRecord = serializeRecord({ won: 1, lost: 2 }, fixedNow);
    expect(deserializeGame(badGame)).toBeNull();
    expect(deserializeRecord(goodRecord)).toEqual({ won: 1, lost: 2 });
  });

  it("uses distinct, namespaced storage keys", () => {
    expect(GAME_KEY).toBe("tbb.game.v1");
    expect(RECORD_KEY).toBe("tbb.record.v1");
    expect(GAME_KEY).not.toBe(RECORD_KEY);
  });
});
