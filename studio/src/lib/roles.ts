import type { Role } from './types'

// Әкімші және куратор — «команда» (қызметкерлер). Куратор тек пайдаланушыларға қолжетімділік ашады
// және оқушылардың тапсырмаларына жауап береді; сайт мазмұнын өзгерту, өшіру — тек әкімші.
export const isStaff = (role: Role | undefined | null) => role === 'admin' || role === 'curator'
export const isAdminRole = (role: Role | undefined | null) => role === 'admin'
// Ақылы бөлімдерді көре алатындар (төлеген клиент, куратор, әкімші)
export const isPaidOrStaff = (role: Role | undefined | null) => role === 'paid' || isStaff(role)

export const ROLE_LABEL: Record<Role, string> = { free: 'Қонақ', paid: 'Төлеген', curator: 'Куратор', admin: 'Әкімші' }
