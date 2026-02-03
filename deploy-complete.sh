#!/bin/bash

echo "🚀 Railway Deployment - Complete Fix"
echo "====================================="
echo ""

cd /Users/qeew/cooperative-loan-app-pro

echo "Step 1: Check Railway status..."
railway status

echo ""
echo "Step 2: If not linked, run: railway link"
echo "Select your project (skillful-art)"
echo ""
read -p "Press ENTER after checking status..."

echo ""
echo "Step 3: Creating services via Railway dashboard..."
echo ""
echo "Since services aren't showing, we'll use the dashboard method."
echo ""
echo "👉 OPEN THIS URL IN YOUR BROWSER:"
echo "https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
echo ""
echo "Then:"
echo "1. Click '+ New' button"
echo "2. Select 'Empty Service'"
echo "3. Name it 'cooperative-app'"
echo "4. Click '+ New' again"
echo "5. Select 'Database' → 'Add PostgreSQL'"
echo ""

# Try to open browser
if command -v open &> /dev/null; then
    open "https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
elif command -v xdg-open &> /dev/null; then
    xdg-open "https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
fi

read -p "Press ENTER after creating services in dashboard..."

echo ""
echo "Step 4: Now link to your app service..."
railway service

echo ""
echo "Step 5: Set environment variables..."
railway variables set NEXTAUTH_SECRET="$(openssl rand -base64 32)"

echo ""
echo "Step 6: Deploy..."
railway up

echo ""
echo "Step 7: Get your domain..."
railway domain

echo ""
echo "Step 8: Set NEXTAUTH_URL with your actual domain..."
echo "Replace YOUR-URL below with the domain from step 7:"
echo "railway variables set NEXTAUTH_URL='https://YOUR-URL.up.railway.app'"
echo ""

echo "Step 9: Setup database..."
echo "railway shell"
echo "Then run: npx prisma migrate deploy && npm run db:seed && exit"
echo ""

echo "✅ Done!"
