# Force Re-deploy to Fix Redirect Issue

## The Problem:
Even though the repo is public, the correct URL still redirects to the random preview URL.

## Solution: Force a Fresh Deployment

After making a repo public, GitHub Pages sometimes needs a fresh deployment to switch from preview to production URL.

### Step 1: Manually Trigger Deployment

1. Go to: https://github.com/snorkel-ai/UI-Elements-Visualizer/actions
2. Click on "Deploy to GitHub Pages" workflow
3. Click "Run workflow" button (top right)
4. Select "main" branch
5. Click "Run workflow"
6. Wait for it to complete (2-5 minutes)

### Step 2: Verify Settings → Pages

1. Go to: https://github.com/snorkel-ai/UI-Elements-Visualizer/settings/pages
2. Make sure "Source" is set to "GitHub Actions"
3. If it's set to a branch, change it to "GitHub Actions" and save
4. Wait a few minutes for changes to propagate

### Step 3: Check Deployment Output

After the workflow completes:
1. Open the workflow run
2. Click "Deploy to GitHub Pages" step
3. Check the output - what URL does it show?
4. Should show: `snorkel-ai.github.io/UI-Elements-Visualizer/`

### Step 4: Clear Browser Cache

1. Clear browser cache completely
2. Or use incognito/private browsing
3. Try: `https://snorkel-ai.github.io/UI-Elements-Visualizer/`

## If Still Redirecting:

The preview deployment might be cached. Try:
- Wait 10-15 minutes for DNS/propagation
- Check if there are multiple deployments in Settings → Pages
- Verify the repository is actually public (check Settings → Danger Zone)

