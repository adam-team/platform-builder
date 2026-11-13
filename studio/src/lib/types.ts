export type Role = 'free' | 'paid' | 'curator' | 'admin'
export type Category = 'debt' | 'savings' | 'house' | 'mortgage_pro'
export type ServiceCategory = Category | 'review' | 'premium'

export interface School {
  id: string
  name: string
  niche: string | null
  country: string | null
  languages: string[]
  default_currency: string
  timezone: string
  brand_color: string
  terms: { course: string; module: string; student: string }
  payment_providers: string[]
  messengers: string[]
  video_provider: string | null
  subdomain: string | null
  custom_domain: string | null
  logo_url: string | null
  tariff: string
  storage_limit_gb: number
  created_at: string
}

// <SegmentBuilder> v1 — тек «ЖӘНЕ» логикасы, шектеулі өріс жиыны (рөл/тег/курсқа қолжетімділік)
export type SegmentCondition =
  | { field: 'role'; op: 'eq'; value: Role }
  | { field: 'tag'; op: 'has'; value: string }
  | { field: 'course_access'; op: 'has' | 'not_has'; value: string }

export interface Segment {
  id: string
  school_id: string
  name: string
  entity: string
  conditions: SegmentCondition[]
  created_at: string
}

export interface UserGroup {
  id: string
  school_id: string
  name: string
  deleted_at: string | null
  created_at: string
  member_count?: number
}

export type EmployeeRoleName = 'teacher' | 'curator' | 'sales_manager' | 'content_manager' | 'administrator'

export interface EmployeeRole {
  id: string
  school_id: string
  user_id: string
  role: EmployeeRoleName
  scope: { course_ids?: string[] }
  created_at: string
}

export interface AuditLogEntry {
  id: string
  school_id: string
  actor_id: string | null
  entity_type: string
  entity_id: string
  action: 'create' | 'update' | 'delete' | 'restore'
  diff: Record<string, { from: unknown; to: unknown }>
  created_at: string
  profiles?: { full_name: string | null; email: string } | null
}

export interface Profile {
  id: string
  school_id: string
  email: string
  full_name: string | null
  phone: string | null
  role: Role
  tags: string[]
  password_changed_at?: string | null
  deactivated_at?: string | null
  created_at: string
}

export interface Course {
  id: string
  school_id: string
  title: string
  description: string | null
  features_intro: string | null
  features: string[]
  category: Category
  price_kzt: number | null
  old_price_kzt: number | null
  offline_price_kzt: number | null
  color: string | null
  card_image_url: string | null
  cover_image_url: string | null
  bg_image_url: string | null
  page_bg: string | null
  card_color: string | null
  rating_ink: string | null
  title_color: string | null
  whatsapp_url: string | null
  telegram_url: string | null
  top30_url: string | null
  top30_title: string | null
  chats: CourseChat[]
  payment_url: string | null
  order_url: string | null
  buy_url: string | null
  is_published: boolean
  position: number
  deleted_at: string | null
  tags: string[]
}

// icon: 'whatsapp' | 'telegram' | 'group' (бос болса — сілтемеден автоматты анықталады); icon_url — өз фотосы
export interface CourseChat {
  title: string
  url: string
  icon?: 'whatsapp' | 'telegram' | 'group'
  icon_url?: string
}

export interface CourseModule {
  id: string
  course_id: string
  position: number
  number_label: string | null
  title: string
  subtitle: string | null
  is_locked: boolean
  opens_at: string | null
}

export interface CourseEvent {
  id: string
  course_id: string
  title: string
  starts_at: string
  link: string | null
}

export interface Lesson {
  id: string
  course_id: string
  module_title: string | null
  module_id: string | null
  is_locked: boolean
  opens_at: string | null
  title: string
  position: number
  is_free_preview: boolean
  is_stop_lesson: boolean
  deleted_at: string | null
}

export interface Material {
  title: string
  url: string
  kind: string
}

export interface Timecode {
  time: string
  label: string
}

export interface LessonContent {
  lesson_id: string
  youtube_id: string | null
  body: string | null
  materials: Material[]
  timecodes: Timecode[]
  outcomes: string[]
  presentation_url: string | null
  notes_url: string | null
  duration_minutes: number | null
  assignment_text: string | null
}

export type AnswerStatus = 'pending' | 'needs_revision' | 'accepted' | 'no_review_needed'

export interface LessonAnswer {
  id: string
  lesson_id: string
  user_id: string
  body: string
  reviewed: boolean
  status: AnswerStatus
  created_at: string
  attachments?: Attachment[]
  profiles?: { full_name: string | null; email: string } | null
}

// Тапсырмаға тіркелген фото/файл: `path` — жеке қоймадағы (answer-files) жол
export interface Attachment {
  path: string
  name: string
  kind: 'image' | 'file'
}

export interface Pipeline {
  id: string
  school_id: string
  name: string
  position: number
  created_at: string
}

export interface PipelineStage {
  id: string
  pipeline_id: string
  name: string
  color: string
  stage_type: 'normal' | 'success' | 'fail'
  position: number
}

