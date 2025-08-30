export interface FieldMatch {
  confidence: number;
  fhirPath: string;
  system?: string;
  valueType: 'string' | 'number' | 'boolean' | 'object' | 'array';
  transformer?: string;
  valueMap?: { [key: string]: any };
  use?: string;
  component?: string;
  code?: string;
  category?: string;
}

export interface DetectedField {
  path: string;
  value: any;
  matches: FieldMatch[];
  bestMatch: FieldMatch;
}

export class SemanticFieldDetector {
  private identifierPatterns = [
    { pattern: /\b(id|identifier|case|mrn|ssn|social|patient.*id|record.*id|chart.*id)\b/i, confidence: 0.9, system: 'medical-record' },
    { pattern: /\b(uuid|guid)\b/i, confidence: 0.95, system: 'uuid' },
    { pattern: /\b(passport|passport.*number|passport.*id)\b/i, confidence: 0.95, system: 'passport' },
    { pattern: /\b(driver.*license|dl|license.*number)\b/i, confidence: 0.9, system: 'drivers-license' },
    { pattern: /\b(employee.*id|staff.*id|badge.*id)\b/i, confidence: 0.85, system: 'employee-id' },
    { pattern: /\b(student.*id|school.*id|university.*id)\b/i, confidence: 0.85, system: 'student-id' },
    { pattern: /\b(insurance.*id|policy.*number|member.*id)\b/i, confidence: 0.85, system: 'insurance' }
  ];

  private namePatterns = [
    { pattern: /\b(name|full.*name|patient.*name|display.*name)\b/i, confidence: 0.9, use: 'official' },
    { pattern: /\b(first.*name|given.*name|forename)\b/i, confidence: 0.95, component: 'given' },
    { pattern: /\b(last.*name|family.*name|surname|lastname)\b/i, confidence: 0.95, component: 'family' },
    { pattern: /\b(middle.*name|middle.*initial)\b/i, confidence: 0.9, component: 'middle' },
    { pattern: /\b(nick.*name|alias|preferred.*name)\b/i, confidence: 0.85, use: 'nickname' },
    { pattern: /\b(maiden.*name|birth.*name)\b/i, confidence: 0.85, use: 'maiden' },
    { pattern: /\b(title|prefix|honorific)\b/i, confidence: 0.8, component: 'prefix' },
    { pattern: /\b(suffix|jr|sr|generation)\b/i, confidence: 0.8, component: 'suffix' }
  ];

  private genderPatterns = [
    { pattern: /\b(gender|sex|sexual.*identity)\b/i, confidence: 0.95 },
    { pattern: /\b(male|female|m|f|man|woman|other|unknown)\b/i, confidence: 0.7 }
  ];

  private agePatterns = [
    { pattern: /\b(age|age.*estimate|years.*old)\b/i, confidence: 0.9 },
    { pattern: /\b(birth.*date|dob|date.*of.*birth|born)\b/i, confidence: 0.95, type: 'birthDate' },
    { pattern: /\b(birth.*year|year.*born)\b/i, confidence: 0.85, type: 'birthDate' }
  ];

  private contactPatterns = [
    { pattern: /\b(phone|telephone|tel|mobile|cell|contact.*number)\b/i, confidence: 0.9, system: 'phone' },
    { pattern: /\b(email|e.*mail|mail|contact.*email)\b/i, confidence: 0.95, system: 'email' },
    { pattern: /\b(fax|facsimile)\b/i, confidence: 0.9, system: 'fax' },
    { pattern: /\b(website|url|web.*address|homepage)\b/i, confidence: 0.85, system: 'url' },
    { pattern: /\b(home.*phone|home.*number|residential)\b/i, confidence: 0.85, system: 'phone', use: 'home' },
    { pattern: /\b(work.*phone|office.*phone|business.*phone)\b/i, confidence: 0.85, system: 'phone', use: 'work' },
    { pattern: /\b(emergency.*phone|emergency.*contact)\b/i, confidence: 0.8, system: 'phone', use: 'temp' }
  ];

  private addressPatterns = [
    { pattern: /\b(address|addr|location|residence)\b/i, confidence: 0.9 },
    { pattern: /\b(street|street.*address|address.*line|line1)\b/i, confidence: 0.95, component: 'line' },
    { pattern: /\b(city|town|locality|municipality)\b/i, confidence: 0.95, component: 'city' },
    { pattern: /\b(state|province|region|county)\b/i, confidence: 0.9, component: 'state' },
    { pattern: /\b(zip|zipcode|postal.*code|postcode)\b/i, confidence: 0.95, component: 'postalCode' },
    { pattern: /\b(country|nation|country.*code)\b/i, confidence: 0.9, component: 'country' },
    { pattern: /\b(home.*address|residential.*address)\b/i, confidence: 0.85, use: 'home' },
    { pattern: /\b(work.*address|office.*address|business.*address)\b/i, confidence: 0.85, use: 'work' },
    { pattern: /\b(mailing.*address|postal.*address|shipping)\b/i, confidence: 0.8, type: 'postal' }
  ];

