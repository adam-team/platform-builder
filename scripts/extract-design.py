#!/usr/bin/env python3
"""Достаёт цвета и шрифты из материалов ученика для варианта «свой дизайн».

  python3 scripts/extract-design.py путь/к/файлу.pdf          # PDF: шрифты документа и основные цвета страниц
  python3 scripts/extract-design.py путь/к/картинке.png       # картинка или скриншот: основные цвета
  python3 scripts/extract-design.py https://сайт-образец.kz   # сайт: цвета и шрифты из CSS
  python3 scripts/extract-design.py --kk-check "Имя шрифта"   # есть ли у шрифта Google Fonts казахские буквы

Нужен Pillow (`pip install pillow`). Для PDF желательно poppler (`pdffonts`, `pdftoppm`). Для --kk-check нужен fonttools.
Скрипт только читает файл или публичную страницу, ничего не отправляет и не меняет. Печатает черновик:
агент показывает его владельцу, правит и записывает в DESIGN.md, затем берёт значения в :root (patterns/README.md).
"""
import io
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36"}
KK = "әғқңөұүһіӘҒҚҢӨҰҮҺІ"


def hexs(c):
    return "#%02X%02X%02X" % tuple(c[:3])


def lum(c):
    def f(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])


def sat(c):
    mx, mn = max(c[:3]), min(c[:3])
    return 0 if mx == 0 else (mx - mn) / mx


def palette_from_images(paths, n=8):
    from PIL import Image
    counts = {}
    total = 0
    for p in paths:
        im = Image.open(p).convert("RGB")
        im.thumbnail((400, 400))
        q = im.quantize(colors=n * 2, method=Image.Quantize.MEDIANCUT).convert("RGB")
        for cnt, col in q.getcolors(maxcolors=100000):
            key = tuple(v // 6 * 6 + 3 for v in col)
            counts[key] = counts.get(key, 0) + cnt
            total += cnt
    top = sorted(counts.items(), key=lambda kv: -kv[1])[:n]
    return [(c, cnt / total) for c, cnt in top]


def saturated_colors(paths, n=5):
    """Яркие цвета отдельно: бренд обычно занимает мало места и тонет среди фона и текста."""
    from PIL import Image
    counts = {}
    for p in paths:
        im = Image.open(p).convert("RGB")
        im.thumbnail((500, 500))
        for col in im.getdata():
            if sat(col) > 0.45 and 0.04 < lum(col) < 0.75:
                key = tuple(v // 16 * 16 + 8 for v in col)
                counts[key] = counts.get(key, 0) + 1
    merged = []
    for c, cnt in sorted(counts.items(), key=lambda kv: -kv[1]):
        if all(sum(abs(a - b) for a, b in zip(c, m)) > 70 for m, _ in merged):
            merged.append((c, cnt))
        if len(merged) == n:
            break
    return merged


def show_palette(pal, sat_cols=None):
    print("Основные цвета (доля площади):")
    for c, share in pal:
        print(f"  {hexs(c)}  {share * 100:4.1f}%")
    cols = [c for c, _ in pal]
    bg = cols[0]
    text = max(cols, key=lambda c: abs(lum(c) - lum(bg)))
    print("\nЯркие цвета (кандидаты в бренд и акцент):")
    for c, _ in (sat_cols or []):
        print(f"  {hexs(c)}")
    brand = sat_cols[0][0] if sat_cols else text
    accent = sat_cols[1][0] if sat_cols and len(sat_cols) > 1 else brand
    print("\nЧерновик ролей (проверить глазами и поправить):")
    print(f"  фон      {hexs(bg)}\n  текст    {hexs(text)}\n  бренд    {hexs(brand)}\n  акцент   {hexs(accent)}")
    print("  Тема:", "тёмная" if lum(bg) < 0.2 else "светлая")


def from_pdf(path):
    if shutil.which("pdffonts"):
        out = subprocess.run(["pdffonts", path], capture_output=True, text=True).stdout.splitlines()[2:]
        names = sorted({re.sub(r"^[A-Z]{6}\+", "", l.split()[0]) for l in out if l.strip()})
        print("Шрифты в PDF:")
        for n in names:
            print("  ", n)
        print("  (имена вида «ManropeExtraLight-Bold» это вариативные шрифты: смотри семейство, например Manrope)")
    else:
        print("Нет pdffonts (poppler): шрифты не прочитаны. Mac: brew install poppler")
    if shutil.which("pdftoppm"):
        with tempfile.TemporaryDirectory() as d:
            subprocess.run(["pdftoppm", "-r", "40", "-f", "1", "-l", "3", "-jpeg", path, os.path.join(d, "p")], check=True)
            files = sorted(os.path.join(d, f) for f in os.listdir(d))
            print()
            show_palette(palette_from_images(files), saturated_colors(files))
    else:
        print("Нет pdftoppm (poppler): цвета не посчитаны.")


def from_url(url):
    def get(u):
        return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20).read().decode("utf-8", "ignore")
    html = get(url)
    css = html
    for href in re.findall(r'<link[^>]+rel=["\']stylesheet["\'][^>]*href=["\']([^"\']+)', html)[:6]:
        try:
            css += "\n" + get(urllib.parse.urljoin(url, href))
        except Exception:
            pass
    fams = {}
    for m in re.findall(r"font-family:\s*([^;}{]+)", css):
        first = m.split(",")[0].strip().strip("'\"")
        if first and not first.startswith("var("):
            fams[first] = fams.get(first, 0) + 1
    print("Шрифты на сайте (по частоте):")
    for f, n in sorted(fams.items(), key=lambda kv: -kv[1])[:8]:
        print(f"  {f}  ×{n}")
    vars_ = re.findall(r"(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\b", css)
    if vars_:
        print("\nПеременные цветов из CSS:")
        for k, v in vars_[:24]:
            print(f"  {k}: {v}")
    hexes = {}
    for h in re.findall(r"#[0-9a-fA-F]{6}\b", css):
        hexes[h.upper()] = hexes.get(h.upper(), 0) + 1
    print("\nЧаще всего встречаются цвета:")
    for h, n in sorted(hexes.items(), key=lambda kv: -kv[1])[:10]:
        print(f"  {h}  ×{n}")


def kk_check(name):
    from fontTools.ttLib import TTFont
    url = "https://fonts.googleapis.com/css2?family=" + urllib.parse.quote(name).replace("%20", "+") + "&text=" + urllib.parse.quote(KK)
    try:
        css = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20).read().decode()
    except Exception:
        print(f"{name}: на Google Fonts не найден или в нём нет ни одной из казахских букв.")
        return
    m = re.search(r"url\((https://[^)]+)\)", css)
    data = urllib.request.urlopen(urllib.request.Request(m.group(1), headers=UA), timeout=30).read()
    cmap = TTFont(io.BytesIO(data)).getBestCmap()
    miss = [c for c in KK if ord(c) not in cmap]
    print(f"{name}: казахские буквы " + ("все есть." if not miss else "отсутствуют: " + " ".join(miss) + ". Нужна замена, см. patterns/FONTS.md."))


def main():
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        print(__doc__)
        return
    if a[0] == "--kk-check":
        kk_check(" ".join(a[1:]))
        return
    t = a[0]
    if re.match(r"https?://", t):
        from_url(t)
    elif t.lower().endswith(".pdf"):
        from_pdf(t)
    else:
        show_palette(palette_from_images([t]), saturated_colors([t]))


if __name__ == "__main__":
    main()
