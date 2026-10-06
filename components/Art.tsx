// Custom flat illustrations for the site. Solid fills from the school palette only: no gradients, no emoji.

const C = {
  purple: "#5b3fe0",
  purpleInk: "#3f28b0",
  purpleSoft: "#ebe5ff",
  green: "#16a34a",
  greenBright: "#4ade80",
  greenSoft: "#bde5ca",
  greenPale: "#e0f4e7",
  ink: "#17153a",
  white: "#ffffff",
};

/** The school building, for the purple sign-in panel. */
export function SchoolArt() {
  return (
    <svg viewBox="0 0 320 190" width="100%" aria-hidden style={{ maxWidth: 360, display: "block" }}>
      <circle cx="262" cy="46" r="24" fill={C.greenBright} />
      <rect x="0" y="176" width="320" height="2" fill={C.white} opacity="0.35" />
      {/* flag */}
      <rect x="159" y="6" width="2" height="34" fill={C.white} />
      <rect x="161" y="6" width="20" height="12" fill={C.greenBright} />
      {/* roof */}
      <path d="M58 82 160 34l102 48z" fill={C.purpleSoft} />
      <circle cx="160" cy="64" r="11" fill={C.purple} />
      <text x="160" y="69" textAnchor="middle" fontSize="13" fontWeight="700" fill={C.white} fontFamily="sans-serif">م</text>
      {/* body */}
      <rect x="70" y="82" width="180" height="94" fill={C.white} />
      {[88, 112, 190, 214].map((x) => (
        <g key={x}>
          <rect x={x} y="96" width="18" height="22" fill={C.greenSoft} />
          <rect x={x} y="134" width="18" height="22" fill={C.greenSoft} />
        </g>
      ))}
      <rect x="146" y="128" width="28" height="48" fill={C.purple} />
      <rect x="146" y="96" width="28" height="18" fill={C.green} />
      {/* books */}
      <rect x="18" y="160" width="44" height="8" fill={C.greenBright} />
      <rect x="22" y="152" width="38" height="8" fill={C.white} />
      <rect x="16" y="168" width="48" height="8" fill={C.purpleSoft} />
      {/* tree */}
      <rect x="283" y="150" width="4" height="26" fill={C.white} />
      <circle cx="285" cy="140" r="16" fill={C.greenSoft} />
    </svg>
  );
}

export function BooksArt({ size = 120 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 90" width={size} aria-hidden>
      <rect x="10" y="84" width="100" height="3" fill={C.ink} />
      <rect x="18" y="30" width="16" height="54" fill={C.purple} />
      <rect x="21" y="38" width="10" height="3" fill={C.white} />
      <rect x="36" y="20" width="14" height="64" fill={C.green} />
      <rect x="39" y="28" width="8" height="3" fill={C.white} />
      <rect x="52" y="36" width="18" height="48" fill={C.purpleSoft} />
      <rect x="56" y="44" width="10" height="3" fill={C.purple} />
      <path d="m74 84 14-52 14 4-14 52z" fill={C.greenSoft} />
      <circle cx="98" cy="18" r="8" fill={C.greenBright} />
    </svg>
  );
}

export function StudentsArt({ size = 130 }: { size?: number }) {
  return (
    <svg viewBox="0 0 130 90" width={size} aria-hidden>
      <rect x="6" y="80" width="118" height="3" fill={C.ink} />
      {[
        { x: 28, c: C.green, h: 34 },
        { x: 65, c: C.purple, h: 42 },
        { x: 102, c: C.greenSoft, h: 30 },
      ].map((f) => (
        <g key={f.x}>
          <circle cx={f.x} cy={80 - f.h - 12} r="10" fill={f.c} />
          <path d={`M${f.x - 15} 80v-${f.h - 10}a15 15 0 0 1 30 0v${f.h - 10}z`} fill={f.c} />
        </g>
      ))}
      <rect x="52" y="64" width="26" height="16" fill={C.white} stroke={C.ink} strokeWidth="1.5" />
    </svg>
  );
}

export function CalendarArt({ size = 120 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 90" width={size} aria-hidden>
      <rect x="18" y="12" width="84" height="72" fill={C.white} stroke={C.ink} strokeWidth="2" />
      <rect x="18" y="12" width="84" height="16" fill={C.purple} />
      <rect x="34" y="6" width="4" height="12" fill={C.ink} />
      <rect x="82" y="6" width="4" height="12" fill={C.ink} />
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2, 3, 4].map((c) => {
          const fill = (r === 1 && c === 2) ? C.purple : (r + c) % 4 === 0 ? C.greenSoft : (r === 2 && c === 4) ? C.green : C.greenPale;
          return <rect key={`${r}${c}`} x={26 + c * 14} y={36 + r * 11} width="10" height="7" fill={fill} />;
        })
      )}
    </svg>
  );
}

export function BoardArt({ size = 150 }: { size?: number }) {
  return (
    <svg viewBox="0 0 150 100" width={size} aria-hidden>
      <rect x="12" y="8" width="126" height="70" fill={C.ink} />
      <rect x="24" y="22" width="56" height="4" fill={C.greenBright} />
      <rect x="24" y="34" width="80" height="3" fill={C.greenSoft} />
      <rect x="24" y="44" width="68" height="3" fill={C.greenSoft} />
      <rect x="24" y="54" width="40" height="3" fill={C.greenSoft} />
      <circle cx="118" cy="56" r="9" fill={C.purple} />
      <path d="M40 78 30 98M110 78l10 20" stroke={C.ink} strokeWidth="3" />
      <rect x="8" y="78" width="134" height="4" fill={C.purpleSoft} />
    </svg>
  );
}

export function ChatArt({ size = 120 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 90" width={size} aria-hidden>
      <path d="M14 14h60v34H36l-12 10V48H14z" fill={C.purple} />
      <rect x="24" y="24" width="34" height="4" fill={C.white} />
      <rect x="24" y="34" width="22" height="4" fill={C.white} />
      <path d="M46 40h60v34H96v10L84 74H46z" fill={C.greenSoft} />
      <rect x="56" y="50" width="40" height="4" fill={C.green} />
      <rect x="56" y="60" width="26" height="4" fill={C.green} />
    </svg>
  );
}

export function TestArt({ size = 110 }: { size?: number }) {
  return (
    <svg viewBox="0 0 110 90" width={size} aria-hidden>
      <rect x="22" y="8" width="62" height="78" fill={C.white} stroke={C.ink} strokeWidth="2" />
      {[22, 40, 58].map((y, i) => (
        <g key={y}>
          <rect x="32" y={y} width="9" height="9" fill={i === 1 ? C.green : C.purpleSoft} />
          <rect x="47" y={y + 3} width="28" height="3" fill={C.ink} opacity="0.7" />
        </g>
      ))}
      <path d="m70 64 18-26 6 4-18 26-8 3z" fill={C.purple} />
    </svg>
  );
}
