# Root Cause Analysis: Random URL and Blank Page

## Issues Identified:

### 1. Missing `.nojekyll` File ✅ FIXED
**Problem**: GitHub Pages uses Jekyll by default, which can interfere with React apps and cause asset loading issues.

**Fix Applied**: Created `.nojekyll` file in `public/` directory so it gets copied to `dist/` during build. This tells GitHub Pages to skip Jekyll processing.

**Status**: ✅ Fixed - `.nojekyll` is now included in build output

---

### 2. Random URL (`potential-adventure-2ey1oqz.pages.github.io`)

**Possible Causes:**

#### A. Preview Deployment URL
The random URL might be a **preview deployment** from:
- A pull request
- A branch deployment
- GitHub Pages preview environment

**Check:**
1. Go to: https://github.com/snorkel-ai/UI-Elements-Visualizer/actions
2. Look at the latest workflow run
3. Check the "Deploy to GitHub Pages" step
4. Look at the deployment URL output - is it showing the random URL or the correct one?

#### B. GitHub Pages Environment Configuration
The workflow uses `environment: name: github-pages` which should deploy to the main site, but there might be multiple environments.

**Check:**
1. Go to: https://github.com/snorkel-ai/UI-Elements-Visualizer/settings/environments
2. Look for "github-pages" environment
3. Check if there are any restrictions or custom URLs configured

#### C. Repository Name Mismatch
If the repository name doesn't match what's in `vite.config.ts`, the base path won't work.

**Current Configuration:**
- Repository: `UI-Elements-Visualizer`
- Base path in vite.config: `/UI-Elements-Visualizer/`
- Expected URL: `https://snorkel-ai.github.io/UI-Elements-Visualizer/`

**Verify:** Repository name matches exactly (case-sensitive)

---

### 3. Asset 404 Errors (Blank Page)

**Root Cause**: Assets are trying to load from `/UI-Elements-Visualizer/assets/...` but getting 404s.

**Why This Happens:**
1. If the site is deployed to a random URL without the `/UI-Elements-Visualizer/` path structure
2. GitHub Pages might be serving from root instead of subdirectory
3. Jekyll processing (now fixed with `.nojekyll`)

**Console Errors Show:**
- CSS file: `404` → Returns HTML instead of CSS
- JS file: `404` → File not found

---

## Solutions Applied:

### ✅ Fix 1: Added `.nojekyll` File
- Created `public/.nojekyll` 
- This prevents Jekyll from processing the site
- File is now included in build output

### 🔍 Fix 2: Verify Deployment URL

**After next deployment, check:**

1. **In GitHub Actions:**
   - Go to Actions tab
   - Click on latest workflow run
   - Check "Deploy to GitHub Pages" step output
   - Look for `page_url` - what does it show?

2. **In GitHub Pages Settings:**
   - Go to Settings → Pages
   - What URL is shown at the top?
   - Is it the random URL or `snorkel-ai.github.io/UI-Elements-Visualizer/`?

3. **If Random URL Persists:**
   - Check if there are multiple Pages deployments
   - Look for any branch-based deployments that might be active
   - Check if there's a custom domain interfering

---

## Next Steps:

1. **Commit and push the `.nojekyll` fix:**
   ```bash
   git add ui-visualizer/public/.nojekyll
   git commit -m "Add .nojekyll to prevent Jekyll processing"
   git push origin main
   ```

2. **Wait for deployment to complete**

3. **Check the actual deployed URL:**
   - Go to Settings → Pages
   - What URL is shown?
   - Try accessing that URL directly

4. **If still random URL:**
   - Check GitHub Actions deployment output for the actual URL
   - The random URL might be a preview - check if there's a "View deployment" link
   - Verify the repository name matches exactly

5. **Test the site:**
   - Open browser console
   - Check if assets load correctly
   - Verify base path is correct in console logs

---

## Additional Debugging:

If issues persist after `.nojekyll` fix:

1. **Check GitHub Actions logs:**
   - Look for any warnings about deployment URL
   - Check if the artifact is being uploaded correctly
   - Verify the build output includes `.nojekyll`

2. **Verify build output:**
   ```bash
   cd ui-visualizer
   NODE_ENV=production npm run build
   ls -la dist/ | grep nojekyll  # Should show .nojekyll file
   cat dist/index.html | grep assets  # Should show /UI-Elements-Visualizer/assets/...
   ```

3. **Test locally with correct base path:**
   ```bash
   cd ui-visualizer
   npm run build
   npx serve -s dist -l 3000
   # Then access http://localhost:3000/UI-Elements-Visualizer/
   ```

---

## Expected Behavior After Fix:

✅ `.nojekyll` file prevents Jekyll interference  
✅ Assets load from `/UI-Elements-Visualizer/assets/...`  
✅ Site accessible at `https://snorkel-ai.github.io/UI-Elements-Visualizer/`  
✅ No 404 errors in console  
✅ App renders correctly (shows upload UI)

