#!/bin/sh

# Docker Entrypoint Script
# Generates config.json from BACKEND_PORT environment variable
# Used when Angular and .NET backend run in the same container

set -e

# Default backend port if not provided
DEFAULT_BACKEND_PORT="5000"

# Get backend port from environment variable or use default
BACKEND_PORT="${BACKEND_PORT:-$DEFAULT_BACKEND_PORT}"

# Construct API URL - backend is on localhost in same container
API_URL="http://localhost:${BACKEND_PORT}/api/"

# Create assets directory if it doesn't exist
ASSETS_DIR="/usr/share/nginx/html/assets"
mkdir -p "$ASSETS_DIR"

# Generate config.json
CONFIG_FILE="${ASSETS_DIR}/config.json"
cat > "$CONFIG_FILE" <<EOF
{
  "apiUrl": "${API_URL}"
}
EOF

echo "✅ Generated config.json with API_URL: ${API_URL}"
echo "📄 Config file location: ${CONFIG_FILE}"
cat "$CONFIG_FILE"

# Execute the main command (nginx, etc.)
exec "$@"

