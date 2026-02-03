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

# Initialize git if not already done
if [ ! -d .git ]; then
    print_status "Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit - Ready for Railway deployment"
    print_success "Git repository initialized"
else
    print_status "Git repository already initialized"
    # Check if there are uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        print_status "Committing changes..."
        git add .
        git commit -m "Update - Ready for deployment"
        print_success "Changes committed"
    fi
fi

# Initialize Railway project
print_status "Initializing Railway project..."
echo "When prompted, choose:"
echo "  - Project Name: cooperative-loan-app (or your preferred name)"
echo "  - Environment: production"
echo ""
railway init

if [ $? -ne 0 ]; then
    print_error "Failed to initialize Railway project"
    exit 1
fi
print_success "Railway project initialized"

# Add PostgreSQL
print_status "Adding PostgreSQL database..."
railway add --plugin postgresql
if [ $? -ne 0 ]; then
    print_error "Failed to add PostgreSQL"
    exit 1
fi
print_success "PostgreSQL database added"

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
railway up

if [ $? -ne 0 ]; then
    print_error "Deployment failed. Check logs with: railway logs"
    exit 1
fi

print_success "App deployed successfully!"

# Get the domain
DOMAIN=$(railway domain)
print_status "Your app URL: $DOMAIN"

# Update NEXTAUTH_URL
print_status "Updating NEXTAUTH_URL..."
railway variables set NEXTAUTH_URL="$DOMAIN"
print_success "NEXTAUTH_URL configured"

# Run database migrations
print_status "Setting up database..."
print_warning "Opening Railway shell to run migrations..."
print_status "When the shell opens, run these commands:"
echo ""
echo "  npx prisma migrate deploy"
echo "  npm run db:seed"
echo "  exit"
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
