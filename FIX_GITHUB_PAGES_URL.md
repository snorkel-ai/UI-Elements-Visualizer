# Fix GitHub Pages Random URL Issue

If your site is deploying to a random URL like `potential-adventure-2ey1oqz.pages.github.io` instead of `snorkel-ai.github.io/UI-Elements-Visualizer/`, follow these steps:

## Step 1: Check GitHub Pages Settings

1. Go to: https://github.com/snorkel-ai/UI-Elements-Visualizer/settings/pages
2. Under **"Source"**, make sure **"GitHub Actions"** is selected (NOT "Deploy from a branch")
3. If it's set to "Deploy from a branch", change it to "GitHub Actions" and save

## Step 2: Remove Custom Domain (if set)

1. In the same Settings → Pages section
2. Scroll down to **"Custom domain"**
3. If there's a custom domain set, **clear it** (leave it empty)
4. Save changes

## Step 3: Verify Repository Name

Make sure your repository is named exactly: `UI-Elements-Visualizer`
- The URL will be: `https://snorkel-ai.github.io/UI-Elements-Visualizer/`
- Note the capital letters and hyphens

## Step 4: Re-run Deployment

1. Go to: https://github.com/snorkel-ai/UI-Elements-Visualizer/actions
2. Find the latest "Deploy to GitHub Pages" workflow run
3. Click "Re-run all jobs" if needed
4. Wait for it to complete

## Step 5: Clear Browser Cache

After the deployment completes:
1. Clear your browser cache
2. Try accessing: `https://snorkel-ai.github.io/UI-Elements-Visualizer/`
3. If you still see the old URL, try incognito/private browsing mode

## Troubleshooting Blank White Page

If you see a blank white page:

1. **Open browser console** (F12 or Cmd+Option+I)
2. Check for JavaScript errors
3. Look for 404 errors on assets (CSS/JS files)
4. Verify the base path is correct in the console logs

The app should log: `Base path: /UI-Elements-Visualizer/`

If you see `Base path: /`, the build didn't use the production base path.

## Still Having Issues?

1. Check the Actions tab for build errors
2. Verify `NODE_ENV=production` is set during build (it should be)
3. Check that `vite.config.ts` has the correct base path for production
4. Make sure the workflow completed successfully (green checkmark)

