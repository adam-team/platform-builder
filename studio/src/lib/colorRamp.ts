// Бір ғана түстен (hex) бірнеше реңк жасайды — қараңғыдан ашыққа дейін, түсі мен қанықтығы сол
// күйінде қалады, тек жарықтығы өзгереді. КП беттерінің негізгі фонын (жасыл/көк) кез келген түске
// ауыстыру үшін қолданылады: әкімші бір түс таңдайды, қалған 5-7 реңк солардан автоматты шығады.
function hexToHsl(hex: string): [number, number, number] {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16) / 255
  const g = parseInt(m.slice(2, 4), 16) / 255
  const b = parseInt(m.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return [h, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let [r, g, b] = [0, 0, 0]
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// lightnesses: 0 (қара) — 1 (ақ) аралығындағы мәндер, әр бағанға бір реңк
export function deriveShadeRamp(baseHex: string, lightnesses: number[]): string[] {
  const [h, s] = hexToHsl(baseHex)
  // Негізгі түстің өз қанықтығы тым төмен болса (сұр/ақ таңдаса), реңктер де сұр болып қалады — соны болдырмау үшін ең төменгі шек қоямыз
  const sat = Math.max(s, 0.35)
  return lightnesses.map((l) => hslToHex(h, sat, l))
}

export function relativeLuminance(hex: string): number {
  const m = hex.replace('#', '')
  const chan = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  const r = chan(parseInt(m.slice(0, 2), 16) / 255)
  const g = chan(parseInt(m.slice(2, 4), 16) / 255)
  const b = chan(parseInt(m.slice(4, 6), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Осы фонда оқылатын мәтін түсі: ашық фонда — қара жазу, қараңғы фонда — ақ жазу
export function inkFor(hex: string): string {
  return relativeLuminance(hex) > 0.55 ? '#15140f' : '#ffffff'
}

export const HEX_RE = /^#[0-9a-f]{6}$/i
