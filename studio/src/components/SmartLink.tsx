import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { prefetchOfferPages } from '../lib/prefetchOffers'

// Әкімші батырмаға сілтемені қолмен жазады: «/courses» (ішкі бет), «#services-list» (бетті айналдыру)
// немесе «https://…» (сыртқы, жаңа терезеде). Осы компонент үшеуін де дұрыс ашады.
export default function SmartLink({ href, children, ...rest }: { href: string; children: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  // Курсты алу батырмасы КП бетіне апарса — үстіне саусақ/тінтуір тигенде алдын ала жүктейміз
  const warm = href.startsWith('/offer/') ? { onMouseEnter: prefetchOfferPages, onTouchStart: prefetchOfferPages, onFocus: prefetchOfferPages } : {}
  if (href.startsWith('/') && !href.startsWith('//')) return <Link to={href} {...warm} {...rest}>{children}</Link>
  if (href.startsWith('#')) return <a href={href} {...rest}>{children}</a>
  return <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>
}
