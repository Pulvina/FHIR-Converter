import { BaseTemplateEngine } from './BaseTemplateEngine';

export interface ResourceDetectionResult {
  resourceType: string;
  confidence: number;
  indicators: string[];
  reasoning: string;
}

/**
 * Detects the FHIR resource type from JSON data structure and content
 */
export class ResourceTypeDetector {
  private engines: Map<string, BaseTemplateEngine> = new Map();

  /**
   * Register a template engine for a specific resource type
   */
  public registerEngine(resourceType: string, engine: BaseTemplateEngine): void {
    this.engines.set(resourceType, engine);
  }

  /**
   * Detect the most likely resource type from JSON data
   */
  public detectResourceType(jsonData: any): ResourceDetectionResult[] {
    if (!jsonData || typeof jsonData !== 'object') {
      return [{
        resourceType: 'Unknown',
        confidence: 0,
        indicators: [],
        reasoning: 'Invalid or empty JSON data'
      }];
    }

    // Check for explicit FHIR resourceType field
    if (jsonData.resourceType && typeof jsonData.resourceType === 'string') {
      return [{
        resourceType: jsonData.resourceType,
        confidence: 100,
        indicators: ['resourceType field'],
        reasoning: `Explicit FHIR resourceType field found: ${jsonData.resourceType}`
      }];
    }

    const results: ResourceDetectionResult[] = [];

    // Check each registered engine
    for (const [resourceType, engine] of this.engines) {
      if (engine.canHandle(jsonData)) {
        const templateScores = engine.scoreTemplates(jsonData);
        const bestScore = templateScores[0];
        
        if (bestScore && bestScore.confidence > 0) {
          results.push({
            resourceType,
            confidence: bestScore.confidence,
            indicators: bestScore.matches.map(m => m.matched),
            reasoning: `Template engine for ${resourceType} found ${bestScore.matches.length} field matches with ${bestScore.confidence.toFixed(1)}% confidence`
          });
        }
      }
    }

    // Sort by confidence descending
    results.sort((a, b) => b.confidence - a.confidence);

    // If no engines can handle it, return unknown
    if (results.length === 0) {
      results.push({
        resourceType: 'Unknown',
        confidence: 0,
        indicators: [],
        reasoning: 'No registered template engines can handle this JSON structure'
      });
    }

    return results;
  }

  /**
   * Get the best matching resource type
   */
  public getBestMatch(jsonData: any): ResourceDetectionResult {
    const results = this.detectResourceType(jsonData);
    return results[0];
  }

  /**
   * Get all registered resource types
   */
  public getRegisteredResourceTypes(): string[] {
    return Array.from(this.engines.keys());
  }

  /**
   * Get engine for a specific resource type
   */
  public getEngine(resourceType: string): BaseTemplateEngine | undefined {
    return this.engines.get(resourceType);
  }

  /**
   * Check if a resource type is supported
   */
  public isSupported(resourceType: string): boolean {
    return this.engines.has(resourceType);
  }
}