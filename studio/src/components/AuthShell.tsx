import type { ReactNode } from 'react'
import { DEFAULT_SETTINGS } from '../lib/content'

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="auth-wrap">
      <div className="auth-brand">
        <img src={DEFAULT_SETTINGS.hero_photo_url} alt={DEFAULT_SETTINGS.expert_name} />
        <div>
          <div className="name">{DEFAULT_SETTINGS.expert_name}</div>
          <div className="role">{DEFAULT_SETTINGS.expert_role}</div>
        </div>
      </div>
      <div className="auth-card">
        <h1>{title}</h1>
        {subtitle && <p className="muted small" style={{ marginTop: -8, marginBottom: 18, textAlign: 'center' }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}
