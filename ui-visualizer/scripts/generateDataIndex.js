import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', '..');
const outputFile = path.join(__dirname, '..', 'public', 'data-index.json');

function getAllFolders(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const folders = [];
  
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'ui-visualizer' && entry.name !== 'node_modules') {
      folders.push(entry.name);
    }
  }
  
  return folders;
}

function loadDataPoint(folderName) {
  const folderPath = path.join(dataDir, folderName);
  const conversationPath = path.join(folderPath, 'conversation.json');
  const componentsPath = path.join(folderPath, 'components.ts');
  const canvasPath = path.join(folderPath, 'canvas.html');
  
  const dataPoint = {
    folderName,
    folderPath: folderPath.replace(dataDir, ''),
    previewImage: null,
    canvasHtml: null,
    hasComponents: false,
  };
  
  // Find preview image and copy to public/data
  const files = fs.readdirSync(folderPath);
  const publicDataDir = path.join(__dirname, '..', 'public', 'data', folderName);
  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
  }
  
  const pngFile = files.find(f => f.endsWith('.png'));
  if (pngFile) {
    const sourceImage = path.join(folderPath, pngFile);
    const destImage = path.join(publicDataDir, pngFile);
    try {
      fs.copyFileSync(sourceImage, destImage);
      dataPoint.previewImage = `/data/${folderName}/${pngFile}`;
    } catch (e) {
      console.error(`Error copying image for ${folderName}:`, e.message);
    }
  }
  
  // Copy canvas.html if it exists
  if (fs.existsSync(canvasPath)) {
    const destCanvas = path.join(publicDataDir, 'canvas.html');
    try {
      fs.copyFileSync(canvasPath, destCanvas);
      dataPoint.canvasHtml = `/data/${folderName}/canvas.html`;
    } catch (e) {
      console.error(`Error copying canvas.html for ${folderName}:`, e.message);
    }
  }
  
  // Copy components.ts if it exists
  if (fs.existsSync(componentsPath)) {
    const destComponents = path.join(publicDataDir, 'components.ts');
    try {
      fs.copyFileSync(componentsPath, destComponents);
      dataPoint.hasComponents = true;
      dataPoint.componentsPath = `/data/${folderName}/components.ts`;
    } catch (e) {
      console.error(`Error copying components.ts for ${folderName}:`, e.message);
    }
  }
  
  // Load conversation.json
  if (fs.existsSync(conversationPath)) {
    try {
      const conversationContent = fs.readFileSync(conversationPath, 'utf-8');
      dataPoint.conversation = JSON.parse(conversationContent);
    } catch (e) {
      console.error(`Error loading conversation.json for ${folderName}:`, e.message);
    }
  }
  
  return dataPoint;
}

function generateIndex() {
  console.log('Scanning folders...');
  const folders = getAllFolders(dataDir);
  console.log(`Found ${folders.length} folders`);
  
  const dataPoints = folders.map(folder => {
    try {
      return loadDataPoint(folder);
    } catch (e) {
      console.error(`Error processing folder ${folder}:`, e.message);
      return null;
    }
  }).filter(Boolean);
  
  console.log(`Loaded ${dataPoints.length} data points`);
  
  // Ensure public directory exists
  const publicDir = path.dirname(outputFile);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  fs.writeFileSync(outputFile, JSON.stringify(dataPoints, null, 2));
  console.log(`Generated index file: ${outputFile}`);
}

generateIndex();
