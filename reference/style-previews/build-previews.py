#!/usr/bin/env python3
"""Собирает картинки для выбора и каталоги из одного источника данных.

  python3 reference/style-previews/build-previews.py            # всё
  python3 reference/style-previews/build-previews.py fonts-4 tables   # только указанное

Источники (правим только их):
  patterns/designs.json  все дизайны (номер, палитра, шрифты, радиус)
  patterns/fonts.json    все шрифты (проверка казахских букв, пакет @fontsource)

Результат:
  reference/style-previews/designs-A.jpg ... designs-E.jpg   выбор дизайна (номер на картинке)
  reference/style-previews/fonts-1.jpg ... fonts-4.jpg       образцы шрифтов на русском, казахском, английском
  reference/style-previews/structure.jpg                     выбор размера сайта (А, Б, В)
  patterns/CATALOG.md, patterns/FONTS.md                     таблицы для агента

Нужны Google Chrome (headless) и Pillow. Шрифты подтягиваются с Google Fonts, нужен интернет.
"""
import html
import json
import os
import subprocess
import tempfile
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
PAT = os.path.join(ROOT, "patterns")
CHROME = os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

DESIGNS = json.load(open(os.path.join(PAT, "designs.json"), encoding="utf-8"))
FONTS = json.load(open(os.path.join(PAT, "fonts.json"), encoding="utf-8"))
FONT = {f["name"]: f for f in FONTS}
CUSTOM_N = len(DESIGNS) + 1
KK_SAMPLE = "Әріптер: ә ғ қ ң ө ұ ү һ і"


def fonts_link(names):
    """Одна ссылка Google Fonts только на нужные листу шрифты (весь каталог сразу грузится минутами)."""
    need = {"Manrope": {400, 600, 700, 800}}
    for n in names:
        if n in FONT:
            f = FONT[n]
            need.setdefault(n, set()).update([w for w in (400, 600, 700, 800) if w in f["weights"]] or f["weights"][:1])
    for d in DESIGNS:
        for fam, w in ((d["fh"], d.get("fh_w", 700)), (d["fb"], 400), (d.get("mono"), 400)):
            if fam in need and w in FONT[fam]["weights"]:
                need[fam].add(w)
    parts = []
    for name, ws in sorted(need.items()):
        parts.append("family=" + urllib.parse.quote(name).replace("%20", "+") + ":wght@" + ";".join(str(w) for w in sorted(ws)))
    return "https://fonts.googleapis.com/css2?" + "&".join(parts) + "&display=swap"


def fstack(name):
    t = FONT.get(name, {}).get("type", "sans")
    return f"'{name}',{'serif' if t == 'serif' else 'monospace' if t == 'mono' else 'sans-serif'}"


