import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import validation logic (adapted for Node.js)
import { validateComponents, parseComponents } from '../src/utils/validateComponentsNode.js';

const dataIndexPath = path.join(__dirname, '..', 'public', 'data-index.json');
const outputPath = path.join(__dirname, '..', '..', 'VALIDATION_REPORT.json');
const dataDir = path.join(__dirname, '..', '..');

/**
 * Load components.ts file content
 */
function loadComponentsFile(folderName) {
  const componentsPath = path.join(dataDir, folderName, 'components.ts');
  if (fs.existsSync(componentsPath)) {
    try {
      return fs.readFileSync(componentsPath, 'utf-8');
    } catch (e) {
      console.error(`Error reading components.ts for ${folderName}:`, e.message);
      return '';
    }
  }
  return '';
}

/**
 * Check if a prop type is safe to filter (array/dict/optional)
 */
function isSafeToFilterType(propType, isOptional) {
  if (isOptional) return true;
  
  // Check if it's an array/list type
  const isList = /\[\]|Array<|array/i.test(propType);
  if (isList) return true;
  
  // Check if it's a dictionary/object/record type
  const isDict = /Record<|object|Object|Dictionary|Map</i.test(propType);
  if (isDict) return true;
  
  return false;
}

/**
 * Analyze schema mismatches to see if they're safe-to-filter
 * This checks the actual interface props against what was flagged
 */
function analyzeSchemaMismatches(conversation, parsedComponents, schemaCheckResult) {
  if (!schemaCheckResult || schemaCheckResult.passed) {
    return { allSafe: true, safeCount: 0, unsafeCount: 0 };
  }
  
  const mismatches = schemaCheckResult.details || [];
  if (mismatches.length === 0) {
    return { allSafe: true, safeCount: 0, unsafeCount: 0 };
  }
  
  let safeCount = 0;
  let unsafeCount = 0;
  
  // Parse mismatch details to check prop types
  mismatches.forEach(mismatch => {
    // Format: "ComponentName.propName: In interface but not in schema"
    const match = mismatch.match(/^([^.]+)\.(.+):/);
    if (!match) {
      // "ComponentName: No matching schema found" - this is unsafe
      unsafeCount++;
      return;
    }
    
    const componentName = match[1];
    const propName = match[2];
    
    // Find the component and prop
    const component = parsedComponents.find(c => c.name === componentName);
    if (!component) {
      unsafeCount++;
      return;
    }
    
    const prop = component.props.find(p => p.name === propName);
    if (!prop) {
      unsafeCount++;
      return;
    }
    
    // Check if this prop type is safe to filter
    if (isSafeToFilterType(prop.type, prop.optional)) {
      safeCount++;
    } else {
      // Also check if it's not required in schema
      if (conversation?.componentsSchema?.$defs) {
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
        
        if (schemaKey) {
          const schema = conversation.componentsSchema.$defs[schemaKey];
          const schemaRequired = schema?.properties?.props?.required || [];
          if (!schemaRequired.includes(propName)) {
            safeCount++; // Not required = effectively optional = safe
            return;
          }
        }
      }
      
      unsafeCount++;
    }
  });
  
  return {
    allSafe: unsafeCount === 0,
    safeCount,
    unsafeCount
  };
}

/**
 * Categorize folder into tier based on validation results
 */
