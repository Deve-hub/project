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
