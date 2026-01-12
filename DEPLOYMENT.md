# Vercel Deployment Guide for TutorFlow

## Prerequisites
- GitHub account with repository pushed
- Vercel account
- OpenAI API key

## Step-by-Step Deployment

### 1. Prepare Code
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. Import to Vercel and Configure Environment Variables

1. **Go to [vercel.com/new](https://vercel.com/new)**
2. **Select your repository** from GitHub
3. **Before clicking "Deploy"**, scroll down to **Environment Variables**
4. **Add these variables** (click "Add" for each):

   | Variable Name | Value | How to Get |
   |--------------|-------|------------|
   | `OPENAI_API_KEY` | `sk-proj-...` | From [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
   | `JWT_SECRET` | Random string | Generate with: `openssl rand -base64 32` |
   | `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Your Vercel URL (get it after deploy) |

   **Generate JWT_SECRET:**
   ```bash
   # On Mac/Linux/WSL:
   openssl rand -base64 32

   # Or use online: https://generate-secret.vercel.app/32
   ```

5. **Click "Deploy"** (first deploy will fail - that's expected, DATABASE_URL is missing)

### 3. Add Vercel Postgres Database

After the first deploy fails:

1. Go to your project dashboard
2. Click **Storage** tab
3. Click **Create Database** → **Postgres**
4. Name it: `tutorflow-db`
5. Click **Create**
6. Vercel automatically adds `DATABASE_URL` and related variables

### 4. Fix NEXT_PUBLIC_APP_URL

1. Copy your deployment URL (e.g., `https://tutorflow-abc123.vercel.app`)
2. Go to **Settings** → **Environment Variables**
3. Edit `NEXT_PUBLIC_APP_URL` to your actual deployment URL
4. Apply to all environments (Production, Preview, Development)

### 5. Redeploy

1. Go to **Deployments** tab
2. Click the 3 dots (...) on the latest deployment
3. Click **Redeploy**
4. Wait for build to complete (should succeed now!)
5. Visit your live site! ✨

## Important Notes

- ✅ `DATABASE_URL` is automatically set by Vercel Postgres
- ✅ Build script runs `prisma generate` and `prisma db push` automatically
- ✅ Database schema is created/updated on each deployment
- ⚠️ First deployment may take 3-5 minutes
- ⚠️ Make sure all environment variables are set for all environments

## Troubleshooting

### "Missing DATABASE_URL" Error
**Solution:** Make sure Vercel Postgres is created and connected to your project first, BEFORE deploying.

### Build Fails with Prisma Error
**Solution:**
1. Check that `DATABASE_URL` exists in environment variables
2. Try redeploying after ensuring all env vars are set

### Can't Login After Deployment
**Solution:**
1. Make sure `JWT_SECRET` is set in environment variables
2. Check that `NEXT_PUBLIC_APP_URL` matches your deployment URL

### Quiz/Flashcards Not Working
**Solution:**
1. Verify `OPENAI_API_KEY` is correct and has credits
2. Check Vercel function logs for errors

## Local Development After Deployment

To pull production environment variables for local testing:
```bash
vercel env pull .env.local
```

## Database Management

### View Database in Vercel Dashboard
1. Go to **Storage** tab
2. Click on your Postgres database
3. Click **Data** to browse tables
4. Click **Query** to run SQL

### Connect Prisma Studio (Local)
```bash
# Pull production DATABASE_URL
vercel env pull .env.production

# Open Prisma Studio with production DB
DATABASE_URL="$(grep DATABASE_URL .env.production | cut -d '=' -f2-)" npx prisma studio
```

### Run Migrations Manually (if needed)
```bash
# Push schema changes to production
DATABASE_URL="your_production_database_url" npx prisma db push
```

## Monitoring

- **Vercel Dashboard**: Check deployment status, logs, analytics
- **OpenAI Usage**: Monitor API costs at [platform.openai.com/usage](https://platform.openai.com/usage)
- **Database Usage**: Check in Vercel Storage tab

## Costs

### Free Tier Limits (Vercel Hobby)
- ✅ Unlimited deployments
- ✅ 100 GB bandwidth/month
- ✅ Vercel Postgres: 256 MB storage, 60 hours compute
- ⚠️ OpenAI API costs are separate (pay-as-you-go)

### Expected Costs
- **Vercel**: Free for hobby projects
- **OpenAI API**:
  - Text chat: ~$0.01 per 1000 messages
  - Voice chat: ~$0.06 per minute
  - Quiz/flashcard generation: ~$0.001 per generation

---

## Quick Checklist

Before deploying, ensure:
- [ ] Code is pushed to GitHub
- [ ] Repository imported to Vercel
- [ ] Vercel Postgres database created
- [ ] `OPENAI_API_KEY` environment variable set
- [ ] `JWT_SECRET` environment variable set (use `openssl rand -base64 32`)
- [ ] `NEXT_PUBLIC_APP_URL` environment variable set
- [ ] All env vars applied to Production, Preview, and Development
- [ ] Redeploy triggered after adding env vars

✨ Your TutorFlow app should now be live!
