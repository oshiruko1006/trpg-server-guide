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
SITE_URL = 'https://trpg-server-guide.pages.dev'
FALLBACK_IMAGE = 'https://my-trpg-room.pages.dev/images/vanilla.webp'


def first_trailer(data):
    """Match site.js trailerUrls: individual trailers first, then batch uploads."""
    individual = data.get('trailers') if isinstance(data.get('trailers'), list) else ([data['trailer']] if data.get('trailer') else [])
    batch = data.get('trailer_batch') if isinstance(data.get('trailer_batch'), list) else ([data['trailer_batch']] if data.get('trailer_batch') else [])

    def flatten(values):
        for value in values:
            if isinstance(value, list):
                yield from flatten(value)
            else:
                yield value

    for value in flatten(individual + batch):
        url = value if isinstance(value, str) else value.get('image', '') if isinstance(value, dict) else ''
        url = str(url).strip()
        if re.fullmatch(r'/(?!/)[^<>"\'\s]*', url):
            return SITE_URL + url
        if re.fullmatch(r'https://[^<>"\'\s]+', url, flags=re.I):
            return url
    return FALLBACK_IMAGE


def meta(value):
    return html.escape(str(value), quote=True)


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
    scenario_title = str(data.get('title') or 'シナリオ')
    title = meta(scenario_title)
    og_title = meta(f'{scenario_title}｜聖バニラ教会')
    og_description = meta('シナリオの詳細情報をご案内します。')
    og_url = meta(f'{SITE_URL}/scenario/{slug}/')
    og_image = meta(first_trailer(data))
    twitter_card = 'summary_large_image' if og_image != meta(FALLBACK_IMAGE) else 'summary'
    detail_dir = out / 'scenario' / slug
    detail_dir.mkdir(parents=True)
    # Detail pages read only the published, build-filtered JSON data.
    (detail_dir / 'index.html').write_text(f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{og_title}</title><meta name="description" content="{og_description}">
<meta property="og:type" content="article"><meta property="og:locale" content="ja_JP"><meta property="og:site_name" content="聖バニラ教会">
<meta property="og:title" content="{og_title}"><meta property="og:description" content="{og_description}">
<meta property="og:url" content="{og_url}"><meta property="og:image" content="{og_image}">
<meta name="twitter:card" content="{twitter_card}"><meta name="twitter:title" content="{og_title}">
<meta name="twitter:description" content="{og_description}"><meta name="twitter:image" content="{og_image}">
<link rel="stylesheet" href="/assets/css/style.css"><link rel="stylesheet" href="/assets/css/header.css"></head><body data-page="detail" data-slug="{slug}"><header>
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

from build_pl_guides import build_pl_guides
build_pl_guides(root, out)
