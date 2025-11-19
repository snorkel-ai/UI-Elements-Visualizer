# UI Elements Visualizer

A React application for visualizing UI component examples with validation and curation tools.

## Features

- 📊 Dashboard view of all component examples
- 🔍 Detailed view with canvas preview, component definitions, and conversation
- ✅ Validation system for component quality
- 📈 Curation pipeline for identifying high-confidence examples

## Development

```bash
cd ui-visualizer
npm install
npm run generate-index  # Generate data index from folders
npm run dev             # Start dev server on port 5174
```

## Deployment

This project is automatically deployed to GitHub Pages via GitHub Actions when changes are pushed to the `main` branch.

The site will be available at: `https://snorkel-ai.github.io/UI-Elements-Visualizer/`

## Project Structure

- `ui-visualizer/` - React application
- `*/` - Data folders (each folder contains `conversation.json`, `components.ts`, `canvas.html`)
- `.github/workflows/` - GitHub Actions deployment configuration

## Scripts

- `npm run generate-index` - Generate data index from folders
- `npm run validate` - Run validation checks on all folders
- `npm run analyze` - Analyze validation results
- `npm run curate` - Generate curated list
- `npm run curation-pipeline` - Run full curation pipeline

