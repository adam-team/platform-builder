import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { createDefaultModules } from '../lib/defaultModules'
import { uploadCourseImage } from '../lib/media'
import { CATEGORY, CATEGORY_ORDER, COURSE_COLORS, courseBannerStyle, courseTheme, formatKzt } from '../lib/content'
import type { Category, Course } from '../lib/types'
import { scheduleBackup } from '../lib/backup'

const linesToList = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

// Әкімшінің «Курстар» беті: барлық курс ашық, курс қосу және мұқабаны өңдеу осында.
export default function AdminCourseManager() {
  const [courses, setCourses] = useState<Course[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [openFeatures, setOpenFeatures] = useState<Set<string>>(new Set())

  async function load() {
    const { data } = await supabase.from('courses').select('*').is('deleted_at', null).order('position')
    setCourses((data as Course[]) ?? [])
  }
  useEffect(() => { load() }, [])

  function toggleFeatures(id: string) {
    setOpenFeatures((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (!courses) return <p className="muted">Жүктелуде…</p>

  return (
    <>
      <div className="section-head admin-courses-head" style={{ marginTop: 20 }}>
        <div>
          <h1>Менің курстарым</h1>
          <p className="muted small">Барлық курс, модуль және сабақ сізге ашық.</p>
        </div>
        <div className="admin-courses-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => { setCreating((v) => !v); setEditingId(null) }}>
            {creating ? 'Жабу' : '+ Жаңа курс қосу'}
          </button>
          <button
            type="button"
            className={editMode ? 'btn btn-outline btn-sm active' : 'btn btn-outline btn-sm'}
            onClick={() => { setEditMode((v) => !v); setEditingId(null) }}
          >
            {editMode ? 'Аяқтау' : 'Редакциялау'}
          </button>
        </div>
      </div>

      {creating && (
        <CourseForm
          nextPosition={courses.length}
          onCancel={() => setCreating(false)}
          onSaved={() => { setCreating(false); load() }}
        />
      )}

      <div className="grid grid-3">
        {courses.map((course) => {
          if (editingId === course.id) {
            return (
              <div key={course.id} style={{ gridColumn: '1 / -1' }}>
                <CourseForm course={course} onCancel={() => setEditingId(null)} onSaved={() => { setEditingId(null); load() }} />
              </div>
            )
          }
          const cat = courseTheme(course)
          const featuresOpen = openFeatures.has(course.id)
          const discount = course.old_price_kzt && course.price_kzt
            ? Math.round(100 - (course.price_kzt / course.old_price_kzt) * 100)
            : null
          return (
            <div key={course.id} className="course-card">
              <div className="banner" style={courseBannerStyle(course)}>
                <div className="top-row">
                  <span className="cat-label">{cat.label}{!course.is_published && ' · жасырын'}</span>
                  {editMode ? (
                    <button type="button" className="btn btn-white btn-sm" onClick={() => setEditingId(course.id)}>Редакциялау</button>
                  ) : discount ? (
                    <span className="badge-discount">−{discount}%</span>
                  ) : <span />}
                </div>
                <span className="icon-chip">{cat.icon}</span>
                <h3>{course.title}</h3>
              </div>
              <div className="body">
                <p className="desc">{course.description}</p>

                {course.features.length > 0 && (
                  <div style={{ margin: '10px 0' }}>
                    <button type="button" className="about-toggle" onClick={() => toggleFeatures(course.id)} aria-expanded={featuresOpen}>
                      {course.features_intro || 'Курс нәтижесінде сіз:'}
                      <span className={featuresOpen ? 'chevron up' : 'chevron'}>⌄</span>
                    </button>
                    {featuresOpen && (
                      <ul className="feature-list" style={{ marginTop: 12 }}>
                        {course.features.map((f, i) => <li key={i}><span className="tick">✓</span>{f}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                {course.offline_price_kzt ? (
                  <div style={{ margin: '4px 0 14px' }}>
                    <p className="format-price">Онлайн формат: <b>{formatKzt(course.price_kzt)}</b></p>
                    <p className="format-price">Офлайн формат: <b>{formatKzt(course.offline_price_kzt)}</b></p>
                  </div>
                ) : (
                  <div className="price-row" style={{ margin: '6px 0 14px' }}>
                    {course.old_price_kzt && <span className="old-price">{formatKzt(course.old_price_kzt)}</span>}
                    <span className="new-price">{formatKzt(course.price_kzt)}</span>
                  </div>
                )}
                <Link to={`/course/${course.id}`} className="btn btn-primary btn-block">Курсқа өту</Link>
              </div>
            </div>
          )
        })}
      </div>
      {courses.length === 0 && <p className="muted">Курс әлі жоқ. «Жаңа курс қосу» батырмасын басыңыз.</p>}
    </>
  )
}

function CourseForm({ course, nextPosition, onSaved, onCancel }: { course?: Course; nextPosition?: number; onSaved: () => void; onCancel: () => void }) {
  const hasDiscount = !!course?.old_price_kzt
  const [form, setForm] = useState({
    category: (course?.category ?? 'debt') as Category,
    title: course?.title ?? '',
    description: course?.description ?? '',
    featuresIntro: course?.features_intro ?? '',
    features: (course?.features ?? []).join('\n'),
    mainPrice: (hasDiscount ? course?.old_price_kzt : course?.price_kzt)?.toString() ?? '',
    discountPrice: hasDiscount ? course?.price_kzt?.toString() ?? '' : '',
    offlinePrice: course?.offline_price_kzt?.toString() ?? '',
    paymentUrl: course?.payment_url ?? '',
    color: course?.color ?? '',
    cardUrl: course?.card_image_url ?? '',
    orderUrl: course?.order_url ?? '',
    coverUrl: course?.cover_image_url ?? '',
    bgUrl: course?.bg_image_url ?? '',
    isPublished: course?.is_published ?? true,
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

  // Мұқабаға өз фото: файл бірден Supabase Storage-ке жүктеледі, сілтемесі формаға түседі
  async function pickPhoto(file: File | undefined) {
    if (!file) return
    setError('')
    setPhotoBusy(true)
    const res = await uploadCourseImage(file, course?.id ?? 'new')
    setPhotoBusy(false)
    if (photoRef.current) photoRef.current.value = ''
    if (res.error || !res.url) return setError(`Фото жүктелмеді: ${res.error ?? 'қате'}`)
    setForm((f) => ({ ...f, cardUrl: res.url! }))
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const main = form.mainPrice ? Number(form.mainPrice) : null
    const discount = form.discountPrice ? Number(form.discountPrice) : null
    const row = {
      title: form.title,
      description: form.description || null,
      features_intro: form.featuresIntro || null,
      features: linesToList(form.features),
      category: form.category,
      price_kzt: discount ?? main,
      old_price_kzt: discount != null ? main : null,
      offline_price_kzt: form.offlinePrice ? Number(form.offlinePrice) : null,
      payment_url: form.paymentUrl || null,
      color: form.color || null,
      order_url: form.orderUrl || null,
      // card_image_url тек өзгерсе жіберіледі (SQL-миграция 34 әлі іске қосылмаса да, қалған өрістер сақтала береді)
      ...(form.cardUrl !== (course?.card_image_url ?? '') ? { card_image_url: form.cardUrl || null } : {}),
      cover_image_url: form.coverUrl || null,
      bg_image_url: form.bgUrl || null,
      is_published: form.isPublished,
    }
    let error: { message: string } | null
    if (course) {
      error = (await supabase.from('courses').update(row).eq('id', course.id)).error
    } else {
      const res = await supabase.from('courses').insert({ ...row, position: nextPosition ?? 0 }).select('id').single()
      error = res.error
      if (!error && res.data) {
        const modulesError = await createDefaultModules(res.data.id as string)
        if (modulesError) error = { message: `Курс құрылды, бірақ модульдер құрылмады: ${modulesError}` }
      }
    }
    setBusy(false)
    if (error) return setError(error.message)
    scheduleBackup()
    onSaved()
  }

  async function remove() {
    if (!course) return
    if (!window.confirm(`«${course.title}» курсын өшіресіз бе? Клиенттерге көрінбей қалады.`)) return
    setBusy(true)
    const { error } = await supabase.from('courses').update({ deleted_at: new Date().toISOString() }).eq('id', course.id)
    setBusy(false)
    if (error) return setError(error.message)
    scheduleBackup()
    onSaved()
  }

  return (
    <form className="panel course-form" onSubmit={save}>
      <h3 style={{ marginBottom: 14 }}>{course ? 'Курсты өзгерту' : 'Жаңа курс'}</h3>

      <label>Бағыты (категория)
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>
          {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY[c].label}</option>)}
        </select>
      </label>
      <label>Курс атауы<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
      <label>Курстың қосымша атауы (сипаттама)<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <label>«Курс нәтижесінде сіз:» жолы<input value={form.featuresIntro} onChange={(e) => setForm({ ...form, featuresIntro: e.target.value })} placeholder="Курс нәтижесінде сіз:" /></label>
      <label>Осы жолдың ішіндегі мәтін (әр жол — жеке пункт, «жабылатын» тізім)
        <textarea rows={5} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
      </label>
      <div className="row">
        <label>Негізгі баға, ₸<input type="number" min="0" value={form.mainPrice} onChange={(e) => setForm({ ...form, mainPrice: e.target.value })} /></label>
        <label>Жеңілдік бағасы, ₸ (міндетті емес)<input type="number" min="0" value={form.discountPrice} onChange={(e) => setForm({ ...form, discountPrice: e.target.value })} /></label>
      </div>
      <label>Офлайн баға, ₸ (міндетті емес — толтырсаңыз, негізгі баға «Онлайн формат» болып көрінеді)<input type="number" min="0" value={form.offlinePrice} onChange={(e) => setForm({ ...form, offlinePrice: e.target.value })} /></label>
      <p className="muted small" style={{ margin: '0 0 10px' }}>«Курсты алу» батырмасының сілтемесі — «Ақылы курстар» бетінде өзгертіледі.</p>
      <label>Kaspi Pay төлем сілтемесі (міндетті емес)<input value={form.paymentUrl} onChange={(e) => setForm({ ...form, paymentUrl: e.target.value })} /></label>

      <div className="color-picker">
        <span className="small muted">Мұқаба түсі</span>
        <div className="color-swatches">
          <button
            type="button"
            className={form.color === '' ? 'swatch auto selected' : 'swatch auto'}
            onClick={() => setForm({ ...form, color: '', cardUrl: '' })}
            aria-label="Бағыт түсі"
            title="Бағытқа сай түс"
          >A</button>
          {Object.entries(COURSE_COLORS).map(([key, c]) => (
            <button
              key={key}
              type="button"
              className={form.color === key ? 'swatch selected' : 'swatch'}
              style={{ background: c.gradient }}
              onClick={() => setForm({ ...form, color: key, cardUrl: '' })}
              aria-label={c.label}
              title={c.label}
            />
          ))}
          <button
            type="button"
            className={form.cardUrl ? 'swatch photo selected' : 'swatch photo'}
            style={form.cardUrl ? { backgroundImage: `url("${form.cardUrl}")` } : undefined}
            onClick={() => photoRef.current?.click()}
            disabled={photoBusy}
            aria-label="Өз фотоңызды қосу"
            title="Өз фотоңызды қосу"
          >{photoBusy ? '…' : form.cardUrl ? '' : '📷'}</button>
          <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => pickPhoto(e.target.files?.[0])} />
        </div>
        <p className="muted small" style={{ margin: '8px 0 0' }}>
          {form.cardUrl ? 'Мұқабада сіздің фотоңыз көрінеді. Түсті таңдасаңыз — фото алынып тасталады.' : 'Соңғы дөңгелек — өз фотоңызды мұқабаға қою.'}
        </p>
      </div>

      <p className="small muted" style={{ margin: '4px 0 8px' }}>Курстың ішкі беті (міндетті емес; чаттар мен Top-30 курстың ішінде «Редакциялау» арқылы өзгертіледі):</p>
      <label>Тақырып суретінің сілтемесі (курсқа кіргендегі үстіңгі сурет)<input value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} placeholder="/images/..." /></label>
      <label>Фон суретінің сілтемесі (бос болса — стандартты фон)<input value={form.bgUrl} onChange={(e) => setForm({ ...form, bgUrl: e.target.value })} placeholder="/images/..." /></label>
      <label className="check"><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> Қонақтар мен клиенттерге көрсету</label>

      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Сақталып жатыр…' : 'Сақтау'}</button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>Болдырмау</button>
        {course && <button type="button" className="btn btn-outline btn-delete" onClick={remove} disabled={busy}>Курсты өшіру</button>}
      </div>
    </form>
  )
}
