import type { ReactElement } from 'react'
import AdminAnswerFeed from './AdminAnswerFeed'
import AdminCuratorMemory from './AdminCuratorMemory'
import AdminInbox from './AdminInbox'
import AdminNews from './AdminNews'
import AdminCourses from './AdminCourses'
import AdminServices from './AdminServices'
import AdminUsers from './AdminUsers'
import AdminPayments from './AdminPayments'
import AdminStats from './AdminStats'
import AdminSettings from './AdminSettings'
import AdminSettingsFree from './AdminSettingsFree'
import AdminSettingsServices from './AdminSettingsServices'
import AdminCrm from './AdminCrm'
import AdminApps from './AdminApps'
import AdminBroadcast from './AdminBroadcast'
import AdminTraffic from './AdminTraffic'
import AdminSchoolSettings from './AdminSchoolSettings'

// GetCourse-тегі сол жақ рельс құрылымы (ЭТАП_01) — бөлім (иконка) → flyout-тегі беттер.
// Бір жерден: Admin.tsx (рельс+flyout) және CommandPalette.tsx (Cmd/Ctrl+K іздеу) осыны пайдаланады.
//
// Рөлдер: `staff: true` — бөлімді әкімші де, куратор да көреді; әдепкіде — тек әкімші.
// Куратор: «Пайдаланушылар» (қолжетімділік ашу) және «Тапсырмалар» (оқушыларға жауап беру) — басқасы жабық.
export const SECTIONS = [
  {
    id: 'users', label: 'Пайдаланушылар', icon: '👥', staff: true,
    items: [
      { id: 'users', label: 'Пайдаланушылар', Component: AdminUsers, staff: true },
      { id: 'stats', label: 'Статистика', Component: AdminStats, staff: false },
    ],
  },
  {
    id: 'assignments', label: 'Тапсырмалар', icon: '📝', staff: true,
    items: [{ id: 'answers', label: 'Оқушы тапсырмалары', Component: AdminAnswerFeed, staff: true }],
  },
  {
    id: 'site', label: 'Сайт', icon: '🌐',
    items: [
      { id: 'settings', label: 'Басты бет', Component: AdminSettings },
      { id: 'free', label: 'Тегін сабақтар', Component: AdminSettingsFree },
      { id: 'services-page', label: 'Қызметтер беті', Component: AdminSettingsServices },
      { id: 'traffic', label: 'Трафик', Component: AdminTraffic },
      { id: 'school', label: 'Мектеп баптаулары', Component: AdminSchoolSettings },
    ],
  },
  {
    id: 'learning', label: 'Оқыту', icon: '📚',
    items: [
      { id: 'courses', label: 'Тренингтер', Component: AdminCourses },
      { id: 'services', label: 'Қызметтер', Component: AdminServices },
      { id: 'curator', label: 'AI-куратор жады', Component: AdminCuratorMemory },
    ],
  },
  {
    id: 'crm', label: 'CRM', icon: '✅',
    items: [{ id: 'crm', label: 'Тапсырмалар мен воронка', Component: AdminCrm }],
  },
  {
    id: 'messages', label: 'Хабарлар', icon: '✉️',
    items: [
      { id: 'inbox', label: 'Кіріс', Component: AdminInbox },
      { id: 'broadcast', label: 'Email тарату', Component: AdminBroadcast },
      { id: 'news', label: 'Жаңалықтар', Component: AdminNews },
    ],
  },
  {
    id: 'sales', label: 'Сатылым', icon: '💳',
    items: [{ id: 'payments', label: 'Төлемдер', Component: AdminPayments }],
  },
  {
    id: 'apps', label: 'Apps', icon: '📱',
    items: [{ id: 'apps', label: 'Қосымша', Component: AdminApps }],
  },
] as readonly Section[]

type Section = {
  id: string; label: string; icon: string; staff?: boolean
  items: readonly { id: string; label: string; Component: () => ReactElement; staff?: boolean }[]
}

// Рөлге сай бөлімдер/беттер: куратор тек `staff: true` белгіленгенді көреді
export function sectionsFor(role: string | undefined): Section[] {
  if (role === 'admin') return [...SECTIONS]
  return SECTIONS.filter((s) => s.staff).map((s) => ({ ...s, items: s.items.filter((i) => i.staff) }))
}

export const FLAT = SECTIONS.flatMap((s) => s.items.map((i) => ({ sectionId: s.id, sectionLabel: s.label, ...i })))
