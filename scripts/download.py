import json, os, re, subprocess, unicodedata

OUT = "/Users/robertoguido/CascadeProjects/Gran Via/la-gran-via/public/tenants"
os.makedirs(OUT, exist_ok=True)

tenants = json.load(open("tenants.json", encoding="utf-8"))


def slug(name):
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s


results = []
for t in tenants:
    url = t["logo"]
    ext = os.path.splitext(url.split("?")[0])[1].lower()
    if ext == ".jpeg":
        ext = ".jpg"
    fn = slug(t["name"]) + ext
    dest = os.path.join(OUT, fn)
    r = subprocess.run(
        ["curl", "-sL", "--max-time", "45", "-w", "%{http_code}", url, "-o", dest],
        capture_output=True, text=True)
    code = r.stdout.strip()
    size = os.path.getsize(dest) if os.path.exists(dest) else 0
    ok = code == "200" and size > 500
    if not ok and os.path.exists(dest):
        os.remove(dest)
    results.append({**t, "file": fn if ok else None, "http": code, "bytes": size})
    print(f"{'ok ' if ok else 'FAIL'} {code} {size:>8} {fn}")

json.dump(results, open("tenants_downloaded.json", "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("\nFAILED:", [r["name"] for r in results if not r["file"]])
