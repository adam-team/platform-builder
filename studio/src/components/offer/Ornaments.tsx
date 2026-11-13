import type { CSSProperties } from 'react'

// Алтын градиент (барлық lucide иконкалары stroke="url(#kp-gold)" арқылы қолданады)
export function GoldDefs() {
  return (
    <svg className="kp-icon-defs" aria-hidden focusable="false">
      <defs>
        <linearGradient id="kp-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbeab0" />
          <stop offset="0.5" stopColor="#e6c26a" />
          <stop offset="1" stopColor="#b98a2e" />
        </linearGradient>
        <linearGradient id="kp-gold-v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.55" stopColor="#e6c26a" />
          <stop offset="1" stopColor="#8f6420" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// Төрт бұрышты жарқыл
export function Spark({ size = 24, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg className="kp-spark" width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden>
      <path fill="currentColor" d="M12 0c.6 6.2 3.2 9.9 12 12-8.8 2.1-11.4 5.8-12 12-.6-6.2-3.2-9.9-12-12C8.8 9.9 11.4 6.2 12 0z" />
    </svg>
  )
}

// Қолмен салынған иілген нұсқау-жебе
export function ArrowHint({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 140 110" fill="none" aria-hidden>
      <path d="M6 12c40-8 92 6 100 52 2 12-2 24-10 34" stroke="url(#kp-gold)" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="1 7" />
      <path d="M82 92l14 8 8-15" stroke="url(#kp-gold)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Алтын кілт
export function GoldKey({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 220 90" aria-hidden>
      <defs>
        <linearGradient id="kp-key" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.5" stopColor="#e6c26a" />
          <stop offset="1" stopColor="#8f6420" />
        </linearGradient>
      </defs>
      <circle cx="45" cy="45" r="34" fill="none" stroke="url(#kp-key)" strokeWidth="14" />
      <circle cx="45" cy="45" r="9" fill="url(#kp-key)" />
      <rect x="76" y="38" width="130" height="14" rx="7" fill="url(#kp-key)" />
      <rect x="160" y="50" width="14" height="24" rx="4" fill="url(#kp-key)" />
      <rect x="184" y="50" width="14" height="18" rx="4" fill="url(#kp-key)" />
    </svg>
  )
}

// Ғимараттар силуэті (hero және финал астына)
export function Skyline({ className }: { className?: string }) {
  const b: [number, number, number][] = [
    [0, 90, 54], [56, 130, 44], [102, 70, 60], [164, 160, 50], [216, 104, 40], [258, 190, 56], [316, 120, 46],
    [364, 150, 42], [408, 84, 58], [468, 176, 48], [518, 110, 52], [572, 200, 46], [620, 130, 60], [682, 96, 44],
    [728, 170, 54], [784, 118, 42], [828, 150, 58], [888, 82, 50], [940, 184, 44], [986, 126, 56], [1044, 100, 48], [1094, 158, 52], [1148, 112, 52],
  ]
  return (
    <svg className={className} viewBox="0 0 1200 220" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="kp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f9d5c" stopOpacity="0.55" />
          <stop offset="1" stopColor="#05200f" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {b.map(([x, h, w], i) => (
        <g key={i}>
          <rect x={x} y={220 - h} width={w} height={h} fill="url(#kp-sky)" stroke="rgba(230,194,106,0.35)" strokeWidth="1" />
          {Array.from({ length: Math.floor(h / 26) }).map((_, r) =>
            Array.from({ length: Math.floor(w / 16) }).map((__, c) => (
              <rect key={`${r}-${c}`} x={x + 8 + c * 16} y={220 - h + 10 + r * 26} width="6" height="10" rx="1" fill="rgba(251,234,176,0.55)" opacity={(i * 7 + r * 3 + c) % 4 === 0 ? 0.9 : 0.22} />
            )),
          )}
        </g>
      ))}
    </svg>
  )
}

// Алтын мөр (қатар)
export function Seal({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden>
      <defs>
        <path id="kp-circ" d="M60 60m-44 0a44 44 0 1 1 88 0a44 44 0 1 1-88 0" />
      </defs>
      <circle cx="60" cy="60" r="58" fill="#05200f" stroke="url(#kp-gold)" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="34" fill="none" stroke="url(#kp-gold)" strokeWidth="1" strokeDasharray="2 4" />
      <text fontSize="9.4" fontWeight="800" letterSpacing="2.6" fill="#e6c26a" fontFamily="Onest, sans-serif">
        <textPath href="#kp-circ">BRAND · ИПОТЕКА ЭКСПЕРТІ · </textPath>
      </text>
      <path d="M60 40c1.2 12 6.4 18.6 20 20-13.6 1.4-18.8 8-20 20-1.2-12-6.4-18.6-20-20 13.6-1.4 18.8-8 20-20z" fill="url(#kp-gold)" />
    </svg>
  )
}
