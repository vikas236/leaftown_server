#!/bin/bash

# === CONFIGURATION ===
REPO_URL="git@github.com:vikas236/leaftown_server.git"   # GitHub repo SSH URL
REPO_BRANCH="main"                                       # Change if your default branch differs
VPS_ALIAS="kvm1"                                         # SSH alias (from ~/.ssh/config)
VPS_PATH="/home/vi/leaftown_server"                      # Path on VPS to host the app

# === STEP 1: Ask for commit message ===
echo "Enter commit message:"
read COMMIT_MSG

# === STEP 2: Initialize Git (if not already) ===
if [ ! -d ".git" ]; then
  echo "🔧 Initializing local Git repo..."
  git init
  git remote add origin $REPO_URL
  git checkout -b $REPO_BRANCH
fi

# === STEP 3: Commit and push to GitHub ===
echo "📦 Committing and pushing changes to GitHub..."
git add .
git commit -m "$COMMIT_MSG"
git push -u origin $REPO_BRANCH

# === STEP 4: Deploy via Git on VPS ===
echo "🚀 Deploying to VPS ($VPS_ALIAS)..."
ssh $VPS_ALIAS << EOF
  set -e  # exit if any command fails

  if [ ! -d "$VPS_PATH/.git" ]; then
    echo "📁 Project not found on VPS — cloning fresh..."
    git clone -b $REPO_BRANCH $REPO_URL $VPS_PATH
  else
    echo "🔄 Pulling latest code from GitHub..."
    cd $VPS_PATH
    git pull origin $REPO_BRANCH
  fi

  echo "✅ Code synced successfully on VPS!"
EOF
