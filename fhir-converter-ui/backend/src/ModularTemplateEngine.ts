import { BaseTemplateEngine, TemplateScore, TemplateSelection, StructureAnalysis } from './engines/BaseTemplateEngine';
import { PatientTemplateEngine } from './engines/PatientTemplateEngine';
import { ResourceTypeDetector, ResourceDetectionResult } from './engines/ResourceTypeDetector';

export interface ModularAnalysisResult {
  resourceDetection: ResourceDetectionResult[];
  selectedResourceType: string;
  templateAnalysis: TemplateSelection | null;
  structureAnalysis: StructureAnalysis;
  recommendation: string;
}

/**
 * Main modular template engine that orchestrates resource type detection
 * and delegates to specialized engines for template matching
 */
export class ModularTemplateEngine {
  private detector: ResourceTypeDetector;
  private engines: Map<string, BaseTemplateEngine> = new Map();

  constructor() {
    this.detector = new ResourceTypeDetector();
    this.initializeEngines();
  }

  /**
   * Initialize and register all specialized template engines
   */
  private initializeEngines(): void {
    // Register Patient engine
    const patientEngine = new PatientTemplateEngine();
    this.engines.set('Patient', patientEngine);
    this.detector.registerEngine('Patient', patientEngine);

    // TODO: Add more engines here as we create them
    // const observationEngine = new ObservationTemplateEngine();
    // this.engines.set('Observation', observationEngine);
    // this.detector.registerEngine('Observation', observationEngine);
  }

  /**
   * Perform comprehensive analysis of JSON data
   */
  public analyzeJson(jsonData: any): ModularAnalysisResult {
    // Step 1: Detect resource type
    const resourceDetection = this.detector.detectResourceType(jsonData);
    const bestMatch = resourceDetection[0];

    // Step 2: Get structure analysis
    const structureAnalysis = this.getStructureAnalysis(jsonData);

    // Step 3: Get template analysis from the appropriate engine
    let templateAnalysis: TemplateSelection | null = null;
    let selectedResourceType = 'Unknown';
    let recommendation = '';

    if (bestMatch && bestMatch.confidence > 0) {
      selectedResourceType = bestMatch.resourceType;
      const engine = this.engines.get(selectedResourceType);
      
      if (engine) {
        templateAnalysis = engine.selectBestTemplate(jsonData);
        recommendation = `Detected as ${selectedResourceType} resource (${bestMatch.confidence.toFixed(1)}% confidence). ${templateAnalysis.recommendation}`;
      } else {
        recommendation = `Detected as ${selectedResourceType} resource, but no template engine available.`;
      }
    } else {
      recommendation = 'Could not determine resource type. Consider adding support for this data format.';
    }

    return {
      resourceDetection,
      selectedResourceType,
      templateAnalysis,
      structureAnalysis,
      recommendation
    };
  }

  /**
   * Quick template selection (backwards compatibility)
   */
  public selectBestTemplate(jsonData: any): TemplateSelection {
    const analysis = this.analyzeJson(jsonData);
    
    if (analysis.templateAnalysis) {
      return analysis.templateAnalysis;
    }

    // Fallback for unknown resource types
    return {
      selected: {
        templateName: 'Unknown',
        resourceType: 'Unknown',
        score: 0,
        confidence: 0,
        matches: [],
        missingRequired: []
      },
      alternatives: [],
      recommendation: analysis.recommendation
    };
  }

  /**
   * Score templates using the appropriate engine
   */
  public scoreTemplates(jsonData: any): TemplateScore[] {
    const bestMatch = this.detector.getBestMatch(jsonData);
    
    if (bestMatch && bestMatch.confidence > 0) {
      const engine = this.engines.get(bestMatch.resourceType);
      if (engine) {
        return engine.scoreTemplates(jsonData);
      }
    }

    // Return empty scores if no appropriate engine found
    return [];
  }

  /**
   * Analyze structure (delegates to base implementation)
   */
  public analyzeStructure(jsonData: any): StructureAnalysis {
    return this.getStructureAnalysis(jsonData);
  }

  /**
   * Get structure analysis using base implementation
   */
  private getStructureAnalysis(jsonData: any): StructureAnalysis {
    // Use Patient engine for structure analysis (they all have the same implementation)
    const patientEngine = this.engines.get('Patient');
    if (patientEngine) {
      return patientEngine.analyzeStructure(jsonData);
    }

    // Fallback implementation
    return {
      maxDepth: 0,
      hasArrays: false,
      hasNestedObjects: false,
      fieldCount: 0,
      allFields: []
    };
  }

  /**
   * Get all available template names across all engines
   */
  public getTemplateNames(): string[] {
    const templates: string[] = [];
    for (const engine of this.engines.values()) {
      templates.push(...engine.getTemplateNames());
    }
    return templates;
  }

  /**
   * Get all supported resource types
   */
  public getSupportedResourceTypes(): string[] {
    return Array.from(this.engines.keys());
  }

  /**
   * Get engine for specific resource type
   */
  public getEngine(resourceType: string): BaseTemplateEngine | undefined {
    return this.engines.get(resourceType);
  }

  /**
   * Check if a resource type is supported
   */
  public isResourceTypeSupported(resourceType: string): boolean {
    return this.engines.has(resourceType);
  }
}