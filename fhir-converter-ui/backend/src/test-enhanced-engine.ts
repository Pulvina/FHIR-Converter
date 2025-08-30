import { ModularTemplateEngine } from './ModularTemplateEngine';
import * as fs from 'fs-extra';
import * as path from 'path';

const engine = new ModularTemplateEngine();

async function testEnhancedEngine() {
  console.log('🚀 Testing Enhanced Patient Template Engine\n');
  
  console.log('📋 Available Templates:', engine.getTemplateNames());
  console.log('');

  // Test with our patient examples
  const samplesDir = path.resolve('../../data/SampleData/Json/PatientExamples');
  const files = await fs.readdir(samplesDir);
  
  for (const file of files.filter(f => f.endsWith('.json'))) {
    console.log(`📋 Testing: ${file}`);
    
    try {
      const filePath = path.join(samplesDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      
      const analysis = engine.analyzeJson(data);
      
      console.log(`  🎯 Resource: ${analysis.selectedResourceType} (${analysis.resourceDetection[0]?.confidence.toFixed(1) || 0}% confidence)`);
      
      if (analysis.templateAnalysis && analysis.templateAnalysis.selected.confidence > 0) {
        console.log(`  🎪 Template: ${analysis.templateAnalysis.selected.templateName} (${analysis.templateAnalysis.selected.confidence.toFixed(1)}% confidence)`);
        console.log(`  ✅ Status: ${analysis.templateAnalysis.selected.confidence >= 80 ? 'High Confidence' : analysis.templateAnalysis.selected.confidence >= 40 ? 'Medium Confidence' : 'Low Confidence'}`);
        
        if (analysis.templateAnalysis.selected.matches.length > 0) {
          console.log(`  🎯 Field matches: ${analysis.templateAnalysis.selected.matches.length}`);
        }
        
        if (analysis.templateAnalysis.selected.missingRequired.length > 0) {
          console.log(`  ⚠️  Missing required: ${analysis.templateAnalysis.selected.missingRequired.join(', ')}`);
        }
      } else {
        console.log(`  ❌ No suitable template found`);
      }
      
      console.log(`  💡 ${analysis.recommendation}`);
      
    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
    }
    
    console.log('');
  }

  // Test specific cases that should now work better
  console.log('🧪 Testing Specific Improvements:\n');
  
  const testCases = [
    {
      name: 'Array Patient (should now detect PatientArray)',
      file: 'ArrayPatient.json'
    },
    {
      name: 'Minimal Patient (should now detect PatientMinimal)',  
      file: 'MinimalPatient.json'
    },
    {
      name: 'Complex Patient (should have better confidence)',
      file: 'ComplexPatient.json'
    }
  ];

  for (const testCase of testCases) {
    console.log(`📋 ${testCase.name}:`);
    
    try {
      const filePath = path.join(samplesDir, testCase.file);
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      
      const analysis = engine.analyzeJson(data);
      const selected = analysis.templateAnalysis?.selected;
      
      if (selected && selected.confidence > 0) {
        console.log(`  ✅ SUCCESS: ${selected.templateName} (${selected.confidence.toFixed(1)}% confidence)`);
        console.log(`  📊 Score: ${selected.score.toFixed(1)}, Matches: ${selected.matches.length}`);
      } else {
        console.log(`  ❌ STILL NO MATCH: No suitable template found`);
      }
      
    } catch (error) {
      console.log(`  ❌ ERROR: ${error}`);
    }
    
    console.log('');
  }

  console.log('✅ Enhanced Template Engine Testing Complete!');
}

testEnhancedEngine().catch(console.error);