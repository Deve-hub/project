# Handoff: deploy "دفتر التحصيل" (expense tracker) on this VPS

You are working directly on the owner's VPS (Hostinger, root shell). Your job is to install, run and verify a small web app on this server, without disturbing anything already running here. All source files are included at the end of this document, so you do not need GitHub access.

## 1. What the app is

An Arabic (right-to-left) phone-first web app for one family's money tracking, in US dollars:

- **شراء (purchase):** the owner buys an item for a person (أحمد، صالح، ناصر، علي by default).
- **تحصيل (collection):** a collector receives money back from that person.
- **تسليم (handover):** the collector hands collected cash to الوالد، الوالدة or مصاريف شخصية.

Two tabs on one page:

- **إضافة (add):** open to anyone with the link, no login. The person picks a type, taps a name, types item (purchases only) and amount, then saves. Date and time are recorded by the server. Amounts accept Arabic-Indic (٠١٢٣٤٥٦٧٨٩), Persian (۰-۹) and English digits, plus `٫` or `.` as decimal separator and `,` / `٬` as thousands separator.
- **الملخص (summary):** protected by a PIN (`DASH_PIN`). Shows totals (bought, received, still to collect, cash with collector), per-person bought/received/remaining with red "عليه مبلغ" or green "مدفوع بالكامل", the split between handover destinations, a log with delete (two-tap confirm), name editing, and an Excel export (SheetJS loaded from cdnjs in the browser). It refreshes every 10 seconds.

Stack: **Python 3 standard library only** (`http.server` + `sqlite3`), no pip packages. Static page in `public/`. Data in SQLite at `/var/lib/expense-tracker/ledger.db`.

API (all JSON):

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/names` | none | people and destinations lists |
| POST | `/api/entries` | none | add `{type, name, item, amount, note}`; name must be in the lists |
| GET | `/api/data` | header `X-Pin` | names + all entries |
| DELETE | `/api/entries/<id>` | header `X-Pin` | delete one entry |
| POST | `/api/names` | header `X-Pin` | replace lists `{people:[], destinations:[]}` |
| GET | `/healthz` | none | `{"ok": true}` |

Config via env file `/etc/expense-tracker.env`: `DASH_PIN`, `HOST`, `PORT` (default 8090), `DB_PATH`.

## 2. Rules

1. **Do not break existing services.** Before changing anything, look at what already runs: `ss -ltnp`, `systemctl list-units --type=service --state=running`, `docker ps` (if Docker exists), and any Nginx/Apache/Caddy config. If port 8090 is taken, pick a free port and use it consistently (`PORT=...` when running install.sh).
2. **Do not stop, restart or reconfigure any existing web server** without asking the owner first. If Nginx or Apache already owns ports 80/443, add a new site/server block for this app instead of installing Caddy (install.sh skips Caddy automatically when 80/443 are busy).
3. **Ask the owner for the PIN** for the summary page. Never print it back in full in logs or summaries, and never commit it anywhere.
4. **Do not touch** `/root/.ssh/github_deploy*` or the `github-deploy` line in `/root/.ssh/authorized_keys`. That key is for the GitHub Actions deploy.
5. Keep changes inside `/opt/expense-tracker`, `/var/lib/expense-tracker`, `/etc/expense-tracker.env`, `/etc/systemd/system/expense-tracker.service`, and (only if needed) one reverse-proxy site config and one firewall rule.
6. Confirm destructive steps (deleting files, dropping data, changing firewall defaults) with the owner before running them.

## 3. Steps

### 3.1 Inspect the server
```bash
cat /etc/os-release | head -3
python3 --version            # needs 3.8 or newer
ss -ltnp | grep -E ':(80|443|8090)\b' || echo "80/443/8090 free"
command -v nginx caddy apache2 docker ufw 2>/dev/null
ip -4 addr show scope global | grep inet || echo "no IPv4"
curl -4 -s https://ifconfig.me; echo
```
Report the OS, Python version, which of 80/443/8090 are in use and by what, and the public **IPv4** address (the IPv6 one is `2a02:4780:12:bbf8::1`; GitHub Actions runners usually cannot reach IPv6-only hosts, so the IPv4 address matters for the deploy step later).

### 3.2 Put the files in place
Create every file listed in section 6 under `/opt/expense-tracker/` with the exact contents given (strip the leading `expense-tracker/` from each path; the workflow file is only for GitHub and does not go on the server). Then:
```bash
chmod +x /opt/expense-tracker/deploy/install.sh
python3 -m py_compile /opt/expense-tracker/app.py
```

### 3.3 Install and start
Without a domain (app reachable at `http://IPv4:8090`):
```bash
DASH_PIN='<pin from owner>' bash /opt/expense-tracker/deploy/install.sh
```
With a domain already pointed at this server, and ports 80/443 free:
```bash
DASH_PIN='<pin>' DOMAIN='expenses.example.com' bash /opt/expense-tracker/deploy/install.sh
```
If ports 80/443 belong to an existing Nginx, run install.sh **with** `DOMAIN` (so the app binds to 127.0.0.1 only), then, after asking the owner, add an Nginx server block proxying that domain to `http://127.0.0.1:8090` and reload Nginx after `nginx -t` passes. Use certbot only if it is already in use on this server or the owner agrees.

install.sh creates the `ledger` system user, the data directory, the env file (mode 600), and the systemd service, then checks `/healthz`.

### 3.4 Firewall
- If `ufw` is active and there is no domain, install.sh already ran `ufw allow 8090/tcp`. Confirm with `ufw status`.
- Tell the owner that Hostinger also has a firewall in **hPanel → VPS → Firewall**; if it is enabled, they must allow TCP 8090 there (or 80/443 when using a domain). You cannot change that from the shell.

