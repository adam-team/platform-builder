#!/usr/bin/env python3
"""Собирает картинки для выбора владельцем: designs.jpg (8 стилей) и structure.jpg (3 размера сайта).

  python3 reference/style-previews/build-previews.py

Источник данных стилей один: список STYLES ниже. Он же описан в patterns/README.md, при правке менять оба места.
Нужны Google Chrome (headless) и Pillow. Шрифты подтягиваются с Google Fonts, нужен интернет.
"""
import html
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# id, название, настроение, фон, поверхность, текст, приглушённый, бренд, акцент, радиус, шрифт заголовков, шрифт текста, тёмный
STYLES = [
    (1, "Спокойная школа", "Зелёный, воздух, мягкие карточки. Как в образце", "#faf8f4", "#ffffff", "#191d1a", "#6b6a63", "#1e7a4c", "#b6862c", 20, "Commissioner", "Commissioner", False),
    (2, "Деловой синий", "Чистый корпоративный, доверие, финансы, право", "#f4f7fd", "#ffffff", "#14213d", "#5b6783", "#2f5bd8", "#18a999", 12, "Manrope", "Manrope", False),
    (3, "Тёплый премиум", "Тёмный фон, золото, высокий чек, наставничество", "#14120e", "#1f1b15", "#f4efe4", "#a79f8e", "#d4a84a", "#f4efe4", 8, "Cormorant", "Onest", True),
    (4, "Мягкий коралл", "Тёплый, дружелюбный, красота, семья, творчество", "#fff6f0", "#ffffff", "#2b1a16", "#8a6b62", "#e4572e", "#f2a65a", 26, "Nunito", "Nunito", False),
    (5, "Минимал ч/б", "Строгий, много воздуха, текст и цифры на первом месте", "#ffffff", "#f5f5f5", "#0e0e0e", "#6a6a6a", "#111111", "#ff4d2e", 4, "Golos Text", "Golos Text", False),
    (6, "Тёмный техно", "IT, ИИ, маркетинг, градиенты и свечение", "#0b0d14", "#151927", "#eef0ff", "#8d93b3", "#7c5cff", "#2ee6c5", 16, "Unbounded", "Manrope", True),
    (7, "Спокойная природа", "Здоровье, психология, wellness, мягкие тона шалфея", "#f3f5ee", "#ffffff", "#232a24", "#6c7569", "#5b7f6a", "#c98b5a", 22, "Lora", "Nunito", False),
    (8, "Редакционный", "Журнальный, бордо, засечки, экспертный блог", "#fbf7f1", "#ffffff", "#221417", "#7a6a6c", "#8c1c3b", "#c9a15b", 6, "Playfair Display", "Golos Text", False),
]


def fonts_link():
    fams = sorted({s[10] for s in STYLES} | {s[11] for s in STYLES})
    q = "&".join("family=" + f.replace(" ", "+") + ":wght@400;600;700;800" for f in fams)
    return f"https://fonts.googleapis.com/css2?{q}&subset=cyrillic,cyrillic-ext,latin&display=swap"


def tile(s):
    n, name, mood, bg, surf, text, muted, brand, accent, rad, fh, fb, dark = s
    on_brand = "#0b0d14" if n in (3, 6) else "#ffffff"
    if n == 3:
        on_brand = "#14120e"
    return f"""
<div class="tile" style="background:{bg};color:{text};font-family:'{fb}',sans-serif">
  <div class="num" style="background:{brand};color:{on_brand}">{n}</div>
  <div class="name" style="font-family:'{fh}',serif;color:{text}">{html.escape(name)}</div>
  <div class="mood" style="color:{muted}">{html.escape(mood)}</div>
  <div class="card" style="background:{surf};border-radius:{rad}px;border:1px solid {muted}33">
    <div class="eyebrow" style="color:{accent}">КУРС · 12 УРОКОВ</div>
    <div class="h" style="font-family:'{fh}',serif">Қарызсыз өмір: жүйелі жол</div>
    <div class="p" style="color:{muted}">Әріптер: ә ғ қ ң ө ұ ү һ і. Русский текст рядом.</div>
    <div class="row">
      <span class="btn" style="background:{brand};color:{on_brand};border-radius:{max(rad-4,3)}px">Бастау</span>
      <span class="btn ghost" style="border:1.5px solid {brand};color:{brand};border-radius:{max(rad-4,3)}px">Толығырақ</span>
    </div>
  </div>
  <div class="sw">
    {''.join(f'<i style="background:{c}"></i>' for c in (bg, surf, brand, accent, text))}
  </div>
  <div class="fn" style="color:{muted}">{html.escape(fh)} / {html.escape(fb)}</div>
</div>"""


