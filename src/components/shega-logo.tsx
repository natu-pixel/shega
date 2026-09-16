// Traced from the supplied Shega mark; shared by the header, footer and About artwork.
export const shegaLogoPaths = [
  "M31 9Q32 6 34 6Q36 6 36.5 8.5Q37 11 43.5 13Q50 15 53 16.5Q56 18 56.5 19.5Q57 21 47 21.5Q37 22 36.5 23.5Q36 25 34 25Q32 25 32 23.5Q32 22 23 22Q14 22 13 21Q12 20 14 18Q16 16 23 14Q30 12 31 9Z",
  "M18.5 30Q22 29 22.5 30Q23 31 21 33.5Q19 36 18 40Q17 44 18 54.5Q19 65 17 65.5Q15 66 12 61Q9 56 8 50Q7 44 8 41Q9 38 10 38Q11 38 10.5 37Q10 36 12.5 33.5Q15 31 18.5 30Z",
  "M44.5 29Q45 28 49 29.5Q53 31 56 34Q59 37 60 39.5Q61 42 61 46.5Q61 51 57 58.5Q53 66 51 65.5Q49 65 50 53.5Q51 42 50 38.5Q49 35 46.5 32.5Q44 30 44.5 29Z",
  "M84 11Q89 9 94.5 10Q100 11 102.5 13Q105 15 104.5 16Q104 17 105 17Q106 17 107 19Q108 21 108 28.5Q108 36 106 40Q104 44 99.5 47.5Q95 51 88 53Q81 55 77 55Q73 55 72.5 59.5Q72 64 71 65Q70 66 70 65Q70 64 69 64.5Q68 65 68.5 58.5Q69 52 74 51.5Q79 51 85 48.5Q91 46 95 41Q99 36 99.5 31Q100 26 99 23Q98 20 94.5 17.5Q91 15 85.5 15Q80 15 81 14Q82 13 80.5 13Q79 13 84 11Z",
];

export function ShegaLogo() {
  return (
    <svg viewBox="0 0 130 79" width="130" height="79" aria-hidden="true" focusable="false">
      {shegaLogoPaths.map((d) => <path key={d} className="shega-logo-part" d={d} />)}
      <text className="shega-logo-events" x="77" y="73">Events</text>
    </svg>
  );
}
