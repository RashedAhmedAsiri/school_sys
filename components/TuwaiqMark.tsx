import { TUWAIQ_PATH, TUWAIQ_VIEWBOX } from "@/lib/brand";

/** The Tuwaiq logo in the current text colour. */
export default function TuwaiqMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox={TUWAIQ_VIEWBOX} role="img" aria-label="طويق">
      <path fill="currentColor" fillRule="evenodd" d={TUWAIQ_PATH} />
    </svg>
  );
}
