import { ValuesetLoader } from '../utils/ValuesetLoader';

export class ValuesetService {
  private static instance: ValuesetService;
  private valuesetLoader: ValuesetLoader;

  private constructor() {
    this.valuesetLoader = new ValuesetLoader();
  }

  public static getInstance(): ValuesetService {
    if (!ValuesetService.instance) {
      ValuesetService.instance = new ValuesetService();
    }
    return ValuesetService.instance;
  }

  // Gender normalization with valueset validation
  public normalizeGender(input: string): string {
    if (!input) return 'unknown';
    
    const lower = input.toLowerCase().trim();
    const validCodes = this.valuesetLoader.getAdministrativeGenderCodes();
    
    // Direct match
    if (validCodes.includes(lower)) {
      return lower;
    }

    // Common mappings
    const mappings: { [key: string]: string } = {
      'm': 'male',
      'male': 'male',
      'man': 'male',
      'f': 'female', 
      'female': 'female',
      'woman': 'female',
      'o': 'other',
      'other': 'other',
      'u': 'unknown',
      'unknown': 'unknown',
      'n/a': 'unknown',
      'na': 'unknown',
      'null': 'unknown',
      '': 'unknown'
    };

    const mapped = mappings[lower];
    if (mapped && validCodes.includes(mapped)) {
      return mapped;
    }

    return 'unknown';
  }

  // Name use normalization
  public normalizeNameUse(input: string): string {
    if (!input) return 'official';
    
    const lower = input.toLowerCase().trim();
    const validCodes = this.valuesetLoader.getNameUseCodes();
    
    // Direct match
    if (validCodes.includes(lower)) {
      return lower;
    }

    // Common mappings
    const mappings: { [key: string]: string } = {
      'legal': 'official',
      'primary': 'official',
      'main': 'official',
      'nick': 'nickname',
      'preferred': 'usual',
      'common': 'usual',
      'maiden': 'maiden',
      'birth': 'maiden',
      'temporary': 'temp',
      'old': 'old',
      'anonymous': 'anonymous'
    };

    const mapped = mappings[lower];
    if (mapped && validCodes.includes(mapped)) {
      return mapped;
    }

    return 'official';
  }

  // Contact point system normalization
  public normalizeContactPointSystem(input: string): string {
    if (!input) return 'phone';
    
    const lower = input.toLowerCase().trim();
    const validCodes = this.valuesetLoader.getContactPointSystemCodes();
    
    // Direct match
    if (validCodes.includes(lower)) {
      return lower;
    }

    // Common mappings
    const mappings: { [key: string]: string } = {
      'telephone': 'phone',
      'tel': 'phone',
      'mobile': 'phone',
      'cell': 'phone',
      'landline': 'phone',
      'e-mail': 'email',
      'mail': 'email',
      'website': 'url',
      'web': 'url',
      'homepage': 'url',
      'fax': 'fax',
      'facsimile': 'fax',
      'sms': 'sms',
      'text': 'sms',
      'pager': 'pager',
      'beeper': 'pager'
    };

    const mapped = mappings[lower];
    if (mapped && validCodes.includes(mapped)) {
      return mapped;
    }

    return 'other';
  }

  // Contact point use normalization
  public normalizeContactPointUse(input: string): string {
    if (!input) return 'home';
    
    const lower = input.toLowerCase().trim();
    const validCodes = this.valuesetLoader.getContactPointUseCodes();
    
    // Direct match
    if (validCodes.includes(lower)) {
      return lower;
    }

    // Common mappings
    const mappings: { [key: string]: string } = {
      'personal': 'home',
      'primary': 'home',
      'residence': 'home',
      'residential': 'home',
      'business': 'work',
      'office': 'work',
      'workplace': 'work',
      'job': 'work',
      'emergency': 'temp',
      'temporary': 'temp',
      'mobile': 'mobile',
      'cell': 'mobile',
      'cellular': 'mobile'
    };

    const mapped = mappings[lower];
    if (mapped && validCodes.includes(mapped)) {
      return mapped;
    }

    return 'home';
  }

