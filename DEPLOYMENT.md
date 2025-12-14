# Deployment Guide - Poly Nova Backend

Deploy your Fastify backend to Render or Railway for free.

---

## Option 1: Deploy to Render (Recommended)

### Prerequisites
- GitHub account
- Render account (sign up at [render.com](https://render.com))

---

### Step 1: Create PostgreSQL Database

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: `poly-nova-db`
   - **Database**: `polymarket`
   - **Region**: Choose closest to you
   - **Plan**: **Free**
4. Click "Create Database"
5. **Copy the Internal Database URL** (starts with `postgresql://`)

---

### Step 2: Push to GitHub

```bash
cd poly_nova_backend
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/poly_nova_backend.git
git push -u origin main
```

---

### Step 3: Deploy Backend

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `poly-nova-backend`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run deploy`
   - **Plan**: **Free**

5. **Add Environment Variables**:
   ```
   DATABASE_URL=<paste Internal Database URL from Step 1>
   YOUTUBE_API_KEY=your_youtube_api_key_here
   CHANNEL_ID=UCX6OQ3DkcsbYNE6H8uQQuVA
   NODE_ENV=production
   PORT=10000
   ```

6. Click "Create Web Service"

---

### Step 4: Get Backend URL

After deployment completes, you'll get a URL like:
```
https://poly-nova-backend.onrender.com
```

Use this URL in your frontend's `VITE_API_URL` environment variable.

---

## Option 2: Deploy to Railway

### Prerequisites
- GitHub account
- Railway account (sign up at [railway.app](https://railway.app))

### Steps

1. **Push to GitHub** (same as above)

2. **Deploy to Railway**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select `poly_nova_backend`
   - Railway will auto-detect Node.js

3. **Add PostgreSQL Database**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will automatically set `DATABASE_URL`

4. **Add Environment Variables**
   ```
   YOUTUBE_API_KEY=your_youtube_api_key_here
   CHANNEL_ID=UCX6OQ3DkcsbYNE6H8uQQuVA
   NODE_ENV=production
   ```

5. **Deploy!**
   - Railway will automatically deploy
   - Get your URL from the deployment

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key | ✅ |
| `CHANNEL_ID` | YouTube channel ID | ✅ |
| `NODE_ENV` | Set to `production` | ✅ |
| `PORT` | Server port (10000 for Render) | ❌ |

---

## Database Migrations

Migrations run automatically on deployment via the `npm run deploy` command:

```json
"deploy": "prisma migrate deploy && npm run start"
```

If you need to run migrations manually:

```bash
# SSH into your Render service (if available) or use Render Shell
npx prisma migrate deploy
```

---

## Custom Domain (Optional)

### Add to Render
1. Go to Service → Settings → Custom Domain
2. Add your domain (e.g., `api.polymarket.com`)
3. Configure DNS:
   ```
   Type: CNAME
   Name: api
   Value: poly-nova-backend.onrender.com
   ```

### Add to Railway
1. Go to Service → Settings → Domains
2. Add custom domain
3. Follow DNS configuration instructions

---

## Monitoring & Logs

### Render
- Dashboard → Your Service → **Logs** tab
- Real-time logs of all server activity
- Filter by date/time

### Railway
- Project → Service → **Deployments**
- Click deployment to view logs
- Real-time log streaming

---

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify `build` script runs `prisma generate && tsc`
- Check build logs for errors

### Database Connection Error
- Verify `DATABASE_URL` is set correctly
- Check database is active in Render/Railway dashboard
- Ensure using **Internal Database URL** (not External)

### Migrations Fail
- Check Prisma schema is valid
- Ensure database is accessible
- Try running migrations manually

### Server Not Starting
- Check `start` command is correct
- Verify `PORT` environment variable
- Check server logs for errors

---

## Free Tier Limitations

### Render Free Tier
- ⚠️ **Sleeps after 15 minutes** of inactivity
- First request after sleep takes 30-60 seconds
- 750 hours/month (enough for 24/7 with one service)
- Database: 1GB storage, expires after 90 days inactivity

### Railway Free Tier
- $5 free credit per month
- No sleep/cold starts
- Credit resets monthly

---

## Upgrade Options

### Render
- **Starter Plan**: $7/month
  - No sleep/cold starts
  - Always on
  - Better performance

### Railway
- **Pay as you go**: ~$5-10/month
  - Based on usage
  - No sleep
  - Automatic scaling

---

## Cost Summary

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| **Render** | Free (sleeps) | $7/month (always on) |
| **Railway** | $5 credit/month | ~$5-10/month usage |
| **Database** | Free (1GB) | $7/month (persistent) |

---

## Next Steps

1. ✅ Deploy backend to Render/Railway
2. 📋 Copy backend URL
3. 🔗 Update frontend `VITE_API_URL` with backend URL
4. 🚀 Redeploy frontend
5. 🎉 Your app is live!

---

## Continuous Deployment

Both Render and Railway support automatic deployments:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Automatically deploys! 🚀
```
