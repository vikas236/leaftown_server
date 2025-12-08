#!/bin/bash

# -----------------------
# 0. CONFIG
# -----------------------
REMOTE="kvm1"
USER="vi"
REMOTE_DIR="/home/vi/leaftown/server"
SERVICE_NAME="leaftown_server"

# -----------------------
# 1. Git push to GitHub
# -----------------------
echo "🔄 Staging files..."
git add .

echo "✍️ Enter commit message: "
read msg

git commit -m "$msg"
git push origin main
echo "✔️ Code pushed to GitHub"

# -----------------------
# 2. Upload to VPS
# -----------------------
echo "🚀 Uploading project to VPS..."
rsync -avz --exclude="node_modules" --exclude=".git" ./ $REMOTE:$REMOTE_DIR

echo "✔️ Upload complete"

# -----------------------
# 3. Install dependencies & restart PM2
# -----------------------
echo "🔧 Installing dependencies & restarting server..."

ssh $REMOTE << EOF
  cd $REMOTE_DIR
  
  echo "📦 Installing dependencies..."
  pnpm install --prod

  echo "📌 Building TypeScript..."
  pnpm build

  echo "🔁 Restarting PM2..."
  pm2 restart $SERVICE_NAME || pm2 start dist/index.js --name $SERVICE_NAME

  echo "✔️ Deployment complete!"
EOF
