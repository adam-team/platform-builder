// Модуль / сабақ қазір ашық па (қолмен жабылмаған және ашылу күні келген)
export function isOpenNow(item: { is_locked?: boolean; opens_at?: string | null } | null | undefined): boolean {
  if (!item) return true
  if (item.is_locked) return false
  return !item.opens_at || new Date(item.opens_at).getTime() <= Date.now()
}

export function formatOpenDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// <input type="datetime-local"> мәні ↔ ISO
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
