import { DataPoint } from '../types';

interface FileEntry {
  file: File;
  webkitRelativePath: string;
}

export async function processFolderUpload(files: FileList): Promise<DataPoint[]> {
  // Group files by folder
  const folderMap = new Map<string, FileEntry[]>();
  
  // Process all files and group by folder
  Array.from(files).forEach((file) => {
    const path = file.webkitRelativePath || (file as any).relativePath || '';
    const parts = path.split('/').filter((p: string) => p.length > 0);
    
    // Need at least 2 parts: [rootFolder, subFolder, ...files]
    if (parts.length < 2) return; // Skip files directly in root
    
    // Skip the root folder (first part) - we want the subfolders
    // parts[0] = root folder name (e.g., "UI Elements 12/4 Shortlist")
    // parts[1] = actual folder we care about (e.g., "folder1")
    // parts[2+] = file path within that folder
    
    const folderName = parts[1]; // The actual subfolder name
    const fileName = parts.slice(2).join('/'); // File path within the folder
    
    // Skip if this is a file directly in the root (no subfolder)
    if (!folderName) return;
    
    if (!folderMap.has(folderName)) {
      folderMap.set(folderName, []);
    }
    
    folderMap.get(folderName)!.push({
      file,
      webkitRelativePath: fileName || parts[parts.length - 1] // Use filename if no subpath
    });
  });
  
  console.log('Found folders:', Array.from(folderMap.keys()));
  console.log('Total files processed:', files.length);

  const dataPoints: DataPoint[] = [];

  // Process each folder
  for (const [folderName, files] of folderMap.entries()) {
    try {
      const dataPoint: DataPoint = {
        folderName,
        folderPath: `/${folderName}`,
        hasComponents: false,
      };

      // Find and process files
      let conversationFile: File | null = null;
      let componentsFile: File | null = null;
      let canvasFile: File | null = null;
      let imageFile: File | null = null;

      for (const entry of files) {
        const fileName = entry.webkitRelativePath.toLowerCase();
        const originalPath = entry.webkitRelativePath;
        
        console.log(`  Checking file in ${folderName}: ${originalPath} (normalized: ${fileName})`);
        
        if (fileName === 'conversation.json' || fileName.endsWith('/conversation.json')) {
          conversationFile = entry.file;
          console.log(`    ✓ Found conversation.json`);
        } else if (fileName === 'components.ts' || fileName === 'components.js' || fileName.endsWith('/components.ts') || fileName.endsWith('/components.js')) {
          componentsFile = entry.file;
          dataPoint.hasComponents = true;
          console.log(`    ✓ Found components file`);
        } else if (fileName === 'canvas.html' || fileName.endsWith('/canvas.html')) {
          canvasFile = entry.file;
          console.log(`    ✓ Found canvas.html`);
        } else if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
          // Use the first image found as preview
          if (!imageFile) {
            imageFile = entry.file;
            console.log(`    ✓ Found preview image: ${originalPath}`);
          }
        }
      }

      // Load conversation.json
      if (conversationFile) {
        try {
          const text = await conversationFile.text();
          dataPoint.conversation = JSON.parse(text);
        } catch (e) {
          console.error(`Error loading conversation.json for ${folderName}:`, e);
        }
      }

      // Create object URLs for files that need to be accessible
      if (imageFile) {
        dataPoint.previewImage = URL.createObjectURL(imageFile);
      }

      if (canvasFile) {
        dataPoint.canvasHtml = URL.createObjectURL(canvasFile);
      }

      if (componentsFile) {
        dataPoint.componentsPath = URL.createObjectURL(componentsFile);
      }

      // Only add if we have at least a conversation file
      if (conversationFile) {
        console.log(`✓ Added folder: ${folderName}`);
        dataPoints.push(dataPoint);
      } else {
        console.warn(`✗ Skipped folder ${folderName}: no conversation.json found`);
        console.warn(`  Files in folder:`, files.map(f => f.webkitRelativePath));
      }
    } catch (error) {
      console.error(`Error processing folder ${folderName}:`, error);
    }
  }

  console.log(`Processed ${dataPoints.length} valid folders out of ${folderMap.size} total folders`);
  return dataPoints;
}

