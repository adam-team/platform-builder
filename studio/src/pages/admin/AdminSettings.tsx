import { useSiteSettingsForm } from './useSiteSettingsForm'

// «Сайт → Басты бет»: hero фото/мәтін, «Эксперт туралы», статистика, 4 мақсат картасы, финалды CTA.
export default function AdminSettings() {
  const { form, set, lists, setList, saved, error, busy, save, loaded } = useSiteSettingsForm({ about_more_list: [] })

  if (!loaded) return <p className="muted">Жүктелуде…</p>

  return (
    <form className="panel" onSubmit={save}>
      <h3>Басты бет мәтіндері мен фото</h3>
      <p className="muted small">Бұл жерді толтырмасаңыз, сайт дайын мәтіндерді көрсетеді.</p>

      <div className="row">
        <label>Маманның аты-жөні<input value={form.expert_name} onChange={(e) => set('expert_name', e.target.value)} /></label>
        <label>Мамандығы<input value={form.expert_role} onChange={(e) => set('expert_role', e.target.value)} /></label>
      </div>
      <label>Фото сілтемесі (URL)
        <input value={form.hero_photo_url} onChange={(e) => set('hero_photo_url', e.target.value)} />
      </label>
      <p className="muted small" style={{ marginTop: -8 }}>
        Файлды жүктеу үшін: Supabase → Storage → жаңа public bucket (мысалы «site») жасаңыз, фотоны жүктеп, оның public
        URL-ін осында қойыңыз.
      </p>
      {form.hero_photo_url && <img src={form.hero_photo_url} alt="" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 10, marginBottom: 12 }} />}

      <label>Басты тақырып (h1)<textarea rows={2} value={form.hero_title} onChange={(e) => set('hero_title', e.target.value)} /></label>
      <label>Қосымша мәтін<textarea rows={3} value={form.hero_subtitle} onChange={(e) => set('hero_subtitle', e.target.value)} /></label>
      <label>«Эксперт туралы» — қысқа кіріспе (әрқашан ашық көрінеді, абзацтар бос жолмен бөлінеді)
        <textarea rows={6} value={form.about_text} onChange={(e) => set('about_text', e.target.value)} />
      </label>
      <label>«Толығырақ» батырмасының астындағы тізім (әр жол — жеке пункт)
        <textarea rows={5} value={lists.about_more_list} onChange={(e) => setList('about_more_list', e.target.value)} />
      </label>
      <label>«Толығырақ» астындағы оқиға (история эксперта…)
        <textarea rows={3} value={form.about_more_text} onChange={(e) => set('about_more_text', e.target.value)} />
      </label>

      <p className="small muted">Цифрлар (статистика):</p>
      {[1, 2, 3, 4].map((n) => (
        <div className="row" key={n}>
          <label className="narrow">Мән<input value={form[`stat${n}_value`]} onChange={(e) => set(`stat${n}_value`, e.target.value)} /></label>
          <label>Жазба<input value={form[`stat${n}_label`]} onChange={(e) => set(`stat${n}_label`, e.target.value)} /></label>
        </div>
      ))}

      <p className="small muted">«Саған не қажет?» — 4 мақсат картасы (бағыты тұрақты, тек мәтінін өзгертесіз):</p>
      {[
        { n: 1, label: 'Қарыз' },
        { n: 2, label: 'Жинақ' },
        { n: 3, label: 'Үй' },
        { n: 4, label: 'Ипотека PRO' },
      ].map(({ n, label }) => (
        <div key={n} style={{ marginBottom: 10 }}>
          <p className="muted small" style={{ marginBottom: 4 }}>{label}</p>
          <label>Тақырып<input value={form[`goal${n}_title`]} onChange={(e) => set(`goal${n}_title`, e.target.value)} /></label>
          <label>Мәтін<textarea rows={2} value={form[`goal${n}_text`]} onChange={(e) => set(`goal${n}_text`, e.target.value)} /></label>
        </div>
      ))}

      <p className="small muted">Беттің төменіндегі финалды шақыру:</p>
      <label>Тақырып<input value={form.final_cta_title} onChange={(e) => set('final_cta_title', e.target.value)} /></label>
      <label>Мәтін<textarea rows={2} value={form.final_cta_text} onChange={(e) => set('final_cta_text', e.target.value)} /></label>
      <label className="narrow">Батырма мәтіні<input value={form.final_cta_label} onChange={(e) => set('final_cta_label', e.target.value)} /></label>

      {error && <p className="error">{error}</p>}
      {saved && <p className="success">Сақталды.</p>}
      <button disabled={busy}>{busy ? 'Сақталуда…' : 'Сақтау'}</button>
    </form>
  )
}
