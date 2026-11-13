#!/usr/bin/env python3
"""Печатает готовый блок стилей для выбранного дизайна из patterns/designs.json.

  python3 scripts/design-tokens.py 3            # дизайн номер 3
  python3 scripts/design-tokens.py 3 --kk       # интерфейс на казахском: шрифты без казахских букв заменяются
  python3 scripts/design-tokens.py 3 --with-dark  # для светлого дизайна добавить черновик тёмной темы
  python3 scripts/design-tokens.py list         # список номеров и названий
  python3 scripts/design-tokens.py projects/<id>/design.custom.json   # свой дизайн (вариант 33)

Скрипт ничего не меняет в проекте: он печатает переменные `:root` для `src/styles.css`, пакеты шрифтов
и импорты для `src/main.tsx`. Агент вставляет их сам и проверяет `npm run build`.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESIGNS = json.load(open(os.path.join(ROOT, "patterns", "designs.json"), encoding="utf-8"))
FONTS = {f["name"]: f for f in json.load(open(os.path.join(ROOT, "patterns", "fonts.json"), encoding="utf-8"))}


def rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def hexs(c):
    return "#%02x%02x%02x" % tuple(max(0, min(255, round(v))) for v in c)


def mix(a, b, t):
    """t доля цвета b."""
    A, B = rgb(a), rgb(b)
    return hexs(tuple(A[i] * (1 - t) + B[i] * t for i in range(3)))


def darken(c, t):
    return mix(c, "#000000", t)


def lighten(c, t):
    return mix(c, "#ffffff", t)


def lum(c):
    def f(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = rgb(c)
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def contrast(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def rgba(c, a):
    r, g, b = rgb(c)
    return f"rgba({r}, {g}, {b}, {a})"


def stack(name):
    t = FONTS.get(name, {}).get("type", "sans")
    tail = "Georgia, 'Times New Roman', serif" if t == "serif" else "ui-monospace, Menlo, monospace" if t == "mono" else "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    return f"'{name}', {tail}"


def custom(path):
    """Свой дизайн (вариант 33): JSON с полями name, bg, surface, text, muted, brand, accent, radius, fh, fb."""
    d = json.load(open(path, encoding="utf-8"))
    need = ("bg", "surface", "text", "muted", "brand", "fh", "fb")
    miss = [k for k in need if k not in d]
    if miss:
        sys.exit("В своём дизайне не хватает полей: " + ", ".join(miss))
    d.setdefault("n", len(DESIGNS) + 1)
    d.setdefault("name", "Свой дизайн")
    d.setdefault("source", "Свой дизайн ученика")
    d.setdefault("accent", d["brand"])
    d.setdefault("radius", 16)
    d.setdefault("fh_w", 700)
    d.setdefault("dark", lum(d["bg"]) < 0.2)
    d.setdefault("on_brand", "#FFFFFF" if contrast("#FFFFFF", d["brand"]) >= contrast("#111111", d["brand"]) else "#111111")
    return d


def pick(n):
    for d in DESIGNS:
        if d["n"] == n:
            return d
    sys.exit(f"Нет дизайна номер {n}. Свой дизайн (номер {len(DESIGNS) + 1}) собирается по patterns/README.md, раздел «Свой дизайн».")


def block(d, kk):
    bg, sf, tx, mu, br, ac = d["bg"], d["surface"], d["text"], d["muted"], d["brand"], d["accent"]
    brand_dark = d.get("brand_dark") or darken(br, 0.38)
    brand_soft = d.get("brand_soft") or mix(sf, br, 0.10)
    r = d["radius"]
    sh = "#000000" if d["dark"] else tx
    lines = [
        f"  --bg: {bg};", f"  --surface: {sf};", f"  --surface-2: {mix(bg, tx, 0.045)};",
        f"  --text: {tx};", f"  --muted: {mu};",
        f"  --border: {rgba(tx, 0.09)};", f"  --hairline: {rgba(tx, 0.07)};",
        "",
        f"  --brand: {br};", f"  --brand-dark: {brand_dark};",
        f"  --brand-gradient: linear-gradient(135deg, {lighten(br, 0.14)} 0%, {brand_dark} 100%);",
        f"  --brand-soft: {brand_soft};",
        f"  --on-brand: {d['on_brand']};",
        f"  --gold: {ac};", f"  --gold-soft: {mix(sf, ac, 0.16)};",
    ]
    ex = d.get("extra") or {}
    for key in ("debt", "savings", "house"):
        if key in ex:
            c = ex[key]
            lines.append(f"  --{key}: {c}; --{key}-gradient: linear-gradient(135deg, {lighten(c, 0.14)} 0%, {darken(c, 0.4)} 100%); --{key}-soft: {mix(sf, c, 0.12)};")
    fh = d["fh"]
    fb = d["fb"]
    if kk:
        fh = FONTS[fh]["kk_alt"] if fh in FONTS and not FONTS[fh]["kk"] else fh
        fb = FONTS[fb]["kk_alt"] if fb in FONTS and not FONTS[fb]["kk"] else fb
    lines += ["", f"  --font: {stack(fb)};", f"  --font-display: {stack(fh)};"]
    if d.get("mono"):
        mono = d["mono"]
        if kk and mono in FONTS and not FONTS[mono]["kk"]:
            mono = FONTS[mono]["kk_alt"]
        lines.append(f"  --font-mono: {stack(mono)};")
    lines += [f"  --radius-lg: {round(r * 1.4)}px;", f"  --radius: {r}px;", f"  --radius-sm: {max(3, round(r * 0.6))}px;",
              f"  --shadow-sm: 0 1px 0 {rgba(sh, 0.04)}, 0 2px 8px -4px {rgba(sh, 0.10 if not d['dark'] else 0.5)};",
              f"  --shadow-md: 0 1px 0 {rgba(sh, 0.04)}, 0 24px 48px -28px {rgba(sh, 0.28 if not d['dark'] else 0.6)};",
              f"  --shadow-lg: 0 1px 0 {rgba(sh, 0.04)}, 0 40px 80px -32px {rgba(sh if d['dark'] else brand_dark, 0.35 if not d['dark'] else 0.65)};"]
    return lines, (fh, fb, d.get("mono") if not kk else (FONTS[d["mono"]]["kk_alt"] if d.get("mono") in FONTS and not FONTS[d["mono"]]["kk"] else d.get("mono")))


def dark_block(d):
    bg = mix(d["text"], "#000000", 0.9) if lum(d["bg"]) > 0.4 else d["bg"]
    bg = mix(bg, d["brand"], 0.05)
    sf = mix(bg, "#ffffff", 0.06)
    tx = "#f3f1ea"
    br = lighten(d["brand"], 0.22)
    return [f"    --bg: {bg};", f"    --surface: {sf};", f"    --surface-2: {mix(bg, '#ffffff', 0.10)};", f"    --text: {tx};",
            f"    --muted: {mix(tx, bg, 0.45)};", f"    --border: {rgba(tx, 0.10)};", f"    --hairline: {rgba(tx, 0.08)};",
            f"    --brand: {br};", f"    --brand-dark: {d['brand']};", f"    --brand-soft: {mix(sf, br, 0.16)};",
            f"    --gold: {lighten(d['accent'], 0.12)};", f"    --gold-soft: {mix(sf, d['accent'], 0.18)};"]


def main():
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        return
    if args[0] == "list":
        for d in DESIGNS:
            print(f"{d['n']:>3}  {d['name']}  [{d['fh']} / {d['fb']}]")
        print(f"{len(DESIGNS) + 1:>3}  Свой дизайн (см. patterns/README.md)")
        return
    d = custom(args[0]) if args[0].endswith(".json") else pick(int(args[0]))
    kk = "--kk" in args
    lines, (fh, fb, mono) = block(d, kk)
    print(f"/* Дизайн {d['n']}: {d['name']}. Источник: {d['source']} */")
    print(":root {")
    print("\n".join(lines))
    print("  color-scheme: " + ("dark" if d["dark"] else "light") + ";")
    print("  font-family: var(--font);\n  color: var(--text);\n  background: var(--bg);\n}")
    print("h1, h2, h3, h4 { font-family: var(--font-display); font-weight: " + str(d.get("fh_w", 700)) + "; }")
    if d["dark"]:
        print("\n/* Дизайн тёмный: значения выше кладутся в :root, блок @media (prefers-color-scheme: dark) в styles.css удаляется. */")
    elif "--with-dark" in args:
        print("\n/* Черновик тёмной темы: проверить контраст вручную */\n@media (prefers-color-scheme: dark) {\n  :root {")
        print("\n".join(dark_block(d)))
        print("  }\n}")
    else:
        print("\n/* Дизайн светлый: блок @media (prefers-color-scheme: dark) из шаблона удаляется, иначе тёмная тема останется зелёной. */")
    print("\n# Шрифты")
    pk = []
    imports = []
    for name, role_w in ((fh, d.get("fh_w", 700)), (fb, 400), (mono, 400)):
        if not name or name not in FONTS:
            continue
        f = FONTS[name]
        if f["pkg"] not in pk:
            pk.append(f["pkg"])
        wanted = sorted({w for w in (400, 500, 600, 700, role_w) if w in f["weights"]}) or f["weights"][:1]
        for w in wanted:
            line = f"import '{f['pkg']}/{w}.css'"
            if line not in imports:
                imports.append(line)
    print("npm install " + " ".join(pk))
    print("\n// src/main.tsx\n" + "\n".join(imports))
    notes = []
    if not kk:
        for n in {d["fh"], d["fb"], d.get("mono")}:
            if n in FONTS and not FONTS[n]["kk"]:
                notes.append(f"Шрифт {n} не содержит казахских букв. Для казахского интерфейса запусти с --kk: замена {FONTS[n]['kk_alt']}.")
    else:
        notes.append("Режим --kk: шрифты без казахских букв заменены.")
    if contrast(d["on_brand"], d["brand"]) < 4.5:
        notes.append(f"Контраст текста на кнопке бренда {contrast(d['on_brand'], d['brand']):.1f}:1, меньше 4,5:1. Проверь кнопки.")
    notes.append(f"Цвет текста на кнопке бренда: {d['on_brand']} (переменная --on-brand). Найди в styles.css кнопки с `color: #fff` на фоне --brand и замени на var(--on-brand).")
    if d.get("feel"):
        notes.append("Фирменные приёмы дизайна (по желанию владельца, запиши в DECISIONS.md): " + d["feel"])
    print("\n# Заметки")
    for n in notes:
        print("- " + n)


if __name__ == "__main__":
    main()
