import SettingsForm, { URL_HINT } from './SettingsForm'
import type { EditTab } from './EditDrawer'
import AdminNews from '../pages/admin/AdminNews'
import AdminServices from '../pages/admin/AdminServices'
import AdminFreeLessons from '../pages/admin/AdminFreeLessons'
import { DEFAULT_ABOUT_MORE_LIST, DEFAULT_CASES_LIST, DEFAULT_COMPANY_LIST, DEFAULT_FREE_OUTRO_LIST } from '../lib/content'

// Әр беттің «Өзгерту» терезесіндегі қойындылар. `reload` — сақтаудан кейін бет өзін жаңартады.

export function homeTabs(reload: () => void): EditTab[] {
  return [
    {
      id: 'hero', label: 'Басты блок',
      node: <SettingsForm onSaved={reload} fields={[
        { key: 'expert_name', label: 'Маманның аты-жөні' },
        { key: 'expert_role', label: 'Мамандығы (жоғарғы кіші жазу)' },
        { key: 'hero_photo_url', label: 'Басты фото (басты беттің, «Эксперт туралы» және қызметтердің фотосы)', kind: 'image' },
        { key: 'hero_title', label: 'Басты тақырып', kind: 'textarea', rows: 2 },
        { key: 'hero_subtitle', label: 'Қосымша мәтін', kind: 'textarea', rows: 3 },
        { heading: '1-батырма (ақ)' },
        { pair: [{ key: 'hero_btn1_label', label: 'Жазуы' }, { key: 'hero_btn1_url', label: 'Сілтемесі' }] },
        { heading: '2-батырма' },
        { pair: [{ key: 'hero_btn2_label', label: 'Жазуы' }, { key: 'hero_btn2_url', label: 'Сілтемесі' }] },
        { heading: '3-батырма' },
        { pair: [{ key: 'hero_btn3_label', label: 'Жазуы' }, { key: 'hero_btn3_url', label: 'Сілтемесі' }] },
        { note: URL_HINT },
        { heading: 'Цифрлар (статистика)' },
        ...[1, 2, 3, 4].map((n) => ({ pair: [{ key: `stat${n}_value`, label: 'Мәні' }, { key: `stat${n}_label`, label: 'Жазуы' }] as [{ key: string; label: string }, { key: string; label: string }], narrow: true })),
      ]} />,
    },
    {
      id: 'goals', label: 'Мақсаттар',
      node: <SettingsForm onSaved={reload} fields={[
        { key: 'goals_eyebrow', label: 'Кіші тақырып' },
        { key: 'goals_title', label: 'Тақырып' },
        { key: 'goals_text', label: 'Мәтін' },
        { key: 'goal_link_label', label: 'Карточкадағы сілтеме жазуы' },
        ...[1, 2, 3, 4].flatMap((n) => [
          { heading: ['Қарыз', 'Жинақ', 'Үй', 'Ипотека PRO'][n - 1] + ' картасы (бағыты тұрақты, тек мәтіні)' },
          { key: `goal${n}_title`, label: 'Тақырып' },
          { key: `goal${n}_text`, label: 'Мәтін', kind: 'textarea' as const, rows: 2 },
        ]),
      ]} />,
    },
    {
      id: 'about', label: 'Эксперт туралы',
      node: <SettingsForm onSaved={reload}
        fields={[
          { key: 'about_eyebrow', label: 'Кіші тақырып' },
          { key: 'about_title', label: 'Аты' },
          { key: 'about_text', label: 'Қысқа кіріспе (абзацтар бос жолмен бөлінеді; алғашқы 2 абзац әрқашан көрінеді)', kind: 'textarea', rows: 8 },
          { key: 'about_toggle_label', label: '«Толығырақ» батырмасының жазуы' },
        ]}
        lists={[{ key: 'about_more_list', label: '«Толығырақ» астындағы тізім (әр жол — жеке пункт)', defaults: DEFAULT_ABOUT_MORE_LIST }]}
      />,
    },
    {
      id: 'free', label: 'Тегін сабақтар',
      node: (
        <>
          <SettingsForm onSaved={reload} fields={[
            { key: 'free_eyebrow', label: 'Кіші тақырып' },
            { key: 'free_title', label: 'Тақырып', kind: 'textarea', rows: 2 },
            { key: 'free_text', label: 'Мәтін', kind: 'textarea', rows: 2 },
            { key: 'free_home_button_label', label: '«Барлық сабақтарды көру» батырмасының жазуы' },
          ]} />
          <h3>Бейне-сабақтар (сілтеме, жаңа қосу)</h3>
          <AdminFreeLessons onChanged={reload} />
        </>
      ),
    },
    {
      id: 'news', label: 'Жаңалықтар',
      node: (
        <>
          <SettingsForm onSaved={reload} fields={[
            { key: 'news_eyebrow', label: 'Кіші тақырып' },
            { key: 'news_title', label: 'Тақырып' },
          ]} />
          <AdminNews onChanged={reload} />
        </>
      ),
    },
    {
      id: 'final', label: 'Төменгі шақыру',
      node: <SettingsForm onSaved={reload} fields={[
        { key: 'final_cta_title', label: 'Тақырып' },
        { key: 'final_cta_text', label: 'Мәтін', kind: 'textarea', rows: 2 },
        { key: 'final_cta_label', label: 'Батырма жазуы' },
        { key: 'final_cta_url', label: 'Батырма сілтемесі (басты бетте де, «Тегін сабақтар» бетінде де)', kind: 'url' },
      ]} />,
    },
  ]
}