function categorizeFolder(report, conversation, parsedComponents) {
  const criticalChecks = ['No export interface', 'No ReactNode attributes', 'Props match schema'];
  const schemaCheck = 'Interface matches schema';
  
  // Check if all critical checks pass
  const criticalPassed = criticalChecks.every(checkName => {
    const check = report.results.find(r => r.check === checkName);
    return check && check.passed;
  });
  
  // Check schema match status
  const schemaCheckResult = report.results.find(r => r.check === schemaCheck);
  const schemaPassed = schemaCheckResult && schemaCheckResult.passed;
  
  if (report.allPassed) {
    // Check if there were safe-to-filter mismatches that were filtered out
    const schemaCheckResult = report.results.find(r => r.check === 'Interface matches schema');
    const safeMismatchCount = schemaCheckResult?.metadata?.totalSafeMismatches || 0;
    
    if (safeMismatchCount > 0) {
      // All checks passed, but there were safe-to-filter props not in schema
      // This is still Tier 1, but we note it
      return { 
        tier: 1, 
        reason: `All checks passed (${safeMismatchCount} safe-to-filter props not in schema were ignored)` 
      };
    }
    return { tier: 1, reason: 'All checks passed' };
  }
  
  if (criticalPassed && !schemaPassed) {
    // Analyze schema mismatches to see if they're safe-to-filter
    const mismatchAnalysis = analyzeSchemaMismatches(conversation, parsedComponents, schemaCheckResult);
    const safeMismatchCount = schemaCheckResult?.metadata?.totalSafeMismatches || 0;
    
    if (mismatchAnalysis.allSafe && mismatchAnalysis.safeCount > 0) {
      return { 
        tier: 2, 
        reason: `Only schema match issues (${mismatchAnalysis.safeCount} safe-to-filter mismatches)` 
      };
    } else if (mismatchAnalysis.unsafeCount === 0 && (mismatchAnalysis.safeCount > 0 || safeMismatchCount > 0)) {
      // All mismatches are safe, but let's be conservative
      return { 
        tier: 2, 
        reason: `Schema mismatches appear safe-to-filter (${mismatchAnalysis.safeCount || safeMismatchCount} array/dict/optional props)` 
      };
    }
  }
  
  return { tier: 3, reason: 'Critical validation failures' };
}

/**
 * Generate validation report for all folders
 */
async function generateValidationReport() {
  console.log('Loading data index...');
  const dataIndex = JSON.parse(fs.readFileSync(dataIndexPath, 'utf-8'));
  console.log(`Found ${dataIndex.length} folders`);
  
  const report = {
    generatedAt: new Date().toISOString(),
    totalFolders: dataIndex.length,
    tier1: [],
    tier2: [],
    tier3: []
  };
  
  for (let i = 0; i < dataIndex.length; i++) {
    const dataPoint = dataIndex[i];
    console.log(`[${i + 1}/${dataIndex.length}] Validating ${dataPoint.folderName}...`);
    
    try {
      // Load components.ts content
      const componentsContent = loadComponentsFile(dataPoint.folderName);
      const parsedComponents = parseComponents(componentsContent);
      
      // Run validation
      const validationReport = validateComponents(dataPoint, parsedComponents, componentsContent);
      
      // Store conversation in report for later analysis
      validationReport.conversation = dataPoint.conversation;
      
      // Categorize (pass conversation and parsedComponents for analysis)
      const category = categorizeFolder(validationReport, dataPoint.conversation, parsedComponents);
      
      const folderResult = {
        folderName: dataPoint.folderName,
        report: validationReport,
        category: category.reason
      };
      
      if (category.tier === 1) {
        report.tier1.push(folderResult);
      } else       if (category.tier === 2) {
        // Extract filtered issues for Tier 2
        const schemaCheck = validationReport.results.find(r => r.check === 'Interface matches schema');
        folderResult.filteredIssues = schemaCheck && !schemaCheck.passed ? schemaCheck.details : [];
        folderResult.safeMismatchCount = schemaCheck?.metadata?.totalSafeMismatches || 0;
        report.tier2.push(folderResult);
      } else {
        // Extract critical issues for Tier 3
        const criticalIssues = validationReport.results
          .filter(r => !r.passed)
          .map(r => ({ check: r.check, message: r.message, details: r.details }));
        folderResult.criticalIssues = criticalIssues;
        report.tier3.push(folderResult);
      }
    } catch (error) {
      console.error(`Error validating ${dataPoint.folderName}:`, error.message);
      report.tier3.push({
        folderName: dataPoint.folderName,
        error: error.message,
        criticalIssues: [{ check: 'Validation Error', message: error.message }]
      });
    }
  }
  
  // Write report
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\nValidation report generated: ${outputPath}`);
  console.log(`\nSummary:`);
  console.log(`  Tier 1 (High Confidence): ${report.tier1.length}`);
  console.log(`  Tier 2 (Medium Confidence): ${report.tier2.length}`);
  console.log(`  Tier 3 (Low Confidence): ${report.tier3.length}`);
}

generateValidationReport().catch(console.error);

