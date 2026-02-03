# Cooperative Loan Management System

A production-ready, full-stack cooperative loan management application with PWA support. Built with Next.js 14, TypeScript, PostgreSQL, and Tailwind CSS.

## ✨ Features

### Core Features
- 🔐 **Secure Authentication** - NextAuth.js with credentials provider
- 👥 **Role-based Access** - Admin and Member roles
- ⏳ **Approval Workflow** - New members require admin approval
- 💰 **Payment System** - Bank transfer with proof upload (Cloudinary)
- 📊 **Loan Management** - Apply, approve, track loans
- 📱 **PWA Support** - Install as app on mobile/desktop
- 💾 **Persistent Data** - PostgreSQL database with Prisma ORM
- 🔔 **Toast Notifications** - Real-time feedback
- 📊 **Dashboard Stats** - Visual overview of activities

### Admin Features
- Approve/reject member registrations
- Verify payment proofs
- Approve/reject loan applications
- View all members and transactions
- Track cooperative statistics

### Member Features
- View account balance and loan eligibility
- Make payments (contributions, loan repayments)
- Upload payment proof images
- Apply for loans (up to 3x savings)
- Track payment and loan history

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Auth** | NextAuth.js |
| **File Storage** | Cloudinary |
| **PWA** | next-pwa |
| **Forms** | React Hook Form + Zod |
| **Notifications** | React Hot Toast |
| **Icons** | Lucide React |

## 🚀 Deployment Guide

### Prerequisites
- Node.js 18+ 
- PostgreSQL database (local or cloud)
- Cloudinary account (for image uploads)
- Vercel account (recommended) or similar hosting

### 1. Local Setup

```bash
# Clone or navigate to project
cd cooperative-loan-app-pro

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Edit .env.local with your credentials:
# - DATABASE_URL (PostgreSQL connection string)
# - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)
# - Cloudinary credentials

# Setup database
npx prisma generate
npx prisma migrate dev --name init

# Seed database with admin user
npm run db:seed

# Run development server
npm run dev
```

### 2. Environment Variables

Create `.env.local` file:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/cooperative_db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-here"

# Cloudinary (for payment proof images)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### 3. Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Add build command: `prisma generate && next build`
5. Deploy!

### 4. Database Setup (Production)

Option A: Railway (Recommended Free Tier)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and create project
railway login
railway init

# Add PostgreSQL plugin
railway add --plugin postgresql

# Get connection string
railway variables
```

Option B: Supabase
1. Create project at supabase.com
2. Get connection string from Settings > Database
3. Use pooled connection string for serverless

Option C: Neon
1. Create project at neon.tech
2. Get connection string from dashboard

## 📱 PWA Installation

### On Mobile (iOS Safari)
1. Open the deployed website in Safari
2. Tap Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Name the app and tap "Add"

### On Mobile (Android Chrome)
1. Open the website in Chrome
2. Tap menu (three dots)
3. Tap "Add to Home Screen"
4. Confirm installation

### On Desktop (Chrome/Edge)
1. Open the website
2. Look for install icon in address bar
3. Or click menu → Install Cooperative Loan System

## 🔑 Default Login Credentials

After seeding the database:

**Admin Account:**
- Email: `admin@coop.com`
- Password: `admin123`

**Sample Member:**
- Email: `member@example.com`
- Password: `member123`

## 📁 Project Structure

```
cooperative-loan-app-pro/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── api/               # API routes
│   │   ├── (auth)/            # Auth pages (login, register)
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── dashboard/         # Dashboard components
│   │   └── providers.tsx      # Context providers
│   ├── lib/                   # Utility functions
│   │   ├── prisma.ts          # Prisma client
│   │   ├── auth.ts            # NextAuth config
│   │   └── utils.ts           # Helper functions
│   └── types/                 # TypeScript types
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data
├── public/
│   ├── icons/                 # PWA icons
│   └── manifest.json          # PWA manifest
└── package.json
```

## 🔄 Database Schema

### Key Models:
- **User** - Members and admins with role/status
- **Payment** - Payment records with proof images
- **Loan** - Loan applications and tracking
- **Transaction** - Audit trail of all activities

## 🛡️ Security Features

- Password hashing with bcrypt
- Session-based authentication
- CSRF protection via NextAuth
- Input validation with Zod
- Type-safe database queries with Prisma
- Secure image upload to Cloudinary

## 📝 API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/[...nextauth]` | ALL | Authentication |
| `/api/register` | POST | Member registration |
| `/api/payments` | GET/POST | Payment operations |
| `/api/loans` | GET/POST | Loan operations |
| `/api/admin/*` | Various | Admin operations |

## 🎨 Customization

### Change Cooperative Bank Details
Edit in `src/components/dashboard/payment-form.tsx`:
```tsx
const BANK_DETAILS = {
  name: 'Your Bank Name',
  accountNumber: '1234567890',
  accountName: 'Your Cooperative Name',
}
```

### Adjust Loan Interest Rate
Edit in `prisma/schema.prisma`:
```prisma
interestRate Float @default(5) // Change default 5%
```

### Update PWA Theme Colors
Edit in `public/manifest.json` and `src/app/layout.tsx`:
```json
{
  "theme_color": "#your-color",
  "background_color": "#your-color"
}
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Test database connection
npx prisma db pull

# Reset database (caution: deletes data!)
npx prisma migrate reset
```

### PWA Not Working
- Check `manifest.json` is valid
- Ensure service worker is registered
- Clear browser cache and reload
- Check console for errors

### Image Upload Fails
- Verify Cloudinary credentials
- Check upload preset configuration
- Ensure environment variables are set

## 📄 License

MIT License - Feel free to use for your cooperative society!

## 🤝 Support

For issues or questions:
1. Check environment variables are correct
2. Verify database is running
3. Check browser console for errors
4. Review server logs

---

Built with ❤️ for cooperative societies
