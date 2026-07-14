/** One icon family (Lucide-style line icons), inlined so there is no extra dependency. */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function ShareIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

export function RollIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8 8h.01M16 16h.01M12 12h.01" />
    </svg>
  );
}

export function NewGameIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export function HintIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base} strokeWidth={2.4} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function OffIcon(props: IconProps) {
  return (
    <svg {...base} strokeWidth={2.4} {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-1" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function RotateIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3a9 9 0 1 0 9 9" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export function NoCubeIcon(props: IconProps) {
  return (
    <svg {...base} strokeWidth={1.9} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

export function BaddieFace(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M4 8h16l-1.2 5.5A5 5 0 0 1 14 17h-4a5 5 0 0 1-4.8-3.5L4 8Z" />
      <path d="M8.5 11.5v.01M15.5 11.5v.01" />
    </svg>
  );
}

export function BaddieMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M3 11c0-3 3-5 9-5s9 2 9 5c0 2-1 3-3 3-1 0-1.5-.6-2-1.2-.4-.5-1-1.1-2-1.1s-1.6.6-2 1.1c-.5.6-1 1.2-2 1.2s-1.5-.6-2-1.2c-.4-.5-1-1.1-2-1.1s-1.6.6-2 1.1" />
      <path d="M8 15.5c1 1.2 2.4 2 4 2s3-.8 4-2" />
    </svg>
  );
}
