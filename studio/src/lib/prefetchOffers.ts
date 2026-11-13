// Ипотека PRO / Қарызсыз өмір беттері — үлкен бөлек JS-файл (React.lazy). Қонақ баяу желіде батырманы
// баса салғанда файл жүктеле бастаса, ашылуы кешігеді. Сондықтан алдын ала (бос уақытта, немесе
// батырманың үстіне тінтуір/саусақ тигенде) фондық жүктеп қоямыз — бассаңыз, бет бірден ашылады.
let started = false
export function prefetchOfferPages() {
  if (started) return
  started = true
  import('../pages/OfferIpotekaPro')
  import('../pages/OfferKaryzsyzOmir')
}

export function warmUpOfferPagesWhenIdle() {
  const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback
  if (idle) idle(prefetchOfferPages)
  else setTimeout(prefetchOfferPages, 2500)
}
