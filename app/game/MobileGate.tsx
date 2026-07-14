import { BaddieMark, RotateIcon } from "./icons";

/** Small phones get a friendly gate rather than a cramped board (CSS shows it under 640px). */
export function MobileGate() {
  return (
    <div className="mobile-gate" aria-hidden>
      <div className="inner">
        <div className="mlogo">
          <BaddieMark width={30} height={30} />
        </div>
        <h2>Best on a bigger screen</h2>
        <p>
          A full backgammon board needs a little room. Come back on a laptop or tablet, or turn your
          phone sideways, and The Baddie will be waiting.
        </p>
        <span className="rotate">
          <RotateIcon width={15} height={15} />
          Rotate or resize
        </span>
      </div>
    </div>
  );
}
