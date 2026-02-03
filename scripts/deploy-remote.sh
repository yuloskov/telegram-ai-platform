#!/bin/bash
# Production deploy script for VM
# Location on VM: ~/telegram-ai-platform/scripts/deploy-remote.sh

set -e

APP_DIR="$HOME/telegram-ai-platform"
LOG_FILE="$APP_DIR/deploy.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cd "$APP_DIR"

log "=== Starting deployment ==="

# Pull latest changes
log "Pulling latest changes..."
git fetch origin
git reset --hard origin/main

# Build and restart containers
log "Building and restarting containers..."
docker compose --env-file .env -f docker/docker-compose.prod.yml build --no-cache
docker compose --env-file .env -f docker/docker-compose.prod.yml up -d

# Run database migrations
log "Running database migrations..."
docker compose --env-file .env -f docker/docker-compose.prod.yml exec -T user-app sh -c "cd /app && npx prisma db push" || true

# Cleanup old images
log "Cleaning up old images..."
docker image prune -f

log "=== Deployment completed ==="
docker compose --env-file .env -f docker/docker-compose.prod.yml ps
