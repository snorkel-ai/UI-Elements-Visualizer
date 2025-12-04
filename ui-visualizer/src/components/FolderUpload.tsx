import { useRef, useState } from 'react';
import { processFolderUpload } from '../utils/processFolderUpload';

interface FolderUploadProps {
  onUpload: (data: any[]) => void;
  onReset: () => void;
  hasCustomData: boolean;
}

export function FolderUpload({ onUpload, onReset, hasCustomData }: FolderUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    
    if (!file.name.endsWith('.json')) {
      setError('Please upload a JSON file');
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate that it's an array
      if (!Array.isArray(data)) {
        setError('JSON file must contain an array of data points');
        return;
      }

      // Validate basic structure
      if (data.length > 0 && !data[0].folderName) {
        setError('Invalid data format: each item must have a folderName property');
        return;
      }

      onUpload(data);
    } catch (e) {
      setError(`Error parsing JSON: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setProcessing(true);

    try {
      const dataPoints = await processFolderUpload(files);
      
      if (dataPoints.length === 0) {
        setError('No valid folders found. Each folder should contain at least a conversation.json file.');
        setProcessing(false);
        return;
      }

      console.log(`Processed ${dataPoints.length} folders`);
      onUpload(dataPoints);
    } catch (e) {
      setError(`Error processing folders: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
      // Reset input so same folder can be selected again
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      // Check if it's a directory
      const entry = items[0].webkitGetAsEntry();
      if (entry && entry.isDirectory) {
        // For directory drops, we'd need to use File System Access API
        // For now, prompt user to use folder selector
        setError('Please use the "Select Folder" button to upload a folder');
        return;
      }
    }
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-4">
        <div
          className={`flex-1 border-2 border-dashed rounded-lg p-4 transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={folderInputRef}
              type="file"
              {...({ webkitdirectory: '', directory: '' } as any)}
              multiple
              onChange={handleFolderSelect}
              className="hidden"
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={() => folderInputRef.current?.click()}
                disabled={processing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : 'Select Folder'}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Or Upload JSON
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 font-medium">
                {isDragging
                  ? 'Drop files here'
                  : hasCustomData
                  ? 'Upload a different folder list'
                  : 'Select a folder containing UI element folders, or upload a JSON file'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Select a folder (like "UI Elements 12/4 Shortlist") to process all subfolders, or upload a JSON file with data points
              </p>
              <details className="text-xs text-gray-400 mt-1">
                <summary className="cursor-pointer hover:text-gray-600">Expected format</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
{`[
  {
    "folderName": "example_folder",
    "folderPath": "/example_folder",
    "previewImage": "/data/example_folder/image.png",
    "canvasHtml": "/data/example_folder/canvas.html",
    "componentsPath": "/data/example_folder/components.ts",
    "hasComponents": true,
    "conversation": { ... }
  },
  ...
]`}
                </pre>
              </details>
            </div>
          </div>
        </div>
        
        {hasCustomData && (
          <button
            onClick={onReset}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Reset to Default
          </button>
        )}
      </div>
      
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}

