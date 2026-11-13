import { Component, type ReactNode } from 'react'
import { isChunkLoadError, reloadOnceForNewVersion } from '../lib/chunkReload'

// Страхует от белого экрана, если какая-то страница упадёт с ошибкой —
// особенно полезно в демо-режиме, где Supabase заменён упрощённой имитацией.
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    // Сайттың жаңа нұсқасы шыққан соң ескі бет файл таба алмаса — қате көрсетпей, өзі жаңарады
    if (isChunkLoadError(error)) reloadOnceForNewVersion()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="auth-card">
          <h1>Бірдеңе дұрыс болмады</h1>
          <p className="muted small">{this.state.error.message}</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => { this.setState({ error: null }); location.href = '/' }}>
            Басты бетке оралу
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
