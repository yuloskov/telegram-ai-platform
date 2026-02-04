#!/bin/bash
# Local script to trigger deployment on VM
# Usage: ./scripts/deploy.sh

set -e

VM_HOST="root@95.111.234.151"
APP_DIR="telegram-ai-platform"

echo "Deploying to $VM_HOST..."

ssh -o ServerAliveInterval=60 -o ServerAliveCountMax=10 "$VM_HOST" "cd ~/$APP_DIR && git fetch origin && git reset --hard origin/main && bash scripts/deploy-remote.sh"

echo "Done!"