  private clinicalPatterns = [
    { pattern: /\b(vital|vitals|vital.*signs)\b/i, confidence: 0.9, category: 'vitals' },
    { pattern: /\b(heart.*rate|hr|pulse|bpm)\b/i, confidence: 0.95, code: '8867-4', system: 'http://loinc.org' },
    { pattern: /\b(blood.*pressure|bp|systolic|diastolic)\b/i, confidence: 0.95, code: '85354-9', system: 'http://loinc.org' },
    { pattern: /\b(temperature|temp|fever)\b/i, confidence: 0.9, code: '8310-5', system: 'http://loinc.org' },
    { pattern: /\b(respiratory.*rate|breathing.*rate|respiration)\b/i, confidence: 0.95, code: '9279-1', system: 'http://loinc.org' },
    { pattern: /\b(oxygen.*saturation|o2.*sat|spo2)\b/i, confidence: 0.95, code: '2708-6', system: 'http://loinc.org' },
    { pattern: /\b(weight|body.*weight|mass)\b/i, confidence: 0.9, code: '29463-7', system: 'http://loinc.org' },
    { pattern: /\b(height|body.*height|stature)\b/i, confidence: 0.9, code: '8302-2', system: 'http://loinc.org' }
  ];

  private emergencyPatterns = [
    { pattern: /\b(case.*id|incident.*id|emergency.*id|ems.*id)\b/i, confidence: 0.95, category: 'emergency' },
    { pattern: /\b(unidentified|unknown.*patient|anonymous)\b/i, confidence: 0.9, category: 'emergency' },
    { pattern: /\b(transport|transported.*to|destination|hospital)\b/i, confidence: 0.85, category: 'emergency' },
    { pattern: /\b(location|incident.*location|scene|coordinates|lat|lng|latitude|longitude)\b/i, confidence: 0.8, category: 'location' }
  ];

  public detectFields(json: any, basePath: string = ''): DetectedField[] {
    const detectedFields: DetectedField[] = [];
    
    this.traverseObject(json, basePath, detectedFields);
    
    // Sort by confidence and remove duplicates
    return this.consolidateFields(detectedFields);
  }

