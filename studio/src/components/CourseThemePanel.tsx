import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { uploadCourseImage } from '../lib/media'
import { COURSE_COLORS, DEFAULT_RATING_INK, PAGE_BG_PRESETS, ratingInk } from '../lib/content'
import { HEX_RE } from '../lib/colorRamp'
import type { Course } from '../lib/types'

// Курс ішіндегі беттің (модульдер тізімі) фоны мен акцентті түсі — «Фон мен түстер» батырмасымен ашылады
// (тек «Редакциялау» режимінде). Таңдау бірден сақталады, Сақтау батырмасы қажет емес.
export default function CourseThemePanel({ course, onSaved }: { course: Course; onSaved: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Түсті таңдау кезінде тышқанды сүйреп жатқанда әр қадамда сақтамай, тоқтаған сәтте ғана сақтаймыз
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function friendly(msg: string) {
    if (/page_bg|card_color/.test(msg)) return 'Supabase-те жаңа SQL-миграция (migration_36) іске қосылмаған.'
    if (/rating_ink/.test(msg)) return 'Supabase-те жаңа SQL-миграция (migration_37) іске қосылмаған.'
    if (/title_color/.test(msg)) return 'Supabase-те жаңа SQL-миграция (migration_38) іске қосылмаған.'
    return msg
  }

  async function setBg(value: string | null) {
    setError('')
    const { error } = await supabase.from('courses').update({ page_bg: value }).eq('id', course.id)
    if (error) return setError(friendly(error.message))
    onSaved()
  }
  function setBgDebounced(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setBg(value), 250)
  }

  async function setTitle(value: string | null) {
    setError('')
    const { error } = await supabase.from('courses').update({ title_color: value }).eq('id', course.id)
    if (error) return setError(friendly(error.message))
    onSaved()
  }
  function setTitleDebounced(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setTitle(value), 250)
  }

  async function setCard(value: string | null) {
    setError('')
    const { error } = await supabase.from('courses').update({ card_color: value }).eq('id', course.id)
    if (error) return setError(friendly(error.message))
    onSaved()
  }
  function setCardDebounced(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setCard(value), 250)
  }

  async function uploadBg(file: File | undefined) {
    if (!file) return
    setError('')
    setBusy(true)
    const res = await uploadCourseImage(file, course.id)
    setBusy(false)
    if (fileRef.current) fileRef.current.value = ''
    if (res.error || !res.url) return setError(`Фото жүктелмеді: ${res.error ?? 'қате'}`)
    const { error } = await supabase.from('courses').update({ bg_image_url: res.url, page_bg: null }).eq('id', course.id)
    if (error) return setError(friendly(error.message))
    onSaved()
  }

  async function resetPhoto() {
    setError('')
    const { error } = await supabase.from('courses').update({ bg_image_url: null, page_bg: null }).eq('id', course.id)
    if (error) return setError(friendly(error.message))
    onSaved()
  }

  async function setRatingInk(value: string | null) {
    setError('')
    const { error } = await supabase.from('courses').update({ rating_ink: value }).eq('id', course.id)
    if (error) return setError(friendly(error.message))
    onSaved()
  }
  function setRatingInkDebounced(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setRatingInk(value), 250)
  }

  const bgKey = course.page_bg || 'photo'
  const bgCustom = bgKey !== 'photo' && bgKey !== 'money' && !PAGE_BG_PRESETS[bgKey] ? bgKey : ''
  const titleKey = course.title_color || 'classic'
  const titleCustom = titleKey !== 'classic' && !COURSE_COLORS[titleKey] ? titleKey : ''
  const cardKey = course.card_color || 'classic'
  const cardCustom = !COURSE_COLORS[cardKey] ? cardKey : ''
  const currentRatingInk = ratingInk(course)
  const ratingIsGold = currentRatingInk === DEFAULT_RATING_INK
  const ratingIsWhite = currentRatingInk.toLowerCase() === '#ffffff'
  const ratingCustom = !ratingIsGold && !ratingIsWhite ? currentRatingInk : ''

  return (
    <div className="course-theme-panel">
      <div className="course-theme-row">
        <span className="course-theme-label">Артқы фон</span>
        <button type="button" className={bgKey === 'photo' ? 'ct-swatch photo selected' : 'ct-swatch photo'} onClick={() => fileRef.current?.click()} title="Өз фотоңызды қою" aria-label="Өз фотоңызды қою">
          {busy ? '…' : '📷'}
        </button>
        <button type="button" className={bgKey === 'money' ? 'ct-swatch money selected' : 'ct-swatch money'} onClick={() => setBg('money')} title="Ақша фоны (стандартты)" aria-label="Ақша фоны (стандартты)" />
        {Object.entries(PAGE_BG_PRESETS).map(([key, p]) => (
          <button key={key} type="button" className={bgKey === key ? 'ct-swatch selected' : 'ct-swatch'} style={{ background: p.css }} onClick={() => setBg(key)} title={p.label} aria-label={p.label} />
        ))}
        <label className={bgCustom ? 'ct-swatch custom selected' : 'ct-swatch custom'} style={bgCustom ? { background: bgCustom } : undefined} title="Кез келген түс">
          {!bgCustom && '+'}
          <input type="color" value={bgCustom || '#4c7ff0'} onChange={(e) => setBgDebounced(e.target.value)} />
        </label>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => uploadBg(e.target.files?.[0])} />
        {bgKey === 'photo' && course.bg_image_url && (
          <button type="button" className="btn btn-outline btn-sm" onClick={resetPhoto} style={{ marginLeft: 4 }}>Стандартты фотоға қайтару</button>
        )}
      </div>

      <div className="course-theme-row">
        <span className="course-theme-label">Курс тақырыбының түсі (фото жоқ болғанда)</span>
        {Object.entries(COURSE_COLORS).map(([key, c]) => (
          <button key={key} type="button" className={titleKey === key ? 'ct-swatch selected' : 'ct-swatch'} style={{ background: c.gradient }} onClick={() => setTitle(key)} title={c.label} aria-label={c.label} />
        ))}
        <label className={titleCustom ? 'ct-swatch custom selected' : 'ct-swatch custom'} style={titleCustom ? { background: titleCustom } : undefined} title="Кез келген түс">
          {!titleCustom && '+'}
          <input type="color" value={titleCustom || '#4c7ff0'} onChange={(e) => setTitleDebounced(e.target.value)} />
        </label>
      </div>

      <div className="course-theme-row">
        <span className="course-theme-label">Модуль карточкалары, батырмалар және рейтинг картасы</span>
        {Object.entries(COURSE_COLORS).map(([key, c]) => (
          <button key={key} type="button" className={cardKey === key ? 'ct-swatch selected' : 'ct-swatch'} style={{ background: c.gradient }} onClick={() => setCard(key)} title={c.label} aria-label={c.label} />
        ))}
        <label className={cardCustom ? 'ct-swatch custom selected' : 'ct-swatch custom'} style={cardCustom ? { background: cardCustom } : undefined} title="Кез келген түс">
          {!cardCustom && '+'}
          <input type="color" value={cardCustom || '#4c7ff0'} onChange={(e) => setCardDebounced(e.target.value)} />
        </label>
      </div>

      <div className="course-theme-row">
        <span className="course-theme-label">Рейтинг картасының жазу түсі</span>
        <button type="button" className={ratingIsGold ? 'ct-swatch selected' : 'ct-swatch'} style={{ background: DEFAULT_RATING_INK }} onClick={() => setRatingInk(null)} title="Алтын (бұрынғыдай)" aria-label="Алтын" />
        <button type="button" className={ratingIsWhite ? 'ct-swatch selected' : 'ct-swatch'} style={{ background: '#ffffff', border: '1px solid var(--border)' }} onClick={() => setRatingInk('#ffffff')} title="Ақ" aria-label="Ақ" />
        <label className={ratingCustom ? 'ct-swatch custom selected' : 'ct-swatch custom'} style={ratingCustom ? { background: ratingCustom } : undefined} title="Кез келген түс">
          {!ratingCustom && '+'}
          <input type="color" value={ratingCustom || DEFAULT_RATING_INK} onChange={(e) => setRatingInkDebounced(e.target.value)} />
        </label>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  )
}
