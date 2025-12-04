# Diagnosis: Random URL and Blank White Page Issues

## Issue 1: Random URL (`potential-adventure-2ey1oqz.pages.github.io`)

### Root Cause:
This is a **GitHub Pages configuration issue**, not a code issue. The random URL indicates GitHub Pages is using a preview deployment URL instead of the repository URL.

### Why This Happens:
- GitHub Pages source is set to "Deploy from a branch" instead of "GitHub Actions"
- A custom domain is configured incorrectly
- Repository settings need to be updated

### Fix Steps:
1. Go to: https://github.com/snorkel-ai/UI-Elements-Visualizer/settings/pages
2. Under **"Source"**, ensure **"GitHub Actions"** is selected (NOT "Deploy from a branch")
3. Scroll to **"Custom domain"** section
4. If a custom domain is set, **clear it completely** (leave empty)
5. Click **Save**
6. Go to Actions tab and re-run the deployment workflow if needed

### Expected Result:
After fixing, the site should be at: `https://snorkel-ai.github.io/UI-Elements-Visualizer/`

---

## Issue 2: Blank White Page

### Root Cause Analysis:

The blank page is likely caused by **asset loading failures** due to the base path mismatch:

1. **Base Path Mismatch**: 
   - The app is built with base path: `/UI-Elements-Visualizer/`
   - Assets are referenced as: `/UI-Elements-Visualizer/assets/index-xxx.js`
   - If the random URL doesn't match this path structure, assets fail to load
   - This causes JavaScript errors and a blank page

2. **Potential Code Issues**:
   - The app no longer loads default data (we removed `loadDataPoints()` call)
   - DashboardPage should show upload UI immediately
   - But if there's a JavaScript error during initialization, ErrorBoundary should catch it

### Diagnostic Steps:

**To diagnose the blank page, check the browser console:**

1. Open the deployed site (even on the random URL)
2. Open browser DevTools (F12 or Cmd+Option+I)
3. Check the **Console** tab for errors
4. Check the **Network** tab for failed requests (404s)

**Expected Console Output:**
```
Rendering app...
Base URL: /UI-Elements-Visualizer/
Mode: production
Production: true
App component rendering
Base path: /UI-Elements-Visualizer
```

**Common Errors to Look For:**
- `Failed to load resource: 404` on `/UI-Elements-Visualizer/assets/...` files
- `Uncaught error:` messages
- `useDataContext must be used within a DataProvider` errors

### Potential Fixes:

#### Fix A: If assets are failing to load (404 errors)
**Problem**: Base path mismatch between URL and asset paths
**Solution**: Fix GitHub Pages URL (Issue 1) - this should resolve it

#### Fix B: If there are JavaScript errors
**Problem**: Code errors preventing app from rendering
**Solution**: Check ErrorBoundary - it should show an error message, not blank page

#### Fix C: If ErrorBoundary isn't showing
**Problem**: Error might be happening before React renders
**Solution**: Check if `index.html` is loading correctly, verify the script tag path

---

## Verification Checklist

After fixing GitHub Pages settings:

- [ ] GitHub Pages source is set to "GitHub Actions"
- [ ] No custom domain is configured
- [ ] Deployment workflow completes successfully (green checkmark)
- [ ] Site is accessible at: `https://snorkel-ai.github.io/UI-Elements-Visualizer/`
- [ ] Browser console shows no 404 errors
- [ ] Browser console shows the debug logs (Base URL, Mode, etc.)
- [ ] App renders (shows upload UI, not blank page)

---

## If Issues Persist

1. **Check GitHub Actions logs**:
   - Go to: https://github.com/snorkel-ai/UI-Elements-Visualizer/actions
   - Click on the latest workflow run
   - Check for any build errors or warnings

2. **Verify build output**:
   - The built `index.html` should have paths like `/UI-Elements-Visualizer/assets/...`
   - Assets should be in `dist/assets/` folder

3. **Test locally**:
   - Run `npm run build` locally
   - Check `dist/index.html` - paths should include `/UI-Elements-Visualizer/`
   - Serve `dist/` folder and verify it works

4. **Check browser console**:
   - Look for specific error messages
   - Check Network tab for failed requests
   - Verify BASE_URL is being set correctly

