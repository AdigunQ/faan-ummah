#!/bin/bash

echo "🗄️  Pushing Database Schema to Railway"
echo "========================================"
echo ""

cd /Users/qeew/cooperative-loan-app-pro

echo "This will push the schema directly to your Railway database..."
echo ""

# Get the DATABASE_URL from Railway
DB_URL=$(railway variables | grep "DATABASE_URL" | grep -o "postgresql://[^[:space:]]*")

if [ -z "$DB_URL" ]; then
    echo "❌ DATABASE_URL not found in Railway variables!"
    echo ""
    echo "Please check Railway dashboard and ensure DATABASE_URL is set."
    exit 1
fi

echo "✅ Found DATABASE_URL"
echo ""

# Use railway run to execute in Railway's environment
echo "Pushing schema using Railway environment..."
railway run npx prisma db push --accept-data-loss

echo ""
echo "Seeding database..."
railway run npm run db:seed

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Try logging in:"
echo "  admin@coop.com / admin123"
