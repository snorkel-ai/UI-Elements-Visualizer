import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseComponents, validateComponents } from '../src/utils/validateComponentsNode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', '..');

/**
 * Test if validation correctly handles safe-to-filter props
 */
function testSafeFiltering() {
  console.log('Testing safe-to-filter prop handling...\n');
  
  // Test case: compare_prices_grocery - has optional mixedCart, currencyCode, showMixedCartDefault
  const folderName = 'compare_prices_grocery_20251118_162627';
  const componentsPath = path.join(dataDir, folderName, 'components.ts');
  const conversationPath = path.join(dataDir, folderName, 'conversation.json');
  
  const componentsContent = fs.readFileSync(componentsPath, 'utf-8');
  const conversation = JSON.parse(fs.readFileSync(conversationPath, 'utf-8'));
  
  const parsedComponents = parseComponents(componentsContent);
  console.log('Parsed components:');
  parsedComponents.forEach(comp => {
    console.log(`\n${comp.name}:`);
    comp.props.forEach(prop => {
      const isOptional = prop.optional;
      const isArray = /\[\]|Array<|array/i.test(prop.type);
      const isDict = /Record<|object|Object|Dictionary|Map</i.test(prop.type);
      const safe = isOptional || isArray || isDict;
      console.log(`  - ${prop.name}${isOptional ? '?' : ''}: ${prop.type}`);
      console.log(`    Optional: ${isOptional}, Array: ${isArray}, Dict: ${isDict}, Safe: ${safe}`);
    });
  });
  
  // Check schema
  const schema = conversation.componentsSchema.$defs.StoreComparisonPanel;
  const schemaProps = Object.keys(schema.properties.props.properties || {});
  const schemaRequired = schema.properties.props.required || [];
  
  console.log('\n\nSchema props:', schemaProps.join(', '));
  console.log('Schema required:', schemaRequired.join(', '));
  
  // Find props in interface but not in schema
  console.log('\n\nAll parsed component names:', parsedComponents.map(c => c.name).join(', '));
  const storeComp = parsedComponents.find(c => 
    c.name === 'StoreComparisonPanel' || 
    c.name.toLowerCase().includes('storecomparison') ||
    c.name.toLowerCase().includes('store')
  );
  if (storeComp) {
    console.log(`\n\nFound component: ${storeComp.name}`);
    console.log(`Props in interface: ${storeComp.props.map(p => p.name).join(', ')}`);
    console.log('\nProps in interface but not in schema:');
    storeComp.props.forEach(prop => {
      if (!schemaProps.includes(prop.name)) {
        const isOptional = prop.optional;
        const isArray = /\[\]|Array<|array/i.test(prop.type);
        const isDict = /Record<|object|Object|Dictionary|Map</i.test(prop.type);
        const safe = isOptional || isArray || isDict;
        const required = schemaRequired.includes(prop.name);
        console.log(`  - ${prop.name}: ${prop.type}`);
        console.log(`    Optional: ${isOptional}, Array: ${isArray}, Dict: ${isDict}`);
        console.log(`    Would be filtered: ${safe || !required}`);
        console.log(`    Would be flagged: ${!safe && required}`);
      } else {
        console.log(`  ✓ ${prop.name}: IN SCHEMA`);
      }
    });
  } else {
    console.log('\n\nStoreComparisonPanel component not found in parsed components');
  }
  
  // Run validation
  const dataPoint = { conversation };
  const report = validateComponents(dataPoint, parsedComponents, componentsContent);
  
  console.log('\n\nValidation Results:');
  report.results.forEach(result => {
    console.log(`\n${result.check}: ${result.passed ? 'PASS' : 'FAIL'}`);
    console.log(`  ${result.message}`);
    if (result.details && result.details.length > 0) {
      console.log(`  Details: ${result.details.length} items`);
      result.details.slice(0, 3).forEach(d => console.log(`    - ${d}`));
      if (result.details.length > 3) {
        console.log(`    ... and ${result.details.length - 3} more`);
      }
    }
  });
  
  console.log(`\n\nOverall: ${report.allPassed ? 'ALL PASSED' : 'SOME FAILED'}`);
}

testSafeFiltering();

