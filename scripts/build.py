from pathlib import Path
import json, shutil, html, re
root = Path(__file__).resolve().parents[1]
out = root / 'dist'
if out.exists():
    shutil.rmtree(out)
out.mkdir()
for name in ('index.html', 'character.html', 'request.html'):
    shutil.copy2(root / name, out / name)
for name in ('scenario', 'assets', 'admin'):
    shutil.copytree(root / name, out / name)
(out / 'data').mkdir()
for name in ('home', 'character', 'request'):
    src = root / 'content' / f'{name}.json'
    json.loads(src.read_text(encoding='utf-8'))
    shutil.copy2(src, out / 'data' / src.name)
items = []
seen = set()
for f in sorted((root / 'content/scenarios').glob('*.json')):
    data = json.loads(f.read_text(encoding='utf-8'))
    if data.get('published') is not True:
        continue
    slug = data.get('slug', '')
    if not isinstance(slug, str) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug):
        raise ValueError(f'{f}: slug must contain only lowercase letters, numbers and hyphens')
    if slug in seen:
        raise ValueError(f'Duplicate scenario slug: {slug}')
    seen.add(slug)
    items.append(data)
    title = html.escape(str(data.get('title', 'シナリオ')))
    detail_dir = out / 'scenario' / slug
    detail_dir.mkdir(parents=True)
    # Detail pages read only the published, build-filtered JSON data.
    (detail_dir / 'index.html').write_text(f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} | TRPG SERVER GUIDE</title><link rel="stylesheet" href="/assets/css/style.css"></head><body data-page="detail" data-slug="{slug}"><header><a class="brand" href="/">TRPG SERVER GUIDE</a><nav><a href="/">HOME</a><a href="/character.html">CHARACTER</a><a href="/request.html">REQUEST</a><a href="/scenario/">SCENARIO</a></nav></header><main id="content"><p>読み込み中…</p></main><footer>TRPG SERVER GUIDE</footer><script src="/assets/js/site.js" defer></script></body></html>''', encoding='utf-8')
(out / 'data/scenarios.json').write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Built {out}; published scenarios: {len(items)}; hidden scenarios excluded: {len(list((root / "content/scenarios").glob("*.json"))) - len(items)}')
