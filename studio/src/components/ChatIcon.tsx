import type { CourseChat } from '../lib/types'

export type ChatIconKind = NonNullable<CourseChat['icon']>
export const CHAT_ICON_LABEL: Record<ChatIconKind, string> = { whatsapp: 'WhatsApp', telegram: 'Telegram', group: 'Топ' }

// Иконка таңдалмаса — сілтеме/атаудан анықтаймыз (wa.me → WhatsApp, t.me → Telegram, қалғаны — топ)
export function detectIcon(chat: Pick<CourseChat, 'title' | 'url' | 'icon'>): ChatIconKind {
  if (chat.icon) return chat.icon
  const s = `${chat.url} ${chat.title}`.toLowerCase()
  if (/wa\.me|whatsapp|wa\.clck|chat\.whatsapp|ватсап|вацап/.test(s)) return 'whatsapp'
  if (/t\.me|telegram|телеграм/.test(s)) return 'telegram'
  return 'group'
}

const Svg = ({ bg, children, size }: { bg: string; children: React.ReactNode; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden style={{ flex: '0 0 auto', borderRadius: 9 }}>
    <rect width="32" height="32" rx="9" fill={bg} />
    {children}
  </svg>
)

export function PresetIcon({ kind, size = 30 }: { kind: ChatIconKind; size?: number }) {
  if (kind === 'whatsapp') {
    return (
      <Svg bg="#25D366" size={size}>
        <path fill="#fff" d="M16 6.5a9.4 9.4 0 0 0-8.1 14.1L6.6 25.4l4.9-1.3A9.4 9.4 0 1 0 16 6.5Zm0 1.8a7.6 7.6 0 1 1-3.9 14.1l-.3-.2-2.9.8.8-2.8-.2-.3A7.6 7.6 0 0 1 16 8.3Zm-3 3.4c-.2 0-.5.1-.7.4-.3.3-.9.9-.9 2.2s1 2.6 1.1 2.7c.1.2 1.9 3 4.7 4.1 2.3.9 2.8.7 3.3.7.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3l-1.9-.9c-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6l.5-.5c.1-.2.2-.3.3-.5.1-.2.1-.4 0-.5l-.9-2.1c-.2-.5-.4-.5-.6-.5Z" />
      </Svg>
    )
  }
  if (kind === 'telegram') {
    return (
      <Svg bg="#2AABEE" size={size}>
        <path fill="#fff" d="M24.6 8.6 6.9 15.4c-1.2.5-1.2 1.2-.2 1.5l4.5 1.4 1.7 5.2c.2.6.1.8.7.8.5 0 .7-.2 1-.5l2.2-2.1 4.5 3.3c.8.5 1.4.2 1.6-.8l3-14.1c.3-1.2-.4-1.7-1.3-1.5ZM12.3 17.6l9.5-6c.4-.3.9-.1.5.2l-7.9 7.1-.3 3.3-1.8-4.6Z" />
      </Svg>
    )
  }
  return (
    <Svg bg="#6E4FE0" size={size}>
      <circle cx="12" cy="13" r="3" fill="#fff" />
      <circle cx="21" cy="13.5" r="2.5" fill="#fff" opacity="0.85" />
      <path fill="#fff" d="M6.5 22.5c0-3.3 2.5-5 5.5-5s5.5 1.7 5.5 5v.5h-11v-.5Z" />
      <path fill="#fff" opacity="0.85" d="M18.5 18.2c.8-.4 1.6-.6 2.5-.6 2.6 0 4.5 1.5 4.5 4.3v.6h-5.4c0-1.7-.5-3.2-1.6-4.3Z" />
    </Svg>
  )
}

export default function ChatIcon({ chat, size = 30 }: { chat: CourseChat; size?: number }) {
  if (chat.icon_url) return <img src={chat.icon_url} alt="" width={size} height={size} style={{ flex: '0 0 auto', borderRadius: 9, objectFit: 'cover' }} />
  return <PresetIcon kind={detectIcon(chat)} size={size} />
}
