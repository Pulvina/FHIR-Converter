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
exports.ValuesetLoader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ValuesetLoader {
    constructor() {
        this.valuesets = new Map();
        this.codesystems = new Map();
        this.valuesetPath = path.join(process.cwd(), '../../data/Valuesets/ValueSets');
        this.codesystemPath = path.join(process.cwd(), '../../data/Valuesets/CodeSystems');
        this.loadValuesets();
        this.loadCodesystems();
    }
    loadValuesets() {
        try {
            if (fs.existsSync(this.valuesetPath)) {
                const files = fs.readdirSync(this.valuesetPath);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        try {
                            const filePath = path.join(this.valuesetPath, file);
                            const content = fs.readFileSync(filePath, 'utf8');
                            const valueset = JSON.parse(content);
                            this.valuesets.set(valueset.id || file.replace('.json', ''), valueset);
                            console.log(`Loaded valueset: ${valueset.id || file}`);
                        }
                        catch (error) {
                            console.warn(`Failed to load valueset ${file}:`, error);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.warn('Failed to load valuesets directory:', error);
        }
    }
    loadCodesystems() {
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
                        }
                        catch (error) {
                            console.warn(`Failed to load codesystem ${file}:`, error);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.warn('Failed to load codesystems directory:', error);
        }
    }
    getValidCodes(valuesetId) {
        const valueset = this.valuesets.get(valuesetId);
        if (!valueset) {
            return [];
        }
        const codes = [];
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
                const concepts = valueset[key];
                for (const concept of concepts) {
                    if (concept.code) {
                        codes.push(concept.code);
                    }
                }
            }
        }
        return codes;
    }
    isValidCode(valuesetId, code) {
        const validCodes = this.getValidCodes(valuesetId);
        return validCodes.includes(code);
    }
    getDisplayForCode(valuesetId, code) {
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
                const concepts = valueset[key];
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
    getNameUseCodes() {
        return this.getValidCodes('name-use');
    }
    getContactPointSystemCodes() {
        return this.getValidCodes('contact-point-system');
    }
    getContactPointUseCodes() {
        return this.getValidCodes('contact-point-use');
    }
    getAddressUseCodes() {
        return this.getValidCodes('address-use');
    }
    getAddressTypeCodes() {
        return this.getValidCodes('address-type');
    }
    getAdministrativeGenderCodes() {
        return this.getValidCodes('administrative-gender');
    }
    getMaritalStatusCodes() {
        return this.getValidCodes('marital-status');
    }
    // Validation methods
    validateNameUse(code) {
        return this.isValidCode('name-use', code);
    }
    validateContactPointSystem(code) {
        return this.isValidCode('contact-point-system', code);
    }
    validateContactPointUse(code) {
        return this.isValidCode('contact-point-use', code);
    }
    validateAddressUse(code) {
        return this.isValidCode('address-use', code);
    }
    validateAddressType(code) {
        return this.isValidCode('address-type', code);
    }
    validateGender(code) {
        return this.isValidCode('administrative-gender', code);
    }
    validateMaritalStatus(code) {
        return this.isValidCode('marital-status', code);
    }
    // Get default values
    getDefaultNameUse() {
        const codes = this.getNameUseCodes();
        return codes.includes('official') ? 'official' : codes[0] || 'official';
    }
    getDefaultContactPointUse() {
        const codes = this.getContactPointUseCodes();
        return codes.includes('home') ? 'home' : codes[0] || 'home';
    }
    getDefaultAddressUse() {
        const codes = this.getAddressUseCodes();
        return codes.includes('home') ? 'home' : codes[0] || 'home';
    }
    normalizeGender(input) {
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
    normalizeContactPointSystem(input) {
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
exports.ValuesetLoader = ValuesetLoader;
