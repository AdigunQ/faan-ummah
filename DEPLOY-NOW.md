# 🚀 Deploy to Railway - Just Copy & Paste These Commands

Your app is ready to deploy. Just run these commands in your terminal.

---

## Prerequisites (One-time setup)

1. **Install Node.js**: https://nodejs.org (get v18 or higher)

2. **Create Railway account**: https://railway.app (sign up with GitHub)

---

## Step 1: Navigate to your project

```bash
cd /Users/qeew/cooperative-loan-app-pro
```

---

## Step 2: Run the automated deployment script

```bash
./deploy-railway.sh
```

This script will:
- ✅ Check/install Railway CLI
- ✅ Login you to Railway
- ✅ Initialize the project
- ✅ Add PostgreSQL database
- ✅ Set environment variables
- ✅ Deploy your app
- ✅ Setup the database

**Just follow the prompts!**

---

## Alternative: Manual Steps (If script doesn't work)

### Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### Initialize & Deploy
```bash
# Go to project
cd /Users/qeew/cooperative-loan-app-pro

# Create Railway project
railway init
# Choose: Project Name = cooperative-loan-app, Environment = production

# Add database
railway add --plugin postgresql

# Set secret key
railway variables set NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Deploy
railway up
```

### Setup Database (after first deploy)
```bash
# Open Railway shell
railway shell

# Run these commands inside the shell:
npx prisma migrate deploy
npm run db:seed
exit
```

### Get your URL
```bash
railway domain
```

Update the auth URL:
```bash
railway variables set NEXTAUTH_URL="https://your-url-here.railway.app"
railway up
```

---

## 🎉 After Deployment

Your app will be live at: `https://your-app-name.up.railway.app`

**Login with:**
- Admin: `admin@coop.com` / `admin123`
- Member: `member@example.com` / `member123`

---

## 📱 Install as App on Phone

1. Open your Railway URL on mobile browser
2. **Android Chrome**: Menu → "Add to Home Screen"
3. **iOS Safari**: Share button → "Add to Home Screen"

The app will work like a native app!

---

## 🔧 Managing Your App

| Command | What it does |
|---------|--------------|
| `railway logs --follow` | Watch live logs |
| `railway status` | Check if app is running |
| `railway variables` | View/change settings |
| `railway up` | Deploy new changes |

---

## 💰 Cost

Railway gives you **$5 free credit per month**.
- This app costs ~$1-3/month to run
- So it's **FREE** for small usage!

---

## ❓ Troubleshooting

**"command not found: railway"**
```bash
npm install -g @railway/cli
```

**"Database connection failed"**
```bash
railway variables  # Check DATABASE_URL is set
railway status     # Check database is running
```

**"Build failed"**
```bash
railway logs  # Check what went wrong
```

---

## 🆘 Need Help?

The detailed guide is in: `RAILWAY-DEPLOY.md`

Or run the automated script again:
```bash
./deploy-railway.sh
```

**That's it! Your cooperative loan app will be live in ~5 minutes.** 🚀
