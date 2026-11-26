"""Build independent encrypted PL pages, never a listing or plaintext data."""
import json, re

ID = re.compile(r"[A-Za-z0-9_-]{22}")
IV = re.compile(r"[A-Za-z0-9_-]{16}")
CIPHER = re.compile(r"[A-Za-z0-9_-]{22,4200000}")
PAGE = """<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="referrer" content="no-referrer">
<title>PL GUIDE｜聖バニラ教会</title>
<script src="/assets/js/theme.js?v=1"></script>
<link rel="stylesheet" href="/assets/css/style.css?v=theme-1">
<link rel="stylesheet" href="/assets/css/pl-guide.css?v=theme-1">
<link rel="stylesheet" href="/assets/css/theme.css?v=2"></head><body data-page="pl-guide"><main id="content"><p>読み込み中…</p></main>
<footer>聖バニラ教会</footer>
<script src="/assets/js/pl-guide-crypto.js" defer></script>
<script src="/assets/js/pl-guide-layout.js?v=2" defer></script>
<script src="/assets/js/pl-guide.js?v=7" defer></script>
<script src="/assets/js/site.js?v=private-images-1" defer></script>
</body></html>"""
def build_pl_guides(root, out):
    seen = set()
    for f in sorted((root / "content/pl-guides").glob("*.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        if d.get("published") is not True:
            continue
        try:
            e = json.loads(d["encrypted_guide"])
            if not (type(e["v"]) is int and e["v"] == 1 and ID.fullmatch(e["id"]) and IV.fullmatch(e["iv"]) and CIPHER.fullmatch(e["cipher"])):
                raise ValueError()
        except (KeyError, TypeError, ValueError):
            raise ValueError(f"Invalid encrypted PL guide: {f.name}") from None
        if e["id"] in seen:
            raise ValueError(f"Duplicate PL guide ID: {f.name}; reissue its URL")
        seen.add(e["id"])
        target = out / "pl-guide" / e["id"]
        target.mkdir(parents=True)
        (target / "index.html").write_text(PAGE, encoding="utf-8")
        (target / "guide.json").write_text(json.dumps({k:e[k] for k in ("v","id","iv","cipher")},separators=(",",":")),encoding="utf-8")
    headers = out / "_headers"
    with headers.open("a", encoding="utf-8") as f:
        f.write("\n/pl-guide/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Referrer-Policy: no-referrer\n  Cache-Control: no-store\n")
    print(f"Built {len(seen)} encrypted PL guides (no public index)")