export interface Deal {
  id: string
  school_id: string
  pipeline_id: string
  stage_id: string
  user_id: string | null
  title: string
  amount_kzt: number | null
  manager_id: string | null
  lost_reason: string | null
  created_at: string
  updated_at: string
  profiles?: { full_name: string | null; email: string } | null
}

export type TaskStatus = 'new' | 'in_progress' | 'done'

export interface CrmTask {
  id: string
  school_id: string
  title: string
  due_at: string | null
  status: TaskStatus
  manager_id: string | null
  deal_id: string | null
  user_id: string | null
  result: string | null
  created_at: string
}

export interface Notification {
  id: string
  school_id: string
  user_id: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

export interface Broadcast {
  id: string
  school_id: string
  subject: string
  body: string
  recipient_count: number
  created_by: string | null
  sent_at: string
}

export interface ReplyTemplate {
  id: string
  school_id: string
  title: string
  body: string
  created_at: string
}

export interface AnswerReply {
  id: string
  answer_id: string
  author_id: string
  body: string
  created_at: string
  attachments?: Attachment[]
  youtube_id?: string | null
  profiles?: { full_name: string | null; email: string; role: Role } | null
}

export interface SupportMessage {
  id: string
  user_id: string
  author_id: string
  body: string
  created_at: string
  profiles?: { full_name: string | null; email: string; role: Role } | null
}

export interface News {
  id: string
  school_id: string
  title: string
  body: string | null
  is_published: boolean
  created_at: string
}

export interface Service {
  id: string
  school_id: string
  title: string
  description: string | null
  features_intro: string | null
  features: string[]
  category: ServiceCategory
  price_kzt: number | null
  cta_label: string
  payment_url: string | null
  is_published: boolean
  position: number
}

export interface Payment {
  id: string
  user_id: string
  course_id: string
  amount_kzt: number | null
  status: 'pending' | 'paid' | 'failed'
  created_at: string
}

export interface SiteSettings {
  school_id: string
  expert_name: string | null
  expert_role: string | null
  hero_title: string | null
  hero_subtitle: string | null
  hero_photo_url: string | null
  about_text: string | null
  about_more_list: string[] | null
  about_more_text: string | null
  stat1_value: string | null; stat1_label: string | null
  stat2_value: string | null; stat2_label: string | null
  stat3_value: string | null; stat3_label: string | null
  stat4_value: string | null; stat4_label: string | null
  // Басты беттегі 4 мақсат картасы (Қарыз/Жинақ/Үй/Ипотека PRO бағыттарына сай, реті тұрақты)
  goal1_title: string | null; goal1_text: string | null
  goal2_title: string | null; goal2_text: string | null
  goal3_title: string | null; goal3_text: string | null
  goal4_title: string | null; goal4_text: string | null
  // Басты беттің төменіндегі финалды шақыру
  final_cta_title: string | null
  final_cta_text: string | null
  final_cta_label: string | null
  // «Тегін сабақтар» беті
  free_eyebrow: string | null
  free_title: string | null
  free_text: string | null
  free_step1_title: string | null; free_step1_text: string | null
  free_step2_title: string | null; free_step2_text: string | null
  free_step3_title: string | null; free_step3_text: string | null
  free_outro: string | null
  free_outro_list: string[] | null
  free_materials_title: string | null
  free_materials_text: string | null
  free_materials_cta: string | null
  // «Қызметтер» беті
  company_eyebrow: string | null
  company_title: string | null
  company_text: string | null
  company_list_intro: string | null
  company_list: string[] | null
  cases_eyebrow: string | null
  cases_title: string | null
  cases_text: string | null
  cases_list_intro: string | null
  cases_list: string[] | null
  cases_cta: string | null
  // «Профиль» бетіндегі куратор мен қолдау (бір ғана жалпы куратор, барлық төлеген клиентке ортақ)
  curator_name: string | null
  curator_hours: string | null
  curator_contact_url: string | null
  support_contact_url: string | null
  legal_agreement_url: string | null
  // Басты беттегі батырмалар мен бөлім тақырыптары (әкімші «Өзгерту» арқылы өңдейді)
  hero_btn1_label: string | null; hero_btn1_url: string | null
  hero_btn2_label: string | null; hero_btn2_url: string | null
  hero_btn3_label: string | null; hero_btn3_url: string | null
  goals_eyebrow: string | null; goals_title: string | null; goals_text: string | null
  goal_link_label: string | null
  about_eyebrow: string | null; about_title: string | null; about_toggle_label: string | null
  free_home_button_label: string | null
  news_eyebrow: string | null; news_title: string | null
  final_cta_url: string | null
  services_eyebrow: string | null; services_title: string | null; services_text: string | null
  cases_cta_url: string | null
  free_materials_url: string | null
}

// «Тегін сабақтар» — әкімші қосатын видео-сабақтар (Басты бет пен /free-lessons беті)
export interface FreeLesson {
  id: string
  school_id: string
  title: string
  category: Category
  youtube_id: string | null
  position: number
  show_on_home: boolean
  is_published: boolean
  created_at: string
}
