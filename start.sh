#!/usr/bin/env bash
# Start everything the study assistant needs, in the right order.
#
#   ./start.sh          start database + backend + frontend
#   ./start.sh stop     stop them again
#
# Ctrl+C stops the servers. The database keeps running (it holds your data);
# use ./start.sh stop to shut it down too.

set -euo pipefail
cd "$(dirname "$0")"

PY=./venv/bin/python
PG_CONTAINER=studyai-pg

# 8000 is Django's default and is often already taken by another project on
# this machine. Override with:  BACKEND_PORT=8002 ./start.sh
BACKEND_PORT="${BACKEND_PORT:-8001}"

port_owner() {
    ss -ltnp 2>/dev/null | awk -v p=":$1\$" '$4 ~ p {print $NF}' | head -1
}

stop_everything() {
    echo "Stopping servers…"
    pkill -f "manage.py runserver" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    docker stop "$PG_CONTAINER" >/dev/null 2>&1 || true
    echo "Stopped. Your data is safe in the Docker volume."
}

if [[ "${1:-}" == "stop" ]]; then
    stop_everything
    exit 0
fi

# ---------------------------------------------------------------- 1. database
echo "[1/3] Database…"
if ! docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
    if docker ps -a --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
        docker start "$PG_CONTAINER" >/dev/null
        echo "      restarted existing container"
    else
        docker run -d --name "$PG_CONTAINER" \
            -e POSTGRES_USER=studyai -e POSTGRES_PASSWORD=studyai \
            -e POSTGRES_DB=studyai_db \
            -p 5433:5432 -v studyai-pgdata:/var/lib/postgresql/data \
            pgvector/pgvector:pg16 >/dev/null
        echo "      created container (first run)"
    fi
else
    echo "      already running"
fi

# Postgres accepts the port before it accepts queries; wait for the real thing.
printf "      waiting for Postgres"
for _ in $(seq 30); do
    if docker exec "$PG_CONTAINER" pg_isready -U studyai -q 2>/dev/null; then
        echo " — ready"
        break
    fi
    printf "."
    sleep 1
done

# ---------------------------------------------------------------- 2. backend
echo "[2/3] Backend…"
if [[ ! -f backend/.env ]]; then
    echo "      ERROR: backend/.env is missing."
    echo "      Run: cp backend/.env.example backend/.env  then add your GEMINI_API_KEY"
    exit 1
fi

# Fail loudly on a busy port. Django's own message scrolls past in a log file,
# and the symptom downstream is a login page showing a parse error -- because
# Vite proxies /api to whatever else is listening there.
if owner=$(port_owner "$BACKEND_PORT") && [[ -n "$owner" ]]; then
    echo "      ERROR: port $BACKEND_PORT is already in use by:"
    echo "             $owner"
    echo
    echo "      Either stop that process, or pick another port:"
    echo "             BACKEND_PORT=8002 ./start.sh"
    exit 1
fi

(cd backend && "../$PY" manage.py migrate --no-input >/dev/null) && echo "      migrations up to date"
(cd backend && "../$PY" manage.py runserver "$BACKEND_PORT" >/tmp/studyai-backend.log 2>&1) &
BACKEND_PID=$!
echo "      running on :$BACKEND_PORT"

# ---------------------------------------------------------------- 3. frontend
echo "[3/3] Frontend…"
if [[ ! -d frontend/node_modules ]]; then
    echo "      installing npm packages (first run, takes a minute)…"
    (cd frontend && npm install --silent)
fi
(cd frontend && npm run dev >/tmp/studyai-frontend.log 2>&1) &
FRONTEND_PID=$!

sleep 4
echo
echo "───────────────────────────────────────────────"
echo "  Open:      http://localhost:3000"
echo "  Admin:     http://localhost:$BACKEND_PORT/admin"
echo
echo "  Logs:      tail -f /tmp/studyai-backend.log"
echo "             tail -f /tmp/studyai-frontend.log"
echo
echo "  Ctrl+C to stop the servers."
echo "───────────────────────────────────────────────"

trap 'echo; echo "Stopping…"; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit 0' INT
wait
