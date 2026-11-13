import type { CSSProperties } from 'react'
import { HEX_RE, inkFor } from './colorRamp'
import type { Category, Course, Lesson, ServiceCategory, SiteSettings } from './types'

// Цвет и подпись каждого направления — из дизайн-концепции «Бренд атауы».
export const CATEGORY: Record<ServiceCategory, { label: string; color: string; gradient: string; soft: string; icon: string }> = {
  debt: { label: 'Қарыз', color: '#3B6FE0', gradient: 'linear-gradient(135deg, #4C7FF0 0%, #26439E 100%)', soft: '#EAF0FE', icon: '↘' },
  savings: { label: 'Жинақ', color: '#B8860B', gradient: 'linear-gradient(135deg, #E3AE3A 0%, #9C6B12 100%)', soft: '#FBF3E1', icon: '◈' },
  house: { label: 'Үй', color: '#6E4FE0', gradient: 'linear-gradient(135deg, #8B6EF0 0%, #4B2FA8 100%)', soft: '#F0ECFD', icon: '⌂' },
  mortgage_pro: { label: 'Ипотека PRO', color: '#1E7A4C', gradient: 'linear-gradient(135deg, #2E9C64 0%, #0F4A2C 100%)', soft: '#E4F3EA', icon: '◆' },
  review: { label: 'Разбор', color: '#3B6FE0', gradient: 'linear-gradient(135deg, #4C7FF0 0%, #26439E 100%)', soft: '#EAF0FE', icon: '◎' },
  premium: { label: 'Premium', color: '#B8860B', gradient: 'linear-gradient(135deg, #D9A63A 0%, #8A5A12 100%)', soft: '#FBF3E1', icon: '✦' },
}

// «Тегін консультация алу» батырмаларының WhatsApp сілтемесі
export const CONSULTATION_URL = 'https://wa.clck.bar/7XXXXXXXXXX?text=%D0%A2%D0%B5%D0%B3%D1%96%D0%BD%20%D0%BA%D0%BE%D0%BD%D1%81%D1%83%D0%BB%D1%8C%D1%82%D0%B0%D1%86%D0%B8%D1%8F%20%D0%B0%D0%BB%D2%93%D1%8B%D0%BC%20%D0%BA%D0%B5%D0%BB%D0%B5%D0%B4%D1%96...'

// «Профиль» бетіндегі «Техникалық қолдауға жазу» батырмасының WhatsApp сілтемесі
export const SUPPORT_CONTACT_URL = 'https://wa.clck.bar/7XXXXXXXXXX?text=' + encodeURIComponent('Техникалық қолдау сұрайын')

export const CATEGORY_ORDER: Category[] = ['debt', 'savings', 'house', 'mortgage_pro']

// Әкімші курс мұқабасына таңдайтын түстер. Таңдалмаса — бағыттың (категорияның) түсі қолданылады.
export const COURSE_COLORS: Record<string, { label: string; color: string; gradient: string; soft: string }> = {
  // Платформа алғашында барлық курс ішіндегі бетте болған стандартты (жалғыз) түс — жаңа палитрада да бірінші тұрады
  classic: { label: 'Классикалық жасыл', color: '#155e54', gradient: 'linear-gradient(135deg, #1f8577 0%, #0c3f44 100%)', soft: '#E4F3EA' },
  blue: { label: 'Көк', color: '#3B6FE0', gradient: 'linear-gradient(135deg, #4C7FF0 0%, #26439E 100%)', soft: '#EAF0FE' },
  gold: { label: 'Алтын', color: '#B8860B', gradient: 'linear-gradient(135deg, #E3AE3A 0%, #9C6B12 100%)', soft: '#FBF3E1' },
  purple: { label: 'Күлгін', color: '#6E4FE0', gradient: 'linear-gradient(135deg, #8B6EF0 0%, #4B2FA8 100%)', soft: '#F0ECFD' },
  green: { label: 'Жасыл', color: '#1E7A4C', gradient: 'linear-gradient(135deg, #2E9C64 0%, #0F4A2C 100%)', soft: '#E4F3EA' },
  rose: { label: 'Қызғылт', color: '#D14B7A', gradient: 'linear-gradient(135deg, #E56B96 0%, #97294F 100%)', soft: '#FCEAF1' },
  teal: { label: 'Көгілдір', color: '#0E8C8C', gradient: 'linear-gradient(135deg, #2CB5B0 0%, #0B5F63 100%)', soft: '#E2F5F4' },
  graphite: { label: 'Графит', color: '#3A3F45', gradient: 'linear-gradient(135deg, #5A6067 0%, #23272B 100%)', soft: '#ECEEF0' },
}

