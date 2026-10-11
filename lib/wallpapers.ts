import type { CSSProperties } from "react";

// Wallpapers drawn for the school: flat line patterns in the site green, tiled behind every page.
// Each tile is seamless; lines that leave one edge come back in on the opposite edge.

const G = "#15803d";

const circuit = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
<g fill="none" stroke="${G}" stroke-opacity=".1" stroke-width="1.5">
<path d="M0 30H50V70H97M160 30H125V0M125 160V130H83V113M0 120H30V147H57M160 120H140V95H123M70 0V20H110V42M70 160V135H40V103"/>
<path d="M16 76h8v8h-8zM131 56h8v8h-8z"/>
</g>
<g fill="${G}" fill-opacity=".13">
<path d="M97 67h6v6h-6zM80 107h6v6h-6zM57 144h6v6h-6zM117 92h6v6h-6zM107 42h6v6h-6zM37 97h6v6h-6z"/>
</g>
</svg>`;

const spiral = `<path d="M6 6H58V58H6V18H46V46H18V30H34"/>`;
const kufi = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
<g fill="none" stroke="${G}" stroke-opacity=".08" stroke-width="2">
<g>${spiral}</g>
<g transform="translate(64 0) rotate(90 32 32)">${spiral}</g>
<g transform="translate(64 64) rotate(180 32 32)">${spiral}</g>
<g transform="translate(0 64) rotate(270 32 32)">${spiral}</g>
</g>
</svg>`;

const graph = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
<path d="M16 0V80M32 0V80M48 0V80M64 0V80M0 16H80M0 32H80M0 48H80M0 64H80" stroke="${G}" stroke-opacity=".045" stroke-width="1"/>
<path d="M0 .5H80M.5 0V80" stroke="${G}" stroke-opacity=".1" stroke-width="1"/>
</svg>`;

const lab = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
<g fill="none" stroke="${G}" stroke-opacity=".09" stroke-width="1.6" stroke-linejoin="miter">
<path d="M15 75H75L15 15ZM27 63H51L27 39Z"/>
<path d="M92 22h14M99 15v14"/>
<path d="M138 18V58L122 88H188L172 58V18M132 18H178M127 78H183"/>
<path d="M50 130 69 141V163L50 174 31 163V141ZM50 140 60 146V158L50 164 40 158V146Z"/>
<path d="M118 150c7-16 13-16 20 0s13 16 20 0 13-16 20 0 13 16 20 0"/>
<path d="M150 182H194M160 182V208M184 182V204l5 4"/>
<path d="M78 196l6 8 9-22h22"/>
</g>
<g fill="${G}" fill-opacity=".12"><path d="M95 95h6v6h-6zM198 40h6v6h-6zM20 196h6v6h-6z"/></g>
</svg>`;

export const WALLPAPERS = [
  { id: "circuit", label: "مسارات تقنية", svg: circuit, size: 160 },
  { id: "kufi", label: "زخرفة كوفية", svg: kufi, size: 128 },
  { id: "graph", label: "ورق رسم بياني", svg: graph, size: 80 },
  { id: "lab", label: "رموز علمية", svg: lab, size: 220 },
  { id: "none", label: "بدون خلفية", svg: "", size: 0 },
] as const;

export const DEFAULT_WALLPAPER = "circuit";
export const isPattern = (id: string) => WALLPAPERS.some((w) => w.id === id);

/** Background style for a wallpaper value: a pattern id, or "image:<timestamp>" for the teacher's photo. */
export function wallpaperStyle(value: string, opts: { preview?: boolean } = {}): CSSProperties {
  if (value.startsWith("image:")) {
    return {
      backgroundImage: `url(/api/wallpaper?v=${encodeURIComponent(value.slice(6))})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: opts.preview ? "scroll" : "fixed",
      // a flat white veil keeps text readable over any photo
      boxShadow: `inset 0 0 0 9999px rgba(255, 255, 255, ${opts.preview ? 0.55 : 0.86})`,
    };
  }
  const w = WALLPAPERS.find((x) => x.id === value) ?? WALLPAPERS[0];
  if (!w.svg) return { backgroundImage: "none" };
  return {
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(w.svg)}")`,
    backgroundSize: `${w.size}px ${w.size}px`,
  };
}
