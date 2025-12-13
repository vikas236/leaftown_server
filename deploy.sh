#!/bin/bash

# -----------------------
# 0. CONFIG
# -----------------------
REMOTE="kvm1"
USER="vi"
REMOTE_DIR="/home/vi/leaftown/server"
SERVICE_NAME="leaftown-server"  # <--- CHANGED: Matches your Nginx config

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

# Create the directory first (just in case)
ssh $REMOTE "mkdir -p $REMOTE_DIR"

# Upload files (Excluding local builds and git metadata)
rsync -avz --exclude="node_modules" --exclude=".git" --exclude="dist" ./ $REMOTE:$REMOTE_DIR

echo "✔️ Upload complete"

# -----------------------
# 3. Install, Build & Start
# -----------------------
echo "🔧 Installing dependencies & starting server..."

ssh $REMOTE << EOF
  cd $REMOTE_DIR

  # 1. Install ALL dependencies (we need devDeps to run the build)
  echo "📦 Installing dependencies..."
  pnpm install

  # 2. Build the TypeScript code
  echo "📌 Building TypeScript..."
  pnpm build

  # 3. Reset PM2
  # We delete the specific process to ensure it picks up the new 'dist' path correctly
  echo "🔁 Resetting PM2..."
  pm2 delete $SERVICE_NAME 2> /dev/null || true
  
  # Start the server pointing to the BUILT file
  pm2 start dist/index.js --name $SERVICE_NAME

  echo "✔️ Deployment complete!"
EOF