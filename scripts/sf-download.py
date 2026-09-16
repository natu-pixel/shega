import sys, os, json, urllib.request, urllib.parse
sys.stdout.reconfigure(encoding='utf-8')
KEY = os.environ["SF_KEY"]
HDR = {"Authorization": "Token " + KEY}
OUT = r"c:\Users\natik\OneDrive\Documents\shega\public\models"

def api(url):
    req = urllib.request.Request(url, headers=HDR)
    return json.load(urllib.request.urlopen(req, timeout=30))

def search(q, count=8, animated=False):
    u = "https://api.sketchfab.com/v3/search?type=models&downloadable=true&count=%d&q=%s" % (count, urllib.parse.quote(q))
    if animated: u += "&animated=true"
    d = api(u)
    for r in d.get("results", []):
        lic = (r.get("license") or {}).get("slug", "?")
        print("%s | %s | %s | anim=%d | likes=%d" % (r["uid"], r["name"], lic, r.get("animationCount", 0), r.get("likeCount", 0)))

def get(uid, name):
    d = api("https://api.sketchfab.com/v3/models/%s/download" % uid)
    glb = d.get("glb", {}).get("url")
    if not glb:
        print("NO-GLB"); return
    path = os.path.join(OUT, name)
    urllib.request.urlretrieve(glb, path)
    print("SAVED %s %.2fMB" % (path, os.path.getsize(path)/1048576))

if sys.argv[1] == "search":
    search(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else 8, "--anim" in sys.argv)
elif sys.argv[1] == "get":
    get(sys.argv[2], sys.argv[3])
