// Line icons drawn for this site (24px grid, 1.75 stroke, currentColor). No emoji anywhere in the UI.

const P: Record<string, React.ReactNode> = {
  home: <><path d="M4 10.5 12 4l8 6.5V20H4z" /><path d="M10 20v-5h4v5" /></>,
  plan: <><rect x="4" y="5" width="16" height="15" rx="1.5" /><path d="M4 9.5h16M9 3v4M15 3v4M8 13.5h3M8 16.5h6" /></>,
  attendance: <><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="m8.5 12.5 2.5 2.5 5-5.5" /></>,
  book: <><path d="M5 4.5h9.5a2.5 2.5 0 0 1 2.5 2.5v13H7.5A2.5 2.5 0 0 1 5 17.5z" /><path d="M5 17.5A2.5 2.5 0 0 1 7.5 15H17M19 7v13" /></>,
  table: <><rect x="3.5" y="5" width="17" height="14" rx="1.5" /><path d="M3.5 10h17M3.5 14.5h17M9 5v14" /></>,
  assistant: <><path d="M5 5h14v10.5H10l-4 3.5v-3.5H5z" /><path d="M9 9.5h6M9 12h3.5" /></>,
  swap: <><path d="M7 4v15M4 7l3-3 3 3M17 20V5M14 17l3 3 3-3" /></>,
  mic: <><rect x="9" y="3.5" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v3.5M9 20.5h6" /></>,
  send: <><path d="M12 19V5M6 11l6-6 6 6" /></>,
  logout: <><path d="M10 4H5v16h5M14 8l-4 4 4 4M10 12h10" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  download: <><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" /></>,
  print: <><path d="M7 9V4h10v5M7 17H4.5V9h15v8H17" /><rect x="7" y="14" width="10" height="6" /></>,
  trash: <><path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13" /></>,
  speaker: <><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>,
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="1" />,
  copy: <><rect x="8" y="8" width="11" height="12" rx="1.5" /><path d="M16 8V4H5v12h3" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
  file: <><path d="M6 3.5h8l4 4V20.5H6z" /><path d="M14 3.5V8h4" /></>,
  upload: <><path d="M12 15V4M7 8.5l5-5 5 5M5 20h14" /></>,
  slides: <><rect x="3.5" y="4.5" width="17" height="12" rx="1" /><path d="M12 16.5V20M8 20h8M7.5 9h6M7.5 12h9" /></>,
  test: <><path d="M6 3.5h12v17H6z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  board: <><rect x="3" y="4" width="18" height="12" rx="1" /><path d="M8 20l4-4 4 4" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  warn: <><path d="M12 4 3 20h18z" /><path d="M12 10v4.5M12 17v.5" /></>,
  chevronL: <path d="m14.5 6-6 6 6 6" />,
  chevronR: <path d="m9.5 6 6 6-6 6" />,
  edit: <><path d="M5 19h4L19 9l-4-4L5 15z" /><path d="m13 7 4 4" /></>,
  image: <><rect x="4" y="5" width="16" height="14" rx="1.5" /><circle cx="9" cy="10" r="1.5" /><path d="m4 17 5-4 4 3 3-2 4 3" /></>,
  repeat: <><path d="M5 11V8.5A2.5 2.5 0 0 1 7.5 6H18M15 3l3 3-3 3M19 13v2.5a2.5 2.5 0 0 1-2.5 2.5H6M9 21l-3-3 3-3" /></>,
  clear: <><path d="M4 20h16M7 16 16.5 6.5l3 3L10 19H7z" /></>,
  bulb: <><path d="M9 17h6M10 20h4M12 3.5a5.5 5.5 0 0 0-3 10.1V15h6v-1.4a5.5 5.5 0 0 0-3-10.1z" /></>,
  question: <><circle cx="12" cy="12" r="8.5" /><path d="M9.8 9.5a2.3 2.3 0 1 1 3.2 2.1c-.6.3-1 .8-1 1.4v.5M12 16.5v.5" /></>,
  list: <><path d="M9 7h11M9 12h11M9 17h11M4.5 7h.5M4.5 12h.5M4.5 17h.5" /></>,
};

export type IconName = keyof typeof P;

export default function Icon({ name, size = 20, className }: { name: IconName | string; size?: number; className?: string }) {
  return (
    <svg
      className={"icon " + (className || "")}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {P[name] ?? null}
    </svg>
  );
}

// Class marks: a flat geometric shape per class instead of emoji logos.
export const SHAPES = ["circle", "square", "triangle", "diamond", "hexagon", "arch", "ring", "cross", "bars"] as const;

export function Shape({ shape, size = 22 }: { shape: string; size?: number }) {
  const s: Record<string, React.ReactNode> = {
    circle: <circle cx="12" cy="12" r="8" />,
    square: <rect x="4.5" y="4.5" width="15" height="15" />,
    triangle: <path d="M12 4 20.5 19h-17z" />,
    diamond: <path d="M12 3 21 12l-9 9-9-9z" />,
    hexagon: <path d="M12 3.5 19.5 7.75v8.5L12 20.5l-7.5-4.25v-8.5z" />,
    arch: <path d="M4 20V12a8 8 0 0 1 16 0v8z" />,
    ring: <path fillRule="evenodd" d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zm0 5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" />,
    cross: <path d="M9 3.5h6v5.5h5.5v6H15v5.5H9V15H3.5V9H9z" />,
    bars: <path d="M4 5h16v4H4zM4 10.5h16v4H4zM4 16h16v3.5H4z" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      {s[shape] ?? s.circle}
    </svg>
  );
}