  private traverseObject(obj: any, currentPath: string, detected: DetectedField[]): void {
    if (obj === null || obj === undefined) return;

    if (typeof obj === 'object' && !Array.isArray(obj)) {
      // Handle nested objects
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        
        // Detect this field
        const matches = this.analyzeField(key, value, fullPath);
        if (matches.length > 0) {
          detected.push({
            path: fullPath,
            value: value,
            matches: matches,
            bestMatch: matches[0] // Highest confidence first
          });
        }

        // Recurse into nested objects and arrays
        if (typeof value === 'object' && value !== null) {
          this.traverseObject(value, fullPath, detected);
        }
      }
    } else if (Array.isArray(obj)) {
      // Handle arrays - check each element
      obj.forEach((item, index) => {
        if (typeof item === 'object') {
          this.traverseObject(item, `${currentPath}[${index}]`, detected);
        } else {
          // Handle primitive arrays by analyzing the parent field name
          const matches = this.analyzeField(currentPath.split('.').pop() || '', item, `${currentPath}[${index}]`);
          if (matches.length > 0) {
            detected.push({
              path: `${currentPath}[${index}]`,
              value: item,
              matches: matches,
              bestMatch: matches[0]
            });
          }
        }
      });
    }
  }

  private analyzeField(fieldName: string, value: any, fullPath: string): FieldMatch[] {
    const matches: FieldMatch[] = [];
    const valueType = this.getValueType(value);

    // Test against all pattern categories
    matches.push(...this.testPatterns(fieldName, value, this.identifierPatterns, 'identifier', valueType));
    matches.push(...this.testPatterns(fieldName, value, this.namePatterns, 'name', valueType));
    matches.push(...this.testPatterns(fieldName, value, this.genderPatterns, 'gender', valueType));
    matches.push(...this.testPatterns(fieldName, value, this.agePatterns, 'age', valueType));
    matches.push(...this.testPatterns(fieldName, value, this.contactPatterns, 'telecom', valueType));
    matches.push(...this.testPatterns(fieldName, value, this.addressPatterns, 'address', valueType));
    matches.push(...this.testPatterns(fieldName, value, this.clinicalPatterns, 'clinical', valueType));
    matches.push(...this.testPatterns(fieldName, value, this.emergencyPatterns, 'emergency', valueType));

    // Sort by confidence (highest first)
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  private testPatterns(fieldName: string, value: any, patterns: any[], category: string, valueType: 'string' | 'number' | 'boolean' | 'object' | 'array'): FieldMatch[] {
    const matches: FieldMatch[] = [];

    for (const pattern of patterns) {
      if (pattern.pattern.test(fieldName)) {
        let confidence = pattern.confidence;
        
        // Boost confidence based on value content
        if (category === 'gender' && typeof value === 'string') {
          const genderValue = value.toLowerCase();
          if (['male', 'female', 'other', 'unknown', 'm', 'f'].includes(genderValue)) {
            confidence += 0.1;
          }
        }

        // Create FHIR path based on category
        const fhirPath = this.generateFhirPath(category, pattern);
        
        matches.push({
          confidence,
          fhirPath,
          system: pattern.system,
          valueType,
          transformer: this.getTransformer(category, pattern),
          valueMap: this.getValueMap(category, pattern),
          use: pattern.use,
          component: pattern.component,
          code: pattern.code,
          category: pattern.category
        });
      }
    }

    return matches;
  }

  private generateFhirPath(category: string, pattern: any): string {
    switch (category) {
      case 'identifier':
        return 'identifier[0].value';
      case 'name':
        if (pattern.component === 'given') return 'name[0].given[0]';
        if (pattern.component === 'family') return 'name[0].family';
        if (pattern.component === 'prefix') return 'name[0].prefix[0]';
        if (pattern.component === 'suffix') return 'name[0].suffix[0]';
        return 'name[0].text';
      case 'gender':
        return 'gender';
      case 'age':
        return pattern.type === 'birthDate' ? 'birthDate' : 'extension[age].valueInteger';
      case 'telecom':
        return 'telecom[0].value';
      case 'address':
        if (pattern.component === 'line') return 'address[0].line[0]';
        if (pattern.component === 'city') return 'address[0].city';
        if (pattern.component === 'state') return 'address[0].state';
        if (pattern.component === 'postalCode') return 'address[0].postalCode';
        if (pattern.component === 'country') return 'address[0].country';
        return 'address[0].text';
      case 'clinical':
        return 'extension[vitals].extension[0].valueQuantity.value';
      case 'emergency':
        return 'extension[emergency].valueString';
      default:
        return `extension[${category}].valueString`;
    }
  }

  private getTransformer(category: string, pattern: any): string | undefined {
    if (category === 'gender') return 'normalizeGender';
    if (category === 'age' && pattern.type !== 'birthDate') return 'ageToEstimatedBirthDate';
    return undefined;
  }

  private getValueMap(category: string, pattern: any): { [key: string]: any } | undefined {
    if (category === 'gender') {
      return {
        'm': 'male', 'male': 'male', 'man': 'male',
        'f': 'female', 'female': 'female', 'woman': 'female',
        'o': 'other', 'other': 'other',
        'u': 'unknown', 'unknown': 'unknown', 'n/a': 'unknown'
      };
    }
    return undefined;
  }

  private getValueType(value: any): 'string' | 'number' | 'boolean' | 'object' | 'array' {
    if (Array.isArray(value)) return 'array';
    const type = typeof value;
    if (['string', 'number', 'boolean', 'object'].includes(type)) {
      return type as 'string' | 'number' | 'boolean' | 'object';
    }
    return 'string';
  }

  private consolidateFields(detected: DetectedField[]): DetectedField[] {
    // Remove duplicates and merge related fields
    const consolidated: { [path: string]: DetectedField } = {};
    
    for (const field of detected) {
      if (!consolidated[field.path] || field.bestMatch.confidence > consolidated[field.path].bestMatch.confidence) {
        consolidated[field.path] = field;
      }
    }

    return Object.values(consolidated);
  }

  public generateMappingConfig(detected: DetectedField[]): any {
    const config: {
      identifier: any[];
      name: { components: any; text?: string; given?: string; family?: string };
      demographics: { gender?: any };
      telecom: any[];
      address: any[];
      extensions: any[];
    } = {
      identifier: [],
      name: { components: {} },
      demographics: {},
      telecom: [],
      address: [],
      extensions: []
    };

    for (const field of detected) {
      const match = field.bestMatch;
      
      if (match.confidence < 0.6) continue; // Skip low-confidence matches

      if (match.fhirPath.startsWith('identifier')) {
        config.identifier.push({
          sourcePath: field.path,
          system: match.system || 'unknown',
          confidence: match.confidence
        });
      } else if (match.fhirPath.startsWith('name')) {
        if (match.fhirPath.includes('given')) {
          config.name.components.given = field.path;
        } else if (match.fhirPath.includes('family')) {
          config.name.components.family = field.path;
        } else {
          config.name.text = field.path;
        }
      } else if (match.fhirPath === 'gender') {
        config.demographics.gender = {
          sourcePath: field.path,
          valueMap: match.valueMap
        };
      } else if (match.fhirPath.startsWith('telecom')) {
        config.telecom.push({
          sourcePath: field.path,
          system: match.system,
          use: (match as any).use || 'home'
        });
      } else if (match.fhirPath.startsWith('address')) {
        config.address.push({
          sourcePath: field.path,
          component: match.fhirPath.split('.').pop(),
          use: (match as any).use || 'home'
        });
      } else {
        config.extensions.push({
          sourcePath: field.path,
          url: `http://example.org/fhir/extension/${field.path.replace(/\./g, '-')}`,
          valueType: match.valueType
        });
      }
    }

    return config;
  }
}