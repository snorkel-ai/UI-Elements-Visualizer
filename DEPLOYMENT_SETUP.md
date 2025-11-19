# GitHub Pages Deployment Setup

This project is configured to automatically deploy to GitHub Pages using GitHub Actions.

## Setup Instructions

1. **Enable GitHub Pages in repository settings:**
   - Go to Settings → Pages
   - Under "Source", select "GitHub Actions"

2. **Push the workflow file:**
   - The workflow file is located at `.github/workflows/deploy.yml`
   - Push to the `main` branch to trigger deployment

3. **First deployment:**
   - After pushing, go to Actions tab
   - The workflow will run automatically
   - Once complete, the site will be available at:
     `https://snorkel-ai.github.io/UI-Elements-Visualizer/`

## What the workflow does:

1. Checks out the code
2. Sets up Node.js 18
3. Installs dependencies
4. Generates the data index (`npm run generate-index`)
5. Builds the React app (`npm run build`)
6. Deploys to GitHub Pages

## Configuration Changes Made:

- **vite.config.ts**: Added base path `/UI-Elements-Visualizer/` for production
- **App.tsx**: Added `basename` to BrowserRouter for correct routing
- **dataLoader.ts**: Updated fetch paths to use base path
- **DetailPage.tsx**: Updated component and canvas paths to use base path

## Manual Deployment

You can also trigger deployment manually:
- Go to Actions tab
- Select "Deploy to GitHub Pages" workflow
- Click "Run workflow"

## Troubleshooting

If deployment fails:
1. Check the Actions tab for error messages
2. Verify Node.js version compatibility
3. Ensure `package-lock.json` exists (run `npm install` if needed)
4. Check that data folders are accessible
