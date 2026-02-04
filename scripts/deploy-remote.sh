#!/bin/bash
# Production deploy script for VM
# Location on VM: ~/telegram-ai-platform/scripts/deploy-remote.sh

set -e

APP_DIR="$HOME/telegram-ai-platform"
LOG_FILE="$APP_DIR/deploy.log"
COMPOSE_CMD="docker compose --env-file .env -f docker/docker-compose.prod.yml"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cd "$APP_DIR"

log "=== Starting deployment ==="

# Build containers with cache (parallel builds with BuildKit)
log "Building containers..."
DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1 $COMPOSE_CMD build --parallel

# Restart containers
log "Restarting containers..."
$COMPOSE_CMD up -d

# Run database migrations
log "Running database migrations..."
$COMPOSE_CMD exec -T worker sh -c "cd /app/packages/database && npm exec -- prisma@6.19.2 db push --schema=./prisma/schema.prisma" || true

# Cleanup old images
log "Cleaning up old images..."
docker image prune -f

log "=== Deployment completed ==="
$COMPOSE_CMD ps
