import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const validationReportPath = path.join(__dirname, '..', '..', 'VALIDATION_REPORT.json');
const outputPath = path.join(__dirname, '..', '..', 'ANALYSIS_REPORT.json');
const checklistPath = path.join(__dirname, '..', '..', 'REVIEW_CHECKLIST.md');
const dataDir = path.join(__dirname, '..', '..');

/**
 * Check if file exists and is non-empty
 */
function checkFileExists(folderName, filename) {
  const filePath = path.join(dataDir, folderName, filename);
  if (!fs.existsSync(filePath)) {
    return { exists: false, reason: 'File does not exist' };
  }
  try {
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return { exists: false, reason: 'File is empty' };
    }
    return { exists: true, size: stats.size };
  } catch (e) {
    return { exists: false, reason: `Error checking file: ${e.message}` };
  }
}

/**
 * Check if schema allows additionalProperties for flexible objects
 */
function checkSchemaFlexibility(conversation, componentName) {
  if (!conversation?.componentsSchema?.$defs) {
    return { flexible: false, reason: 'No schema found' };
  }
  
  const schemaKey = Object.keys(conversation.componentsSchema.$defs).find(key => {
    const keyWithoutProps = key.replace('Props', '');
    const componentNameLower = componentName.toLowerCase();
    const keyLower = key.toLowerCase();
    return (
      key === componentName ||
      key === `${componentName}Props` ||
      componentName === keyWithoutProps ||
      keyLower === componentNameLower ||
      keyLower === `${componentNameLower}props`
    );
  });
  
  if (!schemaKey) {
    return { flexible: false, reason: 'Schema key not found' };
  }
  
  const schema = conversation.componentsSchema.$defs[schemaKey];
  const propsSchema = schema?.properties?.props;
  const additionalProperties = propsSchema?.additionalProperties !== false;
  
  return {
    flexible: additionalProperties,
    reason: additionalProperties 
      ? 'Schema allows additionalProperties' 
      : 'Schema does not allow additionalProperties'
  };
}

/**
 * Analyze validation results and categorize issues
 */
function analyzeValidationResults(validationReport) {
  const analysis = {
    generatedAt: new Date().toISOString(),
    tier1: [],
    tier2: [],
    tier3: [],
    fileChecks: {},
    reviewChecklist: []
  };
  
  // Analyze Tier 1 (should be straightforward - all pass)
  validationReport.tier1.forEach(folder => {
    const fileChecks = {
      componentsTs: checkFileExists(folder.folderName, 'components.ts'),
      canvasHtml: checkFileExists(folder.folderName, 'canvas.html'),
      conversationJson: checkFileExists(folder.folderName, 'conversation.json')
    };
    
    analysis.fileChecks[folder.folderName] = fileChecks;
    
    const allFilesExist = fileChecks.componentsTs.exists && 
                          fileChecks.canvasHtml.exists && 
                          fileChecks.conversationJson.exists;
    
    analysis.tier1.push({
      folderName: folder.folderName,
      confidence: 5,
      fileChecks,
      ready: allFilesExist,
      notes: allFilesExist 
        ? 'All validation checks passed and all required files exist' 
        : 'Validation passed but some files missing'
    });
  });
  
  // Analyze Tier 2 (need to verify filtered issues are safe)
  validationReport.tier2.forEach(folder => {
    const fileChecks = {
      componentsTs: checkFileExists(folder.folderName, 'components.ts'),
      canvasHtml: checkFileExists(folder.folderName, 'canvas.html'),
      conversationJson: checkFileExists(folder.folderName, 'conversation.json')
    };
    
    analysis.fileChecks[folder.folderName] = fileChecks;
    
    // Check schema flexibility for components
    const schemaChecks = {};
    if (folder.report && folder.report.results) {
      const schemaCheck = folder.report.results.find(r => r.check === 'Interface matches schema');
      if (schemaCheck && !schemaCheck.passed && schemaCheck.details) {
        // Extract component names from details
        const componentNames = new Set();
        schemaCheck.details.forEach(detail => {
          const match = detail.match(/^([^.]+)\./);
          if (match) {
            componentNames.add(match[1]);
          }
        });
        
        componentNames.forEach(compName => {
          // Load conversation data
          const conversation = loadConversation(folder.folderName);
          if (conversation) {
            schemaChecks[compName] = checkSchemaFlexibility(conversation, compName);
          }
        });
      }
    }
    
    // Determine if issues are truly safe
    const filteredIssues = folder.filteredIssues || [];
    const hasOnlySafeIssues = filteredIssues.every(issue => {
      // Check if it's a "no matching schema" issue (might be okay)
      if (issue.includes('No matching schema found')) {
        return true; // This is often okay if component isn't used
      }
      // Other issues need review
      return false;
    });
    
    const confidence = hasOnlySafeIssues && Object.values(fileChecks).every(f => f.exists) ? 4 : 3;
    
    analysis.tier2.push({
      folderName: folder.folderName,
      confidence,
      fileChecks,
      schemaChecks,
      filteredIssues,
      safeToFilter: hasOnlySafeIssues,
      ready: confidence >= 4 && Object.values(fileChecks).every(f => f.exists),
      notes: hasOnlySafeIssues 
        ? 'Schema mismatches appear to be safe-to-filter issues' 
        : 'Schema mismatches need review'
    });
    
    // Add to review checklist if not clearly safe
    if (!hasOnlySafeIssues) {
      analysis.reviewChecklist.push({
        folderName: folder.folderName,
        tier: 2,
        questions: [
          `Are the schema mismatches for ${folder.folderName} only for optional/array/dict parameters?`,
          `Does the schema allow additionalProperties for flexible objects?`,
          `Are all required files present (components.ts, canvas.html, conversation.json)?`
        ],
        issues: filteredIssues
      });
    }
  });
  
  // Analyze Tier 3 (categorize critical issues)
  validationReport.tier3.forEach(folder => {
    const fileChecks = {
      componentsTs: checkFileExists(folder.folderName, 'components.ts'),
      canvasHtml: checkFileExists(folder.folderName, 'canvas.html'),
      conversationJson: checkFileExists(folder.folderName, 'conversation.json')
    };
    
    analysis.fileChecks[folder.folderName] = fileChecks;
    
    const criticalIssues = folder.criticalIssues || [];
    const issueTypes = {
      exportInterface: criticalIssues.some(i => i.check === 'No export interface'),
      reactNode: criticalIssues.some(i => i.check === 'No ReactNode attributes'),
      propsMismatch: criticalIssues.some(i => i.check === 'Props match schema'),
      schemaMismatch: criticalIssues.some(i => i.check === 'Interface matches schema'),
      validationError: !!folder.error
    };
    
    // Determine if issues are fixable
    const fixable = issueTypes.exportInterface || issueTypes.reactNode; // These are code fixes
    const disqualifying = issueTypes.propsMismatch && !issueTypes.schemaMismatch; // Props don't match is serious
    
    analysis.tier3.push({
      folderName: folder.folderName,
      confidence: fixable ? 2 : 1,
      fileChecks,
      issueTypes,
      fixable,
      disqualifying,
      ready: false,
      notes: fixable 
        ? 'Issues appear fixable (export interface, ReactNode)' 
        : disqualifying 
          ? 'Critical issues that may disqualify' 
          : 'Multiple validation failures'
    });
    
    // Add to review checklist
    analysis.reviewChecklist.push({
      folderName: folder.folderName,
      tier: 3,
      questions: [
        `Are the issues for ${folder.folderName} fixable?`,
        issueTypes.exportInterface ? 'Can "export interface" be changed to "interface"?' : null,
        issueTypes.reactNode ? 'Can ReactNode types be replaced with more specific types?' : null,
        issueTypes.propsMismatch ? 'Are props in conversation actually valid according to schema?' : null,
        `Are all required files present?`
      ].filter(Boolean),
      issues: criticalIssues
    });
  });
  
  return analysis;
}

