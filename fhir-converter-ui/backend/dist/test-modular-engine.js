"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const ModularTemplateEngine_1 = require("./ModularTemplateEngine");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const engine = new ModularTemplateEngine_1.ModularTemplateEngine();
async function testModularEngine() {
    console.log('🧪 Testing New Modular Template Engine\n');
    console.log('🔧 Supported Resource Types:', engine.getSupportedResourceTypes());
    console.log('📋 Available Templates:', engine.getTemplateNames());
    console.log('');
    // Test cases
    const testCases = [
        {
            name: 'Basic Patient (Flat)',
            data: {
                PatientId: 12345,
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1985-03-15',
                gender: 'M'
            }
        },
        {
            name: 'FHIR Patient (Explicit)',
            data: {
                resourceType: 'Patient',
                id: 'patient-123',
                name: [{ given: ['Jane'], family: 'Smith' }]
            }
        },
        {
            name: 'Non-Patient Data',
            data: {
                orderId: 12345,
                product: 'Widget',
                quantity: 10,
                price: 29.99
            }
        },
        {
            name: 'Complex Patient Structure',
            data: {
                patientInfo: {
                    id: 'P-001',
                    personalDetails: {
                        name: {
                            given: ['Michael', 'James'],
                            family: 'Brown'
                        },
                        birthInfo: {
                            date: '1980-12-25'
                        }
                    }
                }
            }
        }
    ];
    for (const testCase of testCases) {
        console.log(`📋 Testing: ${testCase.name}`);
        console.log('Input:', JSON.stringify(testCase.data, null, 2));
        try {
            // Full modular analysis
            const fullAnalysis = engine.analyzeJson(testCase.data);
            console.log('\n🎯 Resource Detection Results:');
            for (let i = 0; i < Math.min(3, fullAnalysis.resourceDetection.length); i++) {
                const detection = fullAnalysis.resourceDetection[i];
                console.log(`  ${i + 1}. ${detection.resourceType}: ${detection.confidence.toFixed(1)}% confidence`);
                console.log(`     Reasoning: ${detection.reasoning}`);
                if (detection.indicators.length > 0) {
                    console.log(`     Indicators: ${detection.indicators.join(', ')}`);
                }
            }
            console.log('\n📊 Structure Analysis:');
            const structure = fullAnalysis.structureAnalysis;
            console.log(`  - Max Depth: ${structure.maxDepth}`);
            console.log(`  - Has Arrays: ${structure.hasArrays}`);
            console.log(`  - Has Nested Objects: ${structure.hasNestedObjects}`);
            console.log(`  - Field Count: ${structure.fieldCount}`);
            console.log(`  - Fields: ${structure.allFields.join(', ')}`);
            console.log(`\n🏆 Selected Resource Type: ${fullAnalysis.selectedResourceType}`);
            if (fullAnalysis.templateAnalysis) {
                const template = fullAnalysis.templateAnalysis.selected;
                console.log(`\n🎪 Best Template: ${template.templateName}`);
                console.log(`  - Confidence: ${template.confidence.toFixed(1)}%`);
                console.log(`  - Score: ${template.score}`);
                console.log(`  - Matches: ${template.matches.length}`);
                if (template.matches.length > 0) {
                    console.log('  - Field Matches:');
                    for (const match of template.matches) {
                        console.log(`    • ${match.field} → ${match.matched} (weight: ${match.weight})`);
                    }
                }
                if (template.missingRequired.length > 0) {
                    console.log(`  - Missing Required: ${template.missingRequired.join(', ')}`);
                }
                console.log('\n📈 Alternative Templates:');
                for (const alt of fullAnalysis.templateAnalysis.alternatives) {
                    console.log(`  - ${alt.templateName}: ${alt.confidence.toFixed(1)}% confidence`);
                }
            }
            console.log(`\n💡 Recommendation: ${fullAnalysis.recommendation}`);
        }
        catch (error) {
            console.log(`  ❌ Error: ${error}`);
        }
        console.log('\n' + '='.repeat(80) + '\n');
    }
    // Test with actual sample files
    console.log('📁 Testing with Sample Files:\n');
    const samplesDir = path.resolve('../../data/SampleData/Json/PatientExamples');
    if (await fs.pathExists(samplesDir)) {
        const files = await fs.readdir(samplesDir);
        for (const file of files.filter(f => f.endsWith('.json')).slice(0, 3)) {
            console.log(`📋 Testing Sample: ${file}`);
            try {
                const filePath = path.join(samplesDir, file);
                const content = await fs.readFile(filePath, 'utf8');
                const data = JSON.parse(content);
                const analysis = engine.analyzeJson(data);
                console.log(`  🎯 Detected: ${analysis.selectedResourceType} (${analysis.resourceDetection[0]?.confidence.toFixed(1) || 0}% confidence)`);
                if (analysis.templateAnalysis) {
                    console.log(`  🎪 Template: ${analysis.templateAnalysis.selected.templateName} (${analysis.templateAnalysis.selected.confidence.toFixed(1)}% confidence)`);
                }
                console.log(`  💡 ${analysis.recommendation}`);
            }
            catch (error) {
                console.log(`  ❌ Error: ${error}`);
            }
            console.log('');
        }
    }
    console.log('✅ Modular Template Engine Testing Complete!');
}
testModularEngine().catch(console.error);
