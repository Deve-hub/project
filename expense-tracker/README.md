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
