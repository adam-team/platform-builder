// «Қарызсыз өмір» КП бетіндегі барлық «Курсты алу / Сатып алу» батырмалары осы бір функция арқылы өтеді.
// Төлем сервисі қосылғанда: DEBT_PAYMENT_URL-ге сілтеме жазыңыз (немесе осы функцияны
// төлем беті/checkout API-ына ауыстырыңыз) — бет кодын өзгертудің қажеті жоқ.
const WHATSAPP = 'https://wa.clck.bar/7XXXXXXXXXX'

export const DEBT_PAYMENT_URL: string | undefined = 'https://wa.clck.bar/7XXXXXXXXXX?text=%22%D2%9A%D0%B0%D1%80%D1%8B%D0%B7%D1%81%D1%8B%D0%B7%20%D3%A9%D0%BC%D1%96%D1%80%22%20%D0%BA%D1%83%D1%80%D1%81%D1%8B%D0%BD%20%D0%B0%D0%BB%D0%B0%D0%BC%D1%8B%D0%BD'

export function checkoutUrlDebt(): string {
  if (DEBT_PAYMENT_URL) return DEBT_PAYMENT_URL
  return `${WHATSAPP}?text=${encodeURIComponent('«Қарызсыз өмір» курсын аламын')}`
}