### 3.5 Verify
```bash
systemctl status expense-tracker --no-pager | head -5
curl -s http://127.0.0.1:8090/healthz
curl -s http://127.0.0.1:8090/api/names
curl -s -XPOST http://127.0.0.1:8090/api/entries -H 'Content-Type: application/json' \
  -d '{"type":"شراء","name":"أحمد","item":"اختبار","amount":"٨٠"}'
curl -s -H "X-Pin: $(grep ^DASH_PIN= /etc/expense-tracker.env | cut -d= -f2-)" http://127.0.0.1:8090/api/data
```
Expected: health ok, names list, `{"ok": true, "amount": 80.0}`, and the data call returns that test row. Then delete the test row:
```bash
ID=$(sqlite3 /var/lib/expense-tracker/ledger.db "select id from entries where item='اختبار' order by id desc limit 1" 2>/dev/null)
# if sqlite3 CLI is missing, use the API:
curl -s -XDELETE -H "X-Pin: <pin>" http://127.0.0.1:8090/api/entries/$ID
```
Also check from outside: `curl -s -o /dev/null -w '%{http_code}\n' http://<IPv4>:8090/` should print `200`.

### 3.6 Daily backup (recommended, ask first)
```bash
cat > /etc/cron.daily/expense-tracker-backup <<'SH'
#!/bin/sh
mkdir -p /var/backups/expense-tracker
python3 -c "import sqlite3;s=sqlite3.connect('/var/lib/expense-tracker/ledger.db');d=sqlite3.connect('/var/backups/expense-tracker/ledger-'+__import__('time').strftime('%F')+'.db');s.backup(d)"
find /var/backups/expense-tracker -name 'ledger-*.db' -mtime +30 -delete
SH
chmod +x /etc/cron.daily/expense-tracker-backup
```

## 4. Automatic deploys from GitHub (optional, after the app works)

The code also lives in GitHub at `Deve-hub/project`, folder `expense-tracker/`, branch `claude/greeting-rlegll`. The workflow `.github/workflows/expense-tracker.yml` copies the folder to `/opt/expense-tracker` over SSH and re-runs install.sh on every push that touches it. It reads these repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `VPS_HOST` | this server's **IPv4** address |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | contents of `/root/.ssh/github_deploy` (the owner pastes it into GitHub themselves; never print it into a chat or file) |
| `DASH_PIN` | the same PIN |
| `VPS_PORT` | only if SSH is not on 22 |
| `DOMAIN` | only if a domain is used |

Make sure `/root/.ssh/github_deploy.pub` is in `/root/.ssh/authorized_keys` and that SSH accepts key logins for root (`PermitRootLogin` is `yes` or `prohibit-password` in `sshd_config`). Do not change sshd settings without asking.

## 5. When you are done, report to the owner

- The URL to open (`http://<IPv4>:8090` or `https://<domain>`), to send to the collector and to add to the phone home screen (Chrome menu → Add to Home screen).
- That the summary tab opens with their PIN.
- What you changed on the server (files, service, firewall rule, proxy config) and anything they still need to do (hPanel firewall, GitHub secrets).
- How to see logs: `journalctl -u expense-tracker -f`. How to restart: `systemctl restart expense-tracker`.

## 6. Source files

### `expense-tracker/app.py`

~~~~python
"""دفتر التحصيل — a small purchases / collections / handovers ledger.

Standard library only: http.server + sqlite3. Configure with environment
variables (see deploy/expense-tracker.env.example).
"""
import json
import os
import re
import sqlite3
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
DB_PATH = Path(os.environ.get("DB_PATH", ROOT / "data" / "ledger.db"))
PIN = os.environ.get("DASH_PIN", "")
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8090"))

TYPES = ("شراء", "تحصيل", "تسليم")
DEFAULT_PEOPLE = ["أحمد", "صالح", "ناصر", "علي"]
DEFAULT_DEST = ["الوالد", "الوالدة", "مصاريف شخصية"]
MAX_BODY = 16 * 1024

_lock = threading.Lock()


