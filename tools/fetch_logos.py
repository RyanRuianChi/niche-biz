"""Download logo candidates for every org into logo-candidates/ (run on CI)."""
import os, re, urllib.request, urllib.parse

ORGS = {
    "insiders":   ("insidersdotbot", "insiders.bot"),
    "city":       ("CityProtocol",   "cityprotocol.co"),
    "academic":   ("Acad_Labs",      "acad.live"),
    "showtime":   ("SHOWTIME_WATCH", None),
    "sigmaboy":   (None,             "sigmaboy.ai"),
    "oxu":        ("0xUClub",        "0xu.club"),
    "xcreator":   ("MrRyanChi",      None),
    "cuhk":       ("CUHKofficial",   "www.cuhk.edu.hk"),
    "upenn":      ("Penn",           "www.upenn.edu"),
    "wharton":    ("Wharton",        "www.wharton.upenn.edu"),
    "edhec":      ("EDHEC_BSchool",  "www.edhec.edu"),
    "pennbc":     ("PennBlockchain", "pennblockchain.com"),
    "polymarket": ("Polymarket",     "polymarket.com"),
    "evg":        ("EVG_Ventures",   "evg.co"),
    "venzo":      ("VenzoFinance",   "venzofinance.com"),
    "dragonfly":  ("dragonfly_xyz",  "www.dragonfly.xyz"),
    "jump":       ("jump_",          "jumpcrypto.com"),
    "gate":       ("gate_io",        "www.gate.com"),
    "cityu":      ("cityuhk",        "www.cityu.edu.hk"),
    "mit":        ("MIT",            "www.mit.edu"),
    "ycis":       (None,             "www.ycis-hk.com"),
    "bilibili":   ("bilibili_com",   "www.bilibili.com"),
}
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"}
OUT = "logo-candidates"
os.makedirs(OUT, exist_ok=True)

def get(url, limit=3_000_000):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read(limit), r.headers.get("content-type", ""), r.geturl()

EXT = {"png": "png", "jpeg": "jpg", "jpg": "jpg", "svg": "svg", "x-icon": "ico", "vnd.microsoft.icon": "ico", "webp": "webp", "gif": "gif"}
def save(key, tag, url):
    try:
        data, ctype, _ = get(url)
    except Exception as e:
        print(f"  fail {tag}: {e}")
        return
    sub = ctype.split(";")[0].split("/")[-1].strip()
    if not ctype.startswith("image") or len(data) < 200:
        print(f"  skip {tag}: {ctype} {len(data)}")
        return
    ext = EXT.get(sub, sub[:4] or "bin")
    path = f"{OUT}/{key}--{tag}.{ext}"
    open(path, "wb").write(data)
    print(f"  ok   {path} {len(data)}")

for key, (handle, domain) in ORGS.items():
    print(key)
    if handle:
        save(key, "unavatar-x", f"https://unavatar.io/x/{handle}?fallback=false")
    if domain:
        base = f"https://{domain}"
        save(key, "apple", f"{base}/apple-touch-icon.png")
        save(key, "google", f"https://www.google.com/s2/favicons?sz=256&domain={domain}")
        save(key, "ddg", f"https://icons.duckduckgo.com/ip3/{domain.removeprefix('www.')}.ico")
        save(key, "unavatar-site", f"https://unavatar.io/{domain.removeprefix('www.')}?fallback=false")
        try:
            html, _, final = get(base + "/", 800_000)
            html = html.decode("utf-8", "ignore")
            found = []
            for m in re.finditer(r'<(?:link|meta)\b[^>]*>', html, re.I):
                tag = m.group(0)
                rel = re.search(r'(?:rel|property|name)=["\']([^"\']+)', tag, re.I)
                href = re.search(r'(?:href|content)=["\']([^"\']+)', tag, re.I)
                if rel and href and re.search(r'icon|og:image|twitter:image', rel.group(1), re.I):
                    found.append((rel.group(1), urllib.parse.urljoin(final, href.group(1))))
            for i, (rel, u) in enumerate(found[:8]):
                save(key, f"html{i}-{re.sub('[^a-z]', '', rel.lower())[:12]}", u)
            for i, m in enumerate(re.finditer(r'<img\b[^>]*src=["\']([^"\']*logo[^"\']*)["\']', html, re.I)):
                if i >= 3: break
                save(key, f"img{i}", urllib.parse.urljoin(final, m.group(1)))
        except Exception as e:
            print(f"  html fail: {e}")
