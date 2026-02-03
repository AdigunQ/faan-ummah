#!/bin/bash

echo "🗄️  Creating Database Migration"
echo "================================="
echo ""

cd /Users/qeew/cooperative-loan-app-pro

echo "Step 1: Create migration file..."
npx prisma migrate dev --name init --create-only

echo ""
echo "Step 2: Now we need to apply it to Railway database..."
echo ""
echo "👉 Go to Railway Dashboard:"
echo "https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
echo ""
echo "1. Click on 'cooperative-app' service"
echo "2. Click 'Shell' tab"
echo "3. Run: npx prisma migrate deploy"
echo "4. Run: npm run db:seed"
echo "5. Type: exit"
echo ""

if command -v open &> /dev/null; then
    open "https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
fi

read -p "Press ENTER after completing the steps..."

echo ""
echo "✅ Done! Try logging in now."
