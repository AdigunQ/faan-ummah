#!/bin/bash

echo "🔍 Checking Deployment Issues"
echo "=============================="
echo ""

cd /Users/qeew/cooperative-loan-app-pro

echo "Step 1: Check environment variables..."
railway variables

echo ""
echo "Step 2: Check if DATABASE_URL is set..."
DB_URL=$(railway variables get DATABASE_URL 2>&1)
if [ -z "$DB_URL" ] || [[ "$DB_URL" == *"not found"* ]]; then
    echo "❌ DATABASE_URL is NOT set!"
    echo ""
    echo "You need to:"
    echo "1. Go to https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
    echo "2. Click '+ New' → 'Database' → 'Add PostgreSQL'"
    echo "3. Wait for it to provision"
    echo ""
    echo "Then run this script again."
    exit 1
else
    echo "✅ DATABASE_URL is set"
fi

echo ""
echo "Step 3: Check NEXTAUTH_SECRET..."
SECRET=$(railway variables get NEXTAUTH_SECRET 2>&1)
if [ -z "$SECRET" ] || [[ "$SECRET" == *"not found"* ]]; then
    echo "❌ NEXTAUTH_SECRET is NOT set!"
    echo "Setting it now..."
    railway variables set NEXTAUTH_SECRET="$(openssl rand -base64 32)"
else
    echo "✅ NEXTAUTH_SECRET is set"
fi

echo ""
echo "Step 4: View build logs..."
echo "Open this URL to see detailed build logs:"
echo "https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
echo ""
echo "Click on your service, then click 'Deploy Logs'"
echo ""

# Try to get logs
railway logs --tail 50

echo ""
echo "Step 5: Retry deployment?"
read -p "Do you want to try deploying again? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Redeploying..."
    railway up
fi
