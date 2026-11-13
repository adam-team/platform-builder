import { useState } from 'react'
import VideoPlayer from './VideoPlayer'
import { isKinescope } from '../lib/video'
import { useSignedUrls } from '../lib/answerFiles'
import type { Attachment } from '../lib/types'

// Жауап/пікірге тіркелген фото мен файлдарды және YouTube-бейнені көрсетеді
export default function AttachmentList({ attachments, youtubeId }: { attachments?: Attachment[]; youtubeId?: string | null }) {
  const urls = useSignedUrls(attachments)
  const [playing, setPlaying] = useState(false)
  const list = attachments ?? []
  if (list.length === 0 && !youtubeId) return null
  return (
    <div className="attach-view">
      {list.length > 0 && (
        <div className="attach-list">
          {list.map((a) => {
            const url = urls[a.path]
            if (a.kind === 'image') {
              return url
                ? <a key={a.path} href={url} target="_blank" rel="noopener noreferrer" className="attach-item"><img src={url} alt={a.name} /></a>
                : <span key={a.path} className="attach-item attach-file muted small">🔒 фото (көру құқығы жоқ)</span>
            }
            return url
              ? <a key={a.path} href={url} target="_blank" rel="noopener noreferrer" download={a.name} className="attach-item attach-file">📄 {a.name}</a>
              : <span key={a.path} className="attach-item attach-file muted small">📄 {a.name}</span>
          })}
        </div>
      )}
      {youtubeId && (
        <div className="attach-video">
          {playing ? <VideoPlayer videoId={youtubeId} title="Куратор бейнесі" autoPlay /> : (
            <button type="button" className="attach-video-btn" onClick={() => setPlaying(true)} style={isKinescope(youtubeId) ? undefined : { backgroundImage: `url(https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg)` }} aria-label="Бейнені ашу">
              <span>▶</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
