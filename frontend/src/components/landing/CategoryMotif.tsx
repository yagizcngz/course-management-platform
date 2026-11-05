import type { ReactNode } from "react";

/**
 * A small line drawing that stands for a discipline (contours and coordinates for
 * Coğrafya, a formula on grid paper for Matematik, letterforms for Türkçe...). Pure SVG,
 * so a page can show one per category without a WebGL context each. Decorative only.
 */
export function CategoryMotif({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 160 100"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
    >
      {MOTIFS[name] ?? MOTIFS.Genel}
    </svg>
  );
}

const serif = { fontFamily: '"Instrument Serif", Georgia, serif' } as const;
const mono = { fontFamily: '"JetBrains Mono", monospace' } as const;

/** Faint squared paper behind the formula and chart motifs. */
const grid = (step = 10) => (
  <g opacity="0.25">
    {Array.from({ length: 160 / step + 1 }, (_, i) => (
      <line key={`v${i}`} x1={i * step} y1="0" x2={i * step} y2="100" />
    ))}
    {Array.from({ length: 100 / step + 1 }, (_, i) => (
      <line key={`h${i}`} x1="0" y1={i * step} x2="160" y2={i * step} />
    ))}
  </g>
);

const MOTIFS: Record<string, ReactNode> = {
  Coğrafya: (
    <>
      <g opacity="0.3">
        {[20, 50, 80].map((y) => (
          <line key={y} x1="0" y1={y} x2="160" y2={y} strokeDasharray="2 4" />
        ))}
        {[40, 80, 120].map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2="100" strokeDasharray="2 4" />
        ))}
      </g>
      {[34, 26, 18, 10].map((r, i) => (
        <path
          key={r}
          d={`M${80 - r * 1.6} ${52 + i} C${80 - r} ${52 - r * 1.2}, ${80 + r} ${50 - r * 1.1}, ${80 + r * 1.7} ${54 - i}`}
        />
      ))}
      <path d="M78 40 l2 -4 l2 4" />
      <text x="4" y="96" fontSize="8" stroke="none" fill="currentColor" style={mono}>
        39°55′N 32°51′E
      </text>
    </>
  ),
  Matematik: (
    <>
      {grid()}
      <text x="18" y="58" fontSize="30" stroke="none" fill="currentColor" style={serif}>
        ∫ eˣ dx
      </text>
      <path d="M14 82 Q 60 20 146 74" opacity="0.7" />
      <circle cx="146" cy="74" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  "Türk Dili ve Edebiyatı": (
    <>
      <text
        x="6"
        y="70"
        fontSize="64"
        stroke="none"
        fill="currentColor"
        style={serif}
        fontStyle="italic"
      >
        Şğ
      </text>
      <text
        x="92"
        y="38"
        fontSize="11"
        stroke="none"
        fill="currentColor"
        style={serif}
        opacity="0.8"
      >
        söz, ses,
      </text>
      <text
        x="92"
        y="54"
        fontSize="11"
        stroke="none"
        fill="currentColor"
        style={serif}
        opacity="0.8"
      >
        anlam
      </text>
      <line x1="92" y1="66" x2="152" y2="66" opacity="0.5" />
      <line x1="92" y1="74" x2="140" y2="74" opacity="0.5" />
      <line x1="92" y1="82" x2="148" y2="82" opacity="0.5" />
    </>
  ),
  "Edebiyat & Felsefe": (
    <>
      <text x="14" y="78" fontSize="72" stroke="none" fill="currentColor" style={serif}>
        ¶
      </text>
      {[30, 42, 54, 66, 78].map((y, i) => (
        <line key={y} x1="70" y1={y} x2={150 - (i % 2) * 18} y2={y} opacity="0.55" />
      ))}
    </>
  ),
  Yazılım: (
    <>
      <text x="10" y="62" fontSize="40" stroke="none" fill="currentColor" style={mono}>
        {"{ }"}
      </text>
      {[28, 40, 52, 64, 76].map((y, i) => (
        <line key={y} x1={96 + (i % 3) * 8} y1={y} x2={150 - (i % 2) * 20} y2={y} opacity="0.6" />
      ))}
    </>
  ),
  "Fen Bilimleri": (
    <>
      <ellipse cx="80" cy="50" rx="56" ry="16" />
      <ellipse cx="80" cy="50" rx="56" ry="16" transform="rotate(60 80 50)" />
      <ellipse cx="80" cy="50" rx="56" ry="16" transform="rotate(-60 80 50)" />
      <circle cx="80" cy="50" r="4" fill="currentColor" stroke="none" />
    </>
  ),
  "Veri Bilimi & Yapay Zeka": (
    <>
      {grid(20)}
      {[
        [20, 78],
        [32, 70],
        [40, 74],
        [54, 60],
        [62, 64],
        [76, 52],
        [88, 50],
        [96, 40],
        [110, 42],
        [122, 30],
        [134, 32],
        [144, 22],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill="currentColor" stroke="none" />
      ))}
      <line x1="12" y1="84" x2="150" y2="18" opacity="0.7" />
    </>
  ),
  "Ekonomi & Finans": (
    <>
      {grid(20)}
      <polyline points="8,78 30,66 48,72 70,46 92,54 114,30 134,38 152,16" />
      {[30, 70, 114].map((x, i) => (
        <rect
          key={x}
          x={x - 4}
          y={84 - (i + 1) * 8}
          width="8"
          height={(i + 1) * 8}
          opacity="0.45"
        />
      ))}
    </>
  ),
  "Sosyal Bilimler": (
    <>
      <line x1="8" y1="56" x2="152" y2="56" />
      {[
        [20, "1453"],
        [62, "1789"],
        [104, "1923"],
        [142, "2023"],
      ].map(([x, year]) => (
        <g key={year as string}>
          <line x1={x as number} y1="50" x2={x as number} y2="62" />
          <text
            x={(x as number) - 11}
            y="78"
            fontSize="9"
            stroke="none"
            fill="currentColor"
            style={mono}
          >
            {year}
          </text>
        </g>
      ))}
    </>
  ),
  "Yabancı Dil": (
    <>
      {[
        [8, 30, "Hello"],
        [56, 52, "Hallo"],
        [20, 80, "Hola"],
        [96, 82, "Bonjour"],
      ].map(([x, y, w]) => (
        <text
          key={w as string}
          x={x as number}
          y={y as number}
          fontSize="20"
          stroke="none"
          fill="currentColor"
          style={serif}
          fontStyle="italic"
        >
          {w}
        </text>
      ))}
    </>
  ),
  Tasarım: (
    <>
      <rect x="10" y="10" width="80" height="80" />
      <rect x="90" y="10" width="50" height="50" />
      <rect x="90" y="60" width="30" height="30" />
      <path d="M90 90 A80 80 0 0 1 10 10" opacity="0.7" />
      <path d="M90 10 A50 50 0 0 1 140 60" opacity="0.7" />
    </>
  ),
  Sanat: (
    <>
      <path d="M20 70 C40 20, 90 10, 120 34 S150 84, 96 82 S40 90, 20 70Z" />
      {[
        [50, 46, 8],
        [80, 36, 6],
        [104, 56, 7],
        [72, 64, 5],
      ].map(([x, y, r]) => (
        <circle key={`${x}`} cx={x} cy={y} r={r} opacity="0.7" />
      ))}
    </>
  ),
  Müzik: (
    <>
      {[30, 40, 50, 60, 70].map((y) => (
        <line key={y} x1="6" y1={y} x2="154" y2={y} opacity="0.55" />
      ))}
      {[
        [36, 65],
        [64, 55],
        [92, 45],
        [120, 50],
      ].map(([x, y]) => (
        <g key={x}>
          <ellipse
            cx={x}
            cy={y}
            rx="6"
            ry="4.2"
            fill="currentColor"
            stroke="none"
            transform={`rotate(-20 ${x} ${y})`}
          />
          <line x1={x + 5.5} y1={y - 1} x2={x + 5.5} y2={y - 28} />
        </g>
      ))}
    </>
  ),
  Spor: (
    <>
      {[0, 10, 20].map((d) => (
        <rect key={d} x={14 + d} y={14 + d} width={132 - d * 2} height={72 - d * 2} rx={36 - d} />
      ))}
      <line x1="80" y1="14" x2="80" y2="34" opacity="0.6" />
    </>
  ),
  "Fotoğrafçılık & Sinema": (
    <>
      <rect x="8" y="16" width="144" height="68" rx="2" />
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i} opacity="0.6">
          <rect x={14 + i * 16} y="20" width="7" height="5" />
          <rect x={14 + i * 16} y="75" width="7" height="5" />
        </g>
      ))}
      <circle cx="80" cy="50" r="18" />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <line
          key={a}
          x1="80"
          y1="50"
          x2="80"
          y2="32"
          transform={`rotate(${a} 80 50) translate(6 0)`}
          opacity="0.7"
        />
      ))}
    </>
  ),
  "Psikoloji & Bilişsel Bilimler": (
    <>
      <circle cx="62" cy="50" r="30" />
      <circle cx="98" cy="50" r="30" />
      <text
        x="70"
        y="58"
        fontSize="24"
        stroke="none"
        fill="currentColor"
        style={serif}
        fontStyle="italic"
      >
        ψ
      </text>
    </>
  ),
  Genel: (
    <>
      <circle cx="80" cy="50" r="34" />
      <circle cx="80" cy="50" r="2" fill="currentColor" stroke="none" />
      <line x1="80" y1="50" x2="80" y2="26" />
      <line x1="80" y1="50" x2="98" y2="58" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1="80" y1="18" x2="80" y2="22" transform={`rotate(${i * 30} 80 50)`} />
      ))}
    </>
  ),
};
