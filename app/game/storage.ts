/**
 * Thin browser-storage wrapper. This is the ONLY place that touches
 * localStorage. Every access is feature-detected and guarded so that a
 * disabled, blocked, or full store simply turns persistence off and the
 * game keeps playing from memory (NFR-06). The pure serialize/validate
 * logic lives in lib/game/persistence.ts.
 */

import {
  GAME_KEY,
  RECORD_KEY,
  deserializeGame,
  deserializeRecord,
  serializeGame,
  serializeRecord,
  type PlayerRecord,
} from "@/lib/game/persistence";
import type { GameState } from "@/lib/engine";

let available: boolean | null = null;

/** Detect a usable localStorage once, tolerating private-mode and quota errors. */
function store(): Storage | null {
  if (available === false) return null;
  try {
    const ls = globalThis.localStorage;
    if (!ls) {
      available = false;
      return null;
    }
    if (available === null) {
      const probe = "tbb.probe";
      ls.setItem(probe, "1");
      ls.removeItem(probe);
      available = true;
    }
    return ls;
  } catch {
    available = false;
    return null;
  }
}

export function isPersistenceAvailable(): boolean {
  return store() !== null;
}

export function loadGame(): GameState | null {
  const ls = store();
  if (!ls) return null;
  try {
    return deserializeGame(ls.getItem(GAME_KEY));
  } catch {
    return null;
  }
}

export function saveGame(game: GameState): void {
  const ls = store();
  if (!ls) return;
  try {
    ls.setItem(GAME_KEY, serializeGame(game));
  } catch {
    /* storage full or blocked: keep playing from memory */
  }
}

export function clearGame(): void {
  const ls = store();
  if (!ls) return;
  try {
    ls.removeItem(GAME_KEY);
  } catch {
    /* ignore */
  }
}

export function loadRecord(): PlayerRecord {
  const ls = store();
  if (!ls) return { won: 0, lost: 0 };
  try {
    return deserializeRecord(ls.getItem(RECORD_KEY));
  } catch {
    return { won: 0, lost: 0 };
  }
}

export function saveRecord(record: PlayerRecord): void {
  const ls = store();
  if (!ls) return;
  try {
    ls.setItem(RECORD_KEY, serializeRecord(record));
  } catch {
    /* ignore */
  }
}
