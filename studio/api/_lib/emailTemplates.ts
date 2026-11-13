const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Пайдаланушыға кіру мәліметтері бар фирмалық хат: сурет, хабарлама, сайт / логин / құпия сөз
export function accessEmail({
  siteUrl, name, message, login, password, courses,
}: { siteUrl: string; name: string; message: string; login: string; password?: string; courses: { title: string; expiresAt: string | null }[] }) {
  const text = esc(message).replace(/\n/g, '<br>')
  const list = courses.length
    ? `<p style="margin:18px 0 6px;font-weight:700">Сізге ашылған курстар:</p><ul style="margin:0;padding-left:20px">${courses
        .map((c) => `<li>${esc(c.title)}${c.expiresAt ? ` — ${new Date(c.expiresAt).toLocaleDateString('ru-RU')} дейін` : ' — мерзімсіз'}</li>`)
        .join('')}</ul>`
    : ''
  const credentials = `
    <div style="margin:22px 0;padding:18px 20px;border-radius:14px;background:#e4f3ea;border:1px solid #bfe0cd">
      <p style="margin:0 0 8px;font-weight:700;color:#0e3f26">Кіру мәліметтері</p>
      <p style="margin:4px 0"><b>Сайт:</b> <a href="${siteUrl}/login" style="color:#1e7a4c">${siteUrl}/login</a></p>
      <p style="margin:4px 0"><b>Логин:</b> ${esc(login)}</p>
      ${password ? `<p style="margin:4px 0"><b>Құпия сөз:</b> <span style="font-family:monospace;font-size:16px">${esc(password)}</span></p>` : '<p style="margin:4px 0;color:#555">Құпия сөзіңіз бұрынғыдай қалады.</p>'}
    </div>`
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#191d1a">
    <div style="background:linear-gradient(135deg,#2e9c64,#0e3f26);border-radius:18px 18px 0 0;padding:22px;text-align:center">
      <img src="${siteUrl}/images/expert-hero.jpg" alt="" width="84" height="84" style="border-radius:50%;object-fit:cover;border:3px solid #f0cf78">
      <p style="margin:10px 0 0;color:#fff;font-weight:700;font-size:18px">Эксперт Аты-жөні</p>
      <p style="margin:2px 0 0;color:#cfe9da;font-size:13px">Қаржыгер • Ипотека және үй алу маманы</p>
    </div>
    <div style="border:1px solid #e6e2d8;border-top:0;border-radius:0 0 18px 18px;padding:24px;background:#fff">
      <p style="margin:0 0 12px;font-size:16px">${text}</p>
      ${credentials}
      ${list}
      <p style="text-align:center;margin:26px 0 6px"><a href="${siteUrl}/login" style="display:inline-block;padding:13px 30px;border-radius:999px;background:#0e3f26;color:#fff;text-decoration:none;font-weight:700">Платформаға кіру</a></p>
    </div>
  </div>`
}