def db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db() as c:
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS entries (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              at TEXT NOT NULL,
              type TEXT NOT NULL,
              name TEXT NOT NULL,
              item TEXT NOT NULL DEFAULT '',
              amount REAL NOT NULL,
              note TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS names (
              kind TEXT NOT NULL,
              name TEXT NOT NULL,
              pos INTEGER NOT NULL,
              PRIMARY KEY (kind, name)
            );
            """
        )
        if not c.execute("SELECT 1 FROM names LIMIT 1").fetchone():
            set_names(c, DEFAULT_PEOPLE, DEFAULT_DEST)


def set_names(c, people, dest):
    c.execute("DELETE FROM names")
    for kind, lst in (("person", people), ("dest", dest)):
        for i, n in enumerate(lst):
            c.execute("INSERT OR IGNORE INTO names(kind, name, pos) VALUES (?,?,?)", (kind, n, i))


def get_names(c):
    rows = c.execute("SELECT kind, name FROM names ORDER BY pos").fetchall()
    return {
        "people": [r["name"] for r in rows if r["kind"] == "person"],
        "destinations": [r["name"] for r in rows if r["kind"] == "dest"],
    }


_AR = {ord(c): str(i) for i, c in enumerate("٠١٢٣٤٥٦٧٨٩")}
_AR.update({ord(c): str(i) for i, c in enumerate("۰۱۲۳۴۵۶۷۸۹")})


def parse_amount(raw):
    if isinstance(raw, (int, float)) and not isinstance(raw, bool):
        n = float(raw)
    else:
        s = str(raw or "").strip().translate(_AR).replace("٫", ".")
        s = re.sub(r"[٬,\s$]", "", s)
        if not re.fullmatch(r"\d+(\.\d{1,2})?", s):
            return None
        n = float(s)
    return round(n, 2) if 0 < n < 10_000_000 else None


def clean_text(v, limit=200):
    return str(v or "").strip()[:limit]


class Handler(BaseHTTPRequestHandler):
    server_version = "ledger/1"

    def log_message(self, fmt, *args):
        pass

    # ---- helpers
    def send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def error(self, msg, status=400):
        self.send_json({"error": msg}, status)

    def read_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_BODY:
            raise ValueError("الطلب كبير جداً")
        try:
            return json.loads(self.rfile.read(n) or b"{}")
        except json.JSONDecodeError:
            raise ValueError("بيانات غير صحيحة")

    def authed(self):
        return bool(PIN) and self.headers.get("X-Pin", "") == PIN

    # ---- routes
    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/names":
            with db() as c:
                return self.send_json(get_names(c))
        if path == "/api/data":
            if not self.authed():
                return self.error("رمز غير صحيح", 401)
            with db() as c:
                rows = [dict(r) for r in c.execute("SELECT * FROM entries ORDER BY at, id")]
                return self.send_json({"names": get_names(c), "rows": rows})
        if path == "/healthz":
            return self.send_json({"ok": True})
        return self.static(path)

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            body = self.read_json()
        except ValueError as e:
            return self.error(str(e))
        if path == "/api/entries":
            return self.add_entry(body)
        if path == "/api/names":
            if not self.authed():
                return self.error("رمز غير صحيح", 401)
            people = [clean_text(n, 60) for n in body.get("people", []) if clean_text(n, 60)]
            dest = [clean_text(n, 60) for n in body.get("destinations", []) if clean_text(n, 60)]
            with _lock, db() as c:
                set_names(c, people, dest)
                return self.send_json(get_names(c))
        return self.error("غير موجود", 404)

    def do_DELETE(self):
        m = re.fullmatch(r"/api/entries/(\d+)", urlparse(self.path).path)
        if not m:
            return self.error("غير موجود", 404)
        if not self.authed():
            return self.error("رمز غير صحيح", 401)
        with _lock, db() as c:
            c.execute("DELETE FROM entries WHERE id = ?", (int(m.group(1)),))
        return self.send_json({"ok": True})

    def add_entry(self, b):
        typ = b.get("type")
        if typ not in TYPES:
            return self.error("نوع العملية غير صحيح")
        amount = parse_amount(b.get("amount"))
        if amount is None:
            return self.error("المبلغ غير صحيح")
        name = clean_text(b.get("name"), 60)
        item = clean_text(b.get("item")) if typ == "شراء" else ""
        if typ == "شراء" and not item:
            return self.error("اكتب الصنف")
        with _lock, db() as c:
            names = get_names(c)
            allowed = names["destinations"] if typ == "تسليم" else names["people"]
            if name not in allowed:
                return self.error("الاسم غير موجود في القائمة")
            at = datetime.now(timezone.utc).isoformat(timespec="seconds")
            c.execute(
                "INSERT INTO entries(at, type, name, item, amount, note) VALUES (?,?,?,?,?,?)",
                (at, typ, name, item, amount, clean_text(b.get("note"))),
            )
        return self.send_json({"ok": True, "amount": amount}, 201)

    def static(self, path):
        if path in ("", "/"):
            path = "/index.html"
        target = (PUBLIC / path.lstrip("/")).resolve()
        if PUBLIC not in target.parents or not target.is_file():
            return self.error("غير موجود", 404)
        types = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
                 ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json",
                 ".webmanifest": "application/manifest+json"}
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", types.get(target.suffix, "application/octet-stream"))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def main():
    if not PIN:
        raise SystemExit("DASH_PIN is not set")
    init_db()
    print(f"listening on http://{HOST}:{PORT}", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
~~~~

### `expense-tracker/public/index.html`

~~~~html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>دفتر التحصيل</title>
<meta name="theme-color" content="#0F6B57">
<link rel="manifest" href="manifest.webmanifest">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap">
<style>
:root{
  --bg:#F3F5F2; --surface:#FFFFFF; --surface-2:#E9EEEA; --line:#D5DDD7;
  --fg:#16241D; --muted:#5D6B63; --accent:#0F6B57; --accent-fg:#FFFFFF; --accent-soft:#DCEDE7;
  --owe:#B4232C; --owe-soft:#FBE7E8; --paid:#1D7A3A; --paid-soft:#E2F3E6; --warn:#9A6400; --warn-soft:#FBF0D9;
  --display:"Readex Pro","IBM Plex Sans Arabic",Tahoma,sans-serif;
  --body:"IBM Plex Sans Arabic","Segoe UI",Tahoma,sans-serif;
}
@media (prefers-color-scheme: dark){:root{
  --bg:#0F1613; --surface:#17211C; --surface-2:#1F2B25; --line:#2C3A33;
  --fg:#E6EEE9; --muted:#9AABA1; --accent:#4CC2A3; --accent-fg:#0B1A15; --accent-soft:#16352D;
  --owe:#F0727A; --owe-soft:#3A1C1F; --paid:#6BD08A; --paid-soft:#173322; --warn:#E3B04F; --warn-soft:#3A2E14;
  color-scheme:dark}}
*{box-sizing:border-box}
[hidden]{display:none!important}
html,body{margin:0}
body{background:var(--bg);color:var(--fg);font-family:var(--body);font-size:15px;line-height:1.55}
.wrap{max-width:720px;margin:0 auto;padding-inline:16px;padding-block:16px 96px}
h1,h2,h3{font-family:var(--display);margin:0}
h1{font-size:1.4rem}
h2{font-size:1.05rem;margin-bottom:10px}
.num{font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate}
.sub{font-size:.85rem;color:var(--muted)}
header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px}
.live{font-size:.8rem;color:var(--muted)}
section{display:grid;gap:14px}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px}
.form{display:grid;gap:16px}
.seg{display:grid;grid-template-columns:repeat(3,1fr);background:var(--surface-2);border-radius:12px;padding:4px;gap:4px}
.seg button{border:0;background:none;color:var(--muted);font:600 .95rem var(--display);padding:10px 4px;border-radius:9px;cursor:pointer}
.seg button.on{background:var(--surface);color:var(--fg);box-shadow:0 1px 2px rgba(0,0,0,.1)}
.field{display:grid;gap:6px}
.lab{font-size:.85rem;font-weight:600}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chips button{border:1px solid var(--line);background:var(--surface);color:var(--fg);font:500 .95rem var(--body);padding:8px 14px;border-radius:999px;cursor:pointer}
.chips button.on{background:var(--accent);border-color:var(--accent);color:var(--accent-fg)}
input{width:100%;font:inherit;font-size:16px;color:var(--fg);background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:11px 12px}
input.amt{font:600 1.3rem var(--display);text-align:left;direction:ltr}
.hint{font-size:.82rem;color:var(--muted)} .hint.err{color:var(--owe)} .hint.ok{color:var(--paid)}
.btn{border:0;background:var(--accent);color:var(--accent-fg);font:600 1rem var(--display);padding:13px 18px;border-radius:12px;cursor:pointer;width:100%}
.btn:disabled{opacity:.45}
.kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.kpi{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px}
.kpi .l{font-size:.8rem;color:var(--muted)}
.kpi .v{font:700 1.3rem var(--display)}
.kpi.owe .v{color:var(--owe)} .kpi.cash .v{color:var(--accent)}
.row{display:grid;grid-template-columns:1fr auto;gap:4px 10px;padding:10px 0;border-top:1px solid var(--line)}
.row:first-child{border-top:0}
.nm{font-weight:600}
.pill{font-size:.75rem;font-weight:600;padding:2px 9px;border-radius:999px;align-self:center}
.pill.owe{background:var(--owe-soft);color:var(--owe)} .pill.paid{background:var(--paid-soft);color:var(--paid)}
.bar{grid-column:1/-1;height:6px;border-radius:6px;background:var(--surface-2);overflow:hidden}
.bar span{display:block;height:100%;background:var(--paid)}
.bar.d span{background:var(--accent)}
.figs{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:4px 14px;font-size:.82rem;color:var(--muted)}
.figs b{color:var(--fg)} .figs .left b{color:var(--owe)}
.total{display:flex;justify-content:space-between;font-weight:600;padding-top:10px;border-top:1px solid var(--line)}
.entry{display:grid;grid-template-columns:auto 1fr auto;gap:2px 10px;align-items:center;padding:9px 0;border-top:1px solid var(--line)}
.entry:first-child{border-top:0}
.tag{font-size:.72rem;font-weight:700;padding:3px 8px;border-radius:7px;grid-row:span 2}
.tag.p{background:var(--warn-soft);color:var(--warn)} .tag.c{background:var(--paid-soft);color:var(--paid)} .tag.h{background:var(--accent-soft);color:var(--accent)}
.entry .m{font-size:.8rem;color:var(--muted)}
.empty{color:var(--muted);text-align:center;padding:18px}
nav{position:fixed;inset-inline:0;bottom:0;background:var(--surface);border-top:1px solid var(--line);display:flex;justify-content:center;gap:6px;padding:6px 8px 10px}
nav button{flex:1;max-width:200px;border:0;background:none;color:var(--muted);font:600 .9rem var(--display);padding:10px;border-radius:10px;cursor:pointer}
nav button.on{color:var(--accent);background:var(--accent-soft)}
.toast{position:fixed;bottom:76px;inset-inline:16px;margin:0 auto;max-width:360px;background:var(--fg);color:var(--bg);text-align:center;padding:10px 14px;border-radius:12px;font-weight:600}
.pinbox{display:flex;gap:8px}
.pinbox input{flex:1}
.pinbox .btn{width:auto}
.del{border:0;background:none;color:var(--muted);font:500 .8rem var(--body);cursor:pointer;padding:2px 0}
.del.confirm{color:var(--owe);font-weight:700}
.namelist{display:grid;gap:6px}
.namelist div{display:flex;justify-content:space-between;align-items:center;background:var(--surface-2);border-radius:10px;padding:8px 12px}
.namelist button{border:0;background:none;color:var(--owe);font:600 .85rem var(--body);cursor:pointer}
.addrow{display:flex;gap:8px}
.addrow input{flex:1;min-width:0}
.btn.ghost{background:var(--surface-2);color:var(--fg);width:auto}
.tools{display:flex;gap:8px;flex-wrap:wrap;justify-content:space-between;align-items:center}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div><h1>دفتر التحصيل</h1><div class="sub">بالدولار الأمريكي</div></div>
    <span class="live" id="live"></span>
  </header>

  <section id="v-add">
    <div class="panel form">
      <div class="seg" id="seg">
        <button type="button" class="on" data-k="شراء">شراء</button>
        <button type="button" data-k="تحصيل">تحصيل</button>
        <button type="button" data-k="تسليم">تسليم</button>
      </div>
      <div class="field"><div class="lab" id="whoLab">لمن؟</div><div class="chips" id="chips"><span class="hint">جارٍ تحميل الأسماء…</span></div></div>
      <div class="field" id="itemF"><label class="lab" for="item">الصنف</label><input id="item" placeholder="مثال: سماعة" autocomplete="off"></div>
      <div class="field"><label class="lab" for="amt">المبلغ (دولار)</label><input id="amt" class="amt" inputmode="decimal" placeholder="0.00" autocomplete="off"><div class="hint" id="amtHint">تقبل الأرقام العربية ٠١٢٣ والإنجليزية 0123</div></div>
      <div class="field"><label class="lab" for="note">ملاحظات (اختياري)</label><input id="note" autocomplete="off"></div>
      <div class="hint">التاريخ والوقت يُسجَّلان تلقائياً.</div>
      <button class="btn" id="save" type="button" disabled>حفظ</button>
    </div>
  </section>

  <section id="v-sum" hidden>
    <div class="panel" id="pinPanel">
      <h2>الملخص محمي برمز</h2>
      <div class="pinbox"><input id="pin" type="password" placeholder="الرمز"><button class="btn" id="pinGo" type="button">دخول</button></div>
      <div class="hint err" id="pinErr" hidden>الرمز غير صحيح</div>
    </div>
    <div id="sum" hidden>
      <div class="kpis">
        <div class="kpi"><div class="l">إجمالي المشتريات</div><div class="v num" id="kB">$0.00</div></div>
        <div class="kpi"><div class="l">إجمالي المحصّل</div><div class="v num" id="kR">$0.00</div></div>
        <div class="kpi owe"><div class="l">المتبقي للتحصيل</div><div class="v num" id="kL">$0.00</div></div>
        <div class="kpi cash"><div class="l">النقد لدى المحصِّل</div><div class="v num" id="kC">$0.00</div></div>
      </div>
      <div class="panel" style="margin-top:14px"><h2>حسب الشخص</h2><div id="people"></div></div>
      <div class="panel" style="margin-top:14px"><h2>توزيع المبالغ المحصّلة</h2><div id="dest"></div></div>
      <div class="panel" style="margin-top:14px"><div class="tools"><h2>السجل</h2><button class="btn ghost" id="exportBtn" type="button">تنزيل Excel</button></div><div id="log"></div></div>
      <div class="panel form" style="margin-top:14px">
        <h2>الأشخاص</h2>
        <div class="namelist" id="peopleList"></div>
        <div class="addrow"><input id="newPerson" placeholder="اسم جديد"><button class="btn ghost" id="addPerson" type="button">إضافة</button></div>
        <h2>جهات التسليم</h2>
        <div class="namelist" id="destList"></div>
        <div class="addrow"><input id="newDest" placeholder="جهة جديدة"><button class="btn ghost" id="addDest" type="button">إضافة</button></div>
        <div class="hint">حذف اسم من القائمة لا يحذف عملياته المسجّلة.</div>
      </div>
    </div>
  </section>
</div>
<nav>
  <button type="button" class="on" data-v="add">إضافة</button>
  <button type="button" data-v="sum">الملخص</button>
</nav>
<div class="toast" id="toast" hidden></div>

<script src="app.js"></script>
</body>
</html>
~~~~

### `expense-tracker/public/app.js`

~~~~javascript
var NAMES = {people: [], destinations: []};
var kind = "شراء", who = "", pin = "", timer = null, ROWS = [];
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function money(n) { return "$" + (Math.round(n * 100) / 100).toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2}); }
function when(iso) { try { return new Date(iso).toLocaleString("en-GB", {day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false}); } catch (e) { return ""; } }
function parseAmount(raw) {
  var s = String(raw || "").trim();
  if (!s) return null;
  s = s.replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x0660; })
       .replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 0x06F0; })
       .replace(/٫/g, ".").replace(/[٬,\s$]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  var n = parseFloat(s);
  return n > 0 ? n : NaN;
}
function toast(m) { var t = $("toast"); t.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 2500); }

function api(method, path, body) {
  var opts = {method: method, headers: {"Content-Type": "application/json"}};
  if (pin) opts.headers["X-Pin"] = pin;
  if (body) opts.body = JSON.stringify(body);
  return fetch(path, opts).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (j) {
      if (!r.ok) { var e = new Error(j.error || "خطأ في الاتصال"); e.status = r.status; throw e; }
      return j;
    });
  });
}

/* tabs */
document.querySelectorAll("nav button").forEach(function (b) {
  b.onclick = function () {
    document.querySelectorAll("nav button").forEach(function (x) { x.classList.toggle("on", x === b); });
    $("v-add").hidden = b.dataset.v !== "add";
    $("v-sum").hidden = b.dataset.v !== "sum";
    window.scrollTo(0, 0);
    if (b.dataset.v === "sum" && pin) refresh();
  };
});

/* add form */
document.querySelectorAll("#seg button").forEach(function (b) {
  b.onclick = function () {
    kind = b.dataset.k; who = "";
    document.querySelectorAll("#seg button").forEach(function (x) { x.classList.toggle("on", x === b); });
    $("itemF").hidden = kind !== "شراء";
    $("whoLab").textContent = kind === "شراء" ? "لمن؟" : kind === "تحصيل" ? "من مَن تم التحصيل؟" : "سُلِّم إلى";
    chips(); check();
  };
});
function chips() {
  var list = kind === "تسليم" ? NAMES.destinations : NAMES.people;
  $("chips").innerHTML = list.length ? list.map(function (n) {
    return '<button type="button" class="' + (n === who ? "on" : "") + '" data-n="' + esc(n) + '">' + esc(n) + "</button>";
  }).join("") : '<span class="hint">لا توجد أسماء بعد.</span>';
}
$("chips").onclick = function (e) { var b = e.target.closest("button"); if (!b) return; who = b.dataset.n; chips(); check(); };
["item", "amt", "note"].forEach(function (id) { $(id).oninput = check; });
function check() {
  var a = parseAmount($("amt").value), h = $("amtHint");
  if (a === null) { h.className = "hint"; h.textContent = "تقبل الأرقام العربية ٠١٢٣ والإنجليزية 0123"; }
  else if (isNaN(a)) { h.className = "hint err"; h.textContent = "رقم غير صحيح. اكتب المبلغ بالأرقام فقط، مثل 80 أو ٨٠"; }
  else { h.className = "hint ok"; h.textContent = "سيُسجَّل: " + money(a); }
  $("save").disabled = !(who && a && !isNaN(a) && (kind !== "شراء" || $("item").value.trim()));
}
$("save").onclick = function () {
  var a = parseAmount($("amt").value);
  $("save").disabled = true; $("save").textContent = "جارٍ الحفظ…";
  api("POST", "/api/entries", {type: kind, name: who, item: $("item").value.trim(), amount: a, note: $("note").value.trim()})
    .then(function () {
      toast("تم الحفظ: " + kind + " " + money(a));
      $("amt").value = ""; $("item").value = ""; $("note").value = "";
      if (pin) refresh();
    })
    .catch(function (err) { toast("تعذّر الحفظ: " + err.message); })
    .then(function () { $("save").textContent = "حفظ"; check(); });
};
function loadNames() {
  api("GET", "/api/names").then(function (n) { NAMES = n; chips(); check(); })
    .catch(function () { $("chips").innerHTML = '<span class="hint err">تعذّر تحميل الأسماء. أعد فتح الصفحة.</span>'; });
}

/* summary */
$("pinGo").onclick = function () { pin = $("pin").value; refresh(); };
$("pin").onkeydown = function (e) { if (e.key === "Enter") $("pinGo").onclick(); };
function refresh() {
  $("live").textContent = "جارٍ التحديث…";
  api("GET", "/api/data").then(function (d) {
    $("pinPanel").hidden = true; $("pinErr").hidden = true; $("sum").hidden = false;
    try { localStorage.setItem("pin", pin); } catch (e) {}
    render(d);
    $("live").textContent = "مباشر · " + new Date().toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit"});
  }).catch(function (err) {
    $("live").textContent = "";
    if (err.status === 401) {
      pin = ""; $("pinPanel").hidden = false; $("pinErr").hidden = false; $("sum").hidden = true;
      try { localStorage.removeItem("pin"); } catch (e) {}
    } else toast("تعذّر تحميل الملخص");
  }).then(function () {
    clearTimeout(timer);
    if (pin) timer = setTimeout(function () { if (!$("v-sum").hidden) refresh(); }, 10000);
  });
}
function sum(a) { return a.reduce(function (t, e) { return t + (Number(e.amount) || 0); }, 0); }
function render(d) {
  NAMES = d.names; ROWS = d.rows; chips(); check();
  var P = ROWS.filter(function (e) { return e.type === "شراء"; });
  var C = ROWS.filter(function (e) { return e.type === "تحصيل"; });
  var H = ROWS.filter(function (e) { return e.type === "تسليم"; });
  var b = sum(P), rc = sum(C), h = sum(H);
  $("kB").textContent = money(b); $("kR").textContent = money(rc); $("kL").textContent = money(b - rc); $("kC").textContent = money(rc - h);

  var people = NAMES.people.slice();
  P.concat(C).forEach(function (e) { if (people.indexOf(e.name) < 0) people.push(e.name); });
  $("people").innerHTML = people.length ? people.map(function (n) {
    var pb = sum(P.filter(function (e) { return e.name === n; })), pr = sum(C.filter(function (e) { return e.name === n; })), left = pb - pr;
    var pct = pb > 0 ? Math.min(100, pr / pb * 100) : 0;
    var st = pb === 0 && pr === 0 ? '<span class="pill" style="background:var(--surface-2);color:var(--muted)">لا مشتريات</span>'
      : left > 0.004 ? '<span class="pill owe">عليه مبلغ</span>' : '<span class="pill paid">مدفوع بالكامل</span>';
    return '<div class="row"><span class="nm">' + esc(n) + "</span>" + st +
      '<span class="bar"><span style="width:' + pct + '%"></span></span>' +
      '<span class="figs"><span>المشتريات <b class="num">' + money(pb) + '</b></span><span>المحصّل <b class="num">' + money(pr) + '</b></span><span class="left">المتبقي <b class="num">' + money(Math.max(0, left)) + "</b></span></span></div>";
  }).join("") : '<div class="empty">لا توجد أسماء بعد</div>';

  var dests = NAMES.destinations.slice();
  H.forEach(function (e) { if (dests.indexOf(e.name) < 0) dests.push(e.name); });
  $("dest").innerHTML = dests.map(function (n) {
    var a = sum(H.filter(function (e) { return e.name === n; })), pct = rc > 0 ? Math.min(100, a / rc * 100) : 0;
    return '<div class="row"><span>' + esc(n) + '</span><span class="num">' + money(a) + '</span><span class="bar d"><span style="width:' + pct + '%"></span></span></div>';
  }).join("") + '<div class="total"><span>النقد المتبقي لدى المحصِّل</span><span class="num">' + money(rc - h) + "</span></div>";

  var tagOf = {"شراء": "p", "تحصيل": "c", "تسليم": "h"};
  var recent = ROWS.slice().reverse().slice(0, 100);
  $("log").innerHTML = recent.length ? recent.map(function (r) {
    var t = r.type === "شراء" ? esc(r.name) + " · " + esc(r.item) : r.type === "تحصيل" ? "من " + esc(r.name) : "إلى " + esc(r.name);
    return '<div class="entry"><span class="tag ' + (tagOf[r.type] || "p") + '">' + esc(r.type) + "</span><span>" + t + '</span><span class="num">' + money(r.amount) + "</span>" +
      '<span class="m"><span class="num">' + when(r.at) + "</span>" + (r.note ? " · " + esc(r.note) : "") +
      ' · <button class="del" type="button" data-id="' + r.id + '">حذف</button></span></div>';
  }).join("") : '<div class="empty">لا توجد عمليات بعد</div>';

  renderNames();
}

$("log").onclick = function (e) {
  var b = e.target.closest("button.del"); if (!b) return;
  if (!b.classList.contains("confirm")) {
    b.classList.add("confirm"); b.textContent = "تأكيد الحذف";
    setTimeout(function () { if (b.isConnected) { b.classList.remove("confirm"); b.textContent = "حذف"; } }, 3000);
    return;
  }
  api("DELETE", "/api/entries/" + b.dataset.id).then(function () { toast("تم الحذف"); refresh(); })
    .catch(function (err) { toast("تعذّر الحذف: " + err.message); });
};

/* names */
function renderNames() {
  function row(n, k) { return '<div><span>' + esc(n) + '</span><button type="button" data-k="' + k + '" data-n="' + esc(n) + '">إزالة</button></div>'; }
  $("peopleList").innerHTML = NAMES.people.map(function (n) { return row(n, "people"); }).join("") || '<span class="hint">لا توجد أسماء</span>';
  $("destList").innerHTML = NAMES.destinations.map(function (n) { return row(n, "destinations"); }).join("") || '<span class="hint">لا توجد جهات</span>';
}
function saveNames(next) {
  api("POST", "/api/names", next).then(function (n) { NAMES = n; renderNames(); chips(); toast("تم حفظ الأسماء"); refresh(); })
    .catch(function (err) { toast("تعذّر الحفظ: " + err.message); });
}
function addName(k, input) {
  var v = $(input).value.trim(); if (!v) return;
  if (NAMES[k].indexOf(v) >= 0) { toast("الاسم موجود"); return; }
  $(input).value = "";
  var next = {people: NAMES.people.slice(), destinations: NAMES.destinations.slice()};
  next[k].push(v); saveNames(next);
}
$("addPerson").onclick = function () { addName("people", "newPerson"); };
$("addDest").onclick = function () { addName("destinations", "newDest"); };
$("newPerson").onkeydown = function (e) { if (e.key === "Enter") addName("people", "newPerson"); };
$("newDest").onkeydown = function (e) { if (e.key === "Enter") addName("destinations", "newDest"); };
document.addEventListener("click", function (e) {
  var b = e.target.closest(".namelist button[data-k]"); if (!b) return;
  var next = {people: NAMES.people.slice(), destinations: NAMES.destinations.slice()};
  next[b.dataset.k] = next[b.dataset.k].filter(function (n) { return n !== b.dataset.n; });
  saveNames(next);
});

/* Excel export */
function loadXLSX() {
  return new Promise(function (ok, bad) {
    if (window.XLSX) return ok(window.XLSX);
    var s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = function () { ok(window.XLSX); }; s.onerror = bad; document.head.appendChild(s);
  });
}
$("exportBtn").onclick = function () {
  loadXLSX().then(function (X) {
    var P = ROWS.filter(function (e) { return e.type === "شراء"; }), C = ROWS.filter(function (e) { return e.type === "تحصيل"; }), H = ROWS.filter(function (e) { return e.type === "تسليم"; });
    var people = NAMES.people.slice(); P.concat(C).forEach(function (e) { if (people.indexOf(e.name) < 0) people.push(e.name); });
    var s = [["الشخص", "المشتريات", "المحصّل", "المتبقي"]];
    people.forEach(function (n) { var b = sum(P.filter(function (e) { return e.name === n; })), r = sum(C.filter(function (e) { return e.name === n; })); s.push([n, b, r, b - r]); });
    s.push(["الإجمالي", sum(P), sum(C), sum(P) - sum(C)], [], ["سُلِّم إلى", "المبلغ"]);
    var dests = NAMES.destinations.slice(); H.forEach(function (e) { if (dests.indexOf(e.name) < 0) dests.push(e.name); });
    dests.forEach(function (n) { s.push([n, sum(H.filter(function (e) { return e.name === n; }))]); });
    s.push(["إجمالي المسلَّم", sum(H)], ["النقد لدى المحصِّل", sum(C) - sum(H)]);
    var wb = X.utils.book_new(); wb.Workbook = {Views: [{RTL: true}]};
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(s), "الملخص");
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["التاريخ", "الشخص", "الصنف", "المبلغ", "ملاحظات"]].concat(P.map(function (e) { return [when(e.at), e.name, e.item, e.amount, e.note]; }))), "المشتريات");
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["التاريخ", "الشخص", "المبلغ", "ملاحظات"]].concat(C.map(function (e) { return [when(e.at), e.name, e.amount, e.note]; }))), "التحصيلات");
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["التاريخ", "سُلِّم إلى", "المبلغ", "ملاحظات"]].concat(H.map(function (e) { return [when(e.at), e.name, e.amount, e.note]; }))), "التسليمات");
    X.writeFile(wb, "دفتر-التحصيل-" + new Date().toISOString().slice(0, 10) + ".xlsx");
  }).catch(function () { toast("تعذّر إنشاء الملف"); });
};

try { var saved = localStorage.getItem("pin"); if (saved) pin = saved; } catch (e) {}
loadNames();
~~~~

### `expense-tracker/public/manifest.webmanifest`

~~~~json
{"name":"دفتر التحصيل","short_name":"دفتر التحصيل","lang":"ar","dir":"rtl","start_url":"/","display":"standalone","background_color":"#F3F5F2","theme_color":"#0F6B57","icons":[{"src":"icon.svg","sizes":"any","type":"image/svg+xml","purpose":"any"}]}
~~~~

### `expense-tracker/public/icon.svg`

~~~~xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#0F6B57"/><path d="M150 140h170a40 40 0 0 1 40 40v190a20 20 0 0 1-20 20H150z" fill="#fff"/><path d="M190 200h120M190 250h120M190 300h80" stroke="#0F6B57" stroke-width="22" stroke-linecap="round"/></svg>
~~~~

### `expense-tracker/deploy/install.sh`

~~~~bash
#!/usr/bin/env bash
# Idempotent setup, run by the GitHub Action after each deploy (or by hand).
# Env: DASH_PIN (required on first run), DOMAIN (optional), PORT (default 8090).
set -euo pipefail

APP_DIR=/opt/expense-tracker
DATA_DIR=/var/lib/expense-tracker
ENV_FILE=/etc/expense-tracker.env
PORT="${PORT:-8090}"
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"

if ! command -v python3 >/dev/null; then
  $SUDO apt-get update -y && $SUDO apt-get install -y python3
fi

id ledger >/dev/null 2>&1 || $SUDO useradd --system --home "$DATA_DIR" --shell /usr/sbin/nologin ledger
$SUDO mkdir -p "$DATA_DIR"
$SUDO chown ledger:ledger "$DATA_DIR"
$SUDO chmod 750 "$DATA_DIR"

if [ -n "${DOMAIN:-}" ]; then BIND=127.0.0.1; else BIND=0.0.0.0; fi
if [ -n "${DASH_PIN:-}" ] || [ ! -f "$ENV_FILE" ]; then
  [ -n "${DASH_PIN:-}" ] || { echo "DASH_PIN is required on first install" >&2; exit 1; }
  printf 'DASH_PIN=%s\nHOST=%s\nPORT=%s\nDB_PATH=%s/ledger.db\n' "$DASH_PIN" "$BIND" "$PORT" "$DATA_DIR" | $SUDO tee "$ENV_FILE" >/dev/null
  $SUDO chmod 600 "$ENV_FILE"
fi

$SUDO cp "$APP_DIR/deploy/expense-tracker.service" /etc/systemd/system/expense-tracker.service
$SUDO systemctl daemon-reload
$SUDO systemctl enable expense-tracker >/dev/null 2>&1
$SUDO systemctl restart expense-tracker

if [ -n "${DOMAIN:-}" ]; then
  if ! command -v caddy >/dev/null; then
    if $SUDO ss -ltn '( sport = :80 or sport = :443 )' | grep -q LISTEN; then
      echo "Ports 80/443 are already used by another web server; skipping Caddy." >&2
      echo "Point your existing server at http://127.0.0.1:$PORT for $DOMAIN." >&2
    else
      $SUDO apt-get update -y && $SUDO apt-get install -y caddy
    fi
  fi
  if command -v caddy >/dev/null; then
    printf '%s {\n\treverse_proxy 127.0.0.1:%s\n}\n' "$DOMAIN" "$PORT" | $SUDO tee /etc/caddy/Caddyfile >/dev/null
    $SUDO systemctl reload caddy || $SUDO systemctl restart caddy
  fi
elif command -v ufw >/dev/null && $SUDO ufw status | grep -q "Status: active"; then
  $SUDO ufw allow "$PORT"/tcp >/dev/null
fi

sleep 1
if curl -fsS "http://127.0.0.1:$PORT/healthz" >/dev/null; then
  echo "expense-tracker is running on port $PORT"
else
  $SUDO journalctl -u expense-tracker -n 30 --no-pager
  exit 1
fi
~~~~

### `expense-tracker/deploy/expense-tracker.service`

~~~~ini
[Unit]
Description=Expense tracker (دفتر التحصيل)
After=network.target

[Service]
User=ledger
EnvironmentFile=/etc/expense-tracker.env
WorkingDirectory=/opt/expense-tracker
ExecStart=/usr/bin/python3 /opt/expense-tracker/app.py
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/expense-tracker
PrivateTmp=true

[Install]
WantedBy=multi-user.target
~~~~

### `expense-tracker/README.md`

~~~~markdown
# دفتر التحصيل

Arabic ledger for purchases (شراء), collections (تحصيل) and handovers (تسليم), with a live summary per person.

- `app.py`: server (Python 3 standard library + SQLite, no dependencies)
- `public/`: the page the collector and the owner open on their phones
- `deploy/`: systemd service and install script for the VPS
- `../.github/workflows/expense-tracker.yml`: every push that changes this folder is copied to the VPS and restarted

## Run locally

```bash
DASH_PIN=1234 python3 app.py   # http://127.0.0.1:8090
```

## GitHub secrets

| Secret | Value |
|---|---|
| `VPS_HOST` | server IP or hostname |
| `VPS_USER` | SSH user (usually `root`) |
| `VPS_SSH_KEY` | private key allowed in that user's `~/.ssh/authorized_keys` |
| `VPS_PORT` | SSH port, if not 22 (optional) |
| `DASH_PIN` | code that opens the summary |
| `DOMAIN` | domain pointed at the server, for HTTPS via Caddy (optional) |

Data lives in `/var/lib/expense-tracker/ledger.db` and is not touched by deploys.
~~~~

### `.github/workflows/expense-tracker.yml`

~~~~yaml
name: Deploy expense tracker to VPS

on:
  push:
    branches: [main, claude/greeting-rlegll]
    paths:
      - "expense-tracker/**"
      - ".github/workflows/expense-tracker.yml"
  workflow_dispatch:

concurrency:
  group: expense-tracker-deploy
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      HAS_VPS: ${{ secrets.VPS_HOST != '' }}
    steps:
      - uses: actions/checkout@v4

      - name: Check
        working-directory: expense-tracker
        run: |
          python3 -m py_compile app.py
          node --check public/app.js
          bash -n deploy/install.sh

      - name: VPS not configured yet
        if: env.HAS_VPS != 'true'
        run: echo "::notice::Add the VPS_HOST, VPS_USER, VPS_SSH_KEY and DASH_PIN secrets to deploy."

      - name: Copy files
        if: env.HAS_VPS == 'true'
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT || 22 }}
          source: "expense-tracker/app.py,expense-tracker/public,expense-tracker/deploy"
          strip_components: 1
          target: /opt/expense-tracker

      - name: Install and restart
        if: env.HAS_VPS == 'true'
        uses: appleboy/ssh-action@v1.0.3
        env:
          DASH_PIN: ${{ secrets.DASH_PIN }}
          DOMAIN: ${{ secrets.DOMAIN }}
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT || 22 }}
          envs: DASH_PIN,DOMAIN
          script: bash /opt/expense-tracker/deploy/install.sh
~~~~
