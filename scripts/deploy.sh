#!/bin/bash
# Local script to trigger deployment on VM
# Usage: ./scripts/deploy.sh

set -e

VM_HOST="root@95.111.234.151"
APP_DIR="telegram-ai-platform"

echo "Deploying to $VM_HOST..."

ssh "$VM_HOST" "cd ~/$APP_DIR && bash scripts/deploy-remote.sh"

echo "Done!"
