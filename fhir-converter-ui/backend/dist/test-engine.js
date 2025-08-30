"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const templateEngine_1 = require("./templateEngine");
const engine = new templateEngine_1.TemplateDetectionEngine();
// Test different JSON structures
const testCases = [
    {
        name: 'Basic Flat Structure',
        data: {
            PatientId: 12345,
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1990-01-01',
            gender: 'M'
        }
    },
    {
        name: 'Nested Structure',
        data: {
            patient: {
                id: 67890,
                name: {
                    first: 'Jane',
                    last: 'Smith'
                },
                contact: {
                    phone: ['555-1234', '555-5678']
                }
            }
        }
    },
    {
        name: 'EHR Style',
        data: {
            mrn: 'MRN123456',
            demographics: {
                firstName: 'Bob',
                lastName: 'Johnson'
            },
            identifiers: ['ID1', 'ID2']
        }
    },
    {
        name: 'Unknown Structure',
        data: {
            personId: 999,
            givenName: 'Alice',
            familyName: 'Wilson',
            birthYear: 1985
        }
    }
];
console.log('🧪 Testing Template Detection Engine\n');
for (const testCase of testCases) {
    console.log(`📋 Test Case: ${testCase.name}`);
    console.log('Input:', JSON.stringify(testCase.data, null, 2));
    const analysis = engine.selectBestTemplate(testCase.data);
    const structure = engine.analyzeStructure(testCase.data);
    console.log('\n📊 Structure Analysis:');
    console.log(`  - Max Depth: ${structure.maxDepth}`);
    console.log(`  - Has Arrays: ${structure.hasArrays}`);
    console.log(`  - Has Nested Objects: ${structure.hasNestedObjects}`);
    console.log(`  - Field Count: ${structure.fieldCount}`);
    console.log(`  - Fields: ${structure.allFields.join(', ')}`);
    console.log('\n🎯 Best Template Match:');
    console.log(`  - Template: ${analysis.selected.templateName}`);
    console.log(`  - Confidence: ${analysis.selected.confidence.toFixed(1)}%`);
    console.log(`  - Score: ${analysis.selected.score}`);
    console.log(`  - Recommendation: ${analysis.recommendation}`);
    if (analysis.selected.matches.length > 0) {
        console.log('  - Field Matches:');
        for (const match of analysis.selected.matches) {
            console.log(`    • ${match.field} → ${match.matched} (weight: ${match.weight})`);
        }
    }
    if (analysis.selected.missingRequired.length > 0) {
        console.log(`  - Missing Required: ${analysis.selected.missingRequired.join(', ')}`);
    }
    console.log('\n📈 Alternative Templates:');
    for (const alt of analysis.alternatives) {
        console.log(`  - ${alt.templateName}: ${alt.confidence.toFixed(1)}% confidence`);
    }
    console.log('\n' + '='.repeat(80) + '\n');
}
console.log('✅ Template Detection Engine Testing Complete!');