def designs_html():
    css = """
*{box-sizing:border-box;margin:0}
body{background:#e9e7e2;font-family:Inter,sans-serif;padding:28px;width:1700px}
h1{font:700 30px 'Manrope',sans-serif;margin-bottom:6px;color:#222}
.sub{color:#666;font:16px 'Manrope',sans-serif;margin-bottom:20px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.tile{padding:22px;border-radius:18px;position:relative;min-height:420px;box-shadow:0 2px 10px #0002}
.num{position:absolute;top:16px;right:16px;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font:800 20px 'Manrope',sans-serif}
.name{font-weight:700;font-size:26px;margin:6px 60px 4px 0;line-height:1.1}
.mood{font-size:14px;line-height:1.35;margin-bottom:14px;min-height:38px}
.card{padding:16px}
.eyebrow{font-size:11px;font-weight:700;letter-spacing:.08em;margin-bottom:8px}
.h{font-weight:700;font-size:21px;line-height:1.15;margin-bottom:8px}
.p{font-size:13px;line-height:1.4;margin-bottom:12px}
.row{display:flex;gap:8px}
.btn{font-size:13px;font-weight:700;padding:9px 14px}
.sw{display:flex;gap:6px;margin-top:14px}
.sw i{width:34px;height:34px;border-radius:8px;border:1px solid #0002;display:block}
.fn{font-size:13px;margin-top:10px}
"""
    tiles = "".join(tile(s) for s in STYLES)
    return f"""<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="{fonts_link()}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400&subset=cyrillic,latin&display=swap">
<style>{css}</style></head><body>
<h1>Выбери дизайн платформы: номер 1-8</h1>
<div class="sub">Или напиши свой: цвет бренда, настроение, сайт-образец. Справа вверху номер, внизу палитра и шрифты.</div>
<div class="grid">{tiles}</div></body></html>"""


def structure_html():
    variants = [
        ("А", "Минимум", "4 экрана. Быстрый старт, один курс.",
         ["Главная", "Курс", "Вход и регистрация", "Кабинет ученика"],
         ["Курс", "Профиль"], ["Пользователи", "Курсы"]),
        ("Б", "Школа", "8-9 экранов. Несколько курсов и услуги.",
         ["Главная", "Курсы", "Услуги", "Бесплатные уроки", "О эксперте", "Вход и регистрация", "Кабинет", "Профиль", "Конфиденциальность"],
         ["Басты", "Курсы", "Услуги", "Бесплатно", "Профиль"], ["Пользователи", "Задания", "Сайт", "Обучение", "Продажи"]),
        ("В", "Полный", "Всё из «Школы» плюс КП-страницы, новости, CRM, рассылки.",
         ["Всё из «Школы»", "КП-страницы под продукты", "Новости", "Магазин услуг", "Чат с куратором и поддержка", "Календарь событий", "Админка с CRM и рассылками"],
         ["Басты", "Курсы", "Ақылы", "Услуги", "Тегін", "Админка"], ["Пользователи", "Задания", "Сайт", "Обучение", "CRM", "Сообщения", "Продажи", "Приложения"]),
    ]
    cols = ""
    for k, name, desc, pages, tabs, admin in variants:
        cols += f"""<div class="col"><div class="badge">{k}</div><h2>{name}</h2><p class="d">{desc}</p>
<h3>Страницы</h3><ul>{''.join(f'<li>{html.escape(p)}</li>' for p in pages)}</ul>
<h3>Меню на телефоне</h3><div class="tabs">{''.join(f'<span>{html.escape(t)}</span>' for t in tabs)}</div>
<h3>Разделы админки</h3><div class="tabs adm">{''.join(f'<span>{html.escape(t)}</span>' for t in admin)}</div></div>"""
    css = """
*{box-sizing:border-box;margin:0}
body{background:#f4f1ea;font-family:'Manrope',sans-serif;padding:30px;width:1500px;color:#1d2420}
h1{font-size:30px;margin-bottom:6px}.sub{color:#666;margin-bottom:22px;font-size:16px}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.col{background:#fff;border-radius:20px;padding:24px;position:relative;box-shadow:0 2px 10px #0001}
.badge{position:absolute;top:18px;right:18px;width:44px;height:44px;border-radius:50%;background:#1e7a4c;color:#fff;display:grid;place-items:center;font-weight:800;font-size:20px}
h2{font-size:26px;margin-bottom:4px}.d{color:#6b6a63;font-size:14px;margin-bottom:12px;min-height:38px}
h3{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#1e7a4c;margin:14px 0 6px}
ul{padding-left:18px;font-size:14px;line-height:1.6}
.tabs{display:flex;flex-wrap:wrap;gap:6px}.tabs span{background:#e4f3ea;border-radius:99px;padding:6px 12px;font-size:13px;font-weight:600}
.adm span{background:#eaf0fe}
"""
    return f"""<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&subset=cyrillic,latin&display=swap">
<style>{css}</style></head><body><h1>Какого размера нужен сайт? А, Б или В</h1>
<div class="sub">Можно взять один вариант и добавить или убрать пункты. Названия меню потом меняются.</div>
<div class="cols">{cols}</div></body></html>"""


def shot(html_text, out_jpg, w, h):
    from PIL import Image
    with tempfile.TemporaryDirectory() as d:
        src = os.path.join(d, "p.html")
        png = os.path.join(d, "p.png")
        open(src, "w", encoding="utf-8").write(html_text)
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--window-size={w},{h}",
                        "--virtual-time-budget=15000", f"--screenshot={png}", "file://" + src],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        Image.open(png).convert("RGB").save(out_jpg, quality=88)
    print("ok", out_jpg)


if __name__ == "__main__":
    shot(designs_html(), os.path.join(HERE, "designs.jpg"), 1756, 1010)
    shot(structure_html(), os.path.join(HERE, "structure.jpg"), 1560, 760)
