#!/bin/bash
# Initial VM setup script
# Run this ONCE on a fresh VM: curl -fsSL <raw-github-url> | bash

set -e

echo "=== Installing Docker ==="
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

echo "=== Installing Docker Compose ==="
apt-get update
apt-get install -y docker-compose-plugin

echo "=== Creating app directory ==="
mkdir -p ~/telegram-ai-platform

echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "1. Clone your repo: git clone https://<TOKEN>@github.com/<user>/telegram-ai-channels-platform.git ~/telegram-ai-platform"
echo "2. Create .env file: cp ~/telegram-ai-platform/.env.production.example ~/telegram-ai-platform/.env"
echo "3. Edit .env with your values: nano ~/telegram-ai-platform/.env"
echo "4. Point your domain DNS to this server IP"
echo "5. Run: cd ~/telegram-ai-platform && docker compose -f docker/docker-compose.prod.yml up -d"