// «Курсты алу» батырмасы қайда апарады: әкімші «Ақылы курстар» бетінде қойған сілтеме (buy_url), болмаса —
// КП беті (Қарызсыз өмір / Ипотека PRO), болмаса — ескі order_url (WhatsApp). Ешқайсысы жоқ болса — null.
export const DEFAULT_KP_LINK: Partial<Record<Category, string>> = {
  debt: '/offer/karyzsyz-omir',
  mortgage_pro: '/offer/ipoteka-pro',
}
export function courseBuyLink(course: Pick<Course, 'category' | 'buy_url' | 'order_url'>): string | null {
  return course.buy_url || DEFAULT_KP_LINK[course.category] || course.order_url || null
}

export function courseTheme(course: Pick<Course, 'category' | 'color'>) {
  const base = CATEGORY[course.category]
  const override = course.color ? COURSE_COLORS[course.color] : undefined
  return override ? { ...base, ...override } : base
}

// Курс картасының үстіңгі жолағы: әкімші өз фотосын қойса — фото (үстінде қараңғы градиент, мәтін оқылуы үшін),
// әйтпесе түс градиенті.
// Курс ішіндегі бет (CoursePage) үшін: артқы фон таңдаулары. «Фото» — жеке (bg_image_url немесе стандартты
// ақша суреті), қалғаны — түс/градиент. Ақ пен қараны осында ғана қолданамыз (модуль/батырма акцентіне —
// COURSE_COLORS-тың 7 түсі, себебі олардың бәрінде ақ мәтін оқылады, ал ақ/қара фонда оқылмай қалуы мүмкін).
export const PAGE_BG_PRESETS: Record<string, { label: string; css: string }> = {
  white: { label: 'Ақ', css: '#f6f4ee' },
  black: { label: 'Қара', css: '#111113' },
  ...Object.fromEntries(Object.entries(COURSE_COLORS).map(([key, c]) => [key, { label: c.label, css: c.gradient }])),
}

// «money» — курс жасалғаннан бергі стандартты ақша фотосы, өзіңіз жүктеген фото болса да (bg_image_url)
// оны елемей, әрдайым осы стандартты суретті көрсетеді (ештеңе өшірілмейді, тек уақытша қайтарады).
export function coursePageBackground(course: Pick<Course, 'page_bg' | 'bg_image_url'>): string {
  const key = course.page_bg
  const ownPhoto = `url(${course.bg_image_url || '/images/course-bg-money.jpg'}) center top / cover fixed no-repeat`
  if (!key) return ownPhoto
  if (key === 'money') return `url(/images/course-bg-money.jpg) center top / cover fixed no-repeat`
  if (HEX_RE.test(key)) return `${key} fixed`
  const preset = PAGE_BG_PRESETS[key]
  return preset ? `${preset.css} fixed` : ownPhoto
}

// Модуль карточкалары мен батырмалардың акценті: card_color қойылса — сол түс (фон қандай болса да бөлек,
// 7 дайын түстің бірі немесе кез келген hex түс болуы мүмкін), әйтпесе курстың өз түсі/бағыты (courseTheme).
// `ink` — осы акцент үстіндегі мәтін түсі (ашық фонда қара, қараңғыда ақ — автоматты анықталады).
// Курс ішіндегі беттің әдепкі (ешкім өзгертпеген) түсі — платформа алғашында барлық курста көрсеткен түс
const CLASSIC_ACCENT = COURSE_COLORS.classic

function resolveAccent(key: string | null | undefined): { gradient: string; solid: string; ink: string } {
  if (key && HEX_RE.test(key)) return { gradient: key, solid: key, ink: inkFor(key) }
  if (key && COURSE_COLORS[key]) { const c = COURSE_COLORS[key]; return { gradient: c.gradient, solid: c.color, ink: inkFor(c.color) } }
  return { gradient: CLASSIC_ACCENT.gradient, solid: CLASSIC_ACCENT.color, ink: inkFor(CLASSIC_ACCENT.color) }
}

export function courseCardAccent(course: Pick<Course, 'card_color'>): { gradient: string; solid: string; ink: string } {
  return resolveAccent(course.card_color)
}

// Курс тақырыбы (фото жоқ болғанда көрінетін жасыл жолақ) — модуль/батырма түсінен бөлек, өз алдына таңдалады
export function courseTitleAccent(course: Pick<Course, 'title_color'>): { gradient: string; solid: string; ink: string } {
  return resolveAccent(course.title_color)
}

