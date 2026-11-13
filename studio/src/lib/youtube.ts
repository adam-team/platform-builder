// Принимает любую ссылку на YouTube (или сам id) и возвращает 11-символьный id видео
export function extractYoutubeId(input: string): string | null {
  const value = input.trim()
  if (/^[\w-]{11}$/.test(value)) return value
  const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/)
  return match ? match[1] : null
}
