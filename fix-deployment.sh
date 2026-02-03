#!/bin/bash

echo "🔧 Fixing Railway Deployment"
echo "============================="
echo ""

cd /Users/qeew/cooperative-loan-app-pro

echo "Step 1: Linking to your Railway project..."
railway link

echo ""
echo "Step 2: Listing available services..."
echo "You should see your app service (not the database)"
railway service

echo ""
echo "Step 3: Select your app service"
echo "Run: railway service"
echo "Then select the main app service (not postgres)"
echo ""
read -p "Press ENTER after running 'railway service' and selecting your app..."

echo ""
echo "Step 4: Setting environment variables..."
railway variables set NEXTAUTH_SECRET="$(openssl rand -base64 32)"

echo ""
echo "Step 5: Deploying..."
railway up

echo ""
echo "Step 6: Setting up database..."
echo "Opening Railway shell. Run these commands:"
echo "  npx prisma migrate deploy"
echo "  npm run db:seed"
echo "  exit"
echo ""
read -p "Press ENTER to open shell..."
railway shell

echo ""
echo "✅ Done! Check your app URL with: railway domain"
