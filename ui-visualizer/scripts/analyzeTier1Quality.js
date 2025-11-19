import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', '..');

/**
 * Comprehensive quality analysis of Tier 1 folders
 */
function analyzeTier1Quality() {
  const report = JSON.parse(fs.readFileSync(path.join(dataDir, 'VALIDATION_REPORT.json'), 'utf-8'));
  
  const analysis = report.tier1.map(t => {
    const folderName = t.folderName;
    const folderPath = path.join(dataDir, folderName);
    
    // Get validation metadata
    const schemaCheck = t.report.results.find(r => r.check === 'Interface matches schema');
    const safeMismatches = schemaCheck?.metadata?.totalSafeMismatches || 0;
    
    // Check file completeness
    const hasComponents = fs.existsSync(path.join(folderPath, 'components.ts'));
    const hasConversation = fs.existsSync(path.join(folderPath, 'conversation.json'));
    const hasCanvas = fs.existsSync(path.join(folderPath, 'canvas.html'));
    
    // Analyze components.ts quality
    let componentCount = 0;
    let totalProps = 0;
    let avgPropsPerComponent = 0;
    let hasComplexTypes = false;
    
    if (hasComponents) {
      try {
        const componentsContent = fs.readFileSync(path.join(folderPath, 'components.ts'), 'utf-8');
        const interfaceMatches = componentsContent.match(/interface\s+\w+Props\s*\{/g);
        componentCount = interfaceMatches ? interfaceMatches.length : 0;
        
        // Count props
        const propMatches = componentsContent.match(/(\w+)(\??):\s*[^;]+;/g);
        totalProps = propMatches ? propMatches.length : 0;
        avgPropsPerComponent = componentCount > 0 ? (totalProps / componentCount).toFixed(1) : 0;
        
        // Check for complex types (unions, generics, etc.)
        hasComplexTypes = /(\||<|Record<|Array<|\[\])/.test(componentsContent);
      } catch (e) {
        // Error reading file
      }
    }
    
    // Analyze conversation quality
    let messageCount = 0;
    let componentUsageCount = 0;
    let hasGradingGuidance = false;
    
    if (hasConversation) {
      try {
        const conversation = JSON.parse(fs.readFileSync(path.join(folderPath, 'conversation.json'), 'utf-8'));
        messageCount = conversation.conversation?.length || 0;
        
        // Count component usage
        conversation.conversation?.forEach(msg => {
          if (Array.isArray(msg.content)) {
            msg.content.forEach(item => {
              if (item.type === 'component') {
                componentUsageCount++;
              }
            });
          }
          if (msg.grading_guidance) {
            hasGradingGuidance = true;
          }
        });
      } catch (e) {
        // Error reading file
      }
    }
    
    // Calculate quality score (lower is better for filtering)
    // Factors that make a folder weaker:
    // - More safe mismatches (less perfect match)
    // - Missing files
    // - Fewer components (less comprehensive)
    // - Fewer messages (less complete conversation)
    // - No grading guidance (less complete)
    
    const qualityScore = {
      safeMismatches, // Higher = weaker
      missingFiles: (!hasComponents ? 1 : 0) + (!hasConversation ? 1 : 0) + (!hasCanvas ? 1 : 0),
      lowComponentCount: componentCount < 3 ? 1 : 0,
      lowMessageCount: messageCount < 4 ? 1 : 0,
      noGradingGuidance: !hasGradingGuidance ? 1 : 0,
      lowPropsPerComponent: parseFloat(avgPropsPerComponent) < 3 ? 1 : 0
    };
    
    const totalWeakness = 
      qualityScore.safeMismatches * 0.3 +
      qualityScore.missingFiles * 2 +
      qualityScore.lowComponentCount * 1 +
      qualityScore.lowMessageCount * 0.5 +
      qualityScore.noGradingGuidance * 0.5 +
      qualityScore.lowPropsPerComponent * 0.5;
    
    return {
      folderName,
      safeMismatches,
      hasComponents,
      hasConversation,
      hasCanvas,
      componentCount,
      totalProps,
      avgPropsPerComponent,
      messageCount,
      componentUsageCount,
      hasGradingGuidance,
      hasComplexTypes,
      qualityScore,
      totalWeakness
    };
  });
  
  // Sort by weakness (highest = weakest)
  analysis.sort((a, b) => b.totalWeakness - a.totalWeakness);
  
  console.log('Tier 1 Folders Ranked by Weakness (weakest first):\n');
  analysis.forEach((item, i) => {
    console.log(`${i + 1}. ${item.folderName}`);
    console.log(`   Weakness Score: ${item.totalWeakness.toFixed(2)}`);
    console.log(`   Safe Mismatches: ${item.safeMismatches}`);
    console.log(`   Files: components=${item.hasComponents}, conv=${item.hasConversation}, canvas=${item.hasCanvas}`);
    console.log(`   Components: ${item.componentCount}, Avg Props: ${item.avgPropsPerComponent}`);
    console.log(`   Messages: ${item.messageCount}, Component Uses: ${item.componentUsageCount}`);
    console.log(`   Has Grading Guidance: ${item.hasGradingGuidance}`);
    console.log('');
  });
  
  // Top 8 weakest
  console.log('\n=== TOP 8 WEAKEST (Candidates for Exclusion) ===\n');
  analysis.slice(0, 8).forEach((item, i) => {
    console.log(`${i + 1}. ${item.folderName} (Weakness: ${item.totalWeakness.toFixed(2)})`);
  });
  
  // Bottom 20 (strongest)
  console.log('\n=== TOP 20 STRONGEST (Recommended for Final List) ===\n');
  analysis.slice(-20).reverse().forEach((item, i) => {
    console.log(`${i + 1}. ${item.folderName} (Weakness: ${item.totalWeakness.toFixed(2)})`);
  });
  
  return analysis;
}

analyzeTier1Quality();

