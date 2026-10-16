"""One-off: fetch source pages + Malvern logo candidates into _fetched/ (run on CI)."""
import os, re, urllib.request, urllib.parse
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"}
OUT = "_fetched"; os.makedirs(OUT, exist_ok=True)
def get(url, limit=5_000_000):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read(limit), r.headers.get("content-type", ""), r.geturl()
def save(name, url):
    try:
        data, ct, final = get(url)
        open(f"{OUT}/{name}", "wb").write(data)
        print("ok", name, ct, len(data), final)
        return data, final
    except Exception as e:
        print("fail", name, url, e)
        return None, None
LI = "https://www.linkedin.com/in/ryan-chi-web3/"
save("linkedin.html", LI)
save("linkedin-jina.md", "https://r.jina.ai/" + LI)
for sec in ["details/experience/", "details/volunteering-experiences/", "details/recommendations/", "details/education/", "details/honors/"]:
    save("linkedin-jina-" + sec.split("/")[1] + ".md", "https://r.jina.ai/" + LI + sec)
html, final = save("ryanchi.html", "https://ryanchi.com/")
save("ryanchi-jina.md", "https://r.jina.ai/https://ryanchi.com/")
if html:
    t = html.decode("utf-8", "ignore")
    for i, src in enumerate(re.findall(r'<script[^>]+src=["\']([^"\']+)', t)[:10]):
        save(f"ryanchi-script{i}.js", urllib.parse.urljoin(final, src))
m, mf = save("malvern.html", "https://malverncollege.org.hk/")
os.makedirs(f"{OUT}/malvern", exist_ok=True)
def img(tag, url):
    try:
        data, ct, _ = get(url)
        if ct.startswith("image") and len(data) > 200:
            ext = {"png":"png","jpeg":"jpg","svg+xml":"svg","x-icon":"ico","vnd.microsoft.icon":"ico","webp":"webp"}.get(ct.split(";")[0].split("/")[-1], "bin")
            open(f"{OUT}/malvern/{tag}.{ext}", "wb").write(data); print("img", tag, ct, len(data))
    except Exception as e:
        print("imgfail", tag, e)
img("apple", "https://malverncollege.org.hk/apple-touch-icon.png")
img("google", "https://www.google.com/s2/favicons?sz=256&domain=malverncollege.org.hk")
img("unavatar", "https://unavatar.io/malverncollege.org.hk?fallback=false")
if m:
    t = m.decode("utf-8", "ignore")
    for i, mm in enumerate(re.finditer(r'<(?:link|meta)\b[^>]*>', t, re.I)):
        tag = mm.group(0)
        rel = re.search(r'(?:rel|property|name)=["\']([^"\']+)', tag, re.I)
        href = re.search(r'(?:href|content)=["\']([^"\']+)', tag, re.I)
        if rel and href and re.search(r'icon|og:image', rel.group(1), re.I):
            img(f"html{i}", urllib.parse.urljoin(mf, href.group(1)))
    for i, s in enumerate(re.findall(r'<img\b[^>]*src=["\']([^"\']*(?:logo|crest)[^"\']*)["\']', t, re.I)[:6]):
        img(f"img{i}", urllib.parse.urljoin(mf, s))
