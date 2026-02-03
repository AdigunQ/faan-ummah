# Railway Deployment Guide - Step by Step

Railway is the easiest way to deploy this app because it handles both PostgreSQL and the Next.js app automatically!

## Prerequisites

- Railway account (free at railway.app)
- GitHub account (to push your code)
- Git installed locally

---

## Step 1: Push Code to GitHub

First, create a GitHub repository and push your code:

```bash
# Navigate to your project
cd /Users/qeew/cooperative-loan-app-pro

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Cooperative Loan App"

# Create GitHub repo and push
# Go to github.com → New Repository → Name it "cooperative-loan-app"
# Then run:
git remote add origin https://github.com/YOUR_USERNAME/cooperative-loan-app.git
git branch -M main
git push -u origin main
```

---

## Step 2: Install Railway CLI

```bash
# Install Railway CLI globally
npm install -g @railway/cli

# Login (opens browser)
railway login
```

---

## Step 3: Create Railway Project

```bash
# Initialize project in your app directory
cd /Users/qeew/cooperative-loan-app-pro
railway init

# Choose:
# ? Project Name: cooperative-loan-app
# ? Environment: production (or create new)
```

---

## Step 4: Add PostgreSQL Database

```bash
# Add PostgreSQL plugin
railway add --plugin postgresql

# Verify it's created
railway status
```

This automatically:
- Creates a PostgreSQL database
- Sets the `DATABASE_URL` environment variable
- Handles all connection details

---

## Step 5: Configure Environment Variables

Railway will auto-detect some, but we need to add a few:

```bash
# Add required environment variables
railway variables set NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Optional: Cloudinary (for payment proof images)
railway variables set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
railway variables set CLOUDINARY_API_KEY="your-api-key"
railway variables set CLOUDINARY_API_SECRET="your-api-secret"
```

To view all variables:
```bash
railway variables
```

You should see:
- `DATABASE_URL` (auto-created by Railway)
- `NEXTAUTH_SECRET` (you just added)
- `PORT` (auto-set to 3000)

---

## Step 6: Configure Build Settings

Railway needs to know how to build your app. Create a `railway.json` file:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run db:generate && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Also update your `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate deploy",
    "db:seed": "tsx prisma/seed.ts",
    "postinstall": "prisma generate"
  }
}
```

---

## Step 7: Deploy!

```bash
# Deploy to Railway
railway up

# Watch the logs
railway logs --follow
```

This will:
1. Install dependencies
2. Generate Prisma client
3. Build the Next.js app
4. Start the server

---

## Step 8: Run Database Migrations

After first deploy, you need to set up the database:

```bash
# Open Railway shell
railway shell

# Inside the shell, run:
npx prisma migrate deploy

# Then seed the database
npm run db:seed

# Exit shell
exit
```

Alternative: Use Railway's web dashboard:
1. Go to railway.app → Your Project
2. Click on your service
3. Go to "Shell" tab
4. Run the commands above

---

## Step 9: Get Your Public URL

```bash
# Get the deployed URL
railway domain

# Or check status
railway status
```

Your app will be at something like:
`https://cooperative-loan-app-production.up.railway.app`

---

## Step 10: Update NEXTAUTH_URL

After you have your domain, update the environment variable:

```bash
railway variables set NEXTAUTH_URL="https://your-app-url.railway.app"
```

Then redeploy:
```bash
railway up
```

---

## 🎉 Done! Access Your App

Your app is now live at the Railway URL!

**Default Logins:**
- Admin: `admin@coop.com` / `admin123`
- Member: `member@example.com` / `member123`

---

## Custom Domain (Optional)

Want your own domain (e.g., `coop.yourcompany.com`)?

### Via Railway Dashboard:
1. Go to railway.app
2. Select your project
3. Click "Settings" tab
4. Click "+ New Domain"
5. Choose "Custom Domain"
6. Enter your domain
7. Railway will give you DNS records to add
8. Add those records to your DNS provider (Cloudflare, Namecheap, etc.)
9. Wait for SSL certificate (automatic)

### Update Environment Variable:
```bash
railway variables set NEXTAUTH_URL="https://coop.yourcompany.com"
railway up
```

---

## Troubleshooting

### Issue: "Build failed"
```bash
# Check logs
railway logs

# Common fix: Make sure prisma generate runs before build
# Check your railway.json config
```

### Issue: "Database connection error"
```bash
# Verify DATABASE_URL is set
railway variables

# Test connection
railway shell
npx prisma db pull
exit
```

### Issue: "Cannot find module '@prisma/client'"
```bash
# Make sure postinstall script is in package.json
"postinstall": "prisma generate"

# Then redeploy
railway up
```

### Issue: "Seeding failed"
```bash
# Run seed manually in Railway shell
railway shell
npx prisma db seed
# or
npm run db:seed
exit
```

---

## Monitoring & Logs

```bash
# View logs in real-time
railway logs --follow

# View specific service logs
railway logs --service your-service-name

# Check deployment status
railway status
```

---

## Updates & Redeploys

After making code changes:

```bash
# Commit changes
git add .
git commit -m "Your changes"
git push

# Deploy to Railway
railway up
```

Railway also supports **auto-deploy** from GitHub:
1. Go to railway.app dashboard
2. Your Project → Settings
3. Connect GitHub repo
4. Enable "Auto Deploy" on git push

---

## Cost & Free Tier

Railway offers:
- **$5 free credit/month** (enough for small apps)
- PostgreSQL: ~$0.50-1/month
- App hosting: ~$0.50-2/month
- **Total: ~$1-3/month** for small cooperative

Or use the **free trial** ($5 credit) to test first!

---

## Railway Dashboard Tips

### Access via Browser:
1. Go to **railway.app**
2. Click your project
3. You can:
   - View logs
   - Restart service
   - View metrics (CPU, memory)
   - Add environment variables
   - Add custom domains
   - View deployment history

### Useful Features:
- **Variables**: Manage all env vars in UI
- **Metrics**: Monitor app performance
- **Logs**: Real-time streaming
- **Shell**: Direct terminal access to container

---

## Summary Checklist

- [ ] Code pushed to GitHub
- [ ] Railway CLI installed and logged in
- [ ] Project initialized (`railway init`)
- [ ] PostgreSQL added (`railway add --plugin postgresql`)
- [ ] Environment variables set (NEXTAUTH_SECRET)
- [ ] `railway.json` config file created
- [ ] First deploy (`railway up`)
- [ ] Database migrations run (`prisma migrate deploy`)
- [ ] Database seeded (`npm run db:seed`)
- [ ] NEXTAUTH_URL updated with actual domain
- [ ] App tested with default logins

**Questions?** Check Railway docs: https://docs.railway.app
