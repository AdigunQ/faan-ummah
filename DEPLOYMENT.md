# Quick Deployment Guide

## Option 1: Vercel (Easiest - Free)

### Step 1: Prepare Database
Use Railway or Supabase for free PostgreSQL:

**Railway:**
```bash
npm install -g @railway/cli
railway login
railway init
railway add --plugin postgresql
railway variables
# Copy DATABASE_URL
```

**Supabase:**
1. Go to supabase.com → New Project
2. Settings → Database → Connection String (URI)
3. Copy the pooled connection string

### Step 2: Deploy to Vercel
1. Push code to GitHub
2. Go to vercel.com → Import Project
3. Select your repository
4. Configure:
   - Framework Preset: Next.js
   - Build Command: `prisma generate && next build`
   - Output Directory: (leave default)
5. Add Environment Variables:
   ```
   DATABASE_URL=your-postgresql-url
   NEXTAUTH_SECRET=your-random-secret
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud
   CLOUDINARY_API_KEY=your-key
   CLOUDINARY_API_SECRET=your-secret
   ```
6. Deploy!

### Step 3: Setup Database
In Vercel dashboard:
```bash
# Go to Project → Settings → Git
# Add Deploy Hook if needed

# To run migrations, use Vercel CLI:
npx vercel --prod
# Then run:
npx prisma migrate deploy
npm run db:seed
```

## Option 2: Railway (Full-stack)

Deploy both database and app together:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add --plugin postgresql

# Deploy
railway up
```

Railway automatically handles environment variables!

## Option 3: Self-Hosted (VPS)

### Requirements:
- Ubuntu 20.04+ server
- Node.js 18+
- PostgreSQL 14+
- Nginx
- PM2

### Setup:
```bash
# On your server:

# 1. Install dependencies
sudo apt update
sudo apt install -y nodejs npm postgresql nginx

# 2. Setup database
sudo -u postgres psql -c "CREATE DATABASE cooperative_db;"
sudo -u postgres psql -c "CREATE USER coopuser WITH PASSWORD 'yourpassword';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE cooperative_db TO coopuser;"

# 3. Clone and setup app
git clone <your-repo>
cd cooperative-loan-app-pro
npm install
npm run build

# 4. Setup PM2
npm install -g pm2
pm2 start npm --name "coop-app" -- start

# 5. Setup Nginx
sudo nano /etc/nginx/sites-available/cooperative
# Add:
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

sudo ln -s /etc/nginx/sites-available/cooperative /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Post-Deployment Checklist

- [ ] Test registration flow
- [ ] Login as admin and approve test member
- [ ] Test payment upload with Cloudinary
- [ ] Test loan application
- [ ] Check PWA installation on mobile
- [ ] Verify all environment variables are set
- [ ] Run database migrations
- [ ] Seed initial admin user
- [ ] Configure custom domain (if needed)
- [ ] Enable HTTPS (SSL certificate)
- [ ] Set up monitoring/alerts

## Troubleshooting

### "Database connection failed"
- Check DATABASE_URL format
- Ensure IP is whitelisted (for cloud databases)
- Verify database exists and user has permissions

### "Build failed on Vercel"
- Check if `prisma generate` is in build command
- Verify all imports are correct
- Check TypeScript errors: `npx tsc --noEmit`

### "Images not uploading"
- Verify Cloudinary credentials
- Check upload preset exists in Cloudinary dashboard
- Ensure `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set

### "PWA not installing"
- Check browser console for manifest errors
- Verify icons exist in `/public/icons/`
- Ensure service worker is registered
- Test in production (not localhost for some features)

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | Random 32+ char string for JWT |
| `NEXTAUTH_URL` | ✅ | Your app URL (with https) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | ⚠️ | For image uploads (optional but recommended) |
| `CLOUDINARY_API_KEY` | ⚠️ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ⚠️ | Cloudinary API secret |

## Need Help?

1. Check logs: `vercel logs --tail` or `pm2 logs`
2. Test database: `npx prisma db pull`
3. Check Next.js build: `npm run build` locally first
4. Review: https://nextjs.org/docs/deployment
