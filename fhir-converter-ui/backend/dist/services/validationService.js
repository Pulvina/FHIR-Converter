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
exports.validationService = void 0;
const Fhir = __importStar(require("fhir"));
class FhirValidationService {
    constructor() {
        // Initialize FHIR validator with R4 (4.0.0) version
        this.fhir = new Fhir.Fhir();
    }
    /**
     * Validates a FHIR resource
     * @param resource - The FHIR resource to validate (as object or string)
     * @returns ValidationResult with validity status and any errors/warnings
     */
    async validateResource(resource) {
        const errors = [];
        const warnings = [];
        try {
            // If resource is a string, parse it
            let resourceObj = resource;
            if (typeof resource === 'string') {
                try {
                    resourceObj = JSON.parse(resource);
                }
                catch (parseError) {
                    errors.push({
                        message: 'Invalid JSON format',
                        severity: 'error'
                    });
                    return { valid: false, errors, warnings };
                }
            }
            // Check if resource has required FHIR properties
            if (!resourceObj.resourceType) {
                errors.push({
                    message: 'Missing required property: resourceType',
                    severity: 'error'
                });
            }
            // Validate the resource using the FHIR library
            try {
                const validationResult = this.fhir.validate(resourceObj);
                // Process validation results
                if (validationResult && validationResult.messages) {
                    validationResult.messages.forEach((msg) => {
                        if (msg.severity === 'error') {
                            errors.push({
                                message: msg.message || 'Validation error',
                                path: msg.location,
                                severity: 'error'
                            });
                        }
                        else if (msg.severity === 'warning') {
                            warnings.push({
                                message: msg.message || 'Validation warning',
                                path: msg.location,
                                severity: 'warning'
                            });
                        }
                    });
                }
            }
            catch (validationError) {
                // The fhir library may throw errors for invalid resources
                errors.push({
                    message: validationError.message || 'Resource validation failed',
                    severity: 'error'
                });
            }
            // Additional custom validations
            this.performCustomValidations(resourceObj, errors, warnings);
            return {
                valid: errors.length === 0,
                errors,
                warnings
            };
        }
        catch (error) {
            errors.push({
                message: `Validation error: ${error.message}`,
                severity: 'error'
            });
            return { valid: false, errors, warnings };
        }
    }
    /**
     * Validates multiple FHIR resources
     * @param resources - Array of FHIR resources
     * @returns Array of ValidationResults
     */
    async validateResources(resources) {
        const results = [];
        for (const resource of resources) {
            const result = await this.validateResource(resource);
            results.push(result);
        }
        return results;
    }
    /**
     * Validates a FHIR Bundle
     * @param bundle - FHIR Bundle resource
     * @returns ValidationResult for the bundle and its entries
     */
    async validateBundle(bundle) {
        const errors = [];
        const warnings = [];
        // First validate the bundle itself
        const bundleResult = await this.validateResource(bundle);
        errors.push(...bundleResult.errors);
        warnings.push(...bundleResult.warnings);
        // Then validate each entry if it's a Bundle
        if (bundle.resourceType === 'Bundle' && bundle.entry && Array.isArray(bundle.entry)) {
            for (let i = 0; i < bundle.entry.length; i++) {
                const entry = bundle.entry[i];
                if (entry.resource) {
                    const entryResult = await this.validateResource(entry.resource);
                    // Add entry index to error/warning paths
                    entryResult.errors.forEach(error => {
                        errors.push({
                            ...error,
                            path: `Bundle.entry[${i}].resource${error.path ? '.' + error.path : ''}`
                        });
                    });
                    entryResult.warnings.forEach(warning => {
                        warnings.push({
                            ...warning,
                            path: `Bundle.entry[${i}].resource${warning.path ? '.' + warning.path : ''}`
                        });
                    });
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    /**
     * Perform custom FHIR validations
     */
    performCustomValidations(resource, errors, warnings) {
        // Validate Patient-specific requirements
        if (resource.resourceType === 'Patient') {
            // Check for at least one identifier or name
            if (!resource.identifier && !resource.name) {
                warnings.push({
                    message: 'Patient should have at least one identifier or name',
                    severity: 'warning'
                });
            }
            // Validate birth date format if present
            if (resource.birthDate && !this.isValidDate(resource.birthDate)) {
                errors.push({
                    message: 'Invalid birthDate format. Expected YYYY-MM-DD',
                    path: 'birthDate',
                    severity: 'error'
                });
            }
        }
        // Validate Observation-specific requirements
        if (resource.resourceType === 'Observation') {
            if (!resource.code) {
                errors.push({
                    message: 'Observation must have a code',
                    path: 'code',
                    severity: 'error'
                });
            }
            if (!resource.status) {
                errors.push({
                    message: 'Observation must have a status',
                    path: 'status',
                    severity: 'error'
                });
            }
        }
        // Validate references
        this.validateReferences(resource, warnings);
    }
    /**
     * Validate FHIR references in a resource
     */
    validateReferences(resource, warnings, path = '') {
        if (typeof resource !== 'object' || resource === null) {
            return;
        }
        for (const [key, value] of Object.entries(resource)) {
            const currentPath = path ? `${path}.${key}` : key;
            if (key === 'reference' && typeof value === 'string') {
                // Validate reference format
                if (!this.isValidReference(value)) {
                    warnings.push({
                        message: `Invalid reference format: ${value}`,
                        path: currentPath,
                        severity: 'warning'
                    });
                }
            }
            else if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    this.validateReferences(item, warnings, `${currentPath}[${index}]`);
                });
            }
            else if (typeof value === 'object' && value !== null) {
                this.validateReferences(value, warnings, currentPath);
            }
        }
    }
    /**
     * Check if a string is a valid FHIR date format
     */
    isValidDate(dateString) {
        const dateRegex = /^\d{4}(-\d{2}(-\d{2})?)?$/;
        return dateRegex.test(dateString);
    }
    /**
     * Check if a string is a valid FHIR reference
     */
    isValidReference(reference) {
        // Valid formats: ResourceType/id or absolute URL
        const relativeRefRegex = /^[A-Z][a-zA-Z]+\/[A-Za-z0-9\-\.]+$/;
        const absoluteRefRegex = /^https?:\/\/.+/;
        const uuidRefRegex = /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return relativeRefRegex.test(reference) ||
            absoluteRefRegex.test(reference) ||
            uuidRefRegex.test(reference);
    }
}
// Export singleton instance
exports.validationService = new FhirValidationService();
