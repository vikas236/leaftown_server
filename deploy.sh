#!/bin/bash

# === CONFIGURATION ===
VPS_ALIAS="kvm1"                       # <--- Uses your SSH config alias
VPS_PATH="/home/vi/leaftown/server"    # Path on the remote server
PM2_APP_NAME="leaftown-server"         # Name in PM2

# === STEP 1: Ask for commit message ===
echo "Enter commit message:"
read COMMIT_MSG

if [ -z "$COMMIT_MSG" ]; then
    echo "❌ Commit message cannot be empty. Aborting."
    exit 1
fi

# === STEP 2: Git Operations ===
echo "📦 Processing Git..."
git add .
git commit -m "$COMMIT_MSG"
# git push origin main # Uncomment if you use GitHub/GitLab

# === STEP 3: Deploy to VPS via rsync ===
echo "🚀 Deploying code to $VPS_ALIAS:$VPS_PATH ..."

# Ensure destination directory exists using the alias
ssh $VPS_ALIAS "mkdir -p $VPS_PATH"

# === RSYNC ===
# Uses the alias 'kvm1' directly.
# --exclude 'uploads': Protects server-side images.
# --exclude '.env': Protects server-side secrets.

rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'uploads' \
  ./ $VPS_ALIAS:$VPS_PATH/

# === STEP 4: Remote Commands ===
echo "🔄 Running remote commands on $VPS_ALIAS..."

ssh $VPS_ALIAS << EOF
  cd $VPS_PATH
  
  # 1. Install dependencies
  echo "📦 Installing dependencies..."
  npm install --production

  # 2. Restart/Start the server
  echo "🔥 Managing PM2 process..."
  
  # Check if process exists
  pm2 describe $PM2_APP_NAME > /dev/null
  if [ \$? -eq 0 ]; then
      # If it exists, restart it
      pm2 restart $PM2_APP_NAME
  else
      # If it doesn't exist, start it on the new port (3003 will be read from .env)
      pm2 start server.js --name "$PM2_APP_NAME"
  fi
  
  # 3. Save config
  pm2 save

  echo "✅ Deployment of $PM2_APP_NAME Complete!"
EOF