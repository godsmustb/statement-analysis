# Hostinger Deployment Guide

## ✅ Current Setup

Your Bank Statement Analyzer is configured for **Hostinger Git Integration** deployment.

## 🔧 Hostinger Configuration Required

### Step 1: Configure Git Deployment Path

In **Hostinger hPanel** → **Git**:

1. Click on your connected repository
2. Find **"Deployment Path"** or **"Document Root"** setting
3. Set it to: `dist` (or leave empty if it auto-detects)
4. This tells Hostinger to serve files from the `dist/` folder

### Step 2: Verify Auto-Deploy is Enabled

- ✅ **Auto-deploy**: Should be ON
- ✅ **Branch**: `main`
- ✅ **Webhook**: Should show as configured

### Step 3: Configure Domain Document Root

In **Hostinger hPanel** → **Domains** (or **Website Settings**):

1. Find your domain settings
2. Locate **"Document Root"** or **"Website Root"**
3. Set it to: `/public_html/dist` (adjust based on your Git path)
   - If Git deploys to `/public_html`, set Document Root to `/public_html/dist`
   - If Git deploys to `/public_html/statement-analysis`, set to `/public_html/statement-analysis/dist`

## ⚠️ Important: OpenAI API Key Configuration

The current build uses a **placeholder API key**. For the app to work, you need to:

### Option 1: Rebuild with Your API Key (Recommended)

1. **On your local machine:**
   ```bash
   # Create .env file with your real API key
   echo "VITE_OPENAI_API_KEY=sk-your-real-api-key-here" > .env
   echo "VITE_APP_NAME=Bank Statement Analyzer" >> .env

   # Rebuild the app
   npm run build

   # Commit and push
   git add dist/
   git commit -m "Rebuild with configured API key"
   git push origin claude/bank-statement-analyzer-nKjbz

   # Then merge to main via GitHub PR
   ```

2. **Hostinger will auto-deploy** the new build with your API key

### Option 2: Environment Variables in Hostinger (If Supported)

Some Hostinger plans support environment variables:

1. Go to **hPanel** → **Advanced** → **Environment Variables**
2. Add: `VITE_OPENAI_API_KEY` = `your-api-key`
3. This only works if Hostinger runs the build process (unlikely on basic plans)

## 📋 Deployment Workflow

### Every Time You Make Changes:

```bash
# 1. Make your changes
git checkout claude/bank-statement-analyzer-nKjbz

# 2. If you modified source code, rebuild:
npm run build

# 3. Commit everything (including dist/)
git add .
git commit -m "Your changes description"
git push origin claude/bank-statement-analyzer-nKjbz

# 4. Create Pull Request on GitHub
# 5. Merge to main
# 6. Hostinger auto-deploys! 🚀
```

## 🔍 Troubleshooting

### Issue: Site shows directory listing or 404

**Solution**: Document Root is not pointing to `dist/` folder

1. Hostinger hPanel → Domains → Document Root
2. Change from `/public_html` to `/public_html/dist`
3. Or wherever your Git deployment creates the `dist/` folder

### Issue: App shows "API key not configured" error

**Solution**: Rebuild with your real OpenAI API key (see Option 1 above)

### Issue: Changes not appearing on live site

**Solutions**:
1. Check **Git deployment logs** in Hostinger
2. Verify webhook was triggered (GitHub → Settings → Webhooks)
3. Clear browser cache
4. Check if you rebuilt (`npm run build`) before committing

### Issue: CSS/JS files showing 404 errors

**Solution**: Check if files are being served from correct path

1. Open browser DevTools (F12) → Network tab
2. Check the 404 errors - what path is it trying to load?
3. Adjust Document Root in Hostinger accordingly

## 🧪 Testing Deployment

After merging to `main`:

1. **Check Hostinger Deployment Logs**:
   - hPanel → Git → View Latest Deployment Output
   - Should show "Deployment end" without errors

2. **Visit your domain**:
   - You should see the Bank Statement Analyzer app
   - Check browser console for errors (F12)

3. **Test functionality**:
   - Try uploading a sample PDF
   - If API errors occur, rebuild with your API key

## 📁 File Structure on Hostinger

After successful deployment:

```
/public_html/
├── dist/                    ← This should be your Document Root
│   ├── index.html
│   ├── assets/
│   │   ├── index-*.js
│   │   ├── index-*.css
│   │   └── ...
├── src/                     ← Source code (not served)
├── package.json             ← Not used (build already done)
└── ...
```

## 🎯 Quick Checklist

- [ ] Hostinger Git integration connected to repository
- [ ] Webhook configured in GitHub
- [ ] Auto-deploy enabled for `main` branch
- [ ] Document Root set to `/public_html/dist` (or equivalent)
- [ ] Rebuilt app with real OpenAI API key
- [ ] Committed and pushed `dist/` folder
- [ ] Merged changes to `main` branch
- [ ] Verified deployment in Hostinger logs
- [ ] Tested live site in browser

## 💡 Pro Tips

1. **Always rebuild before committing** if you changed source code
2. **Keep dist/ in the repository** for Hostinger to deploy it
3. **Use Pull Requests** to merge to main (triggers webhook)
4. **Check deployment logs** after each merge to verify success
5. **Document Root must point to dist/** folder, not the root

---

Need help? Check the main [README.md](README.md) for full documentation.
