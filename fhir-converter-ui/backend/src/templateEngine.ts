import * as fs from 'fs';
import * as path from 'path';

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
  score: number;
  confidence: number;
  matches: Array<{
    field: string;
    matched: string;
    weight: number;
  }>;
  missingRequired: string[];
}

export class TemplateDetectionEngine {
  private templates: Map<string, TemplateMetadata> = new Map();
  private fieldSynonyms: Map<string, string[]> = new Map();

  constructor() {
    this.initializeFieldSynonyms();
    this.loadTemplateMetadata();
  }

  private initializeFieldSynonyms(): void {
    // Common field name variations
    this.fieldSynonyms.set('firstName', [
      'firstName', 'first_name', 'fname', 'givenName', 'given_name', 
      'forename', 'FirstName', 'FIRST_NAME', 'given'
    ]);
    
    this.fieldSynonyms.set('lastName', [
      'lastName', 'last_name', 'lname', 'surname', 'familyName', 
      'family_name', 'LastName', 'LAST_NAME', 'family'
    ]);
    
    this.fieldSynonyms.set('dateOfBirth', [
      'dateOfBirth', 'dob', 'DOB', 'birthDate', 'birth_date', 
      'birthdate', 'date_of_birth', 'DateOfBirth', 'BIRTH_DATE'
    ]);
    
    this.fieldSynonyms.set('gender', [
      'gender', 'sex', 'Gender', 'SEX', 'patient_gender', 'patientGender'
    ]);
    
    this.fieldSynonyms.set('patientId', [
      'patientId', 'patient_id', 'id', 'ID', 'PatientId', 'PATIENT_ID',
      'mrn', 'MRN', 'medical_record_number', 'medicalRecordNumber'
    ]);
    
    this.fieldSynonyms.set('phoneNumber', [
      'phoneNumber', 'phone_number', 'phone', 'telephone', 'tel', 
      'PhoneNumber', 'PHONE_NUMBER', 'contact_number', 'contactNumber'
    ]);
    
    this.fieldSynonyms.set('email', [
      'email', 'emailAddress', 'email_address', 'Email', 'EMAIL_ADDRESS'
    ]);
    
    this.fieldSynonyms.set('address', [
      'address', 'Address', 'ADDRESS', 'street_address', 'streetAddress'
    ]);
  }

  private loadTemplateMetadata(): void {
    // For now, we'll define templates inline. Later these can be loaded from JSON files
    
    // Basic flat structure template
    this.templates.set('PatientBasic', {
      name: 'PatientBasic',
      description: 'Simple flat JSON structure with basic patient fields',
      priority: 1,
      structurePatterns: {
        maxDepth: 1,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['firstName', 'lastName', 'patientId']
      },
      fieldMappings: [
        {
          fhirField: 'name.given',
          jsonPatterns: this.fieldSynonyms.get('firstName') || [],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'name.family',
          jsonPatterns: this.fieldSynonyms.get('lastName') || [],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'id',
          jsonPatterns: this.fieldSynonyms.get('patientId') || [],
          weight: 8,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'birthDate',
          jsonPatterns: this.fieldSynonyms.get('dateOfBirth') || [],
          weight: 7,
          required: false,
          dataType: 'date'
        },
        {
          fhirField: 'gender',
          jsonPatterns: this.fieldSynonyms.get('gender') || [],
          weight: 5,
          required: false,
          dataType: 'string'
        },
        {
          fhirField: 'telecom',
          jsonPatterns: this.fieldSynonyms.get('phoneNumber') || [],
          weight: 3,
          required: false,
          dataType: 'string'
        }
      ]
    });

    // Nested structure template
    this.templates.set('PatientNested', {
      name: 'PatientNested',
      description: 'Nested JSON structure with objects and arrays',
      priority: 2,
      structurePatterns: {
        maxDepth: 3,
        hasArrays: true,
        hasNestedObjects: true,
        expectedFields: ['patient', 'name', 'contact']
      },
      fieldMappings: [
        {
          fhirField: 'name.given',
          jsonPatterns: ['patient.name.first', 'name.first', 'patient.firstName', 'name.given'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'name.family',
          jsonPatterns: ['patient.name.last', 'name.last', 'patient.lastName', 'name.family'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'id',
          jsonPatterns: ['patient.id', 'patient.patientId', 'id', 'patientInfo.id'],
          weight: 8,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'telecom',
          jsonPatterns: ['contact.phone', 'patient.contact.phone', 'contact.phoneNumbers', 'phoneNumbers'],
          weight: 5,
          required: false,
          dataType: 'array'
        }
      ]
    });

    // EHR-style template
    this.templates.set('PatientEHR', {
      name: 'PatientEHR',
      description: 'EHR-style JSON with medical identifiers and codes',
      priority: 3,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: true,
        hasNestedObjects: true,
        expectedFields: ['mrn', 'identifiers', 'demographics']
      },
      fieldMappings: [
        {
          fhirField: 'identifier',
          jsonPatterns: ['mrn', 'MRN', 'identifiers', 'medicalRecordNumber'],
          weight: 12,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'name.given',
          jsonPatterns: ['demographics.firstName', 'name.first', 'patientName.first'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'name.family',
          jsonPatterns: ['demographics.lastName', 'name.last', 'patientName.last'],
          weight: 10,
          required: true,
          dataType: 'string'
        }
      ]
    });
  }

  public analyzeStructure(jsonData: any): {
    maxDepth: number;
    hasArrays: boolean;
    hasNestedObjects: boolean;
    fieldCount: number;
    allFields: string[];
  } {
    const analysis = {
      maxDepth: 0,
      hasArrays: false,
      hasNestedObjects: false,
      fieldCount: 0,
      allFields: [] as string[]
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

  public findFieldValue(jsonData: any, patterns: string[]): any {
    for (const pattern of patterns) {
      const value = this.getNestedValue(jsonData, pattern);
      if (value !== undefined && value !== null) {
        return value;
      }
    }
    return null;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

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
        score: totalScore,
        confidence,
        matches,
        missingRequired
      });
    }

    // Sort by score descending
    return scores.sort((a, b) => b.score - a.score);
  }

  public selectBestTemplate(jsonData: any): {
    selected: TemplateScore;
    alternatives: TemplateScore[];
    recommendation: string;
  } {
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

  public getTemplateNames(): string[] {
    return Array.from(this.templates.keys());
  }

  public getTemplateMetadata(templateName: string): TemplateMetadata | undefined {
    return this.templates.get(templateName);
  }
}