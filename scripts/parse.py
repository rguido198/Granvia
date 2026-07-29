import re, json, html

h = open('dir.html', encoding='utf-8').read()

rows = re.findall(r'<tr class="wpdt-cell-row[^"]*"\s*>(.*?)</tr>', h, re.S)
out = []
for r in rows:
    cells = re.findall(
        r'<td class="wpdt-cell[^"]*"\s*data-cell-id="[^"]*"\s*data-col-index="(\d+)".*?>(.*?)</td>',
        r, re.S)
    rec = {}
    for idx, raw in cells:
        img = re.search(r'src="([^"]+)"', raw)
        text = re.sub(r'<[^>]+>', '', raw)
        text = html.unescape(text).strip()
        rec[int(idx)] = {'img': img.group(1) if img else None, 'text': text}
    if not rec or 1 not in rec or not rec[1]['text']:
        continue
    out.append({
        'logo': rec.get(0, {}).get('img'),
        'name': rec[1]['text'],
        'c2': rec.get(2, {}).get('text', ''),
        'c3': rec.get(3, {}).get('text', ''),
        'phone': rec.get(4, {}).get('text', ''),
        'zone': rec.get(5, {}).get('text', ''),
    })

print(json.dumps(out, ensure_ascii=False, indent=1)[:2500])
print('...')
print('TOTAL', len(out))
print('WITH LOGO', sum(1 for o in out if o['logo']))
print('NO LOGO:', [o['name'] for o in out if not o['logo']])
json.dump(out, open('tenants.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
