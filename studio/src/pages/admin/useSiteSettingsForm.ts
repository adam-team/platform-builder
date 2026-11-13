import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { DEFAULT_SETTINGS } from '../../lib/content'
import { CURRENT_SCHOOL_ID } from '../../lib/school'
import type { SiteSettings } from '../../lib/types'

const linesToList = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

// site_settings — бір ғана жолы бар кесте, оны бірнеше админ беті (Басты бет / Тегін сабақтар /
// Қызметтер беті) бөлек формалармен өңдейді. Бұл hook сол ортақ жүктеу/сақтау логикасын
// қайталамау үшін: скаляр өрістер (`form`) және жол-жол тізім өрістері (`lists`, textarea-да
// әр жол — жеке пункт, `about_more_list` секілді) бір орында басқарылады.
export function useSiteSettingsForm(listDefaults: Record<string, string[]>, onSaved?: () => void) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [lists, setLists] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [warning, setWarning] = useState('')

  useEffect(() => {
    supabase.from('site_settings').select('*').eq('school_id', CURRENT_SCHOOL_ID).maybeSingle().then(({ data }) => {
      const s = (data as Record<string, unknown>) ?? {}
      const merged: Record<string, string> = {}
      for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[]) {
        merged[key] = (s[key] as string) || (DEFAULT_SETTINGS[key] as string)
      }
      setForm(merged)

      const mergedLists: Record<string, string> = {}
      for (const key of Object.keys(listDefaults)) {
        const stored = s[key] as string[] | undefined
        mergedLists[key] = (stored && stored.length > 0 ? stored : listDefaults[key]).join('\n')
      }
      setLists(mergedLists)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })
  }, [])

  function set(key: keyof SiteSettings | string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  function setList(key: string, value: string) {
    setLists((l) => ({ ...l, [key]: value }))
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setWarning('')
    setSaved(false)
    const listPayload: Record<string, string[]> = {}
    for (const key of Object.keys(lists)) listPayload[key] = linesToList(lists[key])
    const payload: Record<string, unknown> = { ...form, ...listPayload, school_id: CURRENT_SCHOOL_ID }
    // Егер жаңа миграция (SQL) әлі Supabase-те іске қосылмаса, базада жоқ бағанды алып тастап қайта сақтаймыз —
    // сонда бұрынғы өрістер бәрібір сақталады, ал қай өріс сақталмағаны туралы ескерту көрсетеміз.
    const skipped: string[] = []
    let error: { message: string } | null = null
    for (let attempt = 0; attempt < 40; attempt++) {
      const res = await supabase.from('site_settings').upsert(payload, { onConflict: 'school_id' })
      error = res.error
      const missing = error?.message.match(/'([a-z0-9_]+)' column of 'site_settings'/i)?.[1]
        ?? error?.message.match(/column "?([a-z0-9_]+)"? of relation "?site_settings"? does not exist/i)?.[1]
      if (!error || !missing || !(missing in payload)) break
      delete payload[missing]
      skipped.push(missing)
    }
    setBusy(false)
    if (error) return setError(error.message)
    if (skipped.length > 0) setWarning(`Сақталды, бірақ жаңа өрістер (${skipped.length}) сақталған жоқ: Supabase-те жаңа SQL-миграцияны (migration_34) іске қосу керек.`)
    setSaved(true)
    onSaved?.()
  }

  return { form, set, lists, setList, saved, error, warning, busy, save, loaded: Object.keys(form).length > 0 }
}
