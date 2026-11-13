import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// <TrashPanel> — мягко удалённые (deleted_at) жазбаларды көрсетеді, «Қалпына келтіру» береді.
// 8 секундтық <UndoToast> уақыты өтіп кеткен соң деректі жоғалтпау үшін керек (ЭТАП_14 QA-табылым).
export default function TrashPanel({
  table, titleField, onRestored, matchColumn, matchValue,
}: { table: string; titleField: string; onRestored: () => void; matchColumn?: string; matchValue?: string }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Record<string, unknown>[]>([])

  async function load() {
    let query = supabase.from(table).select('*').not('deleted_at', 'is', null)
    if (matchColumn && matchValue) query = query.eq(matchColumn, matchValue)
    const { data } = await query.order('deleted_at', { ascending: false })
    setRows(data ?? [])
  }
  useEffect(() => { if (open) load() }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function restore(id: string) {
    await supabase.from(table).update({ deleted_at: null }).eq('id', id)
    load()
    onRestored()
  }

  if (!open) return <button type="button" className="secondary btn-sm" onClick={() => setOpen(true)}>🗑 Себет</button>

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h4 style={{ margin: 0 }}>Себет ({rows.length})</h4>
        <button type="button" className="secondary btn-sm" onClick={() => setOpen(false)}>Жабу</button>
      </div>
      {rows.length === 0 && <p className="muted small">Себет бос</p>}
      {rows.map((r) => (
        <div key={String(r.id)} className="row" style={{ justifyContent: 'space-between', padding: '6px 0' }}>
          <span>{String(r[titleField])}</span>
          <button type="button" className="secondary btn-sm" onClick={() => restore(String(r.id))}>Қалпына келтіру</button>
        </div>
      ))}
    </div>
  )
}
