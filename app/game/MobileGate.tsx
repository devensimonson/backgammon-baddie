"use client";

import { useEffect } from "react";
import { RotateIcon } from "./icons";

/** A presentation-only portrait prompt. The mounted game remains untouched. */
export function MobileGate() {
  useEffect(() => {
    const media = window.matchMedia("(orientation: portrait) and (max-width: 640px)");
    const game = document.querySelector<HTMLElement>(".wrap");
    const content = game
      ? Array.from(game.children).filter((node): node is HTMLElement =>
          node instanceof HTMLElement && !node.classList.contains("mobile-gate"),
        )
      : [];
    const sync = () => {
      for (const node of content) {
        if (media.matches) {
          node.setAttribute("inert", "");
          node.setAttribute("aria-hidden", "true");
        } else {
          node.removeAttribute("inert");
          node.removeAttribute("aria-hidden");
        }
      }
    };
    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
      for (const node of content) {
        node.removeAttribute("inert");
        node.removeAttribute("aria-hidden");
      }
    };
  }, []);

  return (
    <section className="mobile-gate" aria-label="Rotate your phone to landscape">
      <div className="inner">
        <div className="phone-rotate" aria-hidden="true">
          <span className="phone-board" />
        </div>
        <h2>Turn sideways to <b>play</b></h2>
        <p>
          The full board is ready in landscape. Your game and record stay exactly where you left them.
        </p>
        <span className="rotate">
          <RotateIcon width={15} height={15} />
          Game saved on this device
        </span>
      </div>
    </section>
  );
}
