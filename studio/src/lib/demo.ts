// ДЕМО-РЕЖИМ: имитация Supabase в памяти браузера, чтобы посмотреть платформу без настоящей базы.
// Включается переменной VITE_DEMO=1. Данные вымышленные и сбрасываются при перезагрузке страницы.
// Права доступа (RLS) здесь воспроизведены: курсы/услуги/тегін сабақтар видны и без входа,
// а видео закрытого урока бесплатный клиент реально не получает.

type Row = Record<string, any>
type Db = Record<string, Row[]>

const uid = () => crypto.randomUUID()
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString()
const DEMO_VIDEO = 'jNQXAC9IVRw'
const SCHOOL_ID = '00000000-0000-0000-0000-000000000001'

export const DEMO_USERS = {
  admin: { email: 'admin@demo.kz', password: 'demo1234', label: 'Әкімші' },
  paid: { email: 'paid@demo.kz', password: 'demo1234', label: 'Төлеген клиент' },
  free: { email: 'free@demo.kz', password: 'demo1234', label: 'Тегін клиент' },
  curator: { email: 'curator@demo.kz', password: 'demo1234', label: 'Куратор' },
}

function seed(): Db {
  const [uAdmin, uPaid, uFree, uCurator] = [uid(), uid(), uid(), uid()]
  const [debt, savings, house, pro] = [uid(), uid(), uid(), uid()]
  const [d1, d2, d3, s1, s2, s3, h1, h2, h3, h4, h5, h6, p1, p2] = Array.from({ length: 14 }, uid)
  const a1 = uid()
  const pipelineId = uid()
  const [stageNew, stageContacted, stageThinking, stageWaiting, stagePaid, stageLost] = Array.from({ length: 6 }, uid)

  const materials = [
    { title: 'Қарыздан шығудың 7 қадамы', url: '#', kind: 'PDF' },
    { title: 'Отбасылық бюджет кестесі', url: '#', kind: 'Excel' },
    { title: 'Алғашқы жарна жинау жоспары', url: '#', kind: 'Чек-лист' },
  ]

  const db: Db = {
    profiles: [
      { id: uAdmin, email: DEMO_USERS.admin.email, full_name: 'Эксперт Аты-жөні', phone: null, role: 'admin', created_at: daysAgo(60) },
      { id: uPaid, email: DEMO_USERS.paid.email, full_name: 'Айдана', phone: '+7 701 234 56 78', role: 'paid', created_at: daysAgo(20) },
      { id: uFree, email: DEMO_USERS.free.email, full_name: 'Гүлнара', phone: null, role: 'free', created_at: daysAgo(3) },
      { id: uCurator, email: DEMO_USERS.curator.email, full_name: 'Айгерім (куратор)', phone: null, role: 'curator', created_at: daysAgo(30) },
    ],
    news: [
      { id: uid(), title: 'Жаңа курс: «Ипотека PRO»', body: 'Ипотека маманы болғыңыз келсе — жаңа кәсіби бағдарлама қосылды.', is_published: true, created_at: daysAgo(2) },
      { id: uid(), title: 'Дүйсенбіде тегін консультация', body: 'Осы аптада тегін консультацияға орын әлі бар — жазылуды кешіктірмеңіз.', is_published: true, created_at: daysAgo(6) },
    ],
    news_reads: [],
    lesson_questions: [
      { id: 'q-1', lesson_id: h1, user_id: uPaid, body: 'Алғашқы жарнаны қалай есептеймін?', created_at: daysAgo(2) },
    ],
    lesson_question_replies: [
      { id: 'qr-1', question_id: 'q-1', author_id: uAdmin, body: 'Үй құнының 10–20% шамасында жоспарлаңыз.', created_at: daysAgo(1) },
    ],
    lesson_curator_files: [{ lesson_id: h1, context: 'Сұрақ: Ипотекаға қалай дайындалуға болады?\nЖауап: Алдымен табысыңыз бен шығынды есептеңіз, содан кейін алғашқы жарнаны жинаңыз.\nКілт сөздер: дайындық, ипотека, бастау\n\nСұрақ: Алғашқы жарна қанша болу керек?\nЖауап: Әдетте үй құнының 10–20% шамасында жоспарлайды.\nКілт сөздер: жарна, алғашқы, пайыз', updated_at: daysAgo(1) }],
    enrollment_history: [],
    curator_files: [],
    course_modules: [
      { id: 'm-h1', course_id: house, position: 1, number_label: '01', title: '1-модуль. Қазіргі жағдайды талдау', subtitle: 'Қазіргі жағдайыңызды бағалаймыз', is_locked: false, opens_at: null, created_at: daysAgo(40) },
      { id: 'm-h2', course_id: house, position: 2, number_label: '02', title: '2-модуль. Бюджет және алғашқы жарна', subtitle: null, is_locked: false, opens_at: null, created_at: daysAgo(40) },
      { id: 'm-h3', course_id: house, position: 3, number_label: '03', title: '3-модуль. Ипотекалық мүмкіндікті есептеу', subtitle: null, is_locked: false, opens_at: null, created_at: daysAgo(40) },
    ],
    course_events: [
      { id: uid(), course_id: debt, title: 'Тікелей эфир: қарыздан шығу жоспары', starts_at: new Date(Date.now() + 2 * 86400000).toISOString(), link: null, created_at: daysAgo(1) },
    ],
    courses: [
      {
        id: debt, title: 'Қарызсыз өмір', cover_image_url: '/images/course-cover-debt.jpg', whatsapp_url: 'https://wa.me/', telegram_url: 'https://t.me/',
        description: 'Қарыздарды жүйелеп, төлемдерді дұрыс жоспарлап, қарыздан шығудың нақты стратегиясын құратын практикалық курс.',
        features_intro: 'Курс нәтижесінде сіз:',
        features: [
          'барлық қарызыңызды бір жерге жинақтайсыз',
          'қай қарызды бірінші жабу керегін анықтайсыз',
          'ай сайынғы төлем жоспарын құрасыз',
          'жаңа қарыз алуға итермелейтін әдеттерді өзгертесіз',
          'қарызсыз өмірге шығудың жол картасын аласыз',
        ],
        category: 'debt', old_price_kzt: 80000, price_kzt: 28990, payment_url: 'https://pay.kaspi.kz/pay/demo', is_published: true, position: 1, created_at: daysAgo(50),
      },
      {
        id: savings, title: 'Ақша жинау',
        description: 'Табысыңыздың көлеміне қарамастан, ақшаны жүйелі жинауды үйрететін практикалық курс.',
        features_intro: 'Курс нәтижесінде сіз:',
        features: [
          'табыс пен шығынды дұрыс есептейсіз',
          'қаржылық мақсатыңызды нақтылайсыз',
          'жинақ сомасы мен мерзімін анықтайсыз',
          'жеке бюджет жүйесін енгізесіз',
          'ақша жинаудың тұрақты жоспарын құрасыз',
        ],
        category: 'savings', old_price_kzt: 150000, price_kzt: 68990, payment_url: 'https://pay.kaspi.kz/pay/demo', is_published: true, position: 2, created_at: daysAgo(45),
      },
      {
        id: house, title: 'Үй аламын',
        description: 'Қазіргі жағдайыңызды талдап, өз баспанаңызды алуға арналған қадамдық стратегия құратын курс.',
        features_intro: 'Курс нәтижесінде сіз:',
        features: [
          'қандай үй алғыңыз келетінін нақтылайсыз',
          'баспанаға қажет бюджетті есептейсіз',
          'алғашқы жарна жоспарын құрасыз',
          'ипотекалық мүмкіндігіңізді бағалайсыз',
          'өзіңізге сәйкес бағдарламаларды салыстырасыз',
          'үй алуға арналған жеке жол картасын жасайсыз',
        ],
        category: 'house', old_price_kzt: 250000, price_kzt: 148990, payment_url: 'https://pay.kaspi.kz/pay/demo', is_published: true, position: 3, created_at: daysAgo(40),
      },
      {
        id: pro, title: 'Ипотека PRO',
        description: 'Ипотекалық бағдарламаларды меңгеріп, клиенттерге үй алуға көмектесетін маман болуға арналған кәсіби бағдарлама.',
        features_intro: 'Оқу барысында сіз:',
        features: [
          'ипотекалық бағдарламаларды талдауды',
          'клиенттің қаржылық жағдайын анықтауды',
          'төлем қабілеттілігін есептеуді',
          'құжаттармен жұмыс істеуді',
          'банкке өтінім дайындауды',
          'клиентті баспана алғанға дейін сүйемелдеуді',
          'қызметіңізді сатып, табыс табуды үйренесіз',
        ],
        category: 'mortgage_pro', old_price_kzt: null, price_kzt: 400000, offline_price_kzt: 1000000, payment_url: 'https://pay.kaspi.kz/pay/demo', is_published: true, position: 4, created_at: daysAgo(35),
      },
    ],
    lessons: [
      { id: d1, course_id: debt, module_title: null, title: 'Қарыздан шығуды неден бастау керек?', position: 1, is_free_preview: true, created_at: daysAgo(50) },
      { id: d2, course_id: debt, module_title: null, title: 'Қарыздарды бір жерге жинақтау', position: 2, is_free_preview: false, created_at: daysAgo(49) },
      { id: d3, course_id: debt, module_title: null, title: 'Қарызсыз өмірге шығу жол картасы', position: 3, is_free_preview: false, created_at: daysAgo(48) },
      { id: s1, course_id: savings, module_title: null, title: 'Ақша неге жиналмайды?', position: 1, is_free_preview: true, created_at: daysAgo(45) },
      { id: s2, course_id: savings, module_title: null, title: 'Жеке бюджет жүйесі', position: 2, is_free_preview: false, created_at: daysAgo(44) },
      { id: s3, course_id: savings, module_title: null, title: 'Ақша жинаудың тұрақты жоспары', position: 3, is_free_preview: false, created_at: daysAgo(43) },
      { id: h1, course_id: house, module_id: 'm-h1', module_title: '1-модуль. Қазіргі жағдайды талдау', title: 'Ипотекаға қалай дайындаламыз?', position: 1, is_free_preview: true, created_at: daysAgo(40) },
      { id: h2, course_id: house, module_id: 'm-h1', module_title: '1-модуль. Қазіргі жағдайды талдау', title: 'Баспанаға қажет бюджет', position: 2, is_free_preview: false, created_at: daysAgo(39) },
      { id: h3, course_id: house, module_id: 'm-h2', module_title: '2-модуль. Бюджет және алғашқы жарна', title: 'Алғашқы жарна жоспары', position: 3, is_free_preview: false, created_at: daysAgo(38) },
      { id: h4, course_id: house, module_id: 'm-h3', module_title: '3-модуль. Ипотекалық мүмкіндікті есептеу', title: 'Төлем қабілеттілігі дегеніміз не?', position: 4, is_free_preview: false, created_at: daysAgo(37) },
      { id: h5, course_id: house, module_id: 'm-h3', module_title: '3-модуль. Ипотекалық мүмкіндікті есептеу', title: 'Банк сізді қалай бағалайды', position: 5, is_free_preview: false, created_at: daysAgo(36) },
      { id: h6, course_id: house, module_id: 'm-h3', module_title: '3-модуль. Ипотекалық мүмкіндікті есептеу', title: 'Ипотекалық калькулятормен жұмыс', position: 6, is_free_preview: false, created_at: daysAgo(35) },
      { id: p1, course_id: pro, module_title: null, title: 'Ипотекалық бағдарламаларды талдау', position: 1, is_free_preview: false, created_at: daysAgo(30) },
      { id: p2, course_id: pro, module_title: null, title: 'Клиенттің қаржылық жағдайын анықтау', position: 2, is_free_preview: false, created_at: daysAgo(29) },
    ],
    lesson_content: [
      { lesson_id: d1, youtube_id: DEMO_VIDEO, body: 'Қарыздан шығудың алғашқы қадамы — барлық қарызды бір жерге жинақтау және басымдықты анықтау.', materials: [] },
      { lesson_id: d2, youtube_id: DEMO_VIDEO, body: 'Қай қарызды бірінші жабу керегін қалай анықтау керек.', materials: [] },
      { lesson_id: d3, youtube_id: DEMO_VIDEO, body: 'Қарызсыз өмірге шығудың нақты жол картасы.', materials: [] },
      { lesson_id: s1, youtube_id: DEMO_VIDEO, body: 'Табыс пен шығынды дұрыс есептеу — жинақтың негізі.', materials: [] },
      { lesson_id: s2, youtube_id: DEMO_VIDEO, body: 'Жеке бюджет жүйесін енгізу қадамдары.', materials: [] },
      { lesson_id: s3, youtube_id: DEMO_VIDEO, body: 'Ақша жинаудың тұрақты жоспарын құру.', materials: [] },
      {
        lesson_id: h1, youtube_id: DEMO_VIDEO,
        body: 'Ипотекаға дайындықтың негізгі қадамдары\nТабыс пен шығынды есептеу\nАлғашқы жарна көлемін анықтау',
        materials, outcomes: ['Қандай үй алғыңыз келетінін нақтылайсыз', 'Ипотекаға дайындық жоспарын құрасыз', 'Алғашқы жарнаны есептейсіз'],
        presentation_url: 'https://example.com/presentation.pdf', notes_url: 'https://example.com/notes.pdf',
        timecodes: [{ time: '0:00', label: 'Кіріспе' }, { time: '2:30', label: 'Табысты есептеу' }],
        duration_minutes: 15, assignment_text: 'Өз табысыңызды жазып шығыңыз.',
      },
      { lesson_id: h2, youtube_id: DEMO_VIDEO, body: 'Баспанаға қажет бюджетті есептейміз.', materials: [] },
      { lesson_id: h3, youtube_id: DEMO_VIDEO, body: 'Алғашқы жарна жоспарын құрамыз.', materials: [] },
      { lesson_id: h4, youtube_id: DEMO_VIDEO, body: 'Төлем қабілеттілігі дегеніміз не — негізгі ұғымдар.', materials: [] },
      {
        lesson_id: h5,
        youtube_id: DEMO_VIDEO,
        body: 'Бұл сабақта банк сіздің табысыңызды, шығындарыңызды және несие тарихыңызды қалай бағалайтынын түсінесіз. Сабақтан кейін өз төлем қабілеттілігіңізді есептеп көріңіз.',
        materials,
        assignment_text: 'Өз табысыңыз бен тұрақты шығындарыңызды жазып, төлем қабілеттілігіңізді есептеп, нәтижені төменде жазыңыз.',
      },
      { lesson_id: h6, youtube_id: DEMO_VIDEO, body: 'Ипотекалық калькулятормен жұмыс істеуді үйренеміз.', materials: [] },
      { lesson_id: p1, youtube_id: DEMO_VIDEO, body: 'Нарықтағы ипотекалық бағдарламаларды салыстыру.', materials: [] },
      { lesson_id: p2, youtube_id: DEMO_VIDEO, body: 'Клиенттің төлем қабілеттілігін бағалау әдістемесі.', materials: [] },
    ],
    services: [
      {
        id: uid(), title: 'Тегін консультация',
        description: 'Қай қызмет немесе курс сізге сәйкес екенін білмесеңіз, тегін консультациядан бастаңыз.',
        features_intro: 'Консультация кезінде:',
        features: ['қазіргі мақсатыңыз анықталады', 'негізгі проблемаңыз белгіленеді', 'сізге сәйкес өнім немесе қызмет ұсынылады', 'келесі қадамыңыз түсіндіріледі'],
        category: 'mortgage_pro', price_kzt: null, cta_label: 'Консультацияға жазылу', payment_url: 'https://wa.me/', is_published: true, position: 1,
      },
      {
        id: uid(), title: 'Қаржылық / ипотекалық разбор',
        description: 'Қаржылық жағдайыңызды толық талдап, қарыздан шығу, ақша жинау немесе баспана алу бойынша жеке стратегия алыңыз.',
        features_intro: 'Разбор нәтижесінде:',
        features: ['ақшаңыздың қайда кететінін түсінесіз', 'негізгі қаржылық қателеріңізді көресіз', 'қарыздарыңызды жабу ретін анықтайсыз', 'жинақ мүмкіндігіңізді есептейсіз', 'нақты әрекет жоспарын аласыз'],
        category: 'review', price_kzt: 150000, cta_label: 'Разборға жазылу', payment_url: 'https://pay.kaspi.kz/pay/demo', is_published: true, position: 2,
      },
      {
        id: uid(), title: 'Ипотекалық сопровождение',
        description: 'Сіздің жағдайыңызға сәйкес ипотекалық бағдарламаны анықтап, құжат дайындаудан бастап баспана рәсімдеуге дейін сүйемелдейміз.',
        features_intro: 'Сопровождение құрамына:',
        features: ['қаржылық жағдайды талдау', 'ипотекалық мүмкіндікті анықтау', 'тиімді бағдарламаны таңдау', 'құжаттар тізімін дайындау', 'өтінім беру процесін сүйемелдеу', 'банкпен жұмыс', 'баспана рәсімдеуге көмектесу кіреді'],
        category: 'house', price_kzt: 700000, cta_label: 'Сопровождение алу', payment_url: 'https://pay.kaspi.kz/pay/demo', is_published: true, position: 3,
      },
      {
        id: uid(), title: 'Экспертмен жеке сопровождение',
        description: 'Экспертмен тікелей жұмыс істеп, қаржылық жағдайыңыздан баспана алғанға дейін жеке сүйемелдеу алыңыз.',
        features_intro: 'Бұл форматта:',
        features: ['Эксперт сіздің жағдайыңызды жеке талдайды', 'қарыздан шығу және жинақ жоспарын құрады', 'алғашқы жарнаны қалыптастыру стратегиясын жасайды', 'тиімді ипотекалық бағытты анықтайды', 'қабылданатын маңызды шешімдерді бақылайды', 'сізді нәтижеге дейін жеке сүйемелдейді'],
        category: 'premium', price_kzt: 1000000, cta_label: 'Жеке жұмысқа өтінім беру', payment_url: 'https://pay.kaspi.kz/pay/demo', is_published: true, position: 4,
      },
    ],
    lesson_answers: [
      { id: a1, lesson_id: h5, user_id: uPaid, body: 'Табысым 350 000 ₸, тұрақты шығындарым 120 000 ₸. Төлем қабілеттілігім шамамен 150 000 ₸ болды.', reviewed: true, status: 'accepted', created_at: daysAgo(4) },
    ],
    answer_replies: [
      { id: uid(), answer_id: a1, author_id: uAdmin, body: 'Керемет, дұрыс есептегенсіз! Енді осы соманы 12-ге бөліп, айлық жарнаны шамалап көріңіз.', created_at: daysAgo(3) },
    ],
    support_messages: [
      { id: uid(), user_id: uPaid, author_id: uPaid, body: 'Сәлеметсіз бе! Ипотека алу үшін қанша алғашқы жарна керек болады шамамен?', created_at: daysAgo(2) },
      { id: uid(), user_id: uPaid, author_id: uAdmin, body: 'Сәлем! Әдетте 10–20% аралығында, бірақ бағдарламаға байланысты өзгереді. «Ипотекалық мүмкіндікті есептеу» сабағында толық көрсетілген.', created_at: daysAgo(2) },
    ],
    offer_pages: [],
    free_lessons: [
      { id: uid(), school_id: SCHOOL_ID, title: 'Қарыздан шығуды неден бастау керек?', category: 'debt', youtube_id: DEMO_VIDEO, position: 1, show_on_home: true, is_published: true, created_at: daysAgo(50) },
      { id: uid(), school_id: SCHOOL_ID, title: 'Ипотекаға қалай дайындаламыз?', category: 'house', youtube_id: DEMO_VIDEO, position: 2, show_on_home: true, is_published: true, created_at: daysAgo(40) },
      { id: uid(), school_id: SCHOOL_ID, title: 'Ақша неге жиналмайды?', category: 'savings', youtube_id: null, position: 3, show_on_home: false, is_published: true, created_at: daysAgo(45) },
    ],
    site_settings: [{ school_id: SCHOOL_ID, curator_name: 'Айгерім', curator_hours: 'Дс–Жм, 10:00–19:00', curator_contact_url: 'https://wa.me/7XXXXXXXXXX' }],
    enrollments: [
      { id: uid(), user_id: uPaid, course_id: house, source: 'payment', granted_by: null, created_at: daysAgo(20), expires_at: new Date(Date.now() + 40 * 86400000).toISOString() },
      { id: uid(), user_id: uPaid, course_id: debt, source: 'admin', granted_by: null, created_at: daysAgo(5), expires_at: null },
    ],
    lesson_progress: [
      { user_id: uPaid, lesson_id: h1, completed_at: daysAgo(19) },
      { user_id: uPaid, lesson_id: h2, completed_at: daysAgo(18) },
      { user_id: uPaid, lesson_id: h3, completed_at: daysAgo(10) },
      { user_id: uPaid, lesson_id: h4, completed_at: daysAgo(5) },
    ],
    payments: [{ id: uid(), user_id: uFree, course_id: savings, amount_kzt: 68990, provider: 'kaspi', status: 'pending', external_id: null, created_at: daysAgo(0), paid_at: null }],
    schools: [{
      id: SCHOOL_ID, name: 'Эксперт Аты-жөні', niche: 'қаржы/ипотека', country: 'Қазақстан',
      languages: ['kk'], default_currency: 'KZT', timezone: 'Asia/Almaty', brand_color: '#1E7A4C',
      terms: { course: 'курс', module: 'модуль', student: 'оқушы' }, payment_providers: ['kaspi_manual'],
      messengers: [], video_provider: null, subdomain: null, custom_domain: null, logo_url: null,
      tariff: 'free', storage_limit_gb: 5, created_at: daysAgo(90),
    }],
    employee_roles: [],
    audit_log: [],
    files: [],
    user_groups: [{ id: uid(), school_id: SCHOOL_ID, name: 'Ипотека PRO ағыны', deleted_at: null, created_at: daysAgo(30) }],
    user_group_members: [],
    segments: [],
    course_group_access: [],
    reply_templates: [
      { id: uid(), school_id: SCHOOL_ID, title: 'Қабылданды', body: 'Керемет, дұрыс жасағансыз! Қабылдадым ✅', created_at: daysAgo(60) },
      { id: uid(), school_id: SCHOOL_ID, title: 'Пысықтау керек', body: 'Жақсы бастама, бірақ мына жерін пысықтап көріңізші: ', created_at: daysAgo(60) },
    ],
    broadcasts: [],
    notifications: [],
    pipelines: [{ id: pipelineId, school_id: SCHOOL_ID, name: 'Сатылым', position: 0, created_at: daysAgo(90) }],
    pipeline_stages: [
      { id: stageNew, pipeline_id: pipelineId, name: 'Жаңа', color: '#64748B', stage_type: 'normal', position: 1 },
      { id: stageContacted, pipeline_id: pipelineId, name: 'Байланысқа шықты', color: '#3B6FE0', stage_type: 'normal', position: 2 },
      { id: stageThinking, pipeline_id: pipelineId, name: 'Ойланып жатыр', color: '#B8860B', stage_type: 'normal', position: 3 },
      { id: stageWaiting, pipeline_id: pipelineId, name: 'Төлем күтуде', color: '#E3AE3A', stage_type: 'normal', position: 4 },
      { id: stagePaid, pipeline_id: pipelineId, name: 'Төленді', color: '#16A34A', stage_type: 'success', position: 5 },
      { id: stageLost, pipeline_id: pipelineId, name: 'Бас тартты', color: '#DC2626', stage_type: 'fail', position: 6 },
    ],
    deals: [
      { id: uid(), school_id: SCHOOL_ID, pipeline_id: pipelineId, stage_id: stageNew, user_id: uFree, title: 'Гүлнара — Ақша жинау', amount_kzt: 68990, manager_id: uAdmin, lost_reason: null, created_at: daysAgo(2), updated_at: daysAgo(2) },
      { id: uid(), school_id: SCHOOL_ID, pipeline_id: pipelineId, stage_id: stageThinking, user_id: null, title: 'Аружан — Ипотека PRO сұрайды', amount_kzt: 400000, manager_id: uAdmin, lost_reason: null, created_at: daysAgo(5), updated_at: daysAgo(1) },
      { id: uid(), school_id: SCHOOL_ID, pipeline_id: pipelineId, stage_id: stagePaid, user_id: uPaid, title: 'Айдана — Үй аламын', amount_kzt: 148990, manager_id: uAdmin, lost_reason: null, created_at: daysAgo(20), updated_at: daysAgo(19) },
    ],
    tasks: [
      { id: uid(), school_id: SCHOOL_ID, title: 'Гүлнараға қоңырау шалу', due_at: daysAgo(-1), status: 'new', manager_id: uAdmin, deal_id: null, user_id: uFree, result: null, created_at: daysAgo(1) },
    ],
  }
  // Мультитенанттылық: түбірлік кестелерге (profiles/courses/services/news) school_id қосамыз —
  // жеке-жеке әр жазбаны түзетудің орнына, бір жерден
  for (const table of ['profiles', 'courses', 'services', 'news'] as const) {
    db[table] = db[table].map((r) => ({ school_id: SCHOOL_ID, ...r }))
  }
  db.profiles = db.profiles.map((r) => ({ tags: [], ...r }))
  db.courses = db.courses.map((r) => ({ tags: [], deleted_at: null, ...r }))
  db.lessons = db.lessons.map((r) => ({ is_stop_lesson: false, deleted_at: null, ...r }))
  return db
}

