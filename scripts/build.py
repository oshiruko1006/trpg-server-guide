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
    # Keep existing published URLs; new CMS entries use their generated filename.
    slug = data.get('slug') or f.stem
    data['slug'] = slug
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
    (detail_dir / 'index.html').write_text(f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} | 聖バニラ教会</title><link rel="stylesheet" href="/assets/css/style.css"><link rel="stylesheet" href="/assets/css/header.css"></head><body data-page="detail" data-slug="{slug}"><header>
  <a class="brand" href="/"><span>聖バニラ教会</span><img src="https://my-trpg-room.pages.dev/images/vanilla.webp" alt="猫のアイコン"></a>
  <nav aria-label="メインメニュー">
  <a href="/"><span>HOME</span><small>聖規則</small></a>
  <a href="/character.html"><span>CS GUIDE</span><small>CS作成</small></a>
  <a href="/request.html"><span>REQUEST</span><small>KP依頼</small></a>
  <a href="/scenario/"><span>SCENARIO</span><small>回せるシナリオ</small></a>
</nav>
</header><main id="content"><p>読み込み中…</p></main><footer>聖バニラ教会</footer><script src="/assets/js/site.js" defer></script></body></html>''', encoding='utf-8')
(out / 'data/scenarios.json').write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Built {out}; published scenarios: {len(items)}; hidden scenarios excluded: {len(list((root / "content/scenarios").glob("*.json"))) - len(items)}')
