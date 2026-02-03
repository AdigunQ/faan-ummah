#!/bin/bash

echo "🚀 Cooperative Loan App - Setup Script"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo ""
    echo "📝 Creating .env.local file..."
    cp .env.example .env.local
    echo "⚠️  Please edit .env.local with your actual credentials before continuing!"
    echo ""
    echo "Required variables:"
    echo "  - DATABASE_URL (PostgreSQL connection string)"
    echo "  - NEXTAUTH_SECRET (random string)"
    echo "  - Cloudinary credentials (optional, for image uploads)"
    exit 1
fi

# Setup database with Docker (optional)
read -p "🐳 Start PostgreSQL with Docker? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting PostgreSQL..."
    docker-compose up -d
    
    # Wait for database
    echo "⏳ Waiting for database to be ready..."
    sleep 5
    
    # Update .env.local with Docker credentials
    sed -i '' 's|DATABASE_URL=.*|DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cooperative_db"|' .env.local 2>/dev/null || \
    sed -i 's|DATABASE_URL=.*|DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cooperative_db"|' .env.local
    
    echo "✅ Database URL updated in .env.local"
fi

# Generate Prisma client
echo ""
echo "🔄 Generating Prisma client..."
npx prisma generate

# Run migrations
echo ""
echo "🗄️  Running database migrations..."
npx prisma migrate dev --name init

# Seed database
echo ""
echo "🌱 Seeding database..."
npm run db:seed

echo ""
echo "========================================"
echo "✅ Setup complete!"
echo ""
echo "🚀 Start the development server:"
echo "   npm run dev"
echo ""
echo "🔑 Default login credentials:"
echo "   Admin: admin@coop.com / admin123"
echo "   Member: member@example.com / member123"
echo ""
echo "📱 Open http://localhost:3000 in your browser"
echo "========================================"