  // Address use normalization
  public normalizeAddressUse(input: string): string {
    if (!input) return 'home';
    
    const lower = input.toLowerCase().trim();
    const validCodes = this.valuesetLoader.getAddressUseCodes();
    
    // Direct match
    if (validCodes.includes(lower)) {
      return lower;
    }

    // Common mappings
    const mappings: { [key: string]: string } = {
      'personal': 'home',
      'residence': 'home',
      'residential': 'home',
      'primary': 'home',
      'business': 'work',
      'office': 'work',
      'workplace': 'work',
      'job': 'work',
      'temporary': 'temp',
      'current': 'temp',
      'billing': 'billing',
      'invoice': 'billing',
      'payment': 'billing',
      'previous': 'old',
      'former': 'old',
      'old': 'old'
    };

    const mapped = mappings[lower];
    if (mapped && validCodes.includes(mapped)) {
      return mapped;
    }

    return 'home';
  }

  // Address type normalization
  public normalizeAddressType(input: string): string {
    if (!input) return 'both';
    
    const lower = input.toLowerCase().trim();
    const validCodes = this.valuesetLoader.getAddressTypeCodes();
    
    // Direct match
    if (validCodes.includes(lower)) {
      return lower;
    }

    // Common mappings
    const mappings: { [key: string]: string } = {
      'mailing': 'postal',
      'mail': 'postal',
      'shipping': 'postal',
      'delivery': 'postal',
      'street': 'physical',
      'residence': 'physical',
      'location': 'physical',
      'building': 'physical',
      'both': 'both',
      'all': 'both'
    };

    const mapped = mappings[lower];
    if (mapped && validCodes.includes(mapped)) {
      return mapped;
    }

    return 'both';
  }

  // Validation methods
  public isValidGender(code: string): boolean {
    return this.valuesetLoader.validateGender(code);
  }

  public isValidNameUse(code: string): boolean {
    return this.valuesetLoader.validateNameUse(code);
  }

  public isValidContactPointSystem(code: string): boolean {
    return this.valuesetLoader.validateContactPointSystem(code);
  }

  public isValidContactPointUse(code: string): boolean {
    return this.valuesetLoader.validateContactPointUse(code);
  }

  public isValidAddressUse(code: string): boolean {
    return this.valuesetLoader.validateAddressUse(code);
  }

  public isValidAddressType(code: string): boolean {
    return this.valuesetLoader.validateAddressType(code);
  }

  // Get display names
  public getGenderDisplay(code: string): string {
    return this.valuesetLoader.getDisplayForCode('administrative-gender', code) || code;
  }

  public getNameUseDisplay(code: string): string {
    return this.valuesetLoader.getDisplayForCode('name-use', code) || code;
  }

  public getContactPointSystemDisplay(code: string): string {
    return this.valuesetLoader.getDisplayForCode('contact-point-system', code) || code;
  }

  public getContactPointUseDisplay(code: string): string {
    return this.valuesetLoader.getDisplayForCode('contact-point-use', code) || code;
  }

  public getAddressUseDisplay(code: string): string {
    return this.valuesetLoader.getDisplayForCode('address-use', code) || code;
  }

  public getAddressTypeDisplay(code: string): string {
    return this.valuesetLoader.getDisplayForCode('address-type', code) || code;
  }

  // Get all valid codes for dropdowns/validation
  public getAllValidCodes() {
    return {
      gender: this.valuesetLoader.getAdministrativeGenderCodes(),
      nameUse: this.valuesetLoader.getNameUseCodes(),
      contactPointSystem: this.valuesetLoader.getContactPointSystemCodes(),
      contactPointUse: this.valuesetLoader.getContactPointUseCodes(),
      addressUse: this.valuesetLoader.getAddressUseCodes(),
      addressType: this.valuesetLoader.getAddressTypeCodes(),
      maritalStatus: this.valuesetLoader.getMaritalStatusCodes()
    };
  }
}