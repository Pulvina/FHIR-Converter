import * as fs from 'fs-extra';
import * as path from 'path';
import { IntelligentTemplateGenerator } from '../engines/IntelligentTemplateGenerator';

export interface IntelligentConversion {
  success: boolean;
  template: string;
  analysis: any;
  confidence: number;
  generatedTemplateName: string;
  fhirOutput?: any;
  error?: string;
}

export class IntelligentTemplateService {
  private static instance: IntelligentTemplateService;
  private generator: IntelligentTemplateGenerator;
  private templateCache: Map<string, string> = new Map();
  private baseTemplatePath: string;

  private constructor() {
    this.generator = new IntelligentTemplateGenerator();
    this.baseTemplatePath = path.resolve(process.cwd(), '../../data/Templates/Json');
  }

  public static getInstance(): IntelligentTemplateService {
    if (!IntelligentTemplateService.instance) {
      IntelligentTemplateService.instance = new IntelligentTemplateService();
    }
    return IntelligentTemplateService.instance;
  }

  public async processIntelligentConversion(jsonInput: any): Promise<IntelligentConversion> {
    try {
      // Generate hash for caching
      const inputHash = this.generateHash(JSON.stringify(jsonInput));
      const cacheKey = `intelligent_${inputHash}`;

      // Check if we already generated a template for similar input
      if (this.templateCache.has(cacheKey)) {
        console.log('Using cached intelligent template');
        return {
          success: true,
          template: this.templateCache.get(cacheKey)!,
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

    } catch (error) {
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

  private async testTemplate(templateName: string, jsonInput: any): Promise<any> {
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

        process.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        process.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        process.on('close', async (code: number) => {
          if (code === 0) {
            try {
              const outputContent = await fs.readFile(outputFile, 'utf8');
              const result = JSON.parse(outputContent);
              resolve(result.FhirResource || result);
            } catch (parseError) {
              console.warn('Could not parse template test output:', parseError);
              resolve({ converted: true, rawOutput: stdout });
            }
          } else {
            console.warn(`Template test failed with code ${code}:`, stderr);
            resolve({ error: stderr, code });
          }
        });

        process.on('error', (error: Error) => {
          reject(error);
        });
      });

    } catch (error) {
      console.warn('Template test error:', error);
      return { testError: error instanceof Error ? error.message : 'Unknown test error' };
    }
  }

  public async getTemplateAnalysis(jsonInput: any): Promise<any> {
    const result = this.generator.analyzeAndGenerate(jsonInput);
    return {
      confidence: result.confidence,
      detectedFields: result.analysis.detectedFields,
      fieldBreakdown: result.analysis.fieldBreakdown,
      recommendations: this.generateRecommendations(result.analysis),
      preview: result.template.substring(0, 500) + '...'
    };
  }

  private generateRecommendations(analysis: any): string[] {
    const recommendations: string[] = [];
    
    if (analysis.detectedFields < 3) {
      recommendations.push('Input has few recognizable fields. Consider adding more standard field names.');
    }
    
    if (analysis.fieldBreakdown.some((f: any) => f.confidence < 0.7)) {
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

  private generateHash(input: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  public async cleanupGeneratedTemplates(): Promise<void> {
    try {
      const files = await fs.readdir(this.baseTemplatePath);
      const intelligentTemplates = files.filter(f => f.startsWith('IntelligentTemplate_') && f.endsWith('.liquid'));
      
      for (const template of intelligentTemplates) {
        await fs.unlink(path.join(this.baseTemplatePath, template));
        console.log(`Deleted: ${template}`);
      }
      
      this.templateCache.clear();
      console.log(`Cleaned up ${intelligentTemplates.length} generated templates`);
    } catch (error) {
      console.warn('Error cleaning up templates:', error);
    }
  }

  public getTemplateCache(): Map<string, string> {
    return this.templateCache;
  }

  public getCacheStats(): { size: number; templates: string[] } {
    return {
      size: this.templateCache.size,
      templates: Array.from(this.templateCache.keys())
    };
  }
}