export function servicesTabs(reload: () => void): EditTab[] {
  return [
    {
      id: 'head', label: 'Тақырып',
      node: <SettingsForm onSaved={reload} fields={[
        { key: 'services_eyebrow', label: 'Кіші тақырып' },
        { key: 'services_title', label: 'Тақырып', kind: 'textarea', rows: 2 },
        { key: 'services_text', label: 'Мәтін', kind: 'textarea', rows: 2 },
      ]} />,
    },
    {
      id: 'company', label: 'Компания',
      node: <SettingsForm onSaved={reload}
        fields={[
          { key: 'company_eyebrow', label: 'Кіші тақырып' },
          { key: 'company_title', label: 'Тақырып' },
          { key: 'company_text', label: 'Мәтін', kind: 'textarea', rows: 3 },
          { key: 'company_list_intro', label: 'Тізім алдындағы жол' },
        ]}
        lists={[{ key: 'company_list', label: 'Тізім (әр жол — жеке пункт)', rows: 7, defaults: DEFAULT_COMPANY_LIST }]}
      />,
    },
    {
      id: 'cases', label: 'Кейстер',
      node: <SettingsForm onSaved={reload}
        fields={[
          { key: 'cases_eyebrow', label: 'Кіші тақырып' },
          { key: 'cases_title', label: 'Тақырып' },
          { key: 'cases_text', label: 'Мәтін', kind: 'textarea', rows: 3 },
          { key: 'cases_list_intro', label: 'Тізім алдындағы жол' },
          { pair: [{ key: 'cases_cta', label: 'Батырма жазуы' }, { key: 'cases_cta_url', label: 'Батырма сілтемесі' }] },
          { note: URL_HINT },
        ]}
        lists={[{ key: 'cases_list', label: 'Тізім (әр жол — жеке пункт)', rows: 6, defaults: DEFAULT_CASES_LIST }]}
      />,
    },
    {
      id: 'services', label: 'Қызметтер',
      node: <AdminServices onChanged={reload} />,
    },
  ]
}

export function freeLessonsTabs(reload: () => void): EditTab[] {
  return [
    {
      id: 'texts', label: 'Мәтіндер',
      node: <SettingsForm onSaved={reload}
        fields={[
          { key: 'free_eyebrow', label: 'Кіші тақырып' },
          { key: 'free_title', label: 'Тақырып', kind: 'textarea', rows: 2 },
          { key: 'free_text', label: 'Мәтін', kind: 'textarea', rows: 2 },
          ...[1, 2, 3].flatMap((n) => [
            { heading: `${String(n).padStart(2, '0')}-қадам` },
            { key: `free_step${n}_title`, label: 'Тақырып' },
            { key: `free_step${n}_text`, label: 'Мәтін', kind: 'textarea' as const, rows: 2 },
          ]),
          { heading: 'Төменгі блок' },
          { key: 'free_outro', label: 'Кіріспе сөйлем', kind: 'textarea', rows: 2 },
        ]}
        lists={[{ key: 'free_outro_list', label: '«Сіз:» тізімі (әр жол — жеке пункт)', rows: 6, defaults: DEFAULT_FREE_OUTRO_LIST }]}
      />,
    },
    {
      id: 'lessons', label: 'Сабақтар (видео)',
      node: <AdminFreeLessons onChanged={reload} />,
    },
    {
      id: 'materials', label: 'Материалдар мен шақыру',
      node: <SettingsForm onSaved={reload} fields={[
        { heading: '«Дайын құралдар» блогы' },
        { key: 'free_materials_title', label: 'Тақырып' },
        { key: 'free_materials_text', label: 'Мәтін', kind: 'textarea', rows: 2 },
        { pair: [{ key: 'free_materials_cta', label: 'Батырма жазуы' }, { key: 'free_materials_url', label: 'Батырма сілтемесі' }] },
        { note: URL_HINT },
        { heading: 'Беттің төменіндегі шақыру' },
        { key: 'final_cta_title', label: 'Тақырып' },
        { key: 'final_cta_text', label: 'Мәтін', kind: 'textarea', rows: 2 },
        { pair: [{ key: 'final_cta_label', label: 'Батырма жазуы' }, { key: 'final_cta_url', label: 'Батырма сілтемесі' }] },
      ]} />,
    },
  ]
}
