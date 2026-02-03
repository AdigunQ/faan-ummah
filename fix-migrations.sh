#!/bin/bash

echo "🗄️  Fixing Database - Creating Tables"
echo "======================================"
echo ""

cd /Users/qeew/cooperative-loan-app-pro

echo "❌ The error means migrations didn't create the tables."
echo ""
echo "👉 WE NEED TO RUN MIGRATIONS INSIDE RAILWAY"
echo ""
echo "Go to Railway Dashboard:"
echo "https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
echo ""
echo "STEPS:"
echo ""
echo "1. Click on 'cooperative-app' service"
echo ""
echo "2. Click the 'Shell' tab (next to Logs, Metrics)"
echo ""
echo "3. In the terminal that opens, run:"
echo "   npx prisma migrate deploy"
echo ""
echo "4. You should see:"
echo "   The following migration(s) have been applied:"
echo "   - 20240203_init"
echo ""
echo "5. Then run:"
echo "   npm run db:seed"
echo ""
echo "6. You should see:"
echo "   ✅ Admin user created: admin@coop.com"
echo "   ✅ Sample member created: member@example.com"
echo ""
echo "7. Type: exit"
echo ""

if command -v open &> /dev/null; then
    open "https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
elif command -v xdg-open &> /dev/null; then
    xdg-open "https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
fi

echo "Waiting for you to complete the steps above..."
echo ""
read -p "Press ENTER after running the migrations in Railway Shell..."

echo ""
echo "Testing if it worked..."
curl -s https://cooperative-app-production.up.railway.app/api/health
echo ""

echo ""
echo "Try logging in now:"
echo "  admin@coop.com / admin123"
echo ""
