// "hello" written by hand: the green stroke is drawn, then filled. `still` skips the animation.
export default function Hello({ still = false }: { still?: boolean }) {
  return (
    <svg className={"hello-svg" + (still ? " hello-static" : "")} viewBox="0 0 720 260" aria-label="hello" style={{ direction: "ltr" }}>
      <text x="360" y="200" textAnchor="middle">hello</text>
    </svg>
  );
}
