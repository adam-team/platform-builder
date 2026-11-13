import { extractYoutubeId } from './youtube'

// Бейне екі жерден болуы мүмкін: YouTube немесе Kinescope (Киноскоп). Базада бұрынғы `youtube_id` бағаны қолданылады:
//   YouTube  → 11 таңбалы id (бұрынғыдай, ештеңе өзгермейді)
//   Kinescope → `kinescope:<id>`
const KS_PREFIX = 'kinescope:'

export const isKinescope = (stored: string | null | undefined): stored is string => !!stored && stored.startsWith(KS_PREFIX)
export const kinescopeId = (stored: string) => stored.slice(KS_PREFIX.length)

// Әкімші қойған нәрсені (сілтеме, embed-код немесе id) базада сақталатын мәнге айналдырады. Танымаса — null.
export function parseVideoInput(input: string): string | null {
  const value = input.trim()
  if (!value) return null
  // Kinescope: https://kinescope.io/<id>, https://kinescope.io/embed/<id>, <iframe src="…kinescope.io/embed/<id>">
  const ks = value.match(/kinescope\.io\/(?:embed\/)?([A-Za-z0-9]{10,})/i)
  if (ks) return KS_PREFIX + ks[1]
  const yt = extractYoutubeId(value)
  if (yt) return yt
  // Тек id қойылса: Kinescope id-і ұзын (~22 таңба), YouTube-ікі — 11
  if (/^[A-Za-z0-9]{20,26}$/.test(value)) return KS_PREFIX + value
  return null
}

// Сақталған мәннен өңдеу өрісіне қайтадан көрсетілетін сілтеме
export function videoInputFromStored(stored: string | null | undefined): string {
  if (!stored) return ''
  return isKinescope(stored) ? `https://kinescope.io/${kinescopeId(stored)}` : `https://youtu.be/${stored}`
}

export const VIDEO_ERROR = 'Бейне сілтемесі танылмады. Kinescope (https://kinescope.io/…) немесе YouTube (https://youtu.be/…) сілтемесін қойыңыз'
export const VIDEO_HINT = 'Kinescope немесе YouTube сілтемесі'
