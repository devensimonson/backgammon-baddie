import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const css = readFileSync(join(ROOT, "app", "globals.css"), "utf8");
const prompt = readFileSync(join(ROOT, "app", "game", "MobileGate.tsx"), "utf8");
const layout = readFileSync(join(ROOT, "app", "layout.tsx"), "utf8");
const dock = readFileSync(join(ROOT, "app", "game", "Dock.tsx"), "utf8");

function cssBlock(source: string, header: string): string {
  const headerStart = source.indexOf(header);
  if (headerStart < 0) return "";
  const open = source.indexOf("{", headerStart);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(headerStart, i + 1);
  }
  return "";
}

function isTabletLandscape(width: number, height: number): boolean {
  return width <= 1366 && height >= 701 && height <= 900;
}

describe("mobile play responsive contract", () => {
  it("QA-01 / QA-02 / QA-04: gates phone portrait only and keeps landscape playable", () => {
    expect(css).toContain("(orientation: portrait) and (max-width: 640px)");
    expect(css).toContain("(orientation: landscape) and (max-width: 899px) and (max-height: 540px)");
    expect(prompt).toContain("Turn sideways to");
    expect(prompt).not.toContain("laptop or tablet");
  });

  it("QA-12 / QA-16: preserves 44px actions, safe areas, and dynamic viewport fit", () => {
    expect(css).toMatch(/min-(?:width|height): 44px/);
    expect(css).toContain("env(safe-area-inset-left)");
    expect(css).toContain("env(safe-area-inset-right)");
    expect(css).toContain("100dvh");
    expect(layout).toContain('viewportFit: "cover"');
  });

  it("QA-24: short tablet landscapes switch as one height-aware composition", () => {
    const compact = cssBlock(
      css,
      "@media (orientation: landscape) and (max-width: 1366px) and (max-height: 700px)",
    );

    expect(compact).not.toBe("");
    expect(compact).toContain("--compact-rail: clamp(220px, 25vw, 300px)");
    expect(compact).toContain("grid-template-rows: var(--compact-topbar) var(--compact-status) minmax(0, 1fr)");
    expect(compact).toContain("height: 100dvh");
    expect(compact).toContain("overscroll-behavior: contain");
    expect(compact).toMatch(/\.point\[role="button"\]::after\s*{[\s\S]*?width: 44px/);
    expect(compact).toMatch(/\.players\s*{[\s\S]*?height: 31px/);
    expect(compact).toMatch(/\.hint\s*{[\s\S]*?overflow: hidden/);
    expect(compact).toContain("-webkit-line-clamp: 2");
  });

  it("QA-26: tablet landscape has a bounded full-shell tier with exact breakpoint edges", () => {
    const tablet = cssBlock(
      css,
      "@media (orientation: landscape) and (max-width: 1366px) and (min-height: 701px) and (max-height: 900px)",
    );

    expect(tablet).not.toBe("");
    expect(tablet).toContain("height: 100dvh");
    expect(tablet).toContain("overflow: hidden");
    expect(tablet).toContain("--tablet-dock: 110px");
    expect(tablet).toContain("--tablet-footer: 24px");
    expect(tablet).toContain("640px");
    expect(tablet).toContain("aspect-ratio: 16 / 10");
    expect(tablet).toMatch(/\.dock\s*{[\s\S]*?grid-template-rows: 64px 24px/);
    expect(tablet).toMatch(/\.btn\s*{[\s\S]*?min-height: 44px/);
    expect(tablet).toMatch(/\.hint\s*{[\s\S]*?white-space: nowrap/);
    expect(tablet).toMatch(/footer\s*{[\s\S]*?grid-row: 5/);

    expect(isTabletLandscape(1180, 700)).toBe(false);
    expect(isTabletLandscape(1180, 701)).toBe(true);
    expect(isTabletLandscape(1180, 702)).toBe(true);
    expect(isTabletLandscape(1180, 900)).toBe(true);
    expect(isTabletLandscape(1180, 901)).toBe(false);
    expect(isTabletLandscape(1180, 902)).toBe(false);
    expect(isTabletLandscape(1365, 820)).toBe(true);
    expect(isTabletLandscape(1366, 820)).toBe(true);
    expect(isTabletLandscape(1367, 820)).toBe(false);

    for (const [width, height] of [
      [1180, 820],
      [1024, 768],
      [1194, 834],
      [1366, 820],
    ]) {
      expect(isTabletLandscape(width, height)).toBe(true);
    }
    expect(isTabletLandscape(899, 540)).toBe(false);
  });

  it("QA-25: wide phones retain a denser rail without reducing touch targets", () => {
    const phone = cssBlock(
      css,
      "@media (orientation: landscape) and (max-width: 899px) and (max-height: 540px)",
    );

    expect(phone).toContain("--compact-rail: clamp(156px, 22vw, 184px)");
    expect(phone).toContain(".legal { width: 44px; height: 44px");
    expect(phone).toMatch(/\.btn\s*{[\s\S]*?height: 44px;[\s\S]*?min-height: 44px/);
    expect(phone).toContain(".hint { display: none; }");
    expect(phone).toMatch(/\.players\s*{[\s\S]*?height: 31px/);
    expect(phone).toMatch(/\.pcard\.you\.active\s*{[\s\S]*?color: var\(--cyan\)/);
    expect(phone).toMatch(/\.pcard\.bad\.active\s*{[\s\S]*?color: var\(--accent-soft\)/);
    expect(dock).toContain('className="sr-only" aria-live="polite" aria-atomic="true"');
  });

  it("QA-22: keeps the New game control in the shared visible focus treatment", () => {
    expect(css).toContain(".top-btn:focus-visible,");
  });

  it("QA-03 / QA-19 / QA-23: orientation is presentation-only with reduced-motion fallback", () => {
    expect(prompt).toContain('window.matchMedia("(orientation: portrait) and (max-width: 640px)")');
    expect(prompt).not.toMatch(/saveGame|clearGame|setGame|localStorage/);
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain(".phone-rotate { animation: none; transform: rotate(90deg); }");
  });

  it("QA-06: a completed staged play exposes an explicit End turn action", () => {
    expect(dock).toContain("canEndTurn");
    expect(dock).toContain("End turn");
  });
});
