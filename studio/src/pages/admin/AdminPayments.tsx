import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatKzt } from '../../lib/content'
import DataTable, { type DataTableColumn } from '../../components/DataTable'
import type { Payment } from '../../lib/types'
import { scheduleBackup } from '../../lib/backup'

interface Row extends Payment {
  profiles: { email: string; full_name: string | null } | null
  courses: { title: string } | null
}

const STATUS_LABEL: Record<string, string> = { pending: 'растауды күтуде', paid: 'төленген', failed: 'сәтсіз' }

// ЭТАП_06 «Заказы»: пока оплата — вручную (Kaspi), поэтому полноценный движок продуктов/рассрочек/
// промокодов сюда не строила (нет реального шлюза, о чём честно написано в README). Улучшила то, что
// реально используется каждый день — список заявок на DataTable вместо голой таблицы.
export default function AdminPayments() {
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState('')

  async function load() {
    const { data } = await supabase
      .from('payments')
      .select('*, profiles(email, full_name), courses(title)')
      .order('created_at', { ascending: false })
    setRows((data as unknown as Row[]) ?? [])
  }
  useEffect(() => { load() }, [])

  async function confirmPayment(id: string) {
    setError('')
    const { error } = await supabase.rpc('confirm_payment', { p_payment: id })
    if (!error) scheduleBackup()
    if (error) setError(error.message)
    load()
  }
  async function confirmMany(ids: string[]) {
    setError('')
    let any = false
    for (const id of ids) {
      const row = rows.find((r) => r.id === id)
      if (row?.status === 'pending') { await supabase.rpc('confirm_payment', { p_payment: id }); any = true }
    }
    if (any) scheduleBackup()
    load()
  }

  const stats = useMemo(() => {
    const paid = rows.filter((r) => r.status === 'paid')
    const pending = rows.filter((r) => r.status === 'pending')
    const revenue = paid.reduce((sum, r) => sum + (r.amount_kzt ?? 0), 0)
    return { revenue, paidCount: paid.length, pendingCount: pending.length }
  }, [rows])

  const columns: DataTableColumn<Row>[] = [
    {
      key: 'client', label: 'Клиент / курс', sortable: true,
      value: (r) => `${r.profiles?.full_name ?? ''} ${r.profiles?.email ?? ''} ${r.courses?.title ?? ''}`,
      render: (r) => (
        <>
          <b>{r.profiles?.full_name || r.profiles?.email}</b> — {r.courses?.title}
          <div className="muted small">{new Date(r.created_at).toLocaleString('ru-RU')}</div>
        </>
      ),
    },
    {
      key: 'amount_kzt', label: 'Сома', sortable: true, filterable: false,
      value: (r) => String(r.amount_kzt ?? 0),
      render: (r) => formatKzt(r.amount_kzt) || '—',
    },
    {
      key: 'status', label: 'Күйі', sortable: true,
      value: (r) => STATUS_LABEL[r.status] ?? r.status,
      render: (r) => (r.status === 'pending'
        ? <button className="btn-sm" onClick={() => confirmPayment(r.id)}>Төлемді растау</button>
        : <span className={r.status === 'paid' ? 'badge ok' : 'badge'}>{STATUS_LABEL[r.status] ?? r.status}</span>),
    },
  ]

  return (
    <>
      <p className="muted small">
        Клиент «Оплатить» батырмасын басқанда осы жерде өтінім пайда болады. Kaspi-де түсімді тексеріп,
        «Растау» батырмасын басыңыз: курс ашылады, клиент төлеген болады.
      </p>

      <div className="row" style={{ marginBottom: 18 }}>
        <div className="panel" style={{ flex: '1 1 160px', margin: 0, textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--brand-dark)' }}>{formatKzt(stats.revenue)}</div>
          <div className="muted small">жалпы түсім</div>
        </div>
        <div className="panel" style={{ flex: '1 1 160px', margin: 0, textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{stats.paidCount}</div>
          <div className="muted small">төленген</div>
        </div>
        <div className="panel" style={{ flex: '1 1 160px', margin: 0, textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--danger)' }}>{stats.pendingCount}</div>
          <div className="muted small">растауды күтуде</div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      <DataTable
        columns={columns}
        rows={rows}
        emptyState={<p className="muted">Өтінімдер әлі жоқ</p>}
        bulkActions={[{ label: 'Таңдалғандарды растау', onRun: confirmMany }]}
      />
    </>
  )
}
