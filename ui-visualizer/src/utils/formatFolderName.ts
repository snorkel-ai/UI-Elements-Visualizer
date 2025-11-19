/**
 * Cleans up folder names for display:
 * - Removes timestamps (format: YYYYMMDD_HHMMSS)
 * - Converts underscores to spaces
 * - Capitalizes words properly
 * - Formats dates if found
 */
export function formatFolderName(folderName: string): string {
  // Remove timestamp pattern: YYYYMMDD_HHMMSS (8 digits, underscore, 6 digits)
  let cleaned = folderName.replace(/\d{8}_\d{6}/g, '');
  
  // Remove any trailing/leading underscores and clean up multiple underscores
  cleaned = cleaned.replace(/_+/g, ' ').trim();
  
  // Split into words and capitalize each word
  const words = cleaned.split(/\s+/);
  const capitalized = words.map(word => {
    // Handle special cases like "CSV", "API", etc.
    if (word.length <= 3 && word === word.toUpperCase()) {
      return word;
    }
    // Capitalize first letter, lowercase the rest
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  
  return capitalized.join(' ');
}

/**
 * Extracts date from folder name if present
 * Format: YYYYMMDD_HHMMSS
 */
export function extractDateFromFolderName(folderName: string): Date | null {
  const match = folderName.match(/(\d{8})_\d{6}/);
  if (match) {
    const dateStr = match[1];
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
    const day = parseInt(dateStr.substring(6, 8));
    return new Date(year, month, day);
  }
  return null;
}

/**
 * Formats a date as a readable string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
