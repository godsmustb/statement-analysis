# Deployment Setup Guide - Hostinger FTP

## Problem Summary

Your FTP deployment was failing because the GitHub Actions workflow was **missing Supabase environment variables**. Without these credentials, your deployed app couldn't connect to the Supabase database, causing:

1. ❌ Data not saving when logged in
2. ❌ Having to re-upload statements every time
3. ❌ Having to re-categorize transactions every time
4. ❌ Changes not persisting across sessions

## Solution

The workflow has been updated to include all required environment variables. Now you need to add them as **GitHub Secrets**.

---

## Step 1: Add GitHub Secrets

You need to add the following secrets to your GitHub repository:

### How to Add Secrets:
1. Go to your GitHub repository: `https://github.com/YOUR_USERNAME/statement-analysis`
2. Click **Settings** (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret** button
5. Add each secret below one by one

### Required Secrets:

#### 1. **OPENAI_API_KEY** (Already exists, verify it's correct)
- **Name:** `OPENAI_API_KEY`
- **Value:** Your OpenAI API key (starts with `sk-proj-...`)
- **Where to find:** Check your local `.env` file or OpenAI dashboard

#### 2. **SUPABASE_URL** (NEW - Critical for data persistence)
- **Name:** `SUPABASE_URL`
- **Value:** Your Supabase project URL (from your `.env` file)
- **Where to find:** Your local `.env` file or Supabase project settings

#### 3. **SUPABASE_ANON_KEY** (NEW - Critical for data persistence)
- **Name:** `SUPABASE_ANON_KEY`
- **Value:** Your Supabase anonymous key (from your `.env` file)
- **Where to find:** Your local `.env` file or Supabase project settings

#### 4. **PYTHON_API_URL** (NEW - Optional, for production backend)
- **Name:** `PYTHON_API_URL`
- **Value:** `https://your-python-backend-url.com` (or leave as `http://localhost:5000` for now)

#### 5. **FTP_HOST** (Already exists, verify it's correct)
- **Name:** `FTP_HOST`
- **Value:** Your Hostinger FTP hostname (e.g., `ftp.yourdomain.com`)

#### 6. **FTP_USERNAME** (Already exists, verify it's correct)
- **Name:** `FTP_USERNAME`
- **Value:** Your Hostinger FTP username

#### 7. **FTP_PASSWORD** (Already exists, verify it's correct)
- **Name:** `FTP_PASSWORD`
- **Value:** Your Hostinger FTP password

#### 8. **FTP_PATH** (Already exists, verify it's correct)
- **Name:** `FTP_PATH`
- **Value:** Your Hostinger FTP path (e.g., `/public_html` or `/domains/yourdomain.com/public_html`)

---

## Step 2: Verify All Secrets Are Added

After adding all secrets, your **Actions secrets** page should show:

✅ OPENAI_API_KEY
✅ SUPABASE_URL
✅ SUPABASE_ANON_KEY
✅ PYTHON_API_URL
✅ FTP_HOST
✅ FTP_USERNAME
✅ FTP_PASSWORD
✅ FTP_PATH

---

## Step 3: Push Changes and Deploy

1. **Commit the workflow changes:**
   ```bash
   git add .
   git commit -m "fix: Add Supabase credentials to deployment workflow for data persistence"
   git push origin main
   ```

2. **Monitor the deployment:**
   - Go to **Actions** tab in your GitHub repository
   - Watch the workflow run
   - Check for any errors in the build/deploy steps

---

## Step 4: Verify Data Persistence

After successful deployment:

1. **Visit your Hostinger site**
2. **Create an account / Login**
3. **Upload a statement**
4. **Categorize some transactions**
5. **Log out**
6. **Log back in** → Your data should be there! ✅

---

## What Was Fixed?

### 1. **Updated Workflow File** (`.github/workflows/deploy.yml`)

**Before:**
```yaml
- name: Create .env file
  run: |
    echo "VITE_OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}" > .env
    echo "VITE_APP_NAME=Bank Statement Analyzer" >> .env
    echo "VITE_OPENAI_MODEL=gpt-4o-mini-2024-07-18" >> .env
    echo "VITE_MAX_FILE_SIZE_MB=10" >> .env
```

**After:**
```yaml
- name: Create .env file
  run: |
    echo "VITE_OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}" > .env
    echo "VITE_APP_NAME=Bank Statement Analyzer" >> .env
    echo "VITE_OPENAI_MODEL=gpt-4o-mini-2024-07-18" >> .env
    echo "VITE_MAX_FILE_SIZE_MB=10" >> .env
    echo "VITE_SUPABASE_URL=${{ secrets.SUPABASE_URL }}" >> .env          # NEW
    echo "VITE_SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }}" >> .env  # NEW
    echo "VITE_PYTHON_API_URL=${{ secrets.PYTHON_API_URL }}" >> .env       # NEW
```

### 2. **Improved Supabase Client** (`src/lib/supabaseClient.js`)

Added graceful fallback when Supabase is not configured:
- No more errors if credentials are missing
- Clear console warning when running in localStorage-only mode
- Exports `isSupabaseConfigured` flag for other services to check

### 3. **Improved Auth Service** (`src/services/authService.js`)

Added checks before all Supabase operations:
- Returns clear error messages when Supabase is unavailable
- Prevents crashes when credentials are missing
- Allows app to run in localStorage-only mode gracefully

---

## Troubleshooting

### Deployment Still Failing?

1. **Check GitHub Actions logs:**
   - Go to **Actions** tab
   - Click on the failed workflow
   - Expand each step to see error messages

2. **Common FTP errors:**
   - **"Connection refused"** → Check FTP_HOST is correct
   - **"Login incorrect"** → Check FTP_USERNAME and FTP_PASSWORD
   - **"Permission denied"** → Check FTP_PATH exists and is writable
   - **"Protocol error"** → Try changing `protocol: ftps` to `protocol: ftp` in workflow

3. **Supabase not connecting:**
   - Check browser console for errors
   - Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct
   - Check Supabase project is active and not paused

### Data Still Not Persisting?

1. **Clear browser cache and cookies**
2. **Check browser console for errors** (F12 → Console)
3. **Verify you're logged in** (should see user email in UI)
4. **Check Supabase dashboard** to see if data is being saved:
   - Go to https://app.supabase.com
   - Select your project
   - Click **Table Editor**
   - Check `transactions`, `categories`, `account_types` tables

---

## Security Note

⚠️ **IMPORTANT:** Copy the API keys from your local `.env` file to GitHub Secrets. These are sensitive credentials:

- **OpenAI API Key:** Can incur charges if used - monitor usage at https://platform.openai.com/usage
- **Supabase Keys:** Can access your database - keep them private

**Recommendations:**
1. ✅ Get actual values from your local `.env` file
2. ✅ Store ONLY in GitHub Secrets (never commit to code)
3. ✅ Never commit `.env` file to GitHub (already in `.gitignore`)
4. ✅ Rotate keys if they're exposed publicly
5. ✅ Monitor OpenAI usage dashboard for unexpected charges
6. ✅ Enable Row-Level Security in Supabase (already configured)

---

## Next Steps

After deployment works:

1. ✅ Test all features on production site
2. ✅ Upload a statement and verify it persists
3. ✅ Test categorization and verify it saves
4. ✅ Test account types and verify they persist
5. ✅ Test login/logout flow
6. ✅ Export data regularly as backup

---

## Support

If you encounter issues:

1. Check the **Troubleshooting** section above
2. Review GitHub Actions logs for deployment errors
3. Check browser console for runtime errors
4. Verify all GitHub Secrets are added correctly
5. Ensure Supabase project is active and healthy
