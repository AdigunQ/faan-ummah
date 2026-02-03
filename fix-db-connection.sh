#!/bin/bash

echo "🔌 Fixing Database Connection"
echo "=============================="
echo ""

cd /Users/qeew/cooperative-loan-app-pro

echo "Step 1: Check what services exist..."
railway service

echo ""
echo "Step 2: We need to get the DATABASE_URL from the postgres service"
echo ""
echo "👉 PLEASE DO THIS IN THE RAILWAY DASHBOARD:"
echo ""
echo "1. Go to: https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
echo ""
echo "2. Click on your PostgreSQL service (not the app)"
echo ""
echo "3. Go to 'Variables' tab"
echo ""
echo "4. Copy the DATABASE_URL value"
echo ""
echo "5. Click on your 'cooperative-app' service"
echo ""
echo "6. Go to 'Variables' tab"
echo ""
echo "7. Click '+ New Variable'"
echo ""
echo "8. Add:"
echo "   Name: DATABASE_URL"
echo "   Value: (paste the URL from step 4)"
echo ""
echo "9. Click 'Add' then 'Deploy'"
echo ""

# Try to open browser
if command -v open &> /dev/null; then
    open "https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
elif command -v xdg-open &> /dev/null; then
    xdg-open "https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
fi

read -p "Press ENTER after adding DATABASE_URL in dashboard..."

echo ""
echo "Checking if DATABASE_URL is now set..."
if railway variables | grep -q "DATABASE_URL"; then
    echo "✅ DATABASE_URL is now set!"
    echo ""
    echo "Now let's setup the database..."
    echo ""
    echo "Run these commands:"
    echo "1. railway shell"
    echo "2. npx prisma migrate deploy"
    echo "3. npm run db:seed"
    echo "4. exit"
else
    echo "❌ DATABASE_URL still not found. Try the manual steps above."
fi
