"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValuesetService = void 0;
const ValuesetLoader_1 = require("../utils/ValuesetLoader");
class ValuesetService {
    constructor() {
        this.valuesetLoader = new ValuesetLoader_1.ValuesetLoader();
    }
    static getInstance() {
        if (!ValuesetService.instance) {
            ValuesetService.instance = new ValuesetService();
        }
        return ValuesetService.instance;
    }
    // Gender normalization with valueset validation
    normalizeGender(input) {
        if (!input)
            return 'unknown';
        const lower = input.toLowerCase().trim();
        const validCodes = this.valuesetLoader.getAdministrativeGenderCodes();
        // Direct match
        if (validCodes.includes(lower)) {
            return lower;
        }
        // Common mappings
        const mappings = {
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
    normalizeNameUse(input) {
        if (!input)
            return 'official';
        const lower = input.toLowerCase().trim();
        const validCodes = this.valuesetLoader.getNameUseCodes();
        // Direct match
        if (validCodes.includes(lower)) {
            return lower;
        }
        // Common mappings
        const mappings = {
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
    normalizeContactPointSystem(input) {
        if (!input)
            return 'phone';
        const lower = input.toLowerCase().trim();
        const validCodes = this.valuesetLoader.getContactPointSystemCodes();
        // Direct match
        if (validCodes.includes(lower)) {
            return lower;
        }
        // Common mappings
        const mappings = {
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
    normalizeContactPointUse(input) {
        if (!input)
            return 'home';
        const lower = input.toLowerCase().trim();
        const validCodes = this.valuesetLoader.getContactPointUseCodes();
        // Direct match
        if (validCodes.includes(lower)) {
            return lower;
        }
        // Common mappings
        const mappings = {
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
    normalizeAddressUse(input) {
        if (!input)
            return 'home';
        const lower = input.toLowerCase().trim();
        const validCodes = this.valuesetLoader.getAddressUseCodes();
        // Direct match
        if (validCodes.includes(lower)) {
            return lower;
        }
        // Common mappings
        const mappings = {
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
    normalizeAddressType(input) {
        if (!input)
            return 'both';
        const lower = input.toLowerCase().trim();
        const validCodes = this.valuesetLoader.getAddressTypeCodes();
        // Direct match
        if (validCodes.includes(lower)) {
            return lower;
        }
        // Common mappings
        const mappings = {
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
    isValidGender(code) {
        return this.valuesetLoader.validateGender(code);
    }
    isValidNameUse(code) {
        return this.valuesetLoader.validateNameUse(code);
    }
    isValidContactPointSystem(code) {
        return this.valuesetLoader.validateContactPointSystem(code);
    }
    isValidContactPointUse(code) {
        return this.valuesetLoader.validateContactPointUse(code);
    }
    isValidAddressUse(code) {
        return this.valuesetLoader.validateAddressUse(code);
    }
    isValidAddressType(code) {
        return this.valuesetLoader.validateAddressType(code);
    }
    // Get display names
    getGenderDisplay(code) {
        return this.valuesetLoader.getDisplayForCode('administrative-gender', code) || code;
    }
    getNameUseDisplay(code) {
        return this.valuesetLoader.getDisplayForCode('name-use', code) || code;
    }
    getContactPointSystemDisplay(code) {
        return this.valuesetLoader.getDisplayForCode('contact-point-system', code) || code;
    }
    getContactPointUseDisplay(code) {
        return this.valuesetLoader.getDisplayForCode('contact-point-use', code) || code;
    }
    getAddressUseDisplay(code) {
        return this.valuesetLoader.getDisplayForCode('address-use', code) || code;
    }
    getAddressTypeDisplay(code) {
        return this.valuesetLoader.getDisplayForCode('address-type', code) || code;
    }
    // Get all valid codes for dropdowns/validation
    getAllValidCodes() {
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
exports.ValuesetService = ValuesetService;
