import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const analysisReportPath = path.join(__dirname, '..', '..', 'ANALYSIS_REPORT.json');
const curatedJsonPath = path.join(__dirname, '..', '..', 'CURATED_FOLDERS.json');
const curatedMarkdownPath = path.join(__dirname, '..', '..', 'CURATED_FOLDERS.md');

/**
 * Generate curated list from analysis
 */
function generateCuratedList() {
  console.log('Loading analysis report...');
  const analysis = JSON.parse(fs.readFileSync(analysisReportPath, 'utf-8'));
  
  const curated = {
    generatedAt: new Date().toISOString(),
    highConfidence: [],
    mediumConfidence: [],
    excluded: [],
    summary: {
      total: 0,
      included: 0,
      excluded: 0
    }
  };
  
  // Tier 1: Auto-include if ready
  analysis.tier1.forEach(folder => {
    if (folder.ready && folder.confidence >= 4) {
      curated.highConfidence.push({
        folderName: folder.folderName,
        confidence: folder.confidence,
        tier: 1,
        reason: 'All validation checks passed',
        notes: folder.notes
      });
    } else {
      curated.excluded.push({
        folderName: folder.folderName,
        reason: 'Missing required files or not ready',
        notes: folder.notes
      });
    }
  });
  
  // Tier 2: Include if safe to filter and ready
  analysis.tier2.forEach(folder => {
    if (folder.ready && folder.safeToFilter && folder.confidence >= 4) {
      curated.highConfidence.push({
        folderName: folder.folderName,
        confidence: folder.confidence,
        tier: 2,
        reason: 'Schema mismatches are safe-to-filter issues',
        notes: folder.notes,
        filteredIssues: folder.filteredIssues
      });
    } else if (folder.ready && folder.confidence >= 3) {
      curated.mediumConfidence.push({
        folderName: folder.folderName,
        confidence: folder.confidence,
        tier: 2,
        reason: 'May have minor schema issues',
        notes: folder.notes,
        filteredIssues: folder.filteredIssues
      });
    } else {
      curated.excluded.push({
        folderName: folder.folderName,
        reason: 'Schema issues need review or files missing',
        notes: folder.notes
      });
    }
  });
  
  // Tier 3: Only include if fixable and reviewer approved
  // For now, exclude all Tier 3 unless explicitly marked as fixable and ready
  analysis.tier3.forEach(folder => {
    if (folder.fixable && folder.confidence >= 2) {
      curated.excluded.push({
        folderName: folder.folderName,
        reason: 'Has fixable issues - review and fix before inclusion',
        notes: folder.notes,
        fixable: true
      });
    } else {
      curated.excluded.push({
        folderName: folder.folderName,
        reason: 'Critical validation failures',
        notes: folder.notes
      });
    }
  });
  
  curated.summary.total = curated.highConfidence.length + curated.mediumConfidence.length + curated.excluded.length;
  curated.summary.included = curated.highConfidence.length + curated.mediumConfidence.length;
  curated.summary.excluded = curated.excluded.length;
  
  // Write JSON
  fs.writeFileSync(curatedJsonPath, JSON.stringify(curated, null, 2));
  console.log(`Curated list (JSON) generated: ${curatedJsonPath}`);
  
  // Write Markdown
  const markdown = generateMarkdownReport(curated);
  fs.writeFileSync(curatedMarkdownPath, markdown);
  console.log(`Curated list (Markdown) generated: ${curatedMarkdownPath}`);
  
  console.log('\nSummary:');
  console.log(`  High Confidence: ${curated.highConfidence.length}`);
  console.log(`  Medium Confidence: ${curated.mediumConfidence.length}`);
  console.log(`  Excluded: ${curated.excluded.length}`);
  console.log(`  Total Included: ${curated.summary.included}`);
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(curated) {
  let md = '# Curated Folders List\n\n';
  md += `Generated: ${curated.generatedAt}\n\n`;
  md += `## Summary\n\n`;
  md += `- **High Confidence**: ${curated.highConfidence.length} folders\n`;
  md += `- **Medium Confidence**: ${curated.mediumConfidence.length} folders\n`;
  md += `- **Excluded**: ${curated.excluded.length} folders\n`;
  md += `- **Total Included**: ${curated.summary.included} folders\n\n`;
  
  md += '---\n\n';
  
  if (curated.highConfidence.length > 0) {
    md += '## High Confidence Folders\n\n';
    md += 'These folders pass all validation checks and are ready for customer delivery.\n\n';
    curated.highConfidence.forEach((folder, idx) => {
      md += `### ${idx + 1}. ${folder.folderName}\n\n`;
      md += `- **Confidence**: ${folder.confidence}/5\n`;
      md += `- **Tier**: ${folder.tier}\n`;
      md += `- **Reason**: ${folder.reason}\n`;
      md += `- **Notes**: ${folder.notes}\n`;
      if (folder.filteredIssues && folder.filteredIssues.length > 0) {
        md += `- **Filtered Issues**: ${folder.filteredIssues.length} safe-to-filter schema mismatches\n`;
      }
      md += '\n';
    });
  }
  
  if (curated.mediumConfidence.length > 0) {
    md += '## Medium Confidence Folders\n\n';
    md += 'These folders have minor issues that may be acceptable. Review recommended.\n\n';
    curated.mediumConfidence.forEach((folder, idx) => {
      md += `### ${idx + 1}. ${folder.folderName}\n\n`;
      md += `- **Confidence**: ${folder.confidence}/5\n`;
      md += `- **Tier**: ${folder.tier}\n`;
      md += `- **Reason**: ${folder.reason}\n`;
      md += `- **Notes**: ${folder.notes}\n`;
      if (folder.filteredIssues && folder.filteredIssues.length > 0) {
        md += `- **Issues**: ${folder.filteredIssues.length} schema mismatches\n`;
      }
      md += '\n';
    });
  }
  
  if (curated.excluded.length > 0) {
    md += '## Excluded Folders\n\n';
    md += 'These folders have validation failures or missing files and are not recommended for customer delivery.\n\n';
    curated.excluded.forEach((folder, idx) => {
      md += `### ${idx + 1}. ${folder.folderName}\n\n`;
      md += `- **Reason**: ${folder.reason}\n`;
      md += `- **Notes**: ${folder.notes}\n`;
      if (folder.fixable) {
        md += `- **Fixable**: Yes - review and fix before inclusion\n`;
      }
      md += '\n';
    });
  }
  
  return md;
}

generateCuratedList();

