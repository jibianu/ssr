#!/bin/bash
# Frontend Angular SSR Docker Deployment Script (Linux/Mac)

set -e

# Configuration
IMAGE_NAME=${IMAGE_NAME:-"course-angular-ui:latest"}
CONTAINER_NAME=${CONTAINER_NAME:-"course-angular-ui"}
PORT=${PORT:-4000}
API_BASE_URL=${API_BASE_URL:-"http://localhost:8080"}

echo "=========================================="
echo "Frontend Angular SSR Docker Deployment"
echo "=========================================="
echo ""

# Step 1: Stop and remove existing container
echo "[1/4] Stopping existing container (if any)..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true
echo "✓ Cleanup complete"

# Step 2: Build Docker image
echo "[2/4] Building Docker image..."
cd "$(dirname "$0")"  # Change to ssr directory
docker build -t $IMAGE_NAME --build-arg BUILD_ENV=production .
if [ $? -ne 0 ]; then
    echo "✗ Build failed!"
    exit 1
fi
echo "✓ Build complete"

# Step 3: Run container
echo "[3/4] Starting container..."

# Build docker run command
DOCKER_CMD="docker run -d \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  --cpus=\"1.0\" \
  --memory=\"512m\" \
  -p ${PORT}:${PORT} \
  -e PORT=${PORT} \
  -e NODE_ENV=production \
  -e API_BASE_URL=${API_BASE_URL} \
  -e NODE_OPTIONS=--max-old-space-size=512"

DOCKER_CMD="$DOCKER_CMD $IMAGE_NAME"

eval $DOCKER_CMD

if [ $? -ne 0 ]; then
    echo "✗ Container start failed!"
    exit 1
fi
echo "✓ Container started"

# Step 4: Wait and verify
echo "[4/4] Waiting for application to start (15 seconds)..."
sleep 15

# Check container status
STATUS=$(docker ps --filter "name=$CONTAINER_NAME" --format "{{.Status}}")
if [ -n "$STATUS" ]; then
    echo "✓ Container is running: $STATUS"
else
    echo "✗ Container is not running! Check logs:"
    docker logs $CONTAINER_NAME
    exit 1
fi

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo "Frontend URL: http://localhost:$PORT"
echo "API Base URL: $API_BASE_URL"
echo ""
echo "Useful commands:"
echo "  View logs:    docker logs -f $CONTAINER_NAME"
echo "  Stop:         docker stop $CONTAINER_NAME"
echo "  Start:        docker start $CONTAINER_NAME"
echo "  Remove:       docker rm -f $CONTAINER_NAME"
echo "  Check CPU:    docker stats $CONTAINER_NAME"
echo ""

