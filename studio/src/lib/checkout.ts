// «Ипотека PRO» КП бетіндегі барлық «Қатысу / Тариф таңдау» батырмалары осы бір функция арқылы өтеді.
// Төлем сервисі қосылғанда: PAYMENT_URL_BY_TARIFF-ке сілтемелерді жазыңыз (немесе осы функцияны
// төлем беті/checkout API-ына ауыстырыңыз) — бет кодын өзгертудің қажеті жоқ.
const WHATSAPP = 'https://wa.clck.bar/7XXXXXXXXXX'

export const PAYMENT_URL_BY_TARIFF: Partial<Record<'premium' | 'business', string>> = {
  // premium: 'https://…',
  // business: 'https://…',
}

export function checkoutUrl(tariff?: 'premium' | 'business'): string {
  const direct = tariff ? PAYMENT_URL_BY_TARIFF[tariff] : undefined
  if (direct) return direct
  const label = tariff === 'premium' ? ' (Premium тарифі)' : tariff === 'business' ? ' (Business тарифі)' : ''
  return `${WHATSAPP}?text=${encodeURIComponent(`«Ипотека PRO» курсын аламын${label}`)}`
}
