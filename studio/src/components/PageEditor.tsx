import { useState } from 'react'
import { useAuth } from '../lib/auth'
import EditDrawer, { type EditTab } from './EditDrawer'

// Беттің жоғарғы оң жағындағы «Өзгерту» батырмасы — тек әкімшіге көрінеді. Басқанда сол беттің мәтіндері,
// суреттері, батырма сілтемелері мен бейнелерін өңдейтін терезе ашылады.
export default function PageEditor({ title, tabs }: { title: string; tabs: EditTab[] }) {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  if (profile?.role !== 'admin') return null
  return (
    <>
      <div className="page-edit-bar">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>✎ Өзгерту</button>
      </div>
      {open && <EditDrawer title={title} tabs={tabs} onClose={() => setOpen(false)} />}
    </>
  )
}
