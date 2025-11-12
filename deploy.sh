#!/bin/bash

# === CONFIGURATION ===
VPS_ALIAS="kvm1"                          # SSH alias (from ~/.ssh/config)
VPS_PATH="/home/vi/leaftown_server"       # Remote path on VPS

# === STEP 1: Ask for commit message ===
echo "Enter commit message:"
read COMMIT_MSG

# === STEP 2: Initialize Git locally (optional if not already done) ===
if [ ! -d ".git" ]; then
  echo "🔧 Initializing local Git repo..."
  git init
  git checkout -b main
fi

# === STEP 3: Commit local changes ===
echo "📦 Committing local changes..."
git add .
git commit -m "$COMMIT_MSG" || echo "ℹ️  Nothing new to commit."

# === STEP 4: Deploy to VPS via rsync ===
echo "🚀 Deploying code to VPS ($VPS_ALIAS)..."

# Ensure destination directory exists
ssh $VPS_ALIAS "mkdir -p $VPS_PATH"

# Copy everything except node_modules
rsync -avz --delete \
  --exclude 'node_modules' \
  ./ $VPS_ALIAS:$VPS_PATH/

# === STEP 5: Post-deploy commands ===
ssh $VPS_ALIAS << EOF
  cd $VPS_PATH
  echo "✅ Files copied successfully to $VPS_PATH"

  # Optional: install deps or restart process
  # npm install --production
  # pm2 restart all || pm2 start server.js
EOF

echo "🎉 Deployment complete!"
