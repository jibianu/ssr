#!/usr/bin/env bash
# Build and run Oilandgasclub frontend in Docker.
# Public site + Elearn share one port; Elearn lives under /course/ (same as oilandgasclub.com in prod).
#
# Usage:
#   ./deploy.sh
#   HOST_PORT=8080 ./deploy.sh     # map http://localhost:8080 → container :4000
#   PORT=8080 ./deploy.sh         # alias for HOST_PORT

set -euo pipefail
cd "$(dirname "$0")"

export HOST_PORT="${HOST_PORT:-${PORT:-4000}}"

echo "Building image (site SSR + elearn baseHref /course/)..."
docker compose build

echo "Starting container (host :$HOST_PORT → app :4000)..."
docker compose up -d --remove-orphans

echo ""
echo "Done."
echo "  Public site:  http://localhost:${HOST_PORT}/"
echo "  Elearn app:   http://localhost:${HOST_PORT}/course/"
echo ""
echo "Production (put nginx/Caddy in front):"
echo "  https://oilandgasclub.com/         → proxy_pass to this container:4000"
echo "  https://oilandgasclub.com/course/  → same origin (no extra upstream)"
echo ""
echo "Stop:  docker compose down"