// «ТОП-30» рейтинг картасының тақырып жазуы: бос болса — бұрыннан келе жатқан алтын түс (фон
// қандай болса да жақсы көрінеді), әйтпесе әкімші таңдаған кез келген түс.
export const DEFAULT_RATING_INK = '#f0cf78'
export function ratingInk(course: Pick<Course, 'rating_ink'>): string {
  return course.rating_ink && HEX_RE.test(course.rating_ink) ? course.rating_ink : DEFAULT_RATING_INK
}

export function courseBannerStyle(course: Pick<Course, 'category' | 'color' | 'card_image_url'>): CSSProperties {
  const theme = courseTheme(course)
  if (course.card_image_url) {
    return {
      background: `linear-gradient(180deg, rgba(8,20,30,0.30) 0%, rgba(8,20,30,0.68) 100%), url("${course.card_image_url}") center / cover no-repeat`,
    }
  }
  return { background: theme.gradient }
}

// Курста нағыз модульдер бар ма (CoursePage-тегі модуль-карталарын көрсету керек пе) —
// бірнеше топ болса, немесе бір топ болып, оның атауы бос болмаса.
export function hasRealModules(lessons: Lesson[]): boolean {
  const titles = new Set(lessons.map((l) => l.module_title || ''))
  return titles.size > 1 || (titles.size === 1 && !titles.has(''))
}

// Тексты — слово в слово из «МАРЖАН ХАНЫМНЫҢ ПЛАТФОРМАСЫНА ДАЙЫН МӘТІНДЕР».
// Админ может переопределить часть из них в разделе «Сайт баптаулары».
// Массивы (about_more_list және т.б.) бөлек өңделеді (төмендегі withList функциясын қараңыз).
type ListKey = 'about_more_list' | 'free_outro_list' | 'company_list' | 'cases_list'
// school_id — сыртқы кілт, форма арқылы емес, бөлек басқарылады (useSiteSettingsForm.ts)
type ScalarSettings = Omit<SiteSettings, ListKey | 'school_id'>

