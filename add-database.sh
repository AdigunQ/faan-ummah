#!/bin/bash

echo "🗄️  Adding PostgreSQL Database"
echo "==============================="
echo ""

cd /Users/qeew/cooperative-loan-app-pro

echo "Opening Railway dashboard..."
echo ""
echo "👉 FOLLOW THESE STEPS:"
echo "1. Click '+ New' button"
echo "2. Select 'Database' → 'Add PostgreSQL'"
echo "3. Wait for it to say 'Healthy' (green dot)"
echo "4. Come back here and press ENTER"
echo ""

# Open browser
if command -v open &> /dev/null; then
    open "https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
elif command -v xdg-open &> /dev/null; then
    xdg-open "https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
fi

read -p "Press ENTER after adding PostgreSQL..."

echo ""
echo "Checking if DATABASE_URL was set..."

# Check for DATABASE_URL
if railway variables | grep -q "DATABASE_URL"; then
    echo "✅ DATABASE_URL found!"
    echo ""
    echo "Redeploying app..."
    railway up
    echo ""
    echo "✅ Done! Now setting up database..."
    echo "Run: railway shell"
    echo "Then: npx prisma migrate deploy && npm run db:seed && exit"
else
    echo "❌ DATABASE_URL not found. Waiting a bit more..."
    sleep 10
    if railway variables | grep -q "DATABASE_URL"; then
        echo "✅ Found it now! Redeploying..."
        railway up
    else
        echo "❌ Still not found. Check the dashboard to ensure PostgreSQL was added."
    fi
fi
