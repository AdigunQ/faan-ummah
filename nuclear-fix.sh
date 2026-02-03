#!/bin/bash

echo "☢️  NUCLEAR FIX - Complete Reset"
echo "================================="
echo ""

cd /Users/qeew/cooperative-loan-app-pro

echo "Step 1: Remove railway.json temporarily..."
mv railway.json railway.json.bak

echo ""
echo "Step 2: Clear ALL variables and re-add them fresh..."

echo "This will require you to use the dashboard."
echo ""
echo "👉 GO TO: https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
echo ""
echo "FOR THE cooperative-app SERVICE:"
echo ""
echo "1. Go to Variables tab"
echo "2. Delete ALL variables except RAILWAY_* ones"
echo "3. Click '+ New Variable'"
echo "4. Add each one fresh:"
echo ""
echo "   Name: DATABASE_URL"
echo "   Value: postgresql://postgres:cAujvrAZzPEwruKTTrJROPbjLsYTswOO@postgres.railway.internal:5432/railway"
echo ""
echo "   Name: NEXTAUTH_SECRET"
echo "   Value: $(openssl rand -base64 32)"
echo ""
echo "   Name: NEXTAUTH_URL"
echo "   Value: https://cooperative-app-production.up.railway.app"
echo ""
echo "5. Click Deploy"
echo ""

if command -v open &> /dev/null; then
    open "https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
elif command -v xdg-open &> /dev/null; then
    xdg-open "https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
fi

read -p "Press ENTER after fixing variables in dashboard..."

echo ""
echo "Restoring railway.json..."
mv railway.json.bak railway.json

echo ""
echo "Step 3: Force redeploy..."
railway up

echo ""
echo "Done! Check: https://cooperative-app-production.up.railway.app"