export const DEFAULT_SETTINGS: Record<keyof ScalarSettings, string> = {
  expert_name: 'Эксперт Аты-жөні',
  expert_role: 'Қаржыгер • Ипотека және үй алу маманы',
  hero_title: 'Қарыздан шығып, ақша жинап, өз баспанаңызды алуға көмектесемін',
  hero_subtitle:
    'Қаржылық жағдайыңызды талдап, мақсатыңызға сай нақты стратегия құрамыз. Қарыздан шығудан бастап, ипотека рәсімдеп, баспана алғанға дейін сізді сүйемелдейміз.',
  hero_photo_url: '/images/expert-hero.jpg',
  // Короткое вступление — видно всегда, без прокрутки
  about_text:
    'Мен — Эксперт, қаржыгер, ипотека және баспана алу маманымын.\n\nМенің жұмысым — сізге банк немесе ипотекалық бағдарлама ұсынып қою емес. Алдымен сіздің табысыңызды, шығындарыңызды, қарыздарыңызды, жинағыңызды және мақсатыңызды талдаймын.\n\nСодан кейін қазіргі жағдайыңыздан қалаған нәтижеңізге дейінгі нақты қаржылық стратегия құрамын.\n\nСіз қарыздан шыққыңыз келе ме, ақша жинағыңыз келе ме, үй алғыңыз келе ме немесе ипотека саласында маман болғыңыз келе ме — платформада әр мақсатқа арналған дайын шешім бар.',
  // Оқиға — «Толығырақ» батырмасының астында, тізіммен бірге
  about_more_text:
    'ЗАПОЛНИТЬ: история эксперта своими словами.',
  stat1_value: 'ЗАПОЛНИТЬ', stat1_label: 'ЗАПОЛНИТЬ',
  stat2_value: 'ЗАПОЛНИТЬ', stat2_label: 'ЗАПОЛНИТЬ',
  stat3_value: 'ЗАПОЛНИТЬ', stat3_label: 'ЗАПОЛНИТЬ',
  stat4_value: 'ЗАПОЛНИТЬ', stat4_label: 'ЗАПОЛНИТЬ',

  goal1_title: 'Қарыздан шыққым келеді',
  goal1_text: 'Қарыздарыңызды жүйелеп, төлем жүктемесін азайтып, қарызсыз өмірге шығудың нақты жоспарын құрыңыз.',
  goal2_title: 'Ақша жинағым келеді',
  goal2_text: 'Табысыңызға сай бюджет құрып, ақшаны дұрыс басқарып, нақты мақсатыңызға жинауды бастаңыз.',
  goal3_title: 'Үй алғым келеді',
  goal3_text: 'Қазіргі жағдайыңыздан баспана алуға дейінгі жол картасын құрып, алғашқы жарна мен ипотекалық мүмкіндігіңізді анықтаңыз.',
  goal4_title: 'Ипотека маманы болғым келеді',
  goal4_text: 'Ипотекалық бағдарламаларды меңгеріп, клиенттерге баспана алуға көмектесетін табысты маман болыңыз.',

  final_cta_title: 'Қай бағыттан бастау керегін білмейсіз бе?',
  final_cta_text: 'Тегін консультацияға жазылыңыз. Мамандар сіздің қазіргі жағдайыңызды анықтап, мақсатыңызға сай курс немесе қызмет ұсынады.',
  final_cta_label: 'Тегін консультация алу',

  free_eyebrow: 'ТЕГІН БАСТАУ',
  free_title: 'Алғашқы қадамыңызды тегін жасаңыз',
  free_text: 'Алдымен сабақтарды көріп, дайын құралдарды жүктеп алыңыз. Содан кейін мақсатыңызға сәйкес бағытты таңдаңыз.',
  free_step1_title: 'Тегін сабақтарды көріңіз',
  free_step1_text: 'Қарыз, жинақ, ипотека және үй алу бойынша негізгі сұрақтарға жауап алыңыз.',
  free_step2_title: 'Дайын құралдарды қолданыңыз',
  free_step2_text: 'Чек-листтер мен кестелерді толтырып, қазіргі жағдайыңызды анықтаңыз.',
  free_step3_title: 'Келесі қадамды таңдаңыз',
  free_step3_text: 'Өзіңіз жалғастырыңыз немесе тегін консультацияға жазылыңыз.',
  free_outro: 'Платформада Экспертның қарыз, ақша жинау, ипотека және баспана алу бойынша 10-нан астам тегін сабағы бар.',
  free_materials_title: 'Дайын құралдарды тегін алыңыз',
  free_materials_text: 'Экспертның жұмыс барысында қолданатын пайдалы материалдарын жүктеп алыңыз:',
  free_materials_cta: 'Тегін материал алу',

  company_eyebrow: '«Brand» КОМПАНИЯСЫ',
  company_title: 'Сіздің баспана алуыңызды толық сүйемелдейтін команда',
  company_text: '«Brand» — Экспертның методикасы бойынша ипотека және үй алу қызметін жүргізетін компания.',
  company_list_intro: 'Компания командасы:',

  cases_eyebrow: 'КЕЙСТЕР',
  cases_title: 'Біздің клиенттердің нәтижелері',
  cases_text: 'Әр клиенттің бастапқы жағдайы мен мақсаты әртүрлі. Бірақ дұрыс құрылған стратегия, жүйелі әрекет және кәсіби сүйемелдеу оларды нәтижеге жеткізді.',
  cases_list_intro: 'Бұл бөлімде:',
  cases_cta: 'Кейстерді көру',
  // «Профиль» беті — бастапқы мәндер: сайт іске қосылған сәттен-ақ барлық төлеген клиентке
  // автоматты көрінеді, әкімші кез келген уақытта «Профиль» бетінен өзгерте алады.
  curator_name: 'Эксперт Аты-жөні',
  curator_hours: 'Дс–Жм, 09:00–18:00',
  curator_contact_url: CONSULTATION_URL,
  support_contact_url: CONSULTATION_URL,
  legal_agreement_url: '/privacy',

  // Басты бет: батырмалар (сілтеме — ішкі «/courses» немесе сыртқы «https://…») және бөлім тақырыптары
  hero_btn1_label: 'Тегін консультация алу →', hero_btn1_url: CONSULTATION_URL,
  hero_btn2_label: 'Курстарды көру', hero_btn2_url: '/courses',
  hero_btn3_label: 'Қызмет таңдау', hero_btn3_url: '/services',
  goals_eyebrow: 'ҚАЙ НӘТИЖЕГЕ ЖЕТКІҢІЗ КЕЛЕДІ?',
  goals_title: 'Саған не қажет?',
  goals_text: 'Мақсатыңды таңда — дұрыс бағыт ұсынамыз',
  goal_link_label: 'Шешімді көру →',
  about_eyebrow: 'МАРЖАН ХАНЫМ ТУРАЛЫ',
  about_title: 'Эксперт Аты-жөні',
  about_toggle_label: 'Эксперт туралы толығырақ',
  free_home_button_label: 'Барлық тегін сабақтарды көру →',
  news_eyebrow: 'ЖАҢАЛЫҚТАР',
  news_title: 'Соңғы жаңалықтар',
  final_cta_url: CONSULTATION_URL,
  // Қызметтер беті
  services_eyebrow: 'ҚЫЗМЕТТЕР',
  services_title: 'Жеке жағдайыңызға сай қызметті таңдаңыз',
  services_text: 'Қаржылық разбордан бастап, үй алғанға дейінгі толық сопровождение.',
  cases_cta_url: '#services-list',
  // Тегін сабақтар беті
  free_materials_url: '/services',
}