def _lum(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda v: v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def readable(fg, bg, fallback):
    """Цвет подписи: берём fg, если он читается на bg (контраст от 3:1), иначе fallback."""
    a, b = sorted((_lum(fg), _lum(bg)), reverse=True)
    return fg if (a + 0.05) / (b + 0.05) >= 3 else fallback


def kk_fix(d):
    """Какие шрифты дизайна не рисуют казахские буквы и чем их заменить."""
    out = []
    for key in ("fh", "fb", "mono"):
        n = d.get(key)
        if n and n in FONT and not FONT[n]["kk"]:
            out.append((n, FONT[n]["kk_alt"]))
    return out


def tile(d):
    on = d["on_brand"]
    rad = d["radius"]
    btn = max(rad - 4, 3)
    fixes = kk_fix(d)
    kk_font = FONT[fixes[0][1]]["name"] if fixes else d["fb"]
    badge = ("KK ✓" if not fixes else "KK → " + ", ".join(sorted({b for _, b in fixes})))
    badge_bg = "#1f7a4d" if not fixes else "#b8741a"
    muted = d["muted"]
    mono = ""
    if d.get("mono"):
        mono = f"<div class='mono' style=\"font-family:{fstack(d['mono'])};color:{d['accent'] if d['dark'] else d['brand']}\">// 02 / 07 · тег</div>"
    return f"""
<div class="tile" style="background:{d['bg']};color:{d['text']};font-family:{fstack(d['fb'])}">
  <div class="num" style="background:{d['brand']};color:{on}">{d['n']}</div>
  <div class="name" style="font-family:{fstack(d['fh'])};font-weight:{d.get('fh_w', 700)}">{html.escape(d['name'])}</div>
  <div class="src" style="color:{muted}">{html.escape(d['sub'] or d['source'])}</div>
  <div class="mood" style="color:{muted}">{html.escape(d['mood'])}</div>
  <div class="card" style="background:{d['surface']};border-radius:{rad}px;border:1px solid {muted}33">
    {mono}
    <div class="eyebrow" style="color:{readable(d['accent'], d['surface'], readable(d['brand'], d['surface'], d['text']))}">КУРС · 12 УРОКОВ</div>
    <div class="h" style="font-family:{fstack(d['fh'])};font-weight:{d.get('fh_w', 700)}">Твой первый шаг к результату</div>
    <div class="p" style="color:{muted}">Тегін консультация · Бастау. Русский текст рядом.</div>
    <div class="row">
      <span class="btn" style="background:{d['brand']};color:{on};border-radius:{btn}px">Начать</span>
      <span class="btn ghost" style="border:1.5px solid {d['brand'] if d['brand'] != d['bg'] else d['text']};color:{d['brand'] if d['brand'] != d['bg'] else d['text']};border-radius:{btn}px">Подробнее</span>
    </div>
  </div>
  <div class="sw">{''.join(f'<i style="background:{c}"></i>' for c in (d['bg'], d['surface'], d['brand'], d['accent'], d['text']))}</div>
  <div class="fn" style="color:{muted}">{html.escape(d['fh'])} / {html.escape(d['fb'])}</div>
  <div class="kk" style="font-family:{fstack(kk_font)};color:{muted}">{KK_SAMPLE}</div>
  <div class="bd" style="background:{badge_bg}">{html.escape(badge)}</div>
</div>"""


def custom_tile():
    return f"""
<div class="tile custom">
  <div class="num" style="background:#111;color:#fff">{CUSTOM_N}</div>
  <div class="name" style="font-family:'Manrope',sans-serif;font-weight:800">Свой дизайн</div>
  <div class="src">Твой стиль, не из каталога</div>
  <div class="mood" style="color:#555">Пришли то, что тебе нравится: PDF или скриншот дизайна, ссылку на сайт-образец, цвет бренда и названия шрифтов.</div>
  <div class="card" style="background:#fff;border-radius:16px;border:2px dashed #999;text-align:center;padding:22px 12px">
    <div style="font-size:34px;line-height:1">＋</div>
    <div class="h" style="font-family:'Manrope',sans-serif;font-size:17px;margin-top:8px">Отправь свой дизайн</div>
    <div class="p" style="color:#666;margin:6px 0 0">Агент вытащит цвета и шрифты, проверит казахские буквы и соберёт стиль</div>
  </div>
  <div class="fn" style="color:#555;margin-top:14px">Подойдёт: PDF, JPG, PNG, ссылка, фирменные цвета</div>
</div>"""


CSS_DESIGNS = """
*{box-sizing:border-box;margin:0}
body{background:#e9e7e2;font-family:Manrope,sans-serif;padding:26px;width:1756px}
h1{font:800 28px 'Manrope',sans-serif;margin-bottom:4px;color:#222}
.sub{color:#666;font:15px 'Manrope',sans-serif;margin-bottom:18px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.tile{padding:20px;border-radius:18px;position:relative;min-height:470px;box-shadow:0 2px 10px #0002;overflow:hidden}
.tile.custom{background:#f4f3ef;border:2px dashed #aaa;box-shadow:none}
.num{position:absolute;top:14px;right:14px;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font:800 19px 'Manrope',sans-serif}
.name{font-size:24px;margin:4px 56px 2px 0;line-height:1.1}
.src{font-size:12px;margin-bottom:6px;opacity:.85}
.mood{font-size:13px;line-height:1.35;margin-bottom:12px;min-height:52px}
.card{padding:14px}
.mono{font-size:11px;margin-bottom:6px}
.eyebrow{font-size:11px;font-weight:700;letter-spacing:.08em;margin-bottom:6px}
.h{font-size:19px;line-height:1.15;margin-bottom:6px}
.p{font-size:12.5px;line-height:1.4;margin-bottom:10px}
.row{display:flex;gap:8px}
.btn{font-size:12.5px;font-weight:700;padding:8px 13px}
.sw{display:flex;gap:6px;margin-top:12px}
.sw i{width:32px;height:32px;border-radius:8px;border:1px solid #0002;display:block}
.fn{font-size:12.5px;margin-top:9px}
.kk{font-size:13px;margin-top:5px}
.bd{display:inline-block;color:#fff;font:700 11px 'Manrope',sans-serif;padding:3px 9px;border-radius:99px;margin-top:8px}
"""


def designs_sheets():
    groups = {}
    for d in DESIGNS:
        groups.setdefault(d["group"], []).append(d)
    sheets = []  # (file letter, title, subtitle, tiles)
    keys = list(groups)
    for gi, k in enumerate(keys):
        items = groups[k]
        parts = -(-len(items) // 8)
        size = -(-len(items) // parts)
        for pi in range(parts):
            chunk = items[pi * size:(pi + 1) * size]
            sheets.append([k if parts == 1 else f"{k}{pi + 1}", items[0]["group_name"], chunk])
    sheets[-1][2] = sheets[-1][2] + [None]  # последний лист получает плитку «свой»
    return sheets


def sheet_fonts(chunk):
    names = set()
    for d in chunk:
        if d:
            names.update(x for x in (d["fh"], d["fb"], d.get("mono")) if x)
            names.update(b for _, b in kk_fix(d))
    return names


def designs_html(title, chunk, total_note):
    tiles = "".join(custom_tile() if d is None else tile(d) for d in chunk)
    nums = [d["n"] for d in chunk if d]
    rng = f"{nums[0]}–{nums[-1]}"
    extra = f", и {CUSTOM_N}: свой дизайн" if chunk[-1] is None else ""
    return f"""<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="{fonts_link(sheet_fonts(chunk))}">
<style>{CSS_DESIGNS}</style></head><body>
<h1>{html.escape(title)}: номера {rng}{extra}</h1>
<div class="sub">Выбери номер (всего вариантов: {CUSTOM_N}). Справа вверху номер, внизу палитра и шрифты. Плашка KK: «✓» казахские буквы есть в шрифте, «→ шрифт» агент заменит шрифт на этот для казахского текста. {html.escape(total_note)}</div>
<div class="grid">{tiles}</div></body></html>"""


def font_tile(f):
    ok = f["kk"]
    cyr = f["cyr"]
    badge = "Казахский ✓" if ok else ("Казахский ✗ → " + (f["kk_alt"] or "другой") if cyr else "Кириллицы нет")
    bg = "#1f7a4d" if ok else "#b8741a"
    w = [x for x in (400, 700) if x in f["weights"]] or f["weights"][:1]
    big = max(w)
    return f"""
<div class="ft">
  <div class="top"><div class="nm" style="font-family:{fstack(f['name'])};font-weight:{big}">{html.escape(f['name'])}</div><span class="bd" style="background:{bg}">{html.escape(badge)}</span></div>
  <div class="ty">{ {'sans':'без засечек','serif':'с засечками','display':'для заголовков','mono':'моноширинный'}[f['type']] } · {html.escape(f['pkg'])}</div>
  <div class="l1" style="font-family:{fstack(f['name'])};font-weight:{big}">Съешь ещё этих мягких булок</div>
  <div class="l2" style="font-family:{fstack(f['name'])};font-weight:{w[0]}">Әріптер: ә ғ қ ң ө ұ ү һ і Ә Ғ Қ Ң Ө Ұ Ү Һ</div>
  <div class="l3" style="font-family:{fstack(f['name'])};font-weight:{w[0]}">Quick brown fox 0123456789 ₸</div>
  <div class="nt">{html.escape(f['note'])}</div>
</div>"""


CSS_FONTS = """
*{box-sizing:border-box;margin:0}
body{background:#f4f1ea;font-family:Manrope,sans-serif;padding:26px;width:1756px;color:#1d2420}
h1{font:800 28px 'Manrope',sans-serif;margin-bottom:4px}.sub{color:#666;font-size:15px;margin-bottom:18px}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}
.ft{background:#fff;border-radius:16px;padding:16px;box-shadow:0 2px 8px #0001;min-height:205px}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.nm{font-size:21px;line-height:1.1}
.bd{color:#fff;font:700 10.5px 'Manrope',sans-serif;padding:3px 8px;border-radius:99px;white-space:nowrap}
.ty{font-size:11.5px;color:#7a7a72;margin:4px 0 10px}
.l1{font-size:17px;line-height:1.25;margin-bottom:6px}
.l2{font-size:14px;line-height:1.35;margin-bottom:6px}
.l3{font-size:14px;margin-bottom:8px}
.nt{font-size:12px;color:#6b6a63;line-height:1.35}
"""


def fonts_sheets():
    order = {"sans": 0, "display": 1, "serif": 2, "mono": 3}
    fs = sorted(FONTS, key=lambda f: (order[f["type"]], 0))
    # стабильный порядок как в JSON внутри типа
    fs = [f for t in sorted(order, key=order.get) for f in FONTS if f["type"] == t]
    return [fs[i:i + 10] for i in range(0, len(fs), 10)]


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
        cmd = [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--user-data-dir={os.path.join(d, 'profile')}",
               f"--window-size={w},{h}", "--virtual-time-budget=20000", f"--screenshot={png}", "file://" + src]
        for attempt in range(3):
            r = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
            # Chrome иногда падает при закрытии, уже записав файл: считаем успехом, если скриншот есть
            if os.path.exists(png) and os.path.getsize(png) > 1000:
                break
        else:
            raise SystemExit("Chrome не сделал скриншот: " + r.stderr[-400:])
        im = Image.open(png).convert("RGB")
        from PIL import ImageChops
        bg = Image.new("RGB", im.size, im.getpixel((3, im.size[1] - 3)))
        box = ImageChops.difference(im, bg).getbbox()
        if box:
            im = im.crop((0, 0, im.size[0], min(im.size[1], box[3] + 26)))
        im.save(out_jpg, quality=86)
    print("ok", out_jpg)


def write_catalog():
    lines = ["# Каталог дизайнов", "",
             "Файл собирается скриптом `reference/style-previews/build-previews.py` из `patterns/designs.json`. Руками не править.", "",
             f"Готовых дизайнов: {len(DESIGNS)}, и вариант {CUSTOM_N}: свой. Картинки выбора: `reference/style-previews/designs-*.jpg`.",
             "Колонка **KK**: «ок» значит оба шрифта рисуют казахские буквы `ә ғ қ ң ө ұ ү һ і`; «→ X» значит для казахского интерфейса шрифт нужно заменить на X.", ""]
    cur = None
    for d in DESIGNS:
        if d["group"] != cur:
            cur = d["group"]
            if len(lines) > 7:
                lines.append("")
            lines += [f"## {d['group_name']}", "",
                      "| № | Название | Откуда | Для чего | Фон | Поверхность | Текст | Бренд | Акцент | Радиус | Шрифты (заголовки / текст) | Тема | KK |",
                      "|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
        fx = kk_fix(d)
        kk = "ок" if not fx else "→ " + ", ".join(sorted({b for _, b in fx}))
        fonts = f"{d['fh']} / {d['fb']}" + (f" / {d['mono']}" if d.get("mono") else "")
        lines.append(f"| {d['n']} | {d['name']}{(' (' + d['sub'] + ')') if d['sub'] else ''} | {d['source']} | {d['niche']} | `{d['bg']}` | `{d['surface']}` | `{d['text']}` | `{d['brand']}` | `{d['accent']}` | {d['radius']} | {fonts} | {'тёмная' if d['dark'] else 'светлая'} | {kk} |")
        if d["group"] != cur:
            pass
    lines += ["", f"## {CUSTOM_N}. Свой дизайн", "",
              "Ученик присылает PDF, скриншот, ссылку на сайт-образец или называет цвет бренда и шрифты. Порядок работы: `patterns/README.md`, раздел «Свой дизайн».", ""]
    lines += ["## Особенности оформления", "",
              "Для дизайнов из PDF и проектов выше записаны фирменные приёмы (меню, карточки, подача). Они не входят в базовое применение стиля и ставятся только если владелец попросит: фиксируй в `DECISIONS.md`.", ""]
    for d in DESIGNS:
        if d.get("feel"):
            lines.append(f"- **{d['n']}. {d['name']}**: {d['feel']}")
        if d.get("extra"):
            lines.append(f"  - доп. цвета: " + ", ".join(f"{k} `{v}`" for k, v in d["extra"].items()))
    open(os.path.join(PAT, "CATALOG.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("ok patterns/CATALOG.md")


def write_fonts_md():
    used = {}
    for d in DESIGNS:
        for key in ("fh", "fb", "mono"):
            n = d.get(key)
            if n:
                used.setdefault(n, []).append(d["n"])
    lines = ["# Каталог шрифтов", "",
             "Файл собирается скриптом `reference/style-previews/build-previews.py` из `patterns/fonts.json`. Руками не править.", "",
             "Казахские буквы проверены по реальным файлам шрифтов (Google Fonts): `ә ғ қ ң ө ұ ү һ і` строчные и заглавные. Образцы: `reference/style-previews/fonts-*.jpg`.", "",
             "Все шрифты бесплатные (лицензия SIL OFL или Apache 2.0), подключаются пакетом `@fontsource/...` и отдаются со своего сайта.", "",
             "**Важно про казахский.** `Manrope`, `Unbounded`, `JetBrains Mono`, `Tenor Sans` и `Jost` не содержат казахских букв (или части из них): браузер подставит запасной шрифт, и текст будет выглядеть неровно. "
             "Если интерфейс на казахском, берётся замена из колонки «Замена для казахского».", "",
             "| Шрифт | Тип | Казахский | Замена для казахского | Пакет | Начертания | В дизайнах № | Характер |",
             "|---|---|---|---|---|---|---|---|"]
    tn = {"sans": "без засечек", "display": "для заголовков", "serif": "с засечками", "mono": "моноширинный"}
    for f in FONTS:
        kk = "да" if f["kk"] else "нет"
        lines.append(f"| {f['name']} | {tn[f['type']]} | {kk} | {f['kk_alt'] or ''} | `{f['pkg']}` | {', '.join(str(w) for w in f['weights'])} | {', '.join(str(x) for x in used.get(f['name'], [])) or ''} | {f['note']} |")
    lines += ["", "## Как подключить шрифт", "",
              "```bash", "cd projects/<id>/site", "npm install @fontsource/<имя>", "```", "",
              "В `src/main.tsx`: `import '@fontsource/<имя>/400.css'` (и нужные начертания 500, 600, 700). Имя в `--font` в `src/styles.css`. "
              "Пара «заголовки / текст» берётся из выбранного дизайна. Ненужные пакеты предыдущих шрифтов убрать из `package.json`.", ""]
    open(os.path.join(PAT, "FONTS.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("ok patterns/FONTS.md")


if __name__ == "__main__":
    only = set(os.sys.argv[1:])  # например: fonts-4 structure tables (без аргументов собирается всё)
    want = lambda name: not only or name in only
    sheets = designs_sheets()
    for letter, title, chunk in sheets:
        if not want(f"designs-{letter}"):
            continue
        shot(designs_html(title, chunk, "Или номер " + str(CUSTOM_N) + ": пришли свой дизайн."), os.path.join(HERE, f"designs-{letter}.jpg"), 1782, 1100)
    for i, chunk in enumerate(fonts_sheets(), 1):
        if not want(f"fonts-{i}"):
            continue
        h = (f"""<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="{fonts_link([f["name"] for f in chunk])}"><style>{CSS_FONTS}</style></head><body>
<h1>Шрифты: образцы на русском, казахском и английском (лист {i})</h1>
<div class="sub">Зелёная плашка: казахские буквы есть. Оранжевая: нужна замена для казахского интерфейса. Можно выбрать любой шрифт для заголовков и любой для текста.</div>
<div class="grid">{''.join(font_tile(f) for f in chunk)}</div></body></html>""")
        shot(h, os.path.join(HERE, f"fonts-{i}.jpg"), 1782, 780)
    if want("structure"):
        shot(structure_html(), os.path.join(HERE, "structure.jpg"), 1560, 760)
    if want("tables"):
        write_catalog()
        write_fonts_md()
