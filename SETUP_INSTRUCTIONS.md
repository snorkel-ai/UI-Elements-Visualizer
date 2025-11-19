# Quick Setup Instructions

## Step 1: Commit and Push the Workflow File

Run these commands in your terminal:

```bash
cd "/Users/connor/Documents/UI Elements Visualizer"
git add .github/workflows/deploy.yml
git add ui-visualizer/vite.config.ts
git add ui-visualizer/src/App.tsx
git add ui-visualizer/src/utils/dataLoader.ts
git add ui-visualizer/src/pages/DetailPage.tsx
git commit -m "Add GitHub Pages deployment workflow"
git push origin main
```

## Step 2: Enable GitHub Pages

1. Go to your repository on GitHub: https://github.com/snorkel-ai/UI-Elements-Visualizer
2. Click on **Settings** (top navigation)
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select **"GitHub Actions"** (NOT "Deploy from a branch")
5. Save the changes

## Step 3: Trigger the Workflow

After pushing, the workflow should run automatically. If not:

1. Go to the **Actions** tab in your repository
2. You should see "Deploy to GitHub Pages" workflow
3. Click on it and click **"Run workflow"** button
4. Select the `main` branch and click **"Run workflow"**

## Step 4: Wait for Deployment

- The workflow will take 2-5 minutes to complete
- You can watch the progress in the Actions tab
- Once complete, your site will be live at:
  **https://snorkel-ai.github.io/UI-Elements-Visualizer/**

## Troubleshooting

If you see a 404:
- Make sure GitHub Pages is set to "GitHub Actions" (not a branch)
- Check the Actions tab for any errors
- Make sure the workflow completed successfully (green checkmark)

If the workflow fails:
- Check the error logs in the Actions tab
- Common issues:
  - Missing `package-lock.json` (run `npm install` in `ui-visualizer/` first)
  - Node version mismatch
  - Missing data folders

