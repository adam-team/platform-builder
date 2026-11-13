import SecureVideo from './SecureVideo'
import { isKinescope, kinescopeId } from '../lib/video'

// Бір ойнатқыш екі көзге: Kinescope (Киноскоп) — өз ойнатқышымен iframe арқылы, YouTube — бұрынғы қорғалған SecureVideo.
// seek — тайм-кодқа өту (Kinescope-та `?t=` арқылы iframe қайта жүктеледі).
export default function VideoPlayer({ videoId, title, seek, autoPlay = false }: { videoId: string; title: string; seek?: { t: number; n: number } | null; autoPlay?: boolean }) {
  if (!isKinescope(videoId)) return <SecureVideo youtubeId={videoId} title={title} seek={seek} autoPlay={autoPlay} />
  const start = seek ? Math.max(0, Math.floor(seek.t)) : 0
  const params = new URLSearchParams()
  if (start) params.set('t', String(start))
  if (autoPlay || seek) params.set('autoplay', '1')
  const query = params.toString()
  return (
    <div className="ks-frame">
      <iframe
        key={seek?.n ?? 0}
        src={`https://kinescope.io/embed/${kinescopeId(videoId)}${query ? `?${query}` : ''}`}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write"
        allowFullScreen
        loading="lazy"
      />
    </div>
  )
}
