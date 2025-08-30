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
exports.IntelligentTemplateService = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const IntelligentTemplateGenerator_1 = require("../engines/IntelligentTemplateGenerator");
class IntelligentTemplateService {
    constructor() {
        this.templateCache = new Map();
        this.generator = new IntelligentTemplateGenerator_1.IntelligentTemplateGenerator();
        this.baseTemplatePath = path.resolve(process.cwd(), '../../data/Templates/Json');
    }
    static getInstance() {
        if (!IntelligentTemplateService.instance) {
            IntelligentTemplateService.instance = new IntelligentTemplateService();
        }
        return IntelligentTemplateService.instance;
    }
    async processIntelligentConversion(jsonInput) {
        try {
            // Generate hash for caching
            const inputHash = this.generateHash(JSON.stringify(jsonInput));
            const cacheKey = `intelligent_${inputHash}`;
            // Check if we already generated a template for similar input
            if (this.templateCache.has(cacheKey)) {
                console.log('Using cached intelligent template');
                return {
                    success: true,
                    template: this.templateCache.get(cacheKey),
                    analysis: { cached: true },
                    confidence: 1.0,
                    generatedTemplateName: `IntelligentTemplate_${inputHash.substring(0, 8)}`
                };
            }
            // Analyze input and generate template
            console.log('Analyzing input structure for intelligent template generation...');
            const result = this.generator.analyzeAndGenerate(jsonInput);
            if (result.confidence < 0.5) {
                return {
                    success: false,
                    template: '',
                    analysis: result.analysis,
                    confidence: result.confidence,
                    generatedTemplateName: '',
                    error: 'Low confidence in field detection. Manual template may be required.'
                };
            }
            // Generate unique template name
            const templateName = `IntelligentTemplate_${inputHash.substring(0, 8)}`;
            // Save generated template to filesystem
            const templatePath = path.join(this.baseTemplatePath, `${templateName}.liquid`);
            await fs.writeFile(templatePath, result.template, 'utf8');
            console.log(`Generated intelligent template: ${templateName}.liquid`);
            // Cache the template
            this.templateCache.set(cacheKey, result.template);
            // Try to convert using the generated template
            const fhirOutput = await this.testTemplate(templateName, jsonInput);
            return {
                success: true,
                template: result.template,
                analysis: result.analysis,
                confidence: result.confidence,
                generatedTemplateName: templateName,
                fhirOutput
            };
        }
        catch (error) {
            console.error('Error in intelligent template processing:', error);
            return {
                success: false,
                template: '',
                analysis: {},
                confidence: 0,
                generatedTemplateName: '',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async testTemplate(templateName, jsonInput) {
        try {
            const { spawn } = require('child_process');
            const inputFile = path.join(__dirname, '../temp', `test_${templateName}_input.json`);
            const outputFile = path.join(__dirname, '../temp', `test_${templateName}_output.json`);
            // Write test input file
            await fs.ensureDir(path.dirname(inputFile));
            await fs.writeFile(inputFile, JSON.stringify(jsonInput, null, 2));
            // Run FHIR converter with generated template
            const converterPath = path.resolve(process.cwd(), '../../src/Microsoft.Health.Fhir.Liquid.Converter.Tool/bin/Debug/net8.0/Microsoft.Health.Fhir.Liquid.Converter.Tool.exe');
            const templatesPath = path.resolve(process.cwd(), '../../data/Templates/Json');
            return new Promise((resolve, reject) => {
                const args = [
                    'convert',
                    '-d', templatesPath,
                    '-r', templateName,
                    '-n', inputFile,
                    '-f', outputFile
                ];
                const process = spawn(converterPath, args, {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    shell: true
                });
                let stdout = '';
                let stderr = '';
                process.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
                process.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
                process.on('close', async (code) => {
                    if (code === 0) {
                        try {
                            const outputContent = await fs.readFile(outputFile, 'utf8');
                            const result = JSON.parse(outputContent);
                            resolve(result.FhirResource || result);
                        }
                        catch (parseError) {
                            console.warn('Could not parse template test output:', parseError);
                            resolve({ converted: true, rawOutput: stdout });
                        }
                    }
                    else {
                        console.warn(`Template test failed with code ${code}:`, stderr);
                        resolve({ error: stderr, code });
                    }
                });
                process.on('error', (error) => {
                    reject(error);
                });
            });
        }
        catch (error) {
            console.warn('Template test error:', error);
            return { testError: error instanceof Error ? error.message : 'Unknown test error' };
        }
    }
    async getTemplateAnalysis(jsonInput) {
        const result = this.generator.analyzeAndGenerate(jsonInput);
        return {
            confidence: result.confidence,
            detectedFields: result.analysis.detectedFields,
            fieldBreakdown: result.analysis.fieldBreakdown,
            recommendations: this.generateRecommendations(result.analysis),
            preview: result.template.substring(0, 500) + '...'
        };
    }
    generateRecommendations(analysis) {
        const recommendations = [];
        if (analysis.detectedFields < 3) {
            recommendations.push('Input has few recognizable fields. Consider adding more standard field names.');
        }
        if (analysis.fieldBreakdown.some((f) => f.confidence < 0.7)) {
            recommendations.push('Some fields have low confidence detection. Manual template might be more accurate.');
        }
        if (analysis.context.identifiers.length === 0) {
            recommendations.push('No identifier fields detected. Patient resources should have unique identifiers.');
        }
        if (!analysis.context.name.given && !analysis.context.name.family && !analysis.context.name.text) {
            recommendations.push('No name fields detected. Consider adding patient name information.');
        }
        if (analysis.context.clinical.length > 0) {
            recommendations.push('Clinical data detected. Consider creating specialized clinical templates.');
        }
        if (analysis.context.emergency.length > 0) {
            recommendations.push('Emergency/EMS data detected. Template optimized for emergency care scenarios.');
        }
        return recommendations;
    }
    generateHash(input) {
        // Simple hash function for caching
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    async cleanupGeneratedTemplates() {
        try {
            const files = await fs.readdir(this.baseTemplatePath);
            const intelligentTemplates = files.filter(f => f.startsWith('IntelligentTemplate_') && f.endsWith('.liquid'));
            for (const template of intelligentTemplates) {
                await fs.unlink(path.join(this.baseTemplatePath, template));
                console.log(`Deleted: ${template}`);
            }
            this.templateCache.clear();
            console.log(`Cleaned up ${intelligentTemplates.length} generated templates`);
        }
        catch (error) {
            console.warn('Error cleaning up templates:', error);
        }
    }
    getTemplateCache() {
        return this.templateCache;
    }
    getCacheStats() {
        return {
            size: this.templateCache.size,
            templates: Array.from(this.templateCache.keys())
        };
    }
}
exports.IntelligentTemplateService = IntelligentTemplateService;
