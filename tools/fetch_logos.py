"""One-off: download logo candidates into logo-candidates/ (run on CI)."""
import os, re, urllib.request, urllib.parse
ORGS = {"aiesec": ("AIESEC", "aiesec.org.hk"), "aiesec2": (None, "aiesec.org"), "hutech": ("hutechuniversity", "www.hutech.edu.vn")}
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"}
OUT = "logo-candidates"; os.makedirs(OUT, exist_ok=True)
def get(url, limit=3_000_000):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25) as r:
        return r.read(limit), r.headers.get("content-type", ""), r.geturl()
EXT = {"png": "png", "jpeg": "jpg", "svg+xml": "svg", "x-icon": "ico", "vnd.microsoft.icon": "ico", "webp": "webp", "gif": "gif"}
def save(key, tag, url):
    try:
        data, ct, _ = get(url)
    except Exception as e:
        print("fail", key, tag, e); return
    if not ct.startswith("image") or len(data) < 200:
        print("skip", key, tag, ct, len(data)); return
    ext = EXT.get(ct.split(";")[0].split("/")[-1], "bin")
    open(f"{OUT}/{key}--{tag}.{ext}", "wb").write(data); print("ok", key, tag, len(data))
for key, (handle, domain) in ORGS.items():
    if handle: save(key, "unavatar-x", f"https://unavatar.io/x/{handle}?fallback=false")
    base = f"https://{domain}"
    save(key, "apple", base + "/apple-touch-icon.png")
    save(key, "google", f"https://www.google.com/s2/favicons?sz=256&domain={domain}")
    try:
        html, _, final = get(base + "/", 1_500_000); html = html.decode("utf-8", "ignore")
        n = 0
        for m in re.finditer(r'<(?:link|meta)\b[^>]*>', html, re.I):
            t = m.group(0)
            rel = re.search(r'(?:rel|property|name)=["\']([^"\']+)', t, re.I); href = re.search(r'(?:href|content)=["\']([^"\']+)', t, re.I)
            if rel and href and re.search(r'icon|og:image', rel.group(1), re.I):
                save(key, f"html{n}", urllib.parse.urljoin(final, href.group(1).strip())); n += 1
        for i, s in enumerate(re.findall(r'<img\b[^>]*src=["\']([^"\']*logo[^"\']*)["\']', html, re.I)[:4]):
            save(key, f"img{i}", urllib.parse.urljoin(final, s.strip()))
    except Exception as e:
        print("htmlfail", key, e)
