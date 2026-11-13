import { DEFAULT_CASES_LIST, DEFAULT_COMPANY_LIST } from '../../lib/content'
import { useSiteSettingsForm } from './useSiteSettingsForm'

// «Сайт → Қызметтер беті»: /services беттің төменіндегі Brand компаниясы мен кейстер блоктары.
export default function AdminSettingsServices() {
  const { form, set, lists, setList, saved, error, busy, save, loaded } = useSiteSettingsForm({
    company_list: DEFAULT_COMPANY_LIST,
    cases_list: DEFAULT_CASES_LIST,
  })

  if (!loaded) return <p className="muted">Жүктелуде…</p>

  return (
    <form className="panel" onSubmit={save}>
      <h3>«Қызметтер» беті</h3>
      <p className="muted small">Қызметтердің өзі — «Оқыту → Қызметтер» бөлімінде. Мұнда тек беттің төменіндегі екі блок.</p>

      <p className="small muted">«Brand» компаниясы туралы блок:</p>
      <label className="narrow">Кіші тақырып (eyebrow)<input value={form.company_eyebrow} onChange={(e) => set('company_eyebrow', e.target.value)} /></label>
      <label>Тақырып<input value={form.company_title} onChange={(e) => set('company_title', e.target.value)} /></label>
      <label>Мәтін<textarea rows={3} value={form.company_text} onChange={(e) => set('company_text', e.target.value)} /></label>
      <label className="narrow">Тізім алдындағы сөйлем<input value={form.company_list_intro} onChange={(e) => set('company_list_intro', e.target.value)} /></label>
      <label>Тізім (әр жол — жеке пункт)
        <textarea rows={7} value={lists.company_list} onChange={(e) => setList('company_list', e.target.value)} />
      </label>

      <p className="small muted">Кейстер блогы:</p>
      <label className="narrow">Кіші тақырып (eyebrow)<input value={form.cases_eyebrow} onChange={(e) => set('cases_eyebrow', e.target.value)} /></label>
      <label>Тақырып<input value={form.cases_title} onChange={(e) => set('cases_title', e.target.value)} /></label>
      <label>Мәтін<textarea rows={3} value={form.cases_text} onChange={(e) => set('cases_text', e.target.value)} /></label>
      <label className="narrow">Тізім алдындағы сөйлем<input value={form.cases_list_intro} onChange={(e) => set('cases_list_intro', e.target.value)} /></label>
      <label>Тізім (әр жол — жеке пункт)
        <textarea rows={6} value={lists.cases_list} onChange={(e) => setList('cases_list', e.target.value)} />
      </label>
      <label className="narrow">Батырма мәтіні (әзірге «жақында» деп көрінеді)<input value={form.cases_cta} onChange={(e) => set('cases_cta', e.target.value)} /></label>

      {error && <p className="error">{error}</p>}
      {saved && <p className="success">Сақталды.</p>}
      <button disabled={busy}>{busy ? 'Сақталуда…' : 'Сақтау'}</button>
    </form>
  )
}
