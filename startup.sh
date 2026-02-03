#!/bin/bash
set -e

echo "🗄️  Setting up database..."
npx prisma db push --accept-data-loss

echo "🌱  Seeding database..."
npx tsx prisma/seed.ts || true

echo "🚀  Starting app..."
exec npm start
