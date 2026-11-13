import { useMemo, useState, type ReactNode } from 'react'

export interface DataTableColumn<T> {
  key: string
  label: string
  sortable?: boolean
  filterable?: boolean
  render?: (row: T) => ReactNode
  // Сорттау/фильтрлеу үшін мәнді шығарады (render күрделі JSX қайтарса, осыны бөлек беру керек)
  value?: (row: T) => string | number | null
}

// <DataTable> (ЭТАП_01, компонент A) — админкадағы барлық тізімге ортақ: сорттау, баған астындағы
// фильтр жолы, жаппай әрекет панелі, беттеу, бос күй. Асыра күрделендірмей — нақты керек бөлігі ғана.
export default function DataTable<T extends { id: string }>({
  columns,
  rows,
  bulkActions,
  emptyState,
  pageSize = 30,
}: {
  columns: DataTableColumn<T>[]
  rows: T[]
  bulkActions?: { label: string; onRun: (ids: string[]) => void; danger?: boolean }[]
  emptyState?: ReactNode
  pageSize?: number
}) {
  const [sort, setSort] = useState<{ key: string; asc: boolean } | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(pageSize)

  function colValue(col: DataTableColumn<T>, row: T): string {
    const v = col.value ? col.value(row) : (row as Record<string, unknown>)[col.key]
    return v == null ? '' : String(v)
  }

  const filtered = useMemo(() => {
    let out = rows
    for (const col of columns) {
      const f = filters[col.key]?.trim().toLowerCase()
      if (!f) continue
      out = out.filter((r) => colValue(col, r).toLowerCase().includes(f))
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key)
      if (col) {
        out = [...out].sort((a, b) => {
          const av = colValue(col, a)
          const bv = colValue(col, b)
          return (av > bv ? 1 : av < bv ? -1 : 0) * (sort.asc ? 1 : -1)
        })
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, filters, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / size))
  const pageRows = filtered.slice(page * size, page * size + size)

  function toggleSort(key: string) {
    setSort((s) => (s?.key === key ? { key, asc: !s.asc } : { key, asc: true }))
  }
  function toggleRow(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    setSelected((s) => (s.size === pageRows.length ? new Set() : new Set(pageRows.map((r) => r.id))))
  }
  function exportCsv() {
    const header = columns.map((c) => c.label).join(',')
    const body = filtered.map((r) => columns.map((c) => `"${colValue(c, r).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'export.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (rows.length === 0 && emptyState) return <>{emptyState}</>

  return (
    <div className="data-table-wrap">
      <div className="data-table-toolbar">
        <span className="muted small">
          {filtered.length === rows.length ? `Барлығы: ${rows.length}` : `Табылды: ${filtered.length} / ${rows.length}`}
        </span>
        <button type="button" className="secondary btn-sm" onClick={exportCsv}>⭳ Excel/CSV</button>
      </div>

      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {bulkActions && (
                <th className="dt-check"><input type="checkbox" checked={selected.size > 0 && selected.size === pageRows.length} onChange={toggleAll} /></th>
              )}
              {columns.map((c) => (
                <th key={c.key} className={c.sortable ? 'dt-sortable' : ''} onClick={() => c.sortable && toggleSort(c.key)}>
                  {c.label}{sort?.key === c.key && (sort.asc ? ' ↑' : ' ↓')}
                </th>
              ))}
            </tr>
            <tr className="dt-filter-row">
              {bulkActions && <th />}
              {columns.map((c) => (
                <th key={c.key}>
                  {c.filterable !== false && (
                    <input
                      className="dt-filter-input"
                      placeholder="фильтр…"
                      value={filters[c.key] ?? ''}
                      onChange={(e) => { setFilters({ ...filters, [c.key]: e.target.value }); setPage(0) }}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.id}>
                {bulkActions && (
                  <td className="dt-check"><input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleRow(row.id)} /></td>
                )}
                {columns.map((c) => <td key={c.key}>{c.render ? c.render(row) : colValue(c, row)}</td>)}
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={columns.length + (bulkActions ? 1 : 0)} className="muted" style={{ padding: 20 }}>Ештеңе табылмады</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="data-table-footer">
        <span className="muted small">
          {filtered.length === 0 ? '0' : `${page * size + 1}–${Math.min(filtered.length, (page + 1) * size)}`} / {filtered.length}
        </span>
        <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0) }}>
          {[30, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <div className="row" style={{ gap: 6 }}>
          <button type="button" className="secondary btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>←</button>
          <span className="muted small">{page + 1} / {pageCount}</span>
          <button type="button" className="secondary btn-sm" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>→</button>
        </div>
      </div>

      {bulkActions && selected.size > 0 && (
        <div className="data-table-bulkbar">
          <span>Таңдалды: {selected.size}</span>
          {bulkActions.map((a) => (
            <button
              key={a.label}
              type="button"
              className={a.danger ? 'danger btn-sm' : 'secondary btn-sm'}
              onClick={() => { a.onRun([...selected]); setSelected(new Set()) }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
