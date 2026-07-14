# Contributing

This is a small, single-maintainer project, so there is no heavy process here. If you want to run it, poke at it, or send a fix, this is everything you need.

## Run it

```bash
git clone https://github.com/devensimonson/backgammon-baddie.git
cd backgammon-baddie
npm install
npm run dev        # play at http://localhost:3000
```

## Before you open a pull request

Keep these green. They are what CI and the maintainer check:

```bash
npm test           # 102 tests (Vitest)
npx tsc --noEmit   # type-check the whole repo, tests included
npm run lint
```

If you add engine or bot logic, add a test for it. Tests are named with a QA ID that maps to a requirement, so follow the existing naming when you add one.

## The conventions that actually matter

A few rules are load-bearing. A change that breaks one of them will not be merged, so it is worth knowing them up front:

- **The engine stays pure.** Files in `lib/engine/` import only sibling engine files, no React, no Next.js, no I/O. This is enforced by a test that scans imports. The bot (`lib/bot/`) imports only the engine's public API and sibling bot files, enforced the same way.
- **All legality lives in the engine.** The bot and UI only select among plays the engine offers (`legalPlays` / `movesFrom`). Never construct or mutate a move outside those.
- **One coordinate system.** Points 1 to 24 from White's perspective, and every side-symmetry decision goes through `pointFor(player, n)` in `lib/engine/board.ts`. Do not write mirrored per-side math anywhere else.
- **Turns are atomic.** The engine applies whole turns via `applyPlay`; there is no single-half-move mutation. Stage half-moves in the UI, submit the turn.
- **Keep `npx tsc --noEmit` green across the whole repo,** tests included. Vitest transpiles without type-checking, so a fixture can pass the suite but fail a strict check. Build test fixtures immutably.
- **Verify layout in Safari/WebKit, not just Chromium.** The fit-to-viewport board is sized width-driven; a percentage-height board inside a flex parent collapsed to zero in Safari once, so this is checked on purpose.
- **User-facing copy:** plain, warm, no em dashes, and honest about the opponent (it is a solid computer opponent, never "unbeatable").

More detail on why the code is shaped this way is in [ARCHITECTURE.md](ARCHITECTURE.md).

## Reporting something

Found a rules bug, a bad move, or a rendering glitch? Open an issue with the steps to reproduce (and your browser, if it is visual). A failing case is the most useful thing you can send.
