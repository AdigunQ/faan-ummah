#!/bin/bash
set -e

echo "🗄️  Setting up database..."
npx prisma db push --accept-data-loss

echo "🌱  Seeding database..."
npx prisma db seed || true

echo "🚀  Starting app..."
exec npm start