/**
 * Generate review checklist markdown
 */
function generateReviewChecklist(analysis) {
  let markdown = '# Review Checklist\n\n';
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  markdown += `## Summary\n\n`;
  markdown += `- Tier 1 folders: ${analysis.tier1.length}\n`;
  markdown += `- Tier 2 folders needing review: ${analysis.tier2.filter(t => !t.safeToFilter).length}\n`;
  markdown += `- Tier 3 folders: ${analysis.tier3.length}\n\n`;
  
  if (analysis.reviewChecklist.length === 0) {
    markdown += '## No Review Needed\n\n';
    markdown += 'All folders have been automatically categorized. No manual review required.\n';
    return markdown;
  }
  
  markdown += '## Review Items\n\n';
  
  analysis.reviewChecklist.forEach((item, idx) => {
    markdown += `### ${idx + 1}. ${item.folderName} (Tier ${item.tier})\n\n`;
    markdown += '**Questions:**\n';
    item.questions.forEach(q => {
      markdown += `- [ ] ${q}\n`;
    });
    markdown += '\n**Issues:**\n';
    if (item.issues && item.issues.length > 0) {
      item.issues.forEach(issue => {
        if (typeof issue === 'string') {
          markdown += `- ${issue}\n`;
        } else {
          markdown += `- ${issue.check}: ${issue.message}\n`;
        }
      });
    }
    markdown += '\n---\n\n';
  });
  
  return markdown;
}

/**
 * Load conversation data for a folder
 */
function loadConversation(folderName) {
  const conversationPath = path.join(dataDir, folderName, 'conversation.json');
  if (fs.existsSync(conversationPath)) {
    try {
      return JSON.parse(fs.readFileSync(conversationPath, 'utf-8'));
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Main analysis function
 */
function analyzeResults() {
  console.log('Loading validation report...');
  const validationReport = JSON.parse(fs.readFileSync(validationReportPath, 'utf-8'));
  
  console.log('Analyzing results...');
  const analysis = analyzeValidationResults(validationReport);
  
  // Write analysis report
  fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
  console.log(`Analysis report generated: ${outputPath}`);
  
  // Write review checklist
  const checklist = generateReviewChecklist(analysis);
  fs.writeFileSync(checklistPath, checklist);
  console.log(`Review checklist generated: ${checklistPath}`);
  
  console.log('\nSummary:');
  console.log(`  Tier 1 (High Confidence): ${analysis.tier1.length}`);
  console.log(`  Tier 2 (Medium Confidence): ${analysis.tier2.length}`);
  console.log(`  Tier 3 (Low Confidence): ${analysis.tier3.length}`);
  console.log(`  Review items: ${analysis.reviewChecklist.length}`);
}

analyzeResults();

