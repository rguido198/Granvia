import os, re, subprocess

OUT = "/Users/robertoguido/CascadeProjects/Gran Via/la-gran-via/public/tenants"

# name -> (original src, local filename)
BAD = {
    "AT&T": ("https://lagranvia.com.mx/wp-content/uploads/2016/08/1_LGV_Comercio_Logotipos_ATT-300x99.jpg", "at-t.jpg"),
    "Etcétera": ("https://lagranvia.com.mx/wp-content/uploads/2016/06/1_LGV_Comercio_Logotipos_Etcetera-300x115.png", "etcetera-accesorios.png"),
    "SYMMETRY GYM": ("https://lagranvia.com.mx/wp-content/uploads/2025/05/WhatsApp-Image-2025-05-30-at-4.08.52-PM.jpeg", "symmetry-gym-mexicali.jpg"),
    "Holy Cow": ("https://lagranvia.com.mx/wp-content/uploads/2022/11/la-gran-via-mapa-holy-cow-300x162.png", "holy-cow.png"),
    "Maja": ("https://lagranvia.com.mx/wp-content/uploads/2024/08/maja.svg", "maja.svg"),
    "Nice Factory": ("https://lagranvia.com.mx/wp-content/uploads/2024/02/nice-factory-300x300.jpeg", "nice-factory-of-beauty.jpg"),
    "Wrap & Roll": ("https://lagranvia.com.mx/wp-content/uploads/2021/10/wrap-n-roll.jpg", "wrap-roll.jpg"),
}

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"


def candidates(url):
    yield url
    # drop the -WxH size suffix WordPress appends
    stripped = re.sub(r"-\d+x\d+(?=\.[a-zA-Z]+$)", "", url)
    if stripped != url:
        yield stripped
    # try alternate extensions
    base = re.sub(r"\.[a-zA-Z]+$", "", stripped)
    for ext in (".png", ".jpg", ".jpeg", ".webp", ".svg"):
        yield base + ext


for name, (url, fn) in BAD.items():
    dest = os.path.join(OUT, fn)
    got = None
    for cand in dict.fromkeys(candidates(url)):
        tmp = dest + ".tmp"
        subprocess.run(["curl", "-sL", "--max-time", "40", "-A", UA,
                        "-e", "https://lagranvia.com.mx/1330-2/", cand, "-o", tmp],
                       capture_output=True)
        if not os.path.exists(tmp):
            continue
        mime = subprocess.run(["file", "-b", "--mime-type", tmp],
                              capture_output=True, text=True).stdout.strip()
        if mime.startswith("image/") or mime == "text/xml":
            ext = os.path.splitext(cand)[1].lower().replace(".jpeg", ".jpg")
            final = os.path.join(OUT, os.path.splitext(fn)[0] + ext)
            os.replace(tmp, final)
            if final != dest and os.path.exists(dest):
                os.remove(dest)
            got = (cand, mime, os.path.getsize(final), os.path.basename(final))
            break
        os.remove(tmp)
    print(f"{'OK  ' if got else 'FAIL'} {name:<16} {got if got else url}")
