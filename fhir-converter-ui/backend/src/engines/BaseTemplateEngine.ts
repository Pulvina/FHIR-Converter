export interface FieldMapping {
  fhirField: string;
  jsonPatterns: string[];
  weight: number;
  required: boolean;
  dataType: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
}

export interface TemplateMetadata {
  name: string;
  description: string;
  priority: number;
  resourceType: string; // Added to identify which FHIR resource this template is for
  fieldMappings: FieldMapping[];
  structurePatterns: {
    maxDepth: number;
    hasArrays: boolean;
    hasNestedObjects: boolean;
    expectedFields: string[];
  };
}

export interface TemplateScore {
  templateName: string;
  resourceType: string;
  score: number;
  confidence: number;
  matches: Array<{
    field: string;
    matched: string;
    weight: number;
  }>;
  missingRequired: string[];
}

export interface StructureAnalysis {
  maxDepth: number;
  hasArrays: boolean;
  hasNestedObjects: boolean;
  fieldCount: number;
  allFields: string[];
}

export interface TemplateSelection {
  selected: TemplateScore;
  alternatives: TemplateScore[];
  recommendation: string;
}

/**
 * Base abstract class for all resource-specific template engines
 */
export abstract class BaseTemplateEngine {
  protected templates: Map<string, TemplateMetadata> = new Map();
  protected fieldSynonyms: Map<string, string[]> = new Map();
  protected abstract resourceType: string;

  constructor() {
    this.initializeFieldSynonyms();
    this.loadTemplateMetadata();
  }

  /**
   * Initialize field synonyms specific to this resource type
   */
  protected abstract initializeFieldSynonyms(): void;

  /**
   * Load template metadata specific to this resource type
   */
  protected abstract loadTemplateMetadata(): void;

  /**
   * Check if this engine can handle the given JSON data
   */
  public abstract canHandle(jsonData: any): boolean;

  /**
   * Get the resource type this engine handles
   */
  public getResourceType(): string {
    return this.resourceType;
  }

  /**
   * Analyze the structure of JSON data
   */
  public analyzeStructure(jsonData: any): StructureAnalysis {
    const analysis: StructureAnalysis = {
      maxDepth: 0,
      hasArrays: false,
      hasNestedObjects: false,
      fieldCount: 0,
      allFields: []
    };

    const traverse = (obj: any, path: string = '', depth: number = 0) => {
      analysis.maxDepth = Math.max(analysis.maxDepth, depth);

      if (Array.isArray(obj)) {
        analysis.hasArrays = true;
        obj.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            traverse(item, `${path}[${index}]`, depth);
          }
        });
      } else if (typeof obj === 'object' && obj !== null) {
        if (depth > 0) {
          analysis.hasNestedObjects = true;
        }
        
        Object.keys(obj).forEach(key => {
          const fieldPath = path ? `${path}.${key}` : key;
          analysis.allFields.push(fieldPath);
          analysis.fieldCount++;
          
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            traverse(obj[key], fieldPath, depth + 1);
          }
        });
      }
    };

    traverse(jsonData);
    return analysis;
  }

  /**
   * Find field value from JSON using pattern matching
   */
  public findFieldValue(jsonData: any, patterns: string[]): any {
    for (const pattern of patterns) {
      const value = this.getNestedValue(jsonData, pattern);
      if (value !== undefined && value !== null) {
        return value;
      }
    }
    return null;
  }

  /**
   * Get nested value from object using dot notation path
   */
  protected getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Score all templates against the given JSON data
   */
  public scoreTemplates(jsonData: any): TemplateScore[] {
    const structure = this.analyzeStructure(jsonData);
    const scores: TemplateScore[] = [];

    for (const [templateName, template] of this.templates) {
      let totalScore = 0;
      let maxPossibleScore = 0;
      const matches: Array<{ field: string; matched: string; weight: number }> = [];
      const missingRequired: string[] = [];

      // Structure compatibility score (20% of total)
      let structureScore = 0;
      const structureWeight = 20;

      // Check depth compatibility
      if (structure.maxDepth <= template.structurePatterns.maxDepth) {
        structureScore += 5;
      }

      // Check array/object patterns
      if (structure.hasArrays === template.structurePatterns.hasArrays) {
        structureScore += 5;
      }
      if (structure.hasNestedObjects === template.structurePatterns.hasNestedObjects) {
        structureScore += 5;
      }

      // Check for expected fields
      const foundExpectedFields = template.structurePatterns.expectedFields.filter(
        field => structure.allFields.some(f => f.includes(field))
      );
      structureScore += (foundExpectedFields.length / template.structurePatterns.expectedFields.length) * 5;

      totalScore += structureScore;
      maxPossibleScore += structureWeight;

      // Field mapping score (80% of total)
      for (const mapping of template.fieldMappings) {
        const foundValue = this.findFieldValue(jsonData, mapping.jsonPatterns);
        maxPossibleScore += mapping.weight;

        if (foundValue !== null) {
          const matchedPattern = mapping.jsonPatterns.find(pattern => 
            this.getNestedValue(jsonData, pattern) !== undefined
          );
          
          totalScore += mapping.weight;
          matches.push({
            field: mapping.fhirField,
            matched: matchedPattern || 'unknown',
            weight: mapping.weight
          });
        } else if (mapping.required) {
          missingRequired.push(mapping.fhirField);
          // Penalize heavily for missing required fields
          totalScore -= mapping.weight * 2;
        }
      }

      // Calculate confidence percentage
      const confidence = Math.max(0, Math.min(100, (totalScore / maxPossibleScore) * 100));

      scores.push({
        templateName,
        resourceType: this.resourceType,
        score: totalScore,
        confidence,
        matches,
        missingRequired
      });
    }

    // Sort by score descending
    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Select the best template for the given JSON data
   */
  public selectBestTemplate(jsonData: any): TemplateSelection {
    const scores = this.scoreTemplates(jsonData);
    const best = scores[0];
    const alternatives = scores.slice(1, 3); // Top 3 alternatives

    let recommendation = '';
    
    if (best.confidence >= 80) {
      recommendation = `High confidence match with ${best.templateName}`;
    } else if (best.confidence >= 60) {
      recommendation = `Moderate confidence match with ${best.templateName}. Consider reviewing field mappings.`;
    } else if (best.confidence >= 40) {
      recommendation = `Low confidence match. ${best.templateName} selected but manual review recommended.`;
    } else {
      recommendation = `Very low confidence. Consider creating a custom template or check data format.`;
    }

    if (best.missingRequired.length > 0) {
      recommendation += ` Missing required fields: ${best.missingRequired.join(', ')}.`;
    }

    return {
      selected: best,
      alternatives,
      recommendation
    };
  }

  /**
   * Get all available template names
   */
  public getTemplateNames(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Get metadata for a specific template
   */
  public getTemplateMetadata(templateName: string): TemplateMetadata | undefined {
    return this.templates.get(templateName);
  }
}