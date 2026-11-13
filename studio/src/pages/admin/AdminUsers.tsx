import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import type { Profile, Role, UserGroup } from '../../lib/types'
import { useUsersData, daysLeft, fmtDate, fmtDateTime, type UsersData } from './users/useUsersData'
import { AddUserModal, EditUserModal, callApi, syncUserToSheet } from './users/UserForms'
import { useAuth } from '../../lib/auth'
import { scheduleBackup } from '../../lib/backup'
import { ROLE_LABEL, isAdminRole } from '../../lib/roles'

const TABS = [
  { id: 'users', label: 'Пайдаланушылар' },
  { id: 'staff', label: 'Команда' },
  { id: 'groups', label: 'Топтар' },
  { id: 'deleted', label: 'Жойылғандар тізімі' },
] as const
type Tab = (typeof TABS)[number]['id']
type AddMode = 'single' | 'staff' | 'bulk'

function Avatar({ p }: { p: Profile }) {
  const initial = (p.full_name || p.email).trim().charAt(0).toUpperCase()
  return <span className="au-avatar">{initial}</span>
}

// «Пайдаланушылар» — GetCourse үлгісінде: Пайдаланушылар / Қызметкерлер / Топтар / Жойылғандар тізімі
export default function AdminUsers() {
  const data = useUsersData()
  const { session, profile: me } = useAuth()
  // Куратор: тек «Пайдаланушылар» мен «Жойылғандар тізімі» — команданы, топтарды тек әкімші басқарады
  const isAdmin = isAdminRole(me?.role)
  const tabsShown = TABS.filter((t) => isAdmin || t.id === 'users' || t.id === 'deleted')
  const [tab, setTab] = useState<Tab>('users')
  const [adding, setAdding] = useState<{ mode: AddMode; courseId?: string } | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [addedTick, setAddedTick] = useState(0)

  const editProfile = data.profiles.find((p) => p.id === editing) ?? null

  // Жаңа пайдаланушы қосылған соң (топ ішінен қосса да) — тізім бірден жаңарады, сүзгілер тазаланады
  // және «Пайдаланушылар» қойындысына өзі ауысады, сонда жаңа адам көрінбей қалмайды.
  function onUserAdded() {
    data.reload()
    setAddedTick((t) => t + 1)
    if (adding?.mode !== 'staff') setTab('users')
  }

  return (
    <div className="au-root">
      <div className="au-head">
        <div className="tabs" style={{ marginBottom: 0 }}>
          {tabsShown.map((t) => <button key={t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>
        <div className="au-add" ref={menuRef} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setMenuOpen((v) => !v)}>+ Қосу ▾</button>
          {menuOpen && (
            <div className="au-menu" onMouseLeave={() => setMenuOpen(false)}>
              <button className="secondary" onClick={() => { setAdding({ mode: 'single' }); setMenuOpen(false) }}>👤 Жаңа пайдаланушы қосу</button>
              <button className="secondary" onClick={() => { setAdding({ mode: 'staff' }); setMenuOpen(false) }}>🚩 {isAdmin ? 'Команда мүшесін шақыру' : 'Куратор шақыру'}</button>
              <button className="secondary" onClick={() => { setAdding({ mode: 'bulk' }); setMenuOpen(false) }}>➕ Бірнешеуін қосу / CSV, Excel</button>
            </div>
          )}
        </div>
      </div>

      {!data.loaded ? <p className="muted">Жүктелуде…</p> : (
        <>
          {tab === 'users' && <UsersTab data={data} onOpen={setEditing} hideStaff={!isAdmin} isAdmin={isAdmin} resetSignal={addedTick} />}
          {tab === 'staff' && <StaffTab data={data} onOpen={setEditing} onInvite={() => setAdding({ mode: 'staff' })} />}
          {tab === 'groups' && <GroupsTab data={data} session={session} onOpen={setEditing} onAdd={(courseId) => setAdding({ mode: 'single', courseId })} />}
          {tab === 'deleted' && <DeletedTab data={data} isAdmin={isAdmin} />}
        </>
      )}

      {adding && <AddUserModal mode={adding.mode} presetCourseId={adding.courseId} data={data} onClose={() => setAdding(null)} onDone={onUserAdded} />}
      {editProfile && <EditUserModal profile={editProfile} data={data} onClose={() => setEditing(null)} onChanged={data.reload} />}
    </div>
  )
}

function UsersTab({ data, onOpen, hideStaff, isAdmin, resetSignal }: { data: UsersData; onOpen: (id: string) => void; hideStaff: boolean; isAdmin: boolean; resetSignal?: number }) {
  const { session } = useAuth()
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | Role>('all')
  const [courseId, setCourseId] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [confirmBulk, setConfirmBulk] = useState(false)

  // Жаңа пайдаланушы қосылғанда сүзгілер (іздеу, түрі, курс) тазаланады — солай жаңа адам әрдайым көрінеді
  useEffect(() => {
    if (!resetSignal) return
    setQ(''); setType('all'); setCourseId('')
  }, [resetSignal])

  const rows = useMemo(() => data.profiles.filter((p) => {
    if (p.deactivated_at) return false
    if (hideStaff && p.role !== 'free' && p.role !== 'paid') return false
    if (type !== 'all' && p.role !== type) return false
    if (courseId && !data.infoByUser.get(p.id)?.enrollments.some((e) => e.course_id === courseId)) return false
    const needle = q.trim().toLowerCase()
    return !needle || [p.full_name, p.email, p.phone].some((v) => (v ?? '').toLowerCase().includes(needle))
  }), [data.profiles, data.infoByUser, q, type, courseId, hideStaff])

  const courseTitle = (id: string) => data.courses.find((c) => c.id === id)?.title ?? 'Курс'

  function toggle(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  function toggleAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((p) => p.id))))
  }
  async function deactivateSelected() {
    setBusy(true)
    const { ok, json } = await callApi('/api/admin-deactivate-user', session?.access_token, { userIds: [...selected], action: 'deactivate' })
    setBusy(false)
    setConfirmBulk(false)
    if (!ok) return alert(json.error ?? 'Қате')
    setSelected(new Set())
    scheduleBackup()
    data.reload()
  }

  function exportExcel() {
    const sheet = rows.map((p) => {
      const info = data.infoByUser.get(p.id)
      const stat = data.stats.get(p.id)
      return {
        'Аты-жөні': p.full_name ?? '',
        'Пошта': p.email,
        'Телефон': p.phone ?? '',
        'Түрі': ROLE_LABEL[p.role],
        'Соңғы кіру': fmtDateTime(stat?.last_sign_in_at),
        'Пошта расталған': stat?.email_confirmed_at ? 'иә' : 'жоқ',
        'Прогресс, %': info?.percent ?? '',
        'Қай сабақта': info?.stoppedAt ?? '',
        'Курстар (қалған мерзім)': (info?.enrollments ?? []).map((e) => `${courseTitle(e.course_id)} — ${daysLeft(e.expires_at)}`).join('; '),
        'Тіркелген күні': fmtDate(p.created_at),
      }
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), 'Пайдаланушылар')
    XLSX.writeFile(wb, 'paydalanushylar.xlsx')
  }

  return (
    <>
      <div className="au-filters">
        <input placeholder="🔍 Аты, пошта немесе телефон бойынша іздеу" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value as 'all' | Role)}>
          <option value="all">Барлық пайдаланушылар</option>
          <option value="free">Қонақтар</option>
          <option value="paid">Төлегендер</option>
          {!hideStaff && <option value="curator">Кураторлар</option>}
          {!hideStaff && <option value="admin">Әкімшілер</option>}
        </select>
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">Барлық курс</option>
          {data.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <span className="muted small">Көрсетілді: <b>{rows.length}</b></span>
        <button className="secondary" onClick={exportExcel}>⬇ Excel жүктеу</button>
      </div>
      {isAdmin && selected.size > 0 && (
        <div className="au-bulk-bar">
          <span className="small"><b>{selected.size}</b> таңдалды</span>
          {!confirmBulk ? (
            <button type="button" className="danger btn-sm" onClick={() => setConfirmBulk(true)}>Таңдалғандарды толық жою</button>
          ) : (
            <>
              <span className="small" style={{ color: 'var(--danger)' }}>Кіру мүмкіндігі мен құпия сөзі өшеді, барлық курс жабылады. Растайсыз ба?</span>
              <button type="button" className="danger btn-sm" disabled={busy} onClick={deactivateSelected}>{busy ? 'Жойылуда…' : 'Иә, толық жою'}</button>
              <button type="button" className="secondary btn-sm" onClick={() => setConfirmBulk(false)}>Жоқ</button>
            </>
          )}
        </div>
      )}
      <div className="au-table-wrap">
        <table className="au-table">
          <thead>
            <tr>
              {isAdmin && <th><input type="checkbox" checked={rows.length > 0 && selected.size === rows.length} onChange={toggleAll} /></th>}
              <th>Аватар</th><th>Аты</th><th>Пошта</th><th>Түрі</th><th>Белсенділік</th><th>Прогресс / қай сабақта</th><th>Телефон</th><th>Қолжетімділік</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const info = data.infoByUser.get(p.id)
              const stat = data.stats.get(p.id)
              return (
                <tr key={p.id} onClick={() => onOpen(p.id)}>
                  {isAdmin && <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>}
                  <td><Avatar p={p} /></td>
                  <td><b>{p.full_name || '—'}</b></td>
                  <td>{p.email}</td>
                  <td><span className={`badge ${p.role === 'paid' ? 'ok' : ''}`}>{ROLE_LABEL[p.role]}</span></td>
                  <td className="small">
                    {fmtDateTime(stat?.last_sign_in_at)}
                    <div><span className={stat?.email_confirmed_at ? 'au-ok' : 'au-warn'}>{stat?.email_confirmed_at ? 'Расталған' : 'Расталмаған'}</span></div>
                  </td>
                  <td className="small">
                    {info?.percent != null ? <><b>{info.percent}%</b><div className="muted">{info.stoppedAt}</div></> : '—'}
                  </td>
                  <td className="small">{p.phone || '—'}</td>
                  <td className="small">
                    {info?.enrollments.length ? info.enrollments.map((e) => <div key={e.id}>{courseTitle(e.course_id)}: <b>{daysLeft(e.expires_at)}</b></div>) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted" style={{ padding: 16 }}>Ешкім табылмады.</p>}
      </div>
    </>
  )
}

function StaffTab({ data, onOpen, onInvite }: { data: UsersData; onOpen: (id: string) => void; onInvite: () => void }) {
  const staff = data.profiles.filter((p) => p.role === 'admin' || p.role === 'curator')
  return (
    <>
      <div className="au-filters">
        <span className="muted small">Команда (әкімшілер мен кураторлар): <b>{staff.length}</b></span>
        <button onClick={onInvite}>🚩 Команда мүшесін шақыру</button>
      </div>
      <div className="au-table-wrap">
        <table className="au-table">
          <thead><tr><th>Аватар</th><th>Аты</th><th>Рөлі</th><th>Пошта</th><th>Телефон</th><th>Соңғы кіру</th><th>Пошта</th><th>Құпия сөз өзгерген</th></tr></thead>
          <tbody>
            {staff.map((p) => {
              const stat = data.stats.get(p.id)
              return (
                <tr key={p.id} onClick={() => onOpen(p.id)}>
                  <td><Avatar p={p} /></td>
                  <td><b>{p.full_name || '—'}</b></td>
                  <td><span className="badge">{ROLE_LABEL[p.role]}</span></td>
                  <td>{p.email}</td>
                  <td className="small">{p.phone || '—'}</td>
                  <td className="small">{fmtDateTime(stat?.last_sign_in_at)}</td>
                  <td className="small"><span className={stat?.email_confirmed_at ? 'au-ok' : 'au-warn'}>{stat?.email_confirmed_at ? 'Расталған' : 'Расталмаған'}</span></td>
                  <td className="small">{fmtDateTime(p.password_changed_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

// Топ = курс (немесе қосымша ағын). Курс топтары — курсқа қолжетімділігі бар адамдар.
function GroupsTab({ data, session, onOpen, onAdd }: { data: UsersData; session: { access_token?: string } | null; onOpen: (id: string) => void; onAdd: (courseId: string) => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [pickUser, setPickUser] = useState('')
  const byId = new Map(data.profiles.map((p) => [p.id, p]))

  async function createGroup(e: FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    await supabase.from('user_groups').insert({ name: newName.trim() })
    setNewName(''); setAdding(false)
    data.reload()
  }
  async function removeCourseMember(userId: string, courseId: string) {
    if (!window.confirm('Қатысушының қолжетімділігін жабасыз ба?')) return
    await supabase.rpc('remove_enrollment', { p_user: userId, p_course: courseId })
    syncUserToSheet(session?.access_token, userId)
    data.reload()
  }
  async function addGroupMember(group: UserGroup) {
    if (!pickUser) return
    await supabase.from('user_group_members').insert({ group_id: group.id, user_id: pickUser })
    setPickUser('')
    data.reload()
  }
  async function removeGroupMember(groupId: string, userId: string) {
    await supabase.from('user_group_members').delete().eq('group_id', groupId).eq('user_id', userId)
    data.reload()
  }
  async function deleteGroup(group: UserGroup) {
    if (!window.confirm(`«${group.name}» тобын өшіресіз бе?`)) return
    await supabase.from('user_groups').update({ deleted_at: new Date().toISOString() }).eq('id', group.id)
    setOpen(null)
    data.reload()
  }

  return (
    <>
      <div className="au-filters">
        <span className="muted small">Курс топтары: <b>{data.courses.length}</b></span>
        {adding ? (
          <form className="row" onSubmit={createGroup}>
            <input placeholder="Топ атауы (мысалы: Қыркүйек ағыны)" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button>Қосу</button>
            <button type="button" className="secondary" onClick={() => setAdding(false)}>Болдырмау</button>
          </form>
        ) : <button onClick={() => setAdding(true)}>+ Топ қосу</button>}
      </div>

      <div className="au-groups">
        {data.courses.map((c) => {
          const members = data.enrollments.filter((e) => e.course_id === c.id)
          const isOpen = open === c.id
          return (
            <div key={c.id} className="au-group">
              <button className="au-group-head secondary" onClick={() => setOpen(isOpen ? null : c.id)}>
                <b>{c.title}</b><span>{members.length} қатысушы {isOpen ? '⌃' : '⌄'}</span>
              </button>
              {isOpen && (
                <div className="au-group-body">
                  <button className="secondary" onClick={() => onAdd(c.id)}>+ Қатысушы қосу</button>
                  <table className="au-table">
                    <thead><tr><th>Аты</th><th>Пошта</th><th>Берілген</th><th>Мерзім</th><th /></tr></thead>
                    <tbody>
                      {members.map((e) => {
                        const p = byId.get(e.user_id)
                        return (
                          <tr key={e.id}>
                            <td onClick={() => onOpen(e.user_id)} style={{ cursor: 'pointer' }}><b>{p?.full_name || '—'}</b></td>
                            <td>{p?.email}</td>
                            <td className="small">{fmtDate(e.created_at)}</td>
                            <td className="small">{daysLeft(e.expires_at)}</td>
                            <td>
                              <button className="secondary" onClick={() => onOpen(e.user_id)}>Өзгерту</button>{' '}
                              <button className="danger" onClick={() => removeCourseMember(e.user_id, c.id)}>Жабу</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {members.length === 0 && <p className="muted small">Қатысушы жоқ.</p>}
                </div>
              )}
            </div>
          )
        })}

        {data.groups.map((g) => {
          const ids = data.members.filter((m) => m.group_id === g.id).map((m) => m.user_id)
          const isOpen = open === g.id
          return (
            <div key={g.id} className="au-group">
              <button className="au-group-head secondary" onClick={() => setOpen(isOpen ? null : g.id)}>
                <b>{g.name}</b><span>{ids.length} қатысушы {isOpen ? '⌃' : '⌄'}</span>
              </button>
              {isOpen && (
                <div className="au-group-body">
                  <div className="row">
                    <select value={pickUser} onChange={(e) => setPickUser(e.target.value)}>
                      <option value="">Қатысушыны таңдаңыз…</option>
                      {data.profiles.filter((p) => !ids.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email} ({p.email})</option>)}
                    </select>
                    <button className="secondary" onClick={() => addGroupMember(g)}>Қосу</button>
                    <button className="danger" onClick={() => deleteGroup(g)}>Топты өшіру</button>
                  </div>
                  <table className="au-table">
                    <tbody>
                      {ids.map((id) => (
                        <tr key={id}>
                          <td onClick={() => onOpen(id)} style={{ cursor: 'pointer' }}><b>{byId.get(id)?.full_name || '—'}</b></td>
                          <td>{byId.get(id)?.email}</td>
                          <td><button className="danger" onClick={() => removeGroupMember(g.id, id)}>Топтан шығару</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {ids.length === 0 && <p className="muted small">Қатысушы жоқ.</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

// Қолжетімділігі аяқталған немесе қолмен жабылған қатысушылар — топтар (курстар) бойынша,
// және толық жойылған (кіре алмайтын) пайдаланушылар — қалпына келтіруге болады
function DeletedTab({ data, isAdmin }: { data: UsersData; isAdmin: boolean }) {
  const { session } = useAuth()
  const byId = new Map(data.profiles.map((p) => [p.id, p]))
  const courses = data.courses.filter((c) => data.history.some((h) => h.course_id === c.id))
  const deactivated = data.profiles.filter((p) => p.deactivated_at)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [confirmPurge, setConfirmPurge] = useState(false)

  function toggle(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  function toggleAll() {
    setSelected((prev) => (prev.size === deactivated.length ? new Set() : new Set(deactivated.map((p) => p.id))))
  }
  async function restore(ids: string[]) {
    setBusy(true)
    const { ok, json } = await callApi('/api/admin-deactivate-user', session?.access_token, { userIds: ids, action: 'restore' })
    setBusy(false)
    if (!ok) return alert(json.error ?? 'Қате')
    setSelected(new Set())
    scheduleBackup()
    data.reload()
  }
  async function purge(ids: string[]) {
    setBusy(true)
    const { ok, json } = await callApi('/api/admin-deactivate-user', session?.access_token, { userIds: ids, action: 'purge' })
    setBusy(false)
    setConfirmPurge(false)
    if (!ok) return alert(json.error ?? 'Қате')
    setSelected(new Set())
    scheduleBackup()
    data.reload()
  }

  return (
    <>
      {isAdmin && (
        <div className="au-group" style={{ marginBottom: 18 }}>
          <div className="au-group-head"><b>Толық жойылған пайдаланушылар</b><span>{deactivated.length}</span></div>
          {deactivated.length === 0 ? (
            <p className="muted small" style={{ padding: '10px 4px' }}>Толық жойылған пайдаланушы жоқ.</p>
          ) : (
            <div className="au-table-wrap">
              {selected.size > 0 && (
                <div className="au-bulk-bar">
                  <span className="small"><b>{selected.size}</b> таңдалды</span>
                  {!confirmPurge ? (
                    <>
                      <button type="button" className="secondary btn-sm" disabled={busy} onClick={() => restore([...selected])}>{busy ? 'Қалпына келтірілуде…' : '↺ Қалпына келтіру'}</button>
                      <button type="button" className="danger btn-sm" disabled={busy} onClick={() => setConfirmPurge(true)}>⛔ Мәңгілікке өшіру</button>
                    </>
                  ) : (
                    <>
                      <span className="small" style={{ color: 'var(--danger)' }}>Барлық тарихы, төлемдері, жауаптары біржола өшеді. Қалпына келтіру мүмкін болмайды. Растайсыз ба?</span>
                      <button type="button" className="danger btn-sm" disabled={busy} onClick={() => purge([...selected])}>{busy ? 'Өшірілуде…' : 'Иә, мәңгілікке өшіру'}</button>
                      <button type="button" className="secondary btn-sm" onClick={() => setConfirmPurge(false)}>Жоқ</button>
                    </>
                  )}
                </div>
              )}
              <table className="au-table">
                <thead><tr><th><input type="checkbox" checked={deactivated.length > 0 && selected.size === deactivated.length} onChange={toggleAll} /></th><th>Аты</th><th>Пошта</th><th>Жойылған күні</th><th /></tr></thead>
                <tbody>
                  {deactivated.map((p) => (
                    <tr key={p.id}>
                      <td><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>
                      <td><b>{p.full_name || '—'}</b></td>
                      <td>{p.email}</td>
                      <td className="small">{fmtDateTime(p.deactivated_at)}</td>
                      <td className="actions">
                        <button className="secondary" disabled={busy} onClick={() => restore([p.id])}>↺ Қалпына келтіру</button>{' '}
                        <button className="danger" disabled={busy} onClick={() => { if (window.confirm(`«${p.full_name || p.email}» пайдаланушысын мәңгілікке өшіресіз бе? Тарихы, төлемдері, жауаптары қоса біржола жойылады.`)) purge([p.id]) }}>⛔ Мәңгілікке өшіру</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {courses.length === 0 && <p className="muted">Жойылғандар тізімі бос.</p>}
      {courses.map((c) => (
        <div key={c.id} className="au-group">
          <div className="au-group-head"><b>{c.title}</b><span>{data.history.filter((h) => h.course_id === c.id).length}</span></div>
          <div className="au-table-wrap">
            <table className="au-table">
              <thead><tr><th>Аты</th><th>Пошта</th><th>Қолжетімділік берілген</th><th>Аяқталған</th><th>Себебі</th></tr></thead>
              <tbody>
                {data.history.filter((h) => h.course_id === c.id).map((h) => (
                  <tr key={h.id}>
                    <td><b>{byId.get(h.user_id)?.full_name || '—'}</b></td>
                    <td>{byId.get(h.user_id)?.email}</td>
                    <td className="small">{fmtDate(h.granted_at)}{h.expires_at ? ` → ${fmtDate(h.expires_at)}` : ''}</td>
                    <td className="small">{fmtDateTime(h.ended_at)}</td>
                    <td className="small">{h.reason === 'expired' ? 'Мерзімі аяқталды' : 'Қолмен жабылды'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  )
}
