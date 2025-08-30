import * as fs from 'fs';
import * as path from 'path';

export interface ValuesetConcept {
  code: string;
  display: string;
  definition?: string;
}

export interface Valueset {
  id?: string;
  url?: string;
  name?: string;
  title?: string;
  status?: string;
  compose?: {
    include: Array<{
      system: string;
      concept?: ValuesetConcept[];
    }>;
  };
  expansion?: {
    contains: ValuesetConcept[];
  };
  // Support for custom format
  [key: string]: any;
}

export class ValuesetLoader {
  private valuesets: Map<string, Valueset> = new Map();
  private codesystems: Map<string, any> = new Map();
  private valuesetPath: string;
  private codesystemPath: string;

  constructor() {
    this.valuesetPath = path.join(process.cwd(), '../../data/Valuesets/ValueSets');
    this.codesystemPath = path.join(process.cwd(), '../../data/Valuesets/CodeSystems');
    this.loadValuesets();
    this.loadCodesystems();
  }

  private loadValuesets(): void {
    try {
      if (fs.existsSync(this.valuesetPath)) {
        const files = fs.readdirSync(this.valuesetPath);
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const filePath = path.join(this.valuesetPath, file);
              const content = fs.readFileSync(filePath, 'utf8');
              const valueset: Valueset = JSON.parse(content);
              this.valuesets.set(valueset.id || file.replace('.json', ''), valueset);
              console.log(`Loaded valueset: ${valueset.id || file}`);
            } catch (error) {
              console.warn(`Failed to load valueset ${file}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load valuesets directory:', error);
    }
  }

  private loadCodesystems(): void {
    try {
      if (fs.existsSync(this.codesystemPath)) {
        const files = fs.readdirSync(this.codesystemPath);
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const filePath = path.join(this.codesystemPath, file);
              const content = fs.readFileSync(filePath, 'utf8');
              const codesystem = JSON.parse(content);
              this.codesystems.set(codesystem.id || file.replace('.json', ''), codesystem);
              console.log(`Loaded codesystem: ${codesystem.id || file}`);
            } catch (error) {
              console.warn(`Failed to load codesystem ${file}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load codesystems directory:', error);
    }
  }

  public getValidCodes(valuesetId: string): string[] {
    const valueset = this.valuesets.get(valuesetId);
    if (!valueset) {
      return [];
    }

    const codes: string[] = [];

    // Try expansion first
    if (valueset.expansion?.contains) {
      codes.push(...valueset.expansion.contains.map(c => c.code));
    }

    // Try compose include
    if (valueset.compose?.include) {
      for (const include of valueset.compose.include) {
        if (include.concept) {
          codes.push(...include.concept.map(c => c.code));
        }
      }
    }

    // Handle custom format (e.g., administrativeGender array)
    for (const key in valueset) {
      if (Array.isArray(valueset[key])) {
        const concepts = valueset[key] as any[];
        for (const concept of concepts) {
          if (concept.code) {
            codes.push(concept.code);
          }
        }
      }
    }

    return codes;
  }

  public isValidCode(valuesetId: string, code: string): boolean {
    const validCodes = this.getValidCodes(valuesetId);
    return validCodes.includes(code);
  }

  public getDisplayForCode(valuesetId: string, code: string): string | undefined {
    const valueset = this.valuesets.get(valuesetId);
    if (!valueset) {
      return undefined;
    }

    // Check expansion
    if (valueset.expansion?.contains) {
      const concept = valueset.expansion.contains.find(c => c.code === code);
      if (concept) {
        return concept.display;
      }
    }

    // Check compose include
    if (valueset.compose?.include) {
      for (const include of valueset.compose.include) {
        if (include.concept) {
          const concept = include.concept.find(c => c.code === code);
          if (concept) {
            return concept.display;
          }
        }
      }
    }

    // Handle custom format
    for (const key in valueset) {
      if (Array.isArray(valueset[key])) {
        const concepts = valueset[key] as any[];
        for (const concept of concepts) {
          if (concept.code === code) {
            return concept.display;
          }
        }
      }
    }

    return undefined;
  }

  // Helper methods for common valuesets
  public getNameUseCodes(): string[] {
    return this.getValidCodes('name-use');
  }

  public getContactPointSystemCodes(): string[] {
    return this.getValidCodes('contact-point-system');
  }

  public getContactPointUseCodes(): string[] {
    return this.getValidCodes('contact-point-use');
  }

  public getAddressUseCodes(): string[] {
    return this.getValidCodes('address-use');
  }

  public getAddressTypeCodes(): string[] {
    return this.getValidCodes('address-type');
  }

  public getAdministrativeGenderCodes(): string[] {
    return this.getValidCodes('administrative-gender');
  }

  public getMaritalStatusCodes(): string[] {
    return this.getValidCodes('marital-status');
  }

  // Validation methods
  public validateNameUse(code: string): boolean {
    return this.isValidCode('name-use', code);
  }

  public validateContactPointSystem(code: string): boolean {
    return this.isValidCode('contact-point-system', code);
  }

  public validateContactPointUse(code: string): boolean {
    return this.isValidCode('contact-point-use', code);
  }

  public validateAddressUse(code: string): boolean {
    return this.isValidCode('address-use', code);
  }

  public validateAddressType(code: string): boolean {
    return this.isValidCode('address-type', code);
  }

  public validateGender(code: string): boolean {
    return this.isValidCode('administrative-gender', code);
  }

  public validateMaritalStatus(code: string): boolean {
    return this.isValidCode('marital-status', code);
  }

  // Get default values
  public getDefaultNameUse(): string {
    const codes = this.getNameUseCodes();
    return codes.includes('official') ? 'official' : codes[0] || 'official';
  }

  public getDefaultContactPointUse(): string {
    const codes = this.getContactPointUseCodes();
    return codes.includes('home') ? 'home' : codes[0] || 'home';
  }

  public getDefaultAddressUse(): string {
    const codes = this.getAddressUseCodes();
    return codes.includes('home') ? 'home' : codes[0] || 'home';
  }

  public normalizeGender(input: string): string {
    const lower = input.toLowerCase();
    const genderCodes = this.getAdministrativeGenderCodes();
    
    // Direct match
    if (genderCodes.includes(lower)) {
      return lower;
    }

    // Common mappings
    if (lower === 'm' || lower === 'male') {
      return genderCodes.includes('male') ? 'male' : 'unknown';
    }
    if (lower === 'f' || lower === 'female') {
      return genderCodes.includes('female') ? 'female' : 'unknown';
    }
    if (lower === 'o' || lower === 'other') {
      return genderCodes.includes('other') ? 'other' : 'unknown';
    }

    return genderCodes.includes('unknown') ? 'unknown' : genderCodes[0] || 'unknown';
  }

  public normalizeContactPointSystem(input: string): string {
    const lower = input.toLowerCase();
    const systemCodes = this.getContactPointSystemCodes();

    // Direct match
    if (systemCodes.includes(lower)) {
      return lower;
    }

    // Common mappings
    if (lower === 'telephone' || lower === 'tel') {
      return systemCodes.includes('phone') ? 'phone' : 'other';
    }

    return systemCodes.includes('other') ? 'other' : systemCodes[0] || 'other';
  }
}