# Troubleshooting: Site Can't Be Reached

## Quick Checks

### 1. Check GitHub Actions Status
1. Go to: https://github.com/snorkel-ai/UI-Elements-Visualizer/actions
2. Look for the latest "Deploy to GitHub Pages" workflow run
3. **Is it showing:**
   - ✅ Green checkmark? → Deployment succeeded
   - ❌ Red X? → Click on it to see the error
   - 🟡 Yellow circle? → Still running, wait for it to complete

### 2. Check GitHub Pages Settings
1. Go to: https://github.com/snorkel-ai/UI-Elements-Visualizer/settings/pages
2. **Verify:**
   - Source is set to **"GitHub Actions"** (not "Deploy from a branch")
   - There's a URL shown at the top (should be `https://snorkel-ai.github.io/UI-Elements-Visualizer/`)
   - No custom domain is set (should be empty)

### 3. Check Repository Visibility
1. Go to: https://github.com/snorkel-ai/UI-Elements-Visualizer/settings
2. Scroll to "Danger Zone"
3. **Is the repository:**
   - Public? → Should work fine
   - Private? → GitHub Pages might not be accessible, or might use a preview URL

### 4. Try the Direct URL
Try accessing: `https://snorkel-ai.github.io/UI-Elements-Visualizer/`

**If you get:**
- 404 Not Found → Deployment might not have completed or Pages isn't enabled
- Blank white page → Check browser console for errors (F12)
- "Site can't be reached" → DNS/network issue, or repository is private

## Common Issues & Fixes

### Issue: Workflow Failed
**Symptom:** Red X in GitHub Actions

**Possible causes:**
- Build error (check the "Build" step logs)
- Missing dependencies
- Script error in `generate-index`

**Fix:**
1. Click on the failed workflow run
2. Click on the failed step (usually "Build")
3. Scroll down to see the error message
4. Share the error with me so I can fix it

### Issue: Pages Not Enabled
**Symptom:** No URL shown in Settings → Pages

**Fix:**
1. Go to Settings → Pages
2. Under "Source", select "GitHub Actions"
3. Click "Save"
4. Wait for deployment to complete

### Issue: Repository is Private
**Symptom:** Site shows random preview URL or can't be accessed

**Fix:**
- Make repository public, OR
- Use GitHub Enterprise/Pro for private repo Pages

### Issue: Build Script Error
**Symptom:** Workflow fails at "Generate data index" step

**Fix:**
- The `generate-index` script might fail if there are no data folders
- We can make it optional or handle empty data gracefully

## Next Steps

Please check the GitHub Actions tab and tell me:
1. **What does the latest workflow run show?** (✅ success, ❌ failure, 🟡 running)
2. **If it failed, what's the error message?**
3. **What URL are you trying to access?**
4. **Is the repository public or private?**

This will help me diagnose the exact issue.

