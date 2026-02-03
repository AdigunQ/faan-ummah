#!/bin/bash

echo "🔧 Fixing Database Hostname"
echo "============================"
echo ""

cd /Users/qeew/cooperative-loan-app-pro

echo "The issue is the hostname 'postgres.railway.internal' might not resolve."
echo ""
echo "Let's try using the private network domain instead..."
echo ""

# Get the private domain
PRIVATE_DOMAIN=$(railway variables | grep "RAILWAY_PRIVATE_DOMAIN" | awk -F '│' '{print $3}' | tr -d ' ')

echo "Current private domain: $PRIVATE_DOMAIN"
echo ""

# The database might be at a different hostname
echo "👉 CHECK THE RAILWAY DASHBOARD:"
echo ""
echo "1. Go to: https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
echo ""
echo "2. Click on your POSTGRESQL service (not the app)"
echo ""
echo "3. Go to 'Connect' tab"
echo ""
echo "4. Copy the 'Database URL' (it should be something like:)"
echo "   postgresql://postgres:PASSWORD@postgres-xxx.railway.internal:5432/railway"
echo ""
echo "5. Go to your 'cooperative-app' service"
echo ""
echo "6. Variables tab → Edit DATABASE_URL"
echo ""
echo "7. Paste the correct URL"
echo ""
echo "8. Deploy"
echo ""

if command -v open &> /dev/null; then
    open "https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
fi

read -p "Press ENTER after updating DATABASE_URL..."

echo ""
echo "Testing connection..."
railway shell << 'EOF'
echo "Testing database connection..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT 1\`
  .then(() => { console.log('✅ Database connected!'); process.exit(0); })
  .catch(e => { console.log('❌ Error:', e.message); process.exit(1); });
"
EOF
