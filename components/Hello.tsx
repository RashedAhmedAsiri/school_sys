// "hello" written by hand: the stroke is drawn, then filled with the cyan→purple gradient.
export default function Hello({ small = false }: { small?: boolean }) {
  return (
    <svg className={"hello-svg" + (small ? " hello-small" : "")} viewBox="0 0 720 260" aria-label="hello" style={{ direction: "ltr" }}>
      <defs>
        <linearGradient id="helloGrad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#22c1dc" />
          <stop offset="55%" stopColor="#7c5cff" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <text x="360" y="200" textAnchor="middle">hello</text>
    </svg>
  );
}
