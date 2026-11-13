import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// ЭТАП_10 «Сайт» — sitemap.xml: жарияланған курстарды автоматты қосады, толық конструктор
// сайттың орнына (ол бөлек, өте үлкен жұмыс — Tilda/Framer деңгейіндегі блокты редактор).
const STATIC_PATHS = ['/', '/courses', '/services', '/free-lessons', '/login', '/register']

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const url = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  const siteUrl = process.env.SITE_URL ?? `https://${_req.headers.host ?? ''}`

  let courseUrls: string[] = []
  if (url && anonKey) {
    const supabase = createClient(url, anonKey)
    const { data } = await supabase.from('courses').select('id').eq('is_published', true).is('deleted_at', null)
    courseUrls = (data ?? []).map((c) => `/course/${c.id}`)
  }

  const paths = [...STATIC_PATHS, ...courseUrls]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${siteUrl}${p}</loc></url>`).join('\n')}
</urlset>`

  res.setHeader('Content-Type', 'application/xml')
  res.status(200).send(xml)
}
