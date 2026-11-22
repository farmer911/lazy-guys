#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

is_port_free() {
  node -e '
    const net = require("node:net");
    const port = Number(process.argv[1]);
    const srv = net.createServer();
    srv.once("error", () => process.exit(1));
    srv.once("listening", () => srv.close(() => process.exit(0)));
    srv.listen(port, "0.0.0.0");
  ' "$1" >/dev/null 2>&1
}

echo "[1/5] Checking prerequisites..."
require_cmd node
require_cmd npm
require_cmd docker

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js >= 20 is required (found $(node -v))." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Start Docker Desktop / Docker Engine and re-run ./init.sh." >&2
  exit 1
fi

echo "[2/5] Preparing .env..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
else
  echo ".env already exists, keeping current values"
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

POSTGRES_USER_VAL="${POSTGRES_USER:-lazyguy}"
POSTGRES_PASSWORD_VAL="${POSTGRES_PASSWORD:-lazyguy_secret}"
POSTGRES_DB_VAL="${POSTGRES_DB:-lazy_guy_portfolio}"
POSTGRES_PORT_VAL="${POSTGRES_PORT:-5432}"

CONTAINER_RUNNING="$(docker ps --filter "name=^lazy-guy-postgres$" --filter "status=running" -q)"
if [ -z "$CONTAINER_RUNNING" ] && ! is_port_free "$POSTGRES_PORT_VAL"; then
  OLD_PORT="$POSTGRES_PORT_VAL"
  NEW_PORT=""
  for candidate in $(seq 5433 5450); do
    if is_port_free "$candidate"; then
      NEW_PORT="$candidate"
      break
    fi
  done
  if [ -z "$NEW_PORT" ]; then
    echo "No free PostgreSQL port found between 5433 and 5450." >&2
    exit 1
  fi
  POSTGRES_PORT_VAL="$NEW_PORT"
  node -e '
    const fs = require("node:fs");
    const port = process.argv[1];
    const user = process.argv[2];
    const pass = process.argv[3];
    const db = process.argv[4];
    let env = fs.readFileSync(".env", "utf8");
    env = env.replace(/^POSTGRES_PORT=.*$/m, `POSTGRES_PORT=${port}`);
    env = env.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=postgresql://${user}:${pass}@localhost:${port}/${db}`);
    fs.writeFileSync(".env", env);
  ' "$POSTGRES_PORT_VAL" "$POSTGRES_USER_VAL" "$POSTGRES_PASSWORD_VAL" "$POSTGRES_DB_VAL"
  export POSTGRES_PORT="$POSTGRES_PORT_VAL"
  export DATABASE_URL="postgresql://${POSTGRES_USER_VAL}:${POSTGRES_PASSWORD_VAL}@localhost:${POSTGRES_PORT_VAL}/${POSTGRES_DB_VAL}"
  echo "Port ${OLD_PORT} is already in use; switched POSTGRES_PORT to ${POSTGRES_PORT_VAL} in .env"
fi

echo "[3/5] Installing workspace dependencies..."
npm install

echo "[4/5] Starting PostgreSQL via Docker Compose..."
docker compose up -d

echo "Waiting for PostgreSQL to accept connections..."
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U "$POSTGRES_USER_VAL" -d "$POSTGRES_DB_VAL" >/dev/null 2>&1; then
    echo "PostgreSQL is ready on port ${POSTGRES_PORT_VAL}."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Timed out waiting for PostgreSQL." >&2
    exit 1
  fi
  sleep 1
done

echo "[5/5] Verifying typecheck, unit tests, and build..."
npm run typecheck
npm run test:unit
npm run build

echo ""
echo "Environment ready. Start dev servers with:"
echo "  npm run dev:api"
echo "  npm run dev:web"
echo "Run E2E tests (first time: npx playwright install chromium):"
echo "  npm run test:e2e"
