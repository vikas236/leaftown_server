#!/bin/bash

# === CONFIGURATION ===
VPS_USER="vi"
VPS_HOST="srv766600"
VPS_PATH="/home/vi/leaftown/server"
PM2_APP_NAME="leaftown-server"  # <--- UPDATED NAME

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
echo "🚀 Deploying code to $VPS_HOST:$VPS_PATH ..."

# Ensure destination directory exists
ssh $VPS_USER@$VPS_HOST "mkdir -p $VPS_PATH"

# === RSYNC SAFETY EXPLANATION ===
# --delete: Removes old code files on server that you deleted locally.
# --exclude 'uploads': SAFETY LOCK. It tells rsync to pretend the 'uploads' folder 
#                      doesn't exist. It won't delete server images, and it won't 
#                      upload local images.
# --exclude '.env': Keeps production secrets safe.

rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'uploads' \
  ./ $VPS_USER@$VPS_HOST:$VPS_PATH/

# === STEP 4: Remote Commands ===
echo "🔄 Running remote commands..."

ssh $VPS_USER@$VPS_HOST << EOF
  cd $VPS_PATH
  
  # 1. Install dependencies
  echo "📦 Installing dependencies..."
  npm install --production

  # 2. Restart/Start the server with the NEW NAME
  echo "🔥 Managing PM2 process..."
  
  # Check if process exists, restart it; otherwise start it new
  pm2 describe $PM2_APP_NAME > /dev/null
  if [ \$? -eq 0 ]; then
      pm2 restart $PM2_APP_NAME
  else
      pm2 start server.js --name "$PM2_APP_NAME"
  fi
  
  # 3. Save config
  pm2 save

  echo "✅ Deployment of $PM2_APP_NAME Complete!"
EOF