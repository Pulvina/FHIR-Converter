const { IntelligentTemplateGenerator } = require('./fhir-converter-ui/backend/dist/engines/IntelligentTemplateGenerator');

// Test with your EMS JSON
const emsJson = {
  "caseId": "EMS-2025-1023",
  "patient": {
    "ageEstimate": 45,
    "sex": "male",
    "unidentified": true
  },
  "vitals": {
    "heartRate": 110,
    "respiratoryRate": 22,
    "bloodPressure": "150/95",
    "oxygenSaturation": 92
  },
  "incidentLocation": {
    "lat": 32.0853,
    "lng": 34.7818,
    "description": "Near Tel Aviv Central Bus Station"
  },
  "transportedTo": "Ichilov Hospital"
};

console.log('🧠 Testing Intelligent Template System\n');

try {
  const generator = new IntelligentTemplateGenerator();
  const result = generator.analyzeAndGenerate(emsJson);
  
  console.log(`✅ Analysis Complete`);
  console.log(`📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`🔍 Detected ${result.analysis.detectedFields} fields\n`);
  
  console.log('📋 Field Breakdown:');
  result.analysis.fieldBreakdown.forEach(field => {
    console.log(`  • ${field.path} → ${field.fhirPath} (${(field.confidence * 100).toFixed(1)}%)`);
  });
  
  console.log('\n🚀 Generated Template Preview:');
  console.log(result.template.substring(0, 800) + '...\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}