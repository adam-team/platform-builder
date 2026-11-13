import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from './supabase'

// КП беттерінің (Ипотека PRO / Қарызсыз өмір) мазмұны. Бастапқы мәтін — src/data/*.ts және беттің өз кодында;
// әкімші «✎ Өзгерту» арқылы өзгерткенін Supabase-тегі offer_pages кестесі сақтайды және бастапқының үстінен қолданылады.
export type OfferOverrides = {
  data?: Record<string, unknown>   // деректер блоктары (модульдер, сабақтар, тізімдер, баға…) — жоғарғы деңгей кілті бойынша толық алмастырады
  texts?: Record<string, string>   // беттегі жеке мәтіндер, батырма жазулары мен сілтемелері
  images?: Record<string, string>  // суреттер
}
export type EntryKind = 'text' | 'url' | 'image' | 'color'
export type Entry = { kind: EntryKind; def: string; label: string }

const isPlain = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

// Бастапқы құрылымның үстіне өзгертілгенді қояды (жаңа өріс қосылса — бастапқы мән қалады, бет құламайды)
export function mergeDefaults<T>(def: T, ov: unknown): T {
  if (ov === undefined || ov === null) return def
  if (isPlain(def) && isPlain(ov)) {
    const out: Record<string, unknown> = { ...def }
    for (const k of Object.keys(ov)) out[k] = k in def ? mergeDefaults((def as Record<string, unknown>)[k], ov[k]) : ov[k]
    return out as T
  }
  if (Array.isArray(def) && !Array.isArray(ov)) return def
  if (typeof def !== typeof ov && !Array.isArray(def)) return def
  return ov as T
}

// «*сөз*» → түсті (акцент) сөз, тақырыптарда қолданылады
export function rich(text: string): ReactNode {
  const parts = text.split('*')
  if (parts.length < 3) return text
  return parts.map((p, i) => (i % 2 === 1 ? <em key={i}>{p}</em> : <Fragment key={i}>{p}</Fragment>))
}

export function useOfferPage<D extends Record<string, unknown>>(slug: string, defaults: D) {
  const [ov, setOv] = useState<OfferOverrides>({})
  const registry = useRef(new Map<string, Entry>())

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('offer_pages').select('data').eq('slug', slug).maybeSingle()
    setOv(error ? {} : ((data?.data as OfferOverrides | undefined) ?? {}))
  }, [slug])
  useEffect(() => { load() }, [load])

  const content = useMemo(() => mergeDefaults(defaults, ov.data ?? {}), [defaults, ov.data])

  // t — мәтін/сілтеме, img — сурет. Бет салынған сайын тіркеледі, сондықтан өңдеу терезесі бетте бар барлық өрісті біледі.
  const t = (key: string, def: string, label?: string, kind: EntryKind = 'text'): string => {
    registry.current.set(key, { kind, def, label: label ?? key })
    return ov.texts?.[key] || def
  }
  const img = (key: string, def: string, label?: string): string => {
    registry.current.set(key, { kind: 'image', def, label: label ?? key })
    return ov.images?.[key] || def
  }

  return { slug, defaults, content, ov, t, img, registry: registry.current, reload: load }
}
export type OfferPage<D extends Record<string, unknown> = Record<string, unknown>> = ReturnType<typeof useOfferPage<D>>
