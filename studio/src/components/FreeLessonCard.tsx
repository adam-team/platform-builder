import { useState } from 'react'
import VideoPlayer from './VideoPlayer'
import { CATEGORY } from '../lib/content'
import type { FreeLesson } from '../lib/types'

// Тегін сабақ картасы: видео сілтемесі болса — басқанда осы жерде ойнайды, әйтпесе «жақында қосылады».
export default function FreeLessonCard({ lesson }: { lesson: FreeLesson }) {
  const [playing, setPlaying] = useState(false)
  const cat = CATEGORY[lesson.category]
  return (
    <div className="free-lesson-card">
      {playing && lesson.youtube_id ? (
        <div className="thumb thumb-video">
          <VideoPlayer videoId={lesson.youtube_id} title={lesson.title} autoPlay />
        </div>
      ) : lesson.youtube_id ? (
        <button type="button" className="thumb" style={{ background: cat.gradient }} onClick={() => setPlaying(true)} aria-label={`${lesson.title} — бейнені ашу`}>
          <span className="play">▶</span>
        </button>
      ) : (
        <div className="thumb thumb-disabled" style={{ background: cat.gradient }}>
          <span className="play">▶</span>
          <span className="thumb-note">Бейне жақында қосылады</span>
        </div>
      )}
      <div className="info">
        <span className="tag" style={{ color: cat.color }}>{cat.label}</span>
        <h4>{lesson.title}</h4>
        <span className="muted small">Тегін</span>
      </div>
    </div>
  )
}
