# Alternative Ways to Fix Database (No Shell Tab)

## Option 1: Deploy Trigger (Easiest)

Just trigger a new deploy - this will run migrations automatically:

```bash
cd /Users/qeew/cooperative-loan-app-pro
railway up
```

## Option 2: Add Start Script

Update package.json to run migrations on startup:

```json
"scripts": {
  "start": "npx prisma migrate deploy && next start"
}
```

Then redeploy:
```bash
cd /Users/qeew/cooperative-loan-app-pro
railway up
```

## Option 3: Use Railway CLI "run"

Try running the command remotely:

```bash
cd /Users/qeew/cooperative-loan-app-pro
railway run npx prisma db push --accept-data-loss
```

## Option 4: Dashboard Method (Find Shell)

The Shell tab should be there. Try:
1. Go to https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef
2. Click on **"cooperative-app"** service
3. Look for tabs: **Overview | Deployments | Logs | Metrics | ???**
4. Sometimes it's under "..." menu or "More"
5. Or try URL: https://railway.com/project/ab3d173a-50ca-4409-afda-2197306cd7ef/service/7e5e1d55-3363-40cc-bf3b-717cbdf9dd6d/shell

## Option 5: Use Prisma Cloud (Alternative)

1. Go to https://cloud.prisma.io
2. Connect your Railway database
3. Push schema from there

## Option 6: Manual SQL (Nuclear Option)

Go to Railway Dashboard → PostgreSQL service → Query tab
Run this SQL:

```sql
-- Create tables manually
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "password" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "phone" TEXT,
    "department" TEXT,
    "monthly_contribution" DOUBLE PRECISION DEFAULT 10000,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_contributions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loan_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- Insert admin user (password: admin123)
INSERT INTO "users" ("id", "name", "email", "password", "role", "status", "department", "created_at", "updated_at")
VALUES (
    'admin001',
    'Administrator',
    'admin@coop.com',
    '$2a$10$YourHashedPasswordHere',
    'ADMIN',
    'ACTIVE',
    'Administration',
    NOW(),
    NOW()
)
ON CONFLICT ("email") DO NOTHING;
```

But this is complex. Try Option 1 or 2 first!
