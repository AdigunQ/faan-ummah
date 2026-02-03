#!/bin/bash

echo "🗄️  Running Database Migrations"
echo "================================"
echo ""

cd /Users/qeew/cooperative-loan-app-pro

echo "Since we can't access the internal DB from outside,"
echo "we need to run migrations inside Railway's network."
echo ""
echo "👉 OPTION 1: Use Railway Dashboard (Easiest)"
echo ""
echo "1. Go to: https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef"
echo ""
echo "2. Click on your APP service (cooperative-app)"
echo ""
echo "3. Go to 'Shell' tab"
echo ""
echo "4. Run these commands:"
echo "   npx prisma migrate deploy"
echo "   npm run db:seed"
echo ""
echo "👉 OPTION 2: I can try to use railway connect"
echo ""

read -p "Try Option 2 (railway connect)? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Trying railway connect..."
    echo "This will create a tunnel to your database."
    echo "Press Ctrl+C when done."
    echo ""
    
    # Get the service name for postgres
    echo "First, let's identify your postgres service name..."
    echo "Run: railway service"
    echo "Select your PostgreSQL service"
    echo ""
    
    railway service
    
    echo ""
    echo "Now run: railway connect"
    echo "This will give you a local port to connect to."
    echo ""
    
    railway connect
fi

echo ""
echo "After migrations are done, your app will be ready!"
echo ""
echo "Login credentials will be:"
echo "  Admin: admin@coop.com / admin123"
echo "  Member: member@example.com / member123"
