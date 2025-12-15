# Migrating to Supabase (Free PostgreSQL)

Follow these steps to move your database to Supabase, which is free forever (500MB limit).

## 1. Create Supabase Project
1.  Go to [database.new](https://database.new) (redirects to Supabase).
2.  **Sign up/Login** with GitHub.
3.  Click **"New Project"**.
4.  **Name**: `polymarket-prod`.
5.  **Database Password**: Generate a strong password and **COPY IT** (You won't see it again).
6.  **Region**: Choose one close to you (e.g., US East).
7.  Click **"Create new project"**.

## 2. Get Connection String
1.  Wait a minute for the database to provision.
2.  Go to **Project Settings** (Cog icon at bottom left) -> **Database**.
3.  Scroll to **Connection parameters**.
4.  **Important**: In the dropdown that says **"Mode: Direct connection"**, change it to **"Mode: Transaction"**. (This makes it IPv4 compatible).
5.  **Copy the URI**.
    *   It looks like: `postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
    *   (Note the port is `6543`, not `5432`).
    *   **IMPORTANT**: Replace `[YOUR-PASSWORD]` with the password you saved in Step 1.

## 3. Setup the Database (Schema)
Run these commands in your **local terminal** to push your tables to the new Supabase DB:

```bash
cd ~/Documents/polymarket/poly_nova_backend

# ⚠️ IMPORTANT:
# 1. Add "?pgbouncer=true" to the end of the URL.
# 2. If your password has "@", replace it with "%40".

# Windows Command Prompt
set "DATABASE_URL=YOUR_SUPABASE_CONNECTION_STRING?pgbouncer=true" && npx prisma db push

# OR PowerShell
$env:DATABASE_URL="YOUR_SUPABASE_CONNECTION_STRING?pgbouncer=true"; npx prisma db push
```

## 4. Update Render (Production)
1.  Go to your [Render Dashboard](https://dashboard.render.com/).
2.  Click on your **Backend Service** (`poly_nova_backend`).
3.  Go to **Environment**.
4.  Edit `DATABASE_URL` and paste your **Supabase Connection String** (Add `?pgbouncer=true` here too!).
5.  Click **Save Changes**.

Render will restart automatically. Now your app is using a permanent free database! 🚀
