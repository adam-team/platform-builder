import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { courseBannerStyle, courseBuyLink, courseTheme, formatKzt } from '../lib/content'
import type { Course } from '../lib/types'
import SmartLink from './SmartLink'

// Курстың сату карточкасы («Курстар» беті және әкімшінің «Ақылы курстар» беті). `open` — курс иесіне ашық.
// Төменгі «Курсты алу» батырмасы courseBuyLink арқылы КП бетіне немесе WhatsApp/басқа сілтемеге апарады.
export default function CourseSaleCard({ course, open, fallbackLink = '/login', footer }: {
  course: Course
  open: boolean
  fallbackLink?: string
  footer?: ReactNode
}) {
  const cat = courseTheme(course)
  const [featuresOpen, setFeaturesOpen] = useState(false)
  const discount = course.old_price_kzt && course.price_kzt ? Math.round(100 - (course.price_kzt / course.old_price_kzt) * 100) : null
  const link = courseBuyLink(course) ?? fallbackLink
  return (
    <div className="course-card">
      <div className="banner" style={courseBannerStyle(course)}>
        <div className="top-row">
          <span className="cat-label">{cat.label}{!course.is_published && ' · жасырын'}</span>
          {discount ? <span className="badge-discount">−{discount}%</span> : <span />}
        </div>
        <span className="icon-chip">{cat.icon}</span>
        <h3>{course.title}</h3>
      </div>
      <div className="body">
        <p className="desc">{course.description}</p>

        {course.features.length > 0 && (
          <div style={{ margin: '10px 0' }}>
            <button type="button" className="about-toggle" onClick={() => setFeaturesOpen((v) => !v)} aria-expanded={featuresOpen}>
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

        {open ? (
          <>
            <span className="badge ok" style={{ marginBottom: 10, display: 'inline-block' }}>Сізге ашық</span>
            <Link to={`/course/${course.id}`} className="btn btn-primary btn-block">Курсқа өту →</Link>
          </>
        ) : course.offline_price_kzt ? (
          <>
            <div style={{ margin: '4px 0 14px' }}>
              <p className="format-price">Онлайн формат: <b>{formatKzt(course.price_kzt)}</b></p>
              <p className="format-price">Офлайн формат: <b>{formatKzt(course.offline_price_kzt)}</b></p>
            </div>
            <SmartLink href={link} className="btn btn-primary btn-block">Бағдарламаны көру</SmartLink>
          </>
        ) : (
          <>
            <div className="price-row" style={{ margin: '6px 0 14px' }}>
              {course.old_price_kzt && <span className="old-price">{formatKzt(course.old_price_kzt)}</span>}
              <span className="new-price">{formatKzt(course.price_kzt)}</span>
            </div>
            <SmartLink href={link} className="btn btn-primary btn-block">Курсты алу</SmartLink>
          </>
        )}
        {footer}
      </div>
    </div>
  )
}