// Тізім — «Толығырақ» батырмасының астында, «Эксперт Аты-жөні» атауымен бірге
export const DEFAULT_ABOUT_MORE_LIST = [
  'ЗАПОЛНИТЬ: факт об эксперте',
  'ЗАПОЛНИТЬ: факт об эксперте',
  'ЗАПОЛНИТЬ: факт об эксперте',
  'ЗАПОЛНИТЬ: факт об эксперте',
  'ЗАПОЛНИТЬ: факт об эксперте',
  'ЗАПОЛНИТЬ: факт об эксперте',
]

// Тізім-өрістердің әдепкі мәндері — бос болса, осылар көрсетіледі (about_more_list сияқты).
export const DEFAULT_FREE_OUTRO_LIST = [
  'қарыздан шығуды неден бастау керегін',
  'бюджетті қалай жүргізуді',
  'ақша жинауға не кедергі екенін',
  'алғашқы жарнаны қалай жинауды',
  'ипотекаға қалай дайындалуды',
  'үй аларда қандай қателер жібермеу керегін білесіз',
]

export const DEFAULT_COMPANY_LIST = [
  'өтініміңізді қабылдайды',
  'алғашқы консультация өткізеді',
  'қаржылық жағдайыңызды талдайды',
  'ипотекалық бағдарлама таңдауға көмектеседі',
  'құжаттарды дайындау процесін жүргізеді',
  'банкке өтінім беруді сүйемелдейді',
  'баспана рәсімдеуге дейін жаныңызда болады',
]

export const DEFAULT_CASES_LIST = [
  'қарыздан шыққан',
  'ақша жинаған',
  'алғашқы жарнасын қалыптастырған',
  'ипотека рәсімдеген',
  'өз баспанасын алған',
  'ипотека маманы болған клиенттердің нәтижелері көрсетіледі',
]

function withList(list: string[] | null | undefined, fallback: string[]): string[] {
  return list && list.length > 0 ? list : fallback
}

export function withAboutMoreList(list: string[] | null | undefined): string[] {
  return withList(list, DEFAULT_ABOUT_MORE_LIST)
}
export function withFreeOutroList(list: string[] | null | undefined): string[] {
  return withList(list, DEFAULT_FREE_OUTRO_LIST)
}
export function withCompanyList(list: string[] | null | undefined): string[] {
  return withList(list, DEFAULT_COMPANY_LIST)
}
export function withCasesList(list: string[] | null | undefined): string[] {
  return withList(list, DEFAULT_CASES_LIST)
}

// Мақсат картасының тұрақты бағыты — 4 негізгі бағытқа сай (реті өзгермейді, тек мәтін өңделеді).
const GOAL_CATEGORIES: Category[] = ['debt', 'savings', 'house', 'mortgage_pro']

// «Саған не қажет?» блогының 4 картасы — тақырып/мәтінді settings-тен алады, бағыты тұрақты.
export function buildGoals(settings: Record<keyof ScalarSettings, string>) {
  return GOAL_CATEGORIES.map((category, i) => ({
    category,
    title: settings[`goal${i + 1}_title` as keyof ScalarSettings],
    text: settings[`goal${i + 1}_text` as keyof ScalarSettings],
  }))
}

// «Тегін сабақтар» беттің 3 қадамы — нөмірі тұрақты, тақырып/мәтінді settings-тен алады.
export function buildFreeSteps(settings: Record<keyof ScalarSettings, string>) {
  return [1, 2, 3].map((n) => ({
    n: String(n).padStart(2, '0'),
    title: settings[`free_step${n}_title` as keyof ScalarSettings],
    text: settings[`free_step${n}_text` as keyof ScalarSettings],
  }))
}

export function formatKzt(value: number | null | undefined) {
  return value == null ? '' : `${value.toLocaleString('ru-RU')} ₸`
}

export function withDefaults(settings: Partial<SiteSettings> | null): Record<keyof ScalarSettings, string> {
  const s = settings ?? {}
  const out = { ...DEFAULT_SETTINGS }
  for (const key of Object.keys(out) as (keyof ScalarSettings)[]) {
    const v = s[key]
    if (v) out[key] = v
  }
  return out
}