const DEFAULTS: Record<string, () => Row> = {
  profiles: () => ({ school_id: SCHOOL_ID, phone: null, role: 'free', tags: [], created_at: new Date().toISOString() }),
  courses: () => ({ school_id: SCHOOL_ID, category: 'debt', old_price_kzt: null, offline_price_kzt: null, features_intro: null, features: [], position: 0, is_published: false, deleted_at: null, tags: [], created_at: new Date().toISOString() }),
  lessons: () => ({ module_title: null, module_id: null, is_locked: false, opens_at: null, position: 0, is_free_preview: false, is_stop_lesson: false, deleted_at: null, created_at: new Date().toISOString() }),
  lesson_content: () => ({ materials: [], assignment_text: null }),
  services: () => ({ school_id: SCHOOL_ID, is_published: true, features_intro: null, features: [], position: 0 }),
  free_lessons: () => ({ school_id: SCHOOL_ID, youtube_id: null, position: 0, show_on_home: false, is_published: true, created_at: new Date().toISOString() }),
  enrollment_history: () => ({ reason: 'removed' }),
  curator_files: () => ({ entries: [], created_at: new Date().toISOString() }),
  enrollments: () => ({ source: 'admin', granted_by: null, expires_at: null, created_at: new Date().toISOString() }),
  payments: () => ({ provider: 'kaspi', status: 'pending', external_id: null, paid_at: null, created_at: new Date().toISOString() }),
  lesson_progress: () => ({ completed_at: new Date().toISOString() }),
  news: () => ({ school_id: SCHOOL_ID, body: null, is_published: true, created_at: new Date().toISOString() }),
  lesson_questions: () => ({ created_at: new Date().toISOString() }),
  lesson_question_replies: () => ({ created_at: new Date().toISOString() }),
  lesson_curator_files: () => ({ updated_at: new Date().toISOString() }),
  course_modules: () => ({ subtitle: null, is_locked: false, opens_at: null, created_at: new Date().toISOString() }),
  course_events: () => ({ link: null, created_at: new Date().toISOString() }),
  news_reads: () => ({ read_at: new Date().toISOString() }),
  lesson_answers: () => ({ reviewed: false, status: 'pending', created_at: new Date().toISOString() }),
  reply_templates: () => ({ school_id: SCHOOL_ID, created_at: new Date().toISOString() }),
  pipelines: () => ({ school_id: SCHOOL_ID, position: 0, created_at: new Date().toISOString() }),
  pipeline_stages: () => ({ color: '#64748B', stage_type: 'normal', position: 0 }),
  deals: () => ({ school_id: SCHOOL_ID, amount_kzt: null, manager_id: null, lost_reason: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  tasks: () => ({ school_id: SCHOOL_ID, due_at: null, status: 'new', manager_id: null, deal_id: null, user_id: null, result: null, created_at: new Date().toISOString() }),
  notifications: () => ({ school_id: SCHOOL_ID, body: null, link: null, read_at: null, created_at: new Date().toISOString() }),
  answer_replies: () => ({ created_at: new Date().toISOString() }),
  support_messages: () => ({ created_at: new Date().toISOString() }),
  employee_roles: () => ({ school_id: SCHOOL_ID, scope: {}, created_at: new Date().toISOString() }),
  audit_log: () => ({ school_id: SCHOOL_ID, diff: {}, created_at: new Date().toISOString() }),
  files: () => ({ school_id: SCHOOL_ID, size_bytes: 0, used_in: [], created_at: new Date().toISOString() }),
  user_groups: () => ({ school_id: SCHOOL_ID, deleted_at: null, created_at: new Date().toISOString() }),
  user_group_members: () => ({ joined_at: new Date().toISOString() }),
  segments: () => ({ school_id: SCHOOL_ID, entity: 'users', conditions: [], created_at: new Date().toISOString() }),
}
const PK: Record<string, string> = { lesson_curator_files: 'lesson_id', lesson_content: 'lesson_id', site_settings: 'school_id', offer_pages: 'slug' }
// Кейбір кестелерде «profiles»-қа сілтейтін баған атауы әртүрлі — сондықтан кестеге қарай белгіленеді.
const JOIN_FK: Record<string, Record<string, string>> = {
  payments: { profiles: 'user_id', courses: 'course_id' },
  enrollments: { profiles: 'user_id', courses: 'course_id' },
  lesson_answers: { profiles: 'user_id' },
  answer_replies: { profiles: 'author_id' },
  lesson_question_replies: { profiles: 'author_id' },
  lesson_questions: { profiles: 'user_id' },
  support_messages: { profiles: 'author_id' },
}

export function createDemoClient() {
  const db = seed()
  let userId: string | null = null
  try { userId = sessionStorage.getItem('demo-user') } catch { /* нет доступа к storage — не страшно */ }
  const listeners = new Set<(event: string, session: any) => void>()

  const me = () => db.profiles.find((p) => p.id === userId)
  const isAdmin = () => me()?.role === 'admin'
  const isCurator = () => me()?.role === 'curator'
  const isStaffUser = () => isAdmin() || isCurator()
  const makeSession = () => {
    const user = db.profiles.find((p) => p.id === userId)
    return user ? { access_token: 'demo-token', user: { id: user.id, email: user.email } } : null
  }
  const emit = (event: string) => listeners.forEach((fn) => fn(event, makeSession()))
  const setUser = (id: string | null) => {
    userId = id
    try { id ? sessionStorage.setItem('demo-user', id) : sessionStorage.removeItem('demo-user') } catch { /* ignore */ }
  }
  const enrolled = (user: string | null, course: string) => db.enrollments.some((e) => e.user_id === user && e.course_id === course)
  // Топ арқылы қолжетімділік: пайдаланушы курсқа қолжетімділік беретін топтың кез келгенінің мүшесі болса
  const hasGroupAccess = (user: string | null, course: string) => {
    const groupIds = db.course_group_access.filter((a) => a.course_id === course).map((a) => a.group_id)
    return groupIds.some((gid) => db.user_group_members.some((m) => m.group_id === gid && m.user_id === user))
  }
  const canAnswerRole = () => me()?.role === 'paid' || isStaffUser()
  const canViewLesson = (lessonId: string) => {
    if (isStaffUser()) return true
    const lesson = db.lessons.find((l) => l.id === lessonId)
    return !!lesson && (lesson.is_free_preview || enrolled(userId, lesson.course_id) || hasGroupAccess(userId, lesson.course_id))
  }

  // Аналог политик RLS: какие строки видит текущий пользователь (курсы/услуги/тегін сабақтар — публичная витрина)
  function visible(table: string, row: Row): boolean {
    if (isAdmin()) return true
    if (isCurator() && ['profiles', 'enrollments', 'enrollment_history', 'lesson_progress', 'reply_templates'].includes(table)) return true
    if (table === 'offer_pages') return true
    switch (table) {
      case 'profiles': return row.id === userId
      case 'courses': return row.is_published && !row.deleted_at
      case 'services': return row.is_published
      case 'free_lessons': return row.is_published
      case 'site_settings': return true
      case 'schools': return true
      case 'course_group_access': return !!userId
      case 'news': return row.is_published
      case 'news_reads': return row.user_id === userId
      case 'course_modules': return true
      case 'curator_files': return canAnswerRole() && (!row.lesson_id || canViewLesson(row.lesson_id))
      case 'lesson_questions': return canViewLesson(row.lesson_id) && canAnswerRole()
      case 'lesson_question_replies': {
        const q = db.lesson_questions.find((x) => x.id === row.question_id)
        return !!q && canViewLesson(q.lesson_id) && canAnswerRole()
      }
      case 'lesson_curator_files': return canViewLesson(row.lesson_id)
      case 'course_events': return db.enrollments.some((e) => e.user_id === userId && e.course_id === row.course_id)
      case 'lessons': {
        const c = db.courses.find((x) => x.id === row.course_id)
        return !!c && c.is_published && !c.deleted_at && !row.deleted_at
      }
      case 'lesson_content': return canViewLesson(row.lesson_id)
      case 'lesson_answers': return canViewLesson(row.lesson_id)
      case 'answer_replies': {
        const answer = db.lesson_answers.find((a) => a.id === row.answer_id)
        return !!answer && canViewLesson(answer.lesson_id)
      }
      case 'enrollments':
      case 'payments': return row.user_id === userId
      case 'lesson_progress': return row.user_id === userId
      case 'support_messages': return row.user_id === userId
      case 'notifications': return row.user_id === userId
      default: return false
    }
  }
  function canWrite(table: string, op: string, row?: Row): boolean {
    if (isAdmin()) return true
    if (isCurator() && (table === 'enrollments' || (table === 'lesson_answers' && op === 'update') || (table === 'notifications' && op === 'insert'))) return true
    if (table === 'payments' && op === 'insert') return row?.user_id === userId && (row.status ?? 'pending') === 'pending'
    if (table === 'lesson_progress' && op === 'insert') return row?.user_id === userId
    if (table === 'lesson_progress' && op === 'delete') return row?.user_id === userId
    if (table === 'news_reads' && op === 'insert') return row?.user_id === userId
    if (table === 'lesson_questions' && op === 'insert') return row?.user_id === userId && canAnswerRole() && canViewLesson(row.lesson_id)
    if (table === 'lesson_question_replies' && op === 'insert') return row?.author_id === userId && canAnswerRole()
    if (table === 'lesson_answers' && op === 'insert') return row?.user_id === userId && canAnswerRole() && canViewLesson(row.lesson_id)
    if (table === 'lesson_answers' && op === 'update') return isStaffUser()
    if (table === 'lesson_answers' && op === 'delete') return row?.user_id === userId
    if (table === 'answer_replies' && op === 'insert') {
      if (row?.author_id !== userId || !canAnswerRole()) return false
      const answer = db.lesson_answers.find((a) => a.id === row.answer_id)
      return !!answer && canViewLesson(answer.lesson_id)
    }
    if (table === 'answer_replies' && op === 'delete') return row?.author_id === userId
    if (table === 'support_messages' && op === 'insert') return row?.author_id === userId && row?.user_id === userId
    if (table === 'notifications' && op === 'update') return row?.user_id === userId
    return false
  }

  // Триггеры базы
  function syncRole(user: string) {
    const p = db.profiles.find((x) => x.id === user)
    if (!p) return
    const has = db.enrollments.some((e) => e.user_id === user)
    if (has && p.role === 'free') p.role = 'paid'
    if (!has && p.role === 'paid') p.role = 'free'
  }
  function cascade(table: string, removed: Row[]) {
    const ids = new Set(removed.map((r) => r.id))
    const drop = (t: string, pred: (r: Row) => boolean) => { db[t] = db[t].filter((r) => !pred(r)) }
    if (table === 'courses') {
      const lessonIds = new Set(db.lessons.filter((l) => ids.has(l.course_id)).map((l) => l.id))
      const answerIds = new Set(db.lesson_answers.filter((a) => lessonIds.has(a.lesson_id)).map((a) => a.id))
      drop('answer_replies', (r) => answerIds.has(r.answer_id))
      drop('lesson_answers', (r) => lessonIds.has(r.lesson_id))
      drop('lesson_content', (r) => lessonIds.has(r.lesson_id))
      drop('lesson_progress', (r) => lessonIds.has(r.lesson_id))
      drop('lessons', (r) => ids.has(r.course_id))
      drop('enrollments', (r) => ids.has(r.course_id))
      drop('payments', (r) => ids.has(r.course_id))
    }
    if (table === 'lessons') {
      const answerIds = new Set(db.lesson_answers.filter((a) => ids.has(a.lesson_id)).map((a) => a.id))
      drop('answer_replies', (r) => answerIds.has(r.answer_id))
      drop('lesson_answers', (r) => ids.has(r.lesson_id))
      drop('lesson_content', (r) => ids.has(r.lesson_id))
      drop('lesson_progress', (r) => ids.has(r.lesson_id))
    }
    if (table === 'news') drop('news_reads', (r) => ids.has(r.news_id))
    if (table === 'lesson_answers') drop('answer_replies', (r) => ids.has(r.answer_id))
    if (table === 'enrollments') removed.forEach((r) => syncRole(r.user_id))
  }

  function withJoins(row: Row, cols: string, sourceTable: string): Row {
    const out = { ...row }
    for (const m of cols.matchAll(/(\w+)\(([^)]*)\)/g)) {
      const fk = JOIN_FK[sourceTable]?.[m[1]]
      out[m[1]] = fk ? (db[m[1]]?.find((r) => r.id === row[fk]) ?? null) : null
    }
    return out
  }

  class Query {
    private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
    private filters: [string, unknown][] = []
    private inFilters: [string, unknown[]][] = []
    private notNullFilters: string[] = []
    private gteFilters: [string, unknown][] = []
    private orderBy: [string, boolean] | null = null
    private limitCount: number | null = null
    private mode: 'many' | 'single' | 'maybe' = 'many'
    private payload: Row | Row[] = {}
    private cols = '*'
    private returning = false

    constructor(private table: string) {}
    select(cols = '*') { this.cols = cols; if (this.op !== 'select') this.returning = true; return this }
    insert(p: Row | Row[]) { this.op = 'insert'; this.payload = p; return this }
    update(p: Row) { this.op = 'update'; this.payload = p; return this }
    upsert(p: Row | Row[], _opts?: { onConflict?: string; ignoreDuplicates?: boolean }) { this.op = 'upsert'; this.payload = p; return this }
    delete() { this.op = 'delete'; return this }
    eq(col: string, val: unknown) { this.filters.push([col, val]); return this }
    is(col: string, val: unknown) { this.filters.push([col, val]); return this }
    in(col: string, vals: unknown[]) { this.inFilters.push([col, vals]); return this }
    // .not(col, 'is', null) — «Себет»: тек deleted_at толтырылған жазбалар (толық жалпы теріс емес, осы жағдайға жеткілікті)
    not(col: string, op: string, val: unknown) { if (op === 'is' && val === null) this.notNullFilters.push(col); return this }
    gte(col: string, val: unknown) { this.gteFilters.push([col, val]); return this }
    order(col: string, opts?: { ascending?: boolean }) { this.orderBy = [col, opts?.ascending !== false]; return this }
    limit(n: number) { this.limitCount = n; return this }
    single() { this.mode = 'single'; return this }
    maybeSingle() { this.mode = 'maybe'; return this }
    then(resolve: (v: any) => unknown, reject?: (e: unknown) => unknown) {
      return Promise.resolve(this.exec()).then(resolve, reject)
    }

    private matches(row: Row) {
      return this.filters.every(([c, v]) => row[c] === v)
        && this.inFilters.every(([c, vals]) => vals.includes(row[c]))
        && this.notNullFilters.every((c) => row[c] != null)
        && this.gteFilters.every(([c, v]) => row[c] != null && row[c] >= (v as string | number))
    }
    private finish(rows: Row[]) {
      if (this.mode === 'many') return { data: rows, error: null }
      if (rows.length === 0) return this.mode === 'maybe' ? { data: null, error: null } : { data: null, error: { message: 'Не найдено' } }
      return { data: rows[0], error: null }
    }

    private exec() {
      const table = this.table
      db[table] ??= []
      const denied = { data: null, error: { message: 'Нет прав на это действие' } }

      if (this.op === 'select') {
        let rows = db[table].filter((r) => visible(table, r) && this.matches(r))
        if (this.orderBy) {
          const [col, asc] = this.orderBy
          rows = [...rows].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1))
        }
        if (this.limitCount != null) rows = rows.slice(0, this.limitCount)
        return this.finish(rows.map((r) => withJoins(r, this.cols, table)))
      }

      if (this.op === 'delete') {
        const targets = db[table].filter((r) => this.matches(r) && canWrite(table, 'delete', r))
        db[table] = db[table].filter((r) => !targets.includes(r))
        cascade(table, targets)
        return { data: null, error: null }
      }

      if (this.op === 'update') {
        const targets = db[table].filter((r) => this.matches(r) && canWrite(table, 'update', r))
        targets.forEach((r) => Object.assign(r, this.payload))
        return this.returning ? this.finish(targets) : { data: null, error: null }
      }

      // insert / upsert
      const items = Array.isArray(this.payload) ? this.payload : [this.payload]
      const saved: Row[] = []
      for (const item of items) {
        if (!canWrite(table, 'insert', item)) return denied
        if (table === 'lesson_progress') {
          const dup = db.lesson_progress.find((r) => r.user_id === item.user_id && r.lesson_id === item.lesson_id)
          if (dup) { saved.push(dup); continue }
        }
        if (table === 'news_reads') {
          const dup = db.news_reads.find((r) => r.user_id === item.user_id && r.news_id === item.news_id)
          if (dup) { saved.push(dup); continue }
        }
        const key = PK[table] ?? 'id'
        const existing = db[table].find((r) => r[key] !== undefined && r[key] === item[key])
        if (existing && this.op === 'upsert') { Object.assign(existing, item); saved.push(existing); continue }
        if (table === 'enrollments' && enrolled(item.user_id, item.course_id)) return { data: null, error: { message: 'Доступ уже выдан' } }
        const noAutoId = PK[table] || table === 'lesson_progress' || table === 'news_reads'
        const row = { ...(noAutoId ? {} : { id: uid() }), ...(DEFAULTS[table]?.() ?? {}), ...item }
        db[table].push(row)
        saved.push(row)
        if (table === 'enrollments') syncRole(row.user_id)
      }
      return this.returning ? this.finish(saved) : { data: null, error: null }
    }
  }

  // Серверные функции админки (api/*.ts) в демо тоже имитируются
  const realFetch = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

    if (url.includes('/api/admin-create-user')) {
      if (!isStaffUser()) return reply(403, { error: 'Только для администратора' })
      const { email, fullName, courseIds } = JSON.parse(String(init?.body ?? '{}'))
      if (db.profiles.some((p) => p.email === email)) return reply(409, { error: 'Клиент с такой почтой уже есть — откройте его в списке и выдайте доступ' })
      const id = uid()
      db.profiles.push({ id, email, full_name: fullName || null, ...DEFAULTS.profiles() })
      for (const course_id of (courseIds ?? []) as string[]) {
        db.enrollments.push({ id: uid(), user_id: id, course_id, ...DEFAULTS.enrollments(), granted_by: userId })
      }
      syncRole(id)
      return reply(200, { userId: id })
    }

    if (url.includes('/api/admin-update-user')) {
      if (!isStaffUser()) return reply(403, { error: 'Только для администратора' })
      const { userId: targetId, email, role } = JSON.parse(String(init?.body ?? '{}'))
      if (isCurator() && role) return reply(403, { error: 'Рөлді тек әкімші өзгерте алады' })
      const p = db.profiles.find((x) => x.id === targetId)
      if (!p) return reply(404, { error: 'Пайдаланушы табылмады' })
      if (email) p.email = email
      if (role) p.role = role
      // Демода паролін нақты өзгерту мүмкін емес — тек нақты Supabase-те жұмыс істейді
      return reply(200, { ok: true })
    }

    if (url.includes('/api/admin-deactivate-user')) {
      if (!isAdmin()) return reply(403, { error: 'Только для администратора' })
      const { userIds, action } = JSON.parse(String(init?.body ?? '{}')) as { userIds: string[]; action: 'deactivate' | 'restore' | 'purge' }
      const results: Record<string, { ok: boolean; error?: string }> = {}
      for (const id of userIds) {
        const p = db.profiles.find((x) => x.id === id)
        if (!p) { results[id] = { ok: false }; continue }
        if (action === 'deactivate') {
          const own = db.enrollments.filter((e) => e.user_id === id)
          for (const e of own) db.enrollment_history.push({ id: uid(), user_id: e.user_id, course_id: e.course_id, granted_at: e.created_at, expires_at: e.expires_at, ended_at: new Date().toISOString(), reason: 'removed' })
          db.enrollments = db.enrollments.filter((e) => e.user_id !== id)
          p.role = 'free'
          p.deactivated_at = new Date().toISOString()
        } else if (action === 'purge') {
          if (!p.deactivated_at) { results[id] = { ok: false, error: 'Алдымен «толық жою» (деактивация) қажет' }; continue }
          db.profiles = db.profiles.filter((x) => x.id !== id)
          for (const table of Object.keys(db) as (keyof typeof db)[]) {
            db[table] = (db[table] as Row[]).filter((r) => r.user_id !== id && r.granted_by !== id && r.removed_by !== id)
          }
        } else {
          p.deactivated_at = null
        }
        results[id] = { ok: true }
      }
      return reply(200, { ok: Object.values(results).every((r) => r.ok), results })
    }

    return realFetch(input, init)
  }

  return {
    from: (table: string) => new Query(table),
    rpc: async (fn: string, args: Row) => {
      if (fn === 'expire_enrollments') {
        const now = Date.now()
        const gone = db.enrollments.filter((e) => e.expires_at && new Date(e.expires_at).getTime() <= now)
        for (const e of gone) db.enrollment_history.push({ id: uid(), user_id: e.user_id, course_id: e.course_id, granted_at: e.created_at, expires_at: e.expires_at, ended_at: new Date().toISOString(), reason: 'expired' })
        db.enrollments = db.enrollments.filter((e) => !gone.includes(e))
        return { data: null, error: null }
      }
      if (fn === 'admin_user_stats') return { data: db.profiles.map((p, i) => ({ user_id: p.id, last_sign_in_at: new Date(Date.now() - i * 86400000).toISOString(), email_confirmed_at: i === 2 ? null : p.created_at })), error: null }
      if (fn === 'note_password_changed') return { data: null, error: null }
      if (fn === 'remove_enrollment') {
        const e = db.enrollments.find((x) => x.user_id === args.p_user && x.course_id === args.p_course)
        if (e) {
          db.enrollment_history.push({ id: uid(), user_id: e.user_id, course_id: e.course_id, granted_at: e.created_at, expires_at: e.expires_at, ended_at: new Date().toISOString(), reason: 'removed' })
          db.enrollments = db.enrollments.filter((x) => x !== e)
          syncRole(e.user_id)
        }
        return { data: null, error: null }
      }
      if (fn !== 'confirm_payment') return { data: null, error: { message: 'Функция не найдена' } }
      if (!isAdmin()) return { data: null, error: { message: 'forbidden' } }
      const pay = db.payments.find((p) => p.id === args.p_payment)
      if (!pay) return { data: null, error: { message: 'payment not found' } }
      if (pay.status !== 'paid') {
        pay.status = 'paid'
        pay.paid_at = new Date().toISOString()
        if (!enrolled(pay.user_id, pay.course_id)) {
          db.enrollments.push({ id: uid(), user_id: pay.user_id, course_id: pay.course_id, ...DEFAULTS.enrollments(), source: 'payment' })
          syncRole(pay.user_id)
        }
      }
      return { data: null, error: null }
    },
    auth: {
      getSession: async () => ({ data: { session: makeSession() } }),
      onAuthStateChange: (cb: (event: string, session: any) => void) => {
        listeners.add(cb)
        return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }
      },
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        const known = Object.values(DEMO_USERS).find((u) => u.email === email)
        const p = db.profiles.find((x) => x.email === email)
        if (!p || (known && known.password !== password) || (!known && password.length < 8)) {
          return { data: null, error: { message: 'Invalid login credentials' } }
        }
        setUser(p.id)
        emit('SIGNED_IN')
        return { data: { session: makeSession() }, error: null }
      },
      signUp: async ({ email, options }: { email: string; password: string; options?: { data?: Row } }) => {
        if (db.profiles.some((p) => p.email === email)) return { data: null, error: { message: 'Такая почта уже зарегистрирована' } }
        const id = uid()
        db.profiles.push({ id, email, full_name: options?.data?.full_name ?? null, ...DEFAULTS.profiles() })
        setUser(id)
        emit('SIGNED_IN')
        return { data: { session: makeSession() }, error: null }
      },
      signOut: async () => { setUser(null); emit('SIGNED_OUT'); return { error: null } },
      resetPasswordForEmail: async () => ({ data: {}, error: null }),
      // Демода поштаға код жібермейміз — кез келген кодты қабылдаймыз, тек email дұрыс болсын
      verifyOtp: async ({ email }: { email: string; token: string; type: string }) => {
        const p = db.profiles.find((x) => x.email === email)
        if (!p) return { data: null, error: { message: 'Пайдаланушы табылмады' } }
        setUser(p.id)
        emit('SIGNED_IN')
        return { data: { session: makeSession() }, error: null }
      },
      updateUser: async (attrs: { email?: string; password?: string }) => {
        const p = me()
        if (p && attrs.email) p.email = attrs.email
        // Демода паролін сақтамаймыз — нақты Supabase-те ғана жұмыс істейді
        return { data: {}, error: null }
      },
    },
  }
}
