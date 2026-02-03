#!/bin/bash

echo "🚀 Cooperative Loan App - Railway Deployment Script"
echo "======================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_status "Installing Railway CLI..."
    npm install -g @railway/cli
    if [ $? -ne 0 ]; then
        print_error "Failed to install Railway CLI. Please install manually: npm install -g @railway/cli"
        exit 1
    fi
    print_success "Railway CLI installed"
fi

# Check if user is logged in to Railway
print_status "Checking Railway authentication..."
railway whoami &> /dev/null
if [ $? -ne 0 ]; then
    print_status "Please login to Railway..."
    railway login
    if [ $? -ne 0 ]; then
        print_error "Railway login failed"
        exit 1
    fi
fi
print_success "Authenticated with Railway"

# Check if already in a Railway project
print_status "Checking Railway project..."
RAILWAY_PROJECT=$(railway status 2>&1 | grep -o 'Project: [^ ]*' | cut -d' ' -f2)

if [ -z "$RAILWAY_PROJECT" ] || [ "$RAILWAY_PROJECT" = "None" ]; then
    print_status "Initializing Railway project..."
    echo ""
    echo "When prompted:"
    echo "  1. Select your workspace"
    echo "  2. Choose 'New Project' or enter a name like 'cooperative-loan-app'"
    echo ""
    railway init
    
    if [ $? -ne 0 ]; then
        print_error "Failed to initialize Railway project"
        exit 1
    fi
    print_success "Railway project initialized"
else
    print_success "Already in Railway project: $RAILWAY_PROJECT"
fi

# Add PostgreSQL using the new interactive method
print_status "Adding PostgreSQL database..."
print_warning "You'll need to add PostgreSQL manually via Railway dashboard"
echo ""
echo "Opening Railway dashboard..."
echo ""
echo "👉 STEPS TO ADD DATABASE:"
echo "   1. Click '+ New' in the dashboard"
echo "   2. Select 'Database'"
echo "   3. Choose 'Add PostgreSQL'"
echo "   4. Wait for it to provision (takes ~1 minute)"
echo ""

# Open dashboard in browser
if command -v open &> /dev/null; then
    open "https://railway.com/dashboard"
elif command -v xdg-open &> /dev/null; then
    xdg-open "https://railway.com/dashboard"
fi

read -p "Press ENTER after you've added PostgreSQL in the dashboard..."

# Verify DATABASE_URL is set
print_status "Checking database connection..."
DB_URL=$(railway variables get DATABASE_URL 2>&1)

if [ -z "$DB_URL" ] || [[ "$DB_URL" == *"not found"* ]]; then
    print_error "DATABASE_URL not found. Please make sure PostgreSQL was added."
    print_status "Trying to find database service..."
    
    # List services to find database
    railway status
    
    print_warning "Please run: railway variables"
    print_status "And verify DATABASE_URL is set. If not, wait a moment and try again."
    read -p "Press ENTER to continue anyway..."
fi

# Generate NEXTAUTH_SECRET
print_status "Setting up environment variables..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
railway variables set NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
print_success "NEXTAUTH_SECRET configured"

# Ask for Cloudinary credentials (optional)
echo ""
print_warning "Cloudinary is optional but recommended for payment proof images"
read -p "Do you want to configure Cloudinary now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Get your credentials from: https://cloudinary.com/console"
    read -p "Cloudinary Cloud Name: " cloud_name
    read -p "Cloudinary API Key: " api_key
    read -p "Cloudinary API Secret: " api_secret
    
    railway variables set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="$cloud_name"
    railway variables set CLOUDINARY_API_KEY="$api_key"
    railway variables set CLOUDINARY_API_SECRET="$api_secret"
    print_success "Cloudinary configured"
else
    print_warning "Skipping Cloudinary setup. You can add it later."
fi

echo ""
print_status "Current environment variables:"
railway variables

echo ""
print_status "Deploying to Railway..."
print_warning "This may take 3-5 minutes..."
echo ""

# Deploy
railway up

if [ $? -ne 0 ]; then
    print_error "Deployment failed. Check logs with: railway logs"
    exit 1
fi

print_success "App deployed successfully!"

# Get the domain
DOMAIN=$(railway domain 2>&1 | grep -o 'https://[^ ]*' | head -1)

if [ -z "$DOMAIN" ]; then
    print_warning "Could not get domain automatically"
    echo "Check your Railway dashboard for the URL"
    DOMAIN="https://your-app-url.up.railway.app"
else
    print_status "Your app URL: $DOMAIN"
fi

# Update NEXTAUTH_URL
print_status "Updating NEXTAUTH_URL..."
railway variables set NEXTAUTH_URL="$DOMAIN"
print_success "NEXTAUTH_URL configured"

# Run database migrations
print_status "Setting up database..."
print_warning "Opening Railway shell to run migrations..."
echo ""
echo "👉 RUN THESE COMMANDS IN THE SHELL:"
echo ""
echo "  npx prisma migrate deploy"
echo "  npm run db:seed"
echo "  exit"
echo ""
echo "This will:"
echo "  1. Create database tables"
echo "  2. Add default admin user (admin@coop.com / admin123)"
echo ""
read -p "Press ENTER to open Railway shell..."

railway shell

print_success "Database setup complete!"

echo ""
echo "======================================================"
print_success "DEPLOYMENT COMPLETE! 🎉"
echo "======================================================"
echo ""
print_status "Your app is live at:"
echo "  $DOMAIN"
echo ""
print_status "Default login credentials:"
echo "  Admin: admin@coop.com / admin123"
echo "  Member: member@example.com / member123"
echo ""
print_status "Useful commands:"
echo "  railway logs --follow    # View live logs"
echo "  railway status           # Check status"
echo "  railway variables        # View env vars"
echo ""
print_warning "To install as PWA on your phone:"
echo "  1. Open $DOMAIN on your mobile browser"
echo "  2. Tap 'Add to Home Screen'"
echo ""
print_status "Happy deploying! 🚀"
