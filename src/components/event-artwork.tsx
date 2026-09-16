import type { EventKind } from "@/lib/events";
import { memo } from "react";

const colors: Record<EventKind, [string, string, string]> = {
  festival: ["#e8a24e", "#563b21", "#141817"],
  concert: ["#b1a1fb", "#493469", "#15141b"],
  fight: ["#ef7252", "#672e21", "#1b1413"],
  culture: ["#d4ce89", "#525437", "#171b17"],
};

export const EventArtwork = memo(function EventArtwork({ kind, id, className }: { kind: EventKind; id: string; className?: string }) {
  const [light, middle, dark] = colors[kind];
  return (
    <svg className={className} viewBox="0 0 1200 900" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id={`${id}-sky`} cx=".6" cy=".35" r=".65">
          <stop stopColor={middle} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <radialGradient id={`${id}-halo`}>
          <stop stopColor={light} stopOpacity=".38" />
          <stop offset=".65" stopColor={light} stopOpacity=".1" />
          <stop offset="1" stopColor={light} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-beam`} x1=".5" y1="0" x2=".5" y2="1">
          <stop stopColor={light} stopOpacity=".46" />
          <stop offset="1" stopColor={light} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#353a32" />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <filter id={`${id}-blur`}><feGaussianBlur stdDeviation="4" /></filter>
        <pattern id={`${id}-grid`} width="80" height="45" patternUnits="userSpaceOnUse">
          <path d="M0 0h80v45" stroke={light} strokeOpacity=".08" />
        </pattern>
      </defs>
      <path fill={`url(#${id}-sky)`} d="M0 0h1200v900H0z" />
      <ellipse cx="650" cy="355" rx="520" ry="410" fill={`url(#${id}-halo)`} />
      <circle cx="680" cy="310" r="160" stroke={light} strokeOpacity=".13" />
      <circle cx="680" cy="310" r="157" stroke={light} strokeOpacity=".06" strokeWidth="12" />
      <path d="m-50 685 696-220 651 166-406 341Z" fill={`url(#${id}-floor)`} />
      <path d="m-50 685 696-220 651 166-406 341Z" fill={`url(#${id}-grid)`} />
      <ellipse cx="660" cy="652" rx="352" ry="80" fill={light} opacity=".06" />
      <g stroke={light} strokeOpacity=".28" strokeWidth="2">
        <path d="M370 574V248l390-75 191 104v307M388 577V265l370-72 177 95v290M370 248l18 17m372-92-2 20m193 84-16 11" />
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d={`m370 ${272 + i * 35} 18 20-18 15m563 ${22 - i * 35} 18-20-18-15`} />
        ))}
        <path d="m397 243 32 16 18-27 32 18 18-28 32 17 18-27 32 17 18-27 32 17 18-27 32 17 18-27" />
      </g>
      <g opacity=".72">
        <path d="m422 261-159 452 275-30Z" fill={`url(#${id}-beam)`} />
        <path d="m737 205-153 447 296 6Z" fill={`url(#${id}-beam)`} />
        <path d="m905 290-58 392 248 35Z" fill={`url(#${id}-beam)`} />
      </g>
      <g>
        <path d="m404 529 305-83 220 97-302 101Z" fill="#2e2d25" />
        <path d="m404 529 223 115v27L404 551Z" fill="#161b18" />
        <path d="m627 644 302-101v24L627 671Z" fill="#22251e" />
        <path d="m404 529 223 115 302-101" stroke={light} strokeWidth="3" strokeOpacity=".7" />
        {kind === "fight" ? (
          <g stroke={light} strokeWidth="2">
            <path d="M486 540v-75m237-63v70m112 62v-76m-222 163v-74" />
            {[0, 13, 26].map((n) => <path key={n} d={`m486 ${465 + n} 237-63 112 56-222 89Z`} opacity={1 - n / 60} />)}
            <path d="m486 540 237-68 112 62-222 87Z" fill={light} fillOpacity=".13" />
          </g>
        ) : kind === "culture" ? (
          <g>
            {[0, 1, 2].map((n) => <g key={n} transform={`translate(${450 + n * 120} ${435 + (n % 2) * 45})`}>
              <path d="M0 35h90v80H0z" fill="#302e21" stroke={light} strokeOpacity=".5" />
              <path d="m-10 35 55-60 55 60Z" fill={light} fillOpacity=".4" stroke={light} />
              <path d="M8 50h74v40H8z" fill={light} fillOpacity=".3" />
            </g>)}
            <path d="M375 355q280 170 565 10" stroke={light} strokeOpacity=".7" />
            {Array.from({ length: 11 }, (_, i) => <circle key={i} cx={386 + i * 53} cy={366 + Math.sin(i / 10 * Math.PI) * 73} r="4" fill={light} />)}
          </g>
        ) : (
          <g>
            <path d="m472 341 227-49v195l-227 62Z" fill="#171d19" stroke={light} strokeOpacity=".45" />
            <path d="m484 351 203-43v168l-203 55Z" fill={light} fillOpacity=".12" />
            <circle cx="588" cy="416" r="48" stroke={light} strokeWidth="3" />
            <path d="m588 371 9 31 27-18-18 27 30 7-30 8 18 28-28-18-8 29-7-30-27 18 18-28-29-7 29-8-18-26 27 18Z" fill={light} />
            <path d="m728 310 119 58v176l-119-52Z" fill={light} fillOpacity=".07" stroke={light} strokeOpacity=".35" />
            {[0, 1, 2, 3, 4].map((n) => <path key={n} d={`m746 ${343 + n * 29} 82 39`} stroke={light} strokeOpacity=".35" strokeWidth="3" />)}
          </g>
        )}
      </g>
      {Array.from({ length: 72 }, (_, i) => {
        const x = 230 + ((i * 137) % 790);
        const y = 647 + ((i * 53) % 158);
        return <g key={i} opacity={.2 + (i % 4) * .11}>
          <ellipse cx={x} cy={y + 17} rx="10" ry="3" fill="#040807" />
          <path d={`M${x - 4} ${y + 17}v-13q4-6 8 0v13`} fill={i % 6 === 0 ? light : "#666957"} />
          <circle cx={x} cy={y - 1} r="3.5" fill={i % 6 === 0 ? light : "#6b6a53"} />
        </g>;
      })}
      {Array.from({ length: 34 }, (_, i) => <circle key={i} cx={120 + (i * 149) % 990} cy={100 + (i * 79) % 530} r={i % 3 === 0 ? 1.8 : .8} fill={light} opacity={.15 + (i % 5) * .1} />)}
      <circle cx="737" cy="205" r="9" fill={light} filter={`url(#${id}-blur)`} />
      <circle cx="737" cy="205" r="3" fill="#fff1d5" />
    </svg>
  );
});
