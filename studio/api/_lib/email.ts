// Resend арқылы транзакциялық хат жіберу. Тіркелу хабарламаларын (растау, шақыру, пароль коды)
// Supabase Auth өзі жібереді (SMTP баптауы арқылы) — бұл тек біздің меншікті хабарлама үшін,
// мыс. «курсқа қолжетімділік ашылды».
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  if (!apiKey || !from) return { ok: false as const, error: 'Сервер: RESEND_API_KEY/RESEND_FROM орнатылмаған' }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!res.ok) return { ok: false as const, error: await res.text() }
  return { ok: true as const }
}
