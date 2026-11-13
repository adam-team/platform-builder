import { DEFAULT_FREE_OUTRO_LIST } from '../../lib/content'
import { useSiteSettingsForm } from './useSiteSettingsForm'

// «Сайт → Тегін сабақтар»: /free-lessons беттің үстіңгі мәтіні, 3 қадам, төменгі блоктар.
export default function AdminSettingsFree() {
  const { form, set, lists, setList, saved, error, busy, save, loaded } = useSiteSettingsForm({
    free_outro_list: DEFAULT_FREE_OUTRO_LIST,
  })

  if (!loaded) return <p className="muted">Жүктелуде…</p>

  return (
    <form className="panel" onSubmit={save}>
      <h3>«Тегін сабақтар» беті</h3>
      <p className="muted small">Бұл жерді толтырмасаңыз, сайт дайын мәтіндерді көрсетеді.</p>

      <label className="narrow">Кіші тақырып (eyebrow)<input value={form.free_eyebrow} onChange={(e) => set('free_eyebrow', e.target.value)} /></label>
      <label>Басты тақырып (h1)<textarea rows={2} value={form.free_title} onChange={(e) => set('free_title', e.target.value)} /></label>
      <label>Қосымша мәтін<textarea rows={2} value={form.free_text} onChange={(e) => set('free_text', e.target.value)} /></label>

      <p className="small muted">3 қадам (нөмірі тұрақты):</p>
      {[1, 2, 3].map((n) => (
        <div key={n} style={{ marginBottom: 10 }}>
          <p className="muted small" style={{ marginBottom: 4 }}>{String(n).padStart(2, '0')}-қадам</p>
          <label>Тақырып<input value={form[`free_step${n}_title`]} onChange={(e) => set(`free_step${n}_title`, e.target.value)} /></label>
          <label>Мәтін<textarea rows={2} value={form[`free_step${n}_text`]} onChange={(e) => set(`free_step${n}_text`, e.target.value)} /></label>
        </div>
      ))}

      <label>Төменгі блоктың кіріспе сөйлемі<textarea rows={2} value={form.free_outro} onChange={(e) => set('free_outro', e.target.value)} /></label>
      <label>«Сіз:» тізімі (әр жол — жеке пункт)
        <textarea rows={6} value={lists.free_outro_list} onChange={(e) => setList('free_outro_list', e.target.value)} />
      </label>

      <p className="small muted">«Дайын құралдар» блогы:</p>
      <label>Тақырып<input value={form.free_materials_title} onChange={(e) => set('free_materials_title', e.target.value)} /></label>
      <label>Мәтін<textarea rows={2} value={form.free_materials_text} onChange={(e) => set('free_materials_text', e.target.value)} /></label>
      <label className="narrow">Батырма мәтіні<input value={form.free_materials_cta} onChange={(e) => set('free_materials_cta', e.target.value)} /></label>

      {error && <p className="error">{error}</p>}
      {saved && <p className="success">Сақталды.</p>}
      <button disabled={busy}>{busy ? 'Сақталуда…' : 'Сақтау'}</button>
    </form>
  )
}
