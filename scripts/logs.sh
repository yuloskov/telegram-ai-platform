#!/bin/bash
# View logs from production containers
# Usage: ./scripts/logs.sh [service]
# Example: ./scripts/logs.sh user-app

APP_DIR="$HOME/telegram-ai-platform"
SERVICE=${1:-""}

cd "$APP_DIR"

if [ -z "$SERVICE" ]; then
    docker compose -f docker/docker-compose.prod.yml logs -f --tail=100
else
    docker compose -f docker/docker-compose.prod.yml logs -f --tail=100 "$SERVICE"
fi
