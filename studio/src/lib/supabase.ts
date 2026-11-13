import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// VITE_DEMO=1 — показать платформу на вымышленных данных без настоящего Supabase
export const isDemo = import.meta.env.VITE_DEMO === '1'
export const isConfigured = isDemo || Boolean(url && key)

// || (не ??): пустая строка из недозаполненной переменной в Vercel тоже должна попасть на заглушку,
// иначе createClient() падает необработанным исключением ещё до рендера — белый экран без объяснения
// Демо-режим (көп ауыр деректері бар demo.ts) тек VITE_DEMO=1 болғанда жүктеледі — нақты сайттың бумасына кірмейді
const createDemoClient = isDemo ? (await import('./demo')).createDemoClient : null

export const supabase: SupabaseClient = createDemoClient
  ? (createDemoClient() as unknown as SupabaseClient)
  : createClient(url || 'http://localhost', key || 'missing')
