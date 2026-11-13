import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface ToastItem { id: number; message: string; onUndo: () => void }
interface UndoToastCtx { show: (message: string, onUndo: () => void) => void }

const Ctx = createContext<UndoToastCtx | null>(null)

// <UndoToast> (ЭТАП_01, компонент E) — «жойылды. Болдырмау» 8 секунд, қорқынышты растау терезесінің орнына.
export function UndoToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const show = useCallback((message: string, onUndo: () => void) => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, message, onUndo }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 8000)
  }, [])

  function undo(id: number) {
    setToasts((t) => {
      const item = t.find((x) => x.id === id)
      item?.onUndo()
      return t.filter((x) => x.id !== id)
    })
  }

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {toasts.length > 0 && (
        <div className="undo-toast-stack">
          {toasts.map((t) => (
            <div key={t.id} className="undo-toast">
              <span>{t.message}</span>
              <button onClick={() => undo(t.id)}>Болдырмау</button>
            </div>
          ))}
        </div>
      )}
    </Ctx.Provider>
  )
}

export function useUndoToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useUndoToast — тек <UndoToastProvider> ішінде')
  return ctx
}
