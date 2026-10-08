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
