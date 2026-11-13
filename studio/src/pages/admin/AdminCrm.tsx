import { useEffect, useState, type FormEvent } from 'react'
import { DndContext, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../../lib/supabase'
import { formatKzt } from '../../lib/content'
import DataTable, { type DataTableColumn } from '../../components/DataTable'
import type { CrmTask, Deal, Pipeline, PipelineStage, TaskStatus } from '../../lib/types'

const TABS = ['Доска', 'Тапсырмалар'] as const

// ЭТАП_09 CRM — честный срез: канбан доска + тапсырмалар нақты жұмыс істейді (dnd-kit, өткенде
// сабақтарда қолданғандай паттерн). «Процессы» (автоматтандыру — триггер→пауза→әрекет) жоқ: оған
// нақты queue/cron инфрақұрылымы керек, Vercel-де жоқ — жартылай жасау өтірік болар еді.
export default function AdminCrm() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Доска')
  return (
    <>
      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map((t) => <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {tab === 'Доска' && <DealsBoard />}
      {tab === 'Тапсырмалар' && <TasksList />}
    </>
  )
}

function DealsBoard() {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  async function load() {
    const { data: pipelines } = await supabase.from('pipelines').select('*').order('position').limit(1)
    const p = (pipelines as Pipeline[])?.[0] ?? null
    setPipeline(p)
    if (!p) return
    const [{ data: stageRows }, { data: dealRows }] = await Promise.all([
      supabase.from('pipeline_stages').select('*').eq('pipeline_id', p.id).order('position'),
      supabase.from('deals').select('*, profiles(full_name, email)').eq('pipeline_id', p.id).order('created_at', { ascending: false }),
    ])
    setStages((stageRows as PipelineStage[]) ?? [])
    setDeals((dealRows as Deal[]) ?? [])
  }
  useEffect(() => { load() }, [])

  async function createDeal(e: FormEvent) {
    e.preventDefault()
    if (!pipeline || !stages[0]) return
    await supabase.from('deals').insert({ pipeline_id: pipeline.id, stage_id: stages[0].id, title: newTitle, amount_kzt: newAmount ? Number(newAmount) : null })
    setNewTitle(''); setNewAmount(''); setCreating(false)
    load()
  }

  async function moveDeal(dealId: string, stageId: string) {
    const stage = stages.find((s) => s.id === stageId)
    let lostReason: string | null = null
    if (stage?.stage_type === 'fail') {
      lostReason = prompt('Бас тарту себебі:') ?? ''
      if (lostReason === '') return // болдырмады
    }
    await supabase.from('deals').update({ stage_id: stageId, lost_reason: lostReason }).eq('id', dealId)
    load()
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    const dealId = String(active.id)
    const overId = String(over.id)
    const targetStage = stages.find((s) => s.id === overId)
    if (targetStage) return moveDeal(dealId, targetStage.id)
    const overDeal = deals.find((d) => d.id === overId)
    if (overDeal) return moveDeal(dealId, overDeal.stage_id)
  }

  if (!pipeline) return <p className="muted">Жүктелуде…</p>

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{pipeline.name}</h3>
        <button onClick={() => setCreating((v) => !v)}>{creating ? 'Болдырмау' : '+ Сделка'}</button>
      </div>
      {creating && (
        <form className="panel" onSubmit={createDeal}>
          <div className="row">
            <label>Атауы (клиент/өтінім)<input required autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></label>
            <label className="narrow">Сома, ₸<input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} /></label>
          </div>
          <button>Құру</button>
        </form>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="crm-board">
          {stages.map((stage) => (
            <BoardColumn key={stage.id} stage={stage} deals={deals.filter((d) => d.stage_id === stage.id)} />
          ))}
        </div>
      </DndContext>
    </>
  )
}

function BoardColumn({ stage, deals }: { stage: PipelineStage; deals: Deal[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const total = deals.reduce((sum, d) => sum + (d.amount_kzt ?? 0), 0)
  return (
    <div className="crm-column" ref={setNodeRef} style={isOver ? { background: 'var(--surface-2)' } : undefined}>
      <div className="crm-column-head" style={{ borderColor: stage.color }}>
        <b style={{ color: stage.color }}>{stage.name}</b>
        <span className="muted small">{deals.length} · {formatKzt(total)}</span>
      </div>
      <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        {deals.map((d) => <DealCard key={d.id} deal={d} />)}
      </SortableContext>
    </div>
  )
}

function DealCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <div className="crm-card" ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <b>{deal.title}</b>
      {deal.profiles && <div className="muted small">{deal.profiles.full_name || deal.profiles.email}</div>}
      {deal.amount_kzt != null && <div className="small" style={{ marginTop: 4 }}>{formatKzt(deal.amount_kzt)}</div>}
    </div>
  )
}

const STATUS_LABEL: Record<TaskStatus, string> = { new: 'Жаңа', in_progress: 'Жұмыста', done: 'Орындалды' }

function TasksList() {
  const [tasks, setTasks] = useState<CrmTask[]>([])
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [dueAt, setDueAt] = useState('')

  async function load() {
    const { data } = await supabase.from('tasks').select('*').order('due_at', { ascending: true, nullsFirst: false })
    setTasks((data as CrmTask[]) ?? [])
  }
  useEffect(() => { load() }, [])

  async function createTask(e: FormEvent) {
    e.preventDefault()
    await supabase.from('tasks').insert({ title, due_at: dueAt || null })
    setTitle(''); setDueAt(''); setCreating(false)
    load()
  }
  async function setStatus(task: CrmTask, status: TaskStatus) {
    await supabase.from('tasks').update({ status }).eq('id', task.id)
    load()
  }

  const columns: DataTableColumn<CrmTask>[] = [
    { key: 'title', label: 'Атауы', sortable: true },
    {
      key: 'due_at', label: 'Мерзімі', sortable: true, filterable: false,
      value: (t) => t.due_at ?? '',
      render: (t) => t.due_at ? new Date(t.due_at).toLocaleString('ru-RU') : '—',
    },
    {
      key: 'status', label: 'Күйі', filterable: false,
      render: (t) => (
        <select value={t.status} onChange={(e) => setStatus(t, e.target.value as TaskStatus)}>
          {(['new', 'in_progress', 'done'] as TaskStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      ),
    },
  ]

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Тапсырмалар</h3>
        <button onClick={() => setCreating((v) => !v)}>{creating ? 'Болдырмау' : '+ Тапсырма'}</button>
      </div>
      {creating && (
        <form className="panel" onSubmit={createTask}>
          <div className="row">
            <label>Атауы<input required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} /></label>
            <label className="narrow">Мерзімі<input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></label>
          </div>
          <button>Құру</button>
        </form>
      )}
      <DataTable columns={columns} rows={tasks} emptyState={<p className="muted">Тапсырмалар жоқ 🎉</p>} />
    </>
  )
}
