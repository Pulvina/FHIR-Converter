"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntelligentTemplateGenerator = void 0;
const SemanticFieldDetector_1 = require("./SemanticFieldDetector");
const ValuesetService_1 = require("../services/ValuesetService");
class IntelligentTemplateGenerator {
    constructor() {
        this.detector = new SemanticFieldDetector_1.SemanticFieldDetector();
        this.valuesetService = ValuesetService_1.ValuesetService.getInstance();
    }
    generateTemplate(sampleJson) {
        // Check if input is already FHIR-structured
        if (this.isFhirStructured(sampleJson)) {
            return this.generateFhirPassthroughTemplate(sampleJson);
        }
        // Detect all semantic fields
        const detectedFields = this.detector.detectFields(sampleJson);
        // Create template context
        const context = this.buildTemplateContext(detectedFields);
        // Generate the liquid template
        return this.createLiquidTemplate(context);
    }
    isFhirStructured(json) {
        // Check if this looks like FHIR Patient resource structure
        if (json.resourceType === 'Patient') {
            return true;
        }
        // Check for FHIR-like structures
        const fhirLikeFields = ['name', 'identifier', 'telecom', 'address', 'contact'];
        const hasFhirArrays = fhirLikeFields.some(field => Array.isArray(json[field]) &&
            json[field].length > 0 &&
            typeof json[field][0] === 'object');
        return hasFhirArrays;
    }
    generateFhirPassthroughTemplate(json) {
        // For FHIR-structured input, we need a simpler approach that doesn't try to deconstruct arrays
        // Instead, we'll create a template that works with the first name object directly
        let template = `{
    "resourceType": "Patient",
    "id": "{{ msg.id | default: generate_uuid }}",
    "text": {
        "status": "generated",
        "div": "<div xmlns=\\"http://www.w3.org/1999/xhtml\\">FHIR-Structured Patient Data</div>"
    },
    "active": true,`;
        // For FHIR passthrough, handle the most common case: single name object
        if (json.name && Array.isArray(json.name) && json.name.length > 0) {
            const firstName = json.name[0];
            template += `
    "name": [
        {`;
            if (firstName.use) {
                template += `
            "use": "{{ msg.name[0].use }}",`;
            }
            if (firstName.family) {
                template += `
            "family": "{{ msg.name[0].family }}",`;
            }
            if (firstName.given && Array.isArray(firstName.given)) {
                template += `
            "given": [`;
                firstName.given.forEach((given, index) => {
                    template += `
                "{{ msg.name[0].given[${index}] }}"`;
                    if (index < firstName.given.length - 1) {
                        template += `,`;
                    }
                });
                template += `
            ]`;
            }
            template += `
        }
    ],`;
        }
        // Handle identifier array with direct access
        if (json.identifier && Array.isArray(json.identifier) && json.identifier.length > 0) {
            template += `
    "identifier": [`;
            json.identifier.forEach((id, index) => {
                template += `
        {`;
                if (id.use)
                    template += `
            "use": "{{ msg.identifier[${index}].use }}",`;
                if (id.system)
                    template += `
            "system": "{{ msg.identifier[${index}].system }}",`;
                if (id.value)
                    template += `
            "value": "{{ msg.identifier[${index}].value }}"`;
                template += `
        }`;
                if (index < json.identifier.length - 1)
                    template += `,`;
            });
            template += `
    ],`;
        }
        if (json.gender) {
            template += `
    {% if msg.gender -%}
    "gender": "{{ msg.gender }}",
    {% endif -%}`;
        }
        if (json.birthDate) {
            template += `
    {% if msg.birthDate -%}
    "birthDate": "{{ msg.birthDate }}",
    {% endif -%}`;
        }
        // Handle telecom array with direct access
        if (json.telecom && Array.isArray(json.telecom) && json.telecom.length > 0) {
            template += `
    "telecom": [`;
            json.telecom.forEach((telecom, index) => {
                template += `
        {`;
                if (telecom.system)
                    template += `
            "system": "{{ msg.telecom[${index}].system }}",`;
                if (telecom.value)
                    template += `
            "value": "{{ msg.telecom[${index}].value }}",`;
                if (telecom.use)
                    template += `
            "use": "{{ msg.telecom[${index}].use }}"`;
                template += `
        }`;
                if (index < json.telecom.length - 1)
                    template += `,`;
            });
            template += `
    ],`;
        }
        // Handle address array with direct access  
        if (json.address && Array.isArray(json.address) && json.address.length > 0) {
            template += `
    "address": [`;
            json.address.forEach((addr, index) => {
                template += `
        {`;
                if (addr.use)
                    template += `
            "use": "{{ msg.address[${index}].use }}",`;
                if (addr.line && Array.isArray(addr.line)) {
                    template += `
            "line": [`;
                    addr.line.forEach((line, lineIndex) => {
                        template += `
                "{{ msg.address[${index}].line[${lineIndex}] }}"`;
                        if (lineIndex < addr.line.length - 1)
                            template += `,`;
                    });
                    template += `
            ],`;
                }
                if (addr.city)
                    template += `
            "city": "{{ msg.address[${index}].city }}",`;
                if (addr.state)
                    template += `
            "state": "{{ msg.address[${index}].state }}",`;
                if (addr.postalCode)
                    template += `
            "postalCode": "{{ msg.address[${index}].postalCode }}",`;
                if (addr.country)
                    template += `
            "country": "{{ msg.address[${index}].country }}"`;
                template += `
        }`;
                if (index < json.address.length - 1)
                    template += `,`;
            });
            template += `
    ],`;
        }
        template += `
    "managingOrganization": {
        "reference": "Organization/fhir-passthrough",
        "display": "FHIR Passthrough System"
    }
}`;
        return template;
    }
    buildTemplateContext(detectedFields) {
        const context = {
            identifiers: [],
            name: {},
            demographics: {},
            telecom: [],
            address: [],
            extensions: [],
            clinical: [],
            emergency: []
        };
        for (const field of detectedFields) {
            const match = field.bestMatch;
            if (match.confidence < 0.6)
                continue; // Skip low-confidence matches
            if (match.fhirPath.startsWith('identifier')) {
                context.identifiers.push({
                    path: field.path,
                    system: match.system || 'unknown',
                    value: field.value
                });
            }
            else if (match.fhirPath.startsWith('name')) {
                if (match.fhirPath.includes('given')) {
                    context.name.given = field.path;
                }
                else if (match.fhirPath.includes('family')) {
                    context.name.family = field.path;
                }
                else if (match.fhirPath.includes('prefix')) {
                    context.name.prefix = field.path;
                }
                else if (match.fhirPath.includes('suffix')) {
                    context.name.suffix = field.path;
                }
                else {
                    context.name.text = field.path;
                }
            }
            else if (match.fhirPath === 'gender') {
                context.demographics.gender = {
                    path: field.path,
                    valueMap: match.valueMap
                };
            }
            else if (match.fhirPath === 'birthDate') {
                context.demographics.birthDate = field.path;
            }
            else if (match.fhirPath.includes('age')) {
                context.demographics.age = field.path;
            }
            else if (match.fhirPath.startsWith('telecom')) {
                context.telecom.push({
                    path: field.path,
                    system: match.system || 'phone',
                    use: match.use || 'home'
                });
            }
            else if (match.fhirPath.startsWith('address')) {
                const component = match.fhirPath.includes('line') ? 'line' :
                    match.fhirPath.includes('city') ? 'city' :
                        match.fhirPath.includes('state') ? 'state' :
                            match.fhirPath.includes('postalCode') ? 'postalCode' :
                                match.fhirPath.includes('country') ? 'country' : 'text';
                context.address.push({
                    path: field.path,
                    component,
                    use: match.use || 'home'
                });
            }
            else if (match.fhirPath.startsWith('extension[vitals]')) {
                context.clinical.push({
                    path: field.path,
                    code: match.code,
                    system: match.system,
                    category: 'vitals'
                });
            }
            else if (match.fhirPath.startsWith('extension[emergency]')) {
                context.emergency.push({
                    path: field.path,
                    category: 'emergency'
                });
            }
            else {
                context.extensions.push({
                    path: field.path,
                    url: `http://example.org/fhir/extension/${field.path.replace(/\./g, '-')}`,
                    valueType: match.valueType
                });
            }
        }
        return context;
    }
    createLiquidTemplate(context) {
        let template = `{
    "resourceType": "Patient",`;
        // Generate ID
        if (context.identifiers.length > 0) {
            const primaryId = context.identifiers[0];
            template += `
    "id": "{{ ${this.getLiquidPath(primaryId.path)} | to_json_string | generate_uuid }}",`;
        }
        else {
            template += `
    "id": "{{ generate_uuid }}",`;
        }
        // Generate narrative text
        template += `
    "text": {
        "status": "generated",
        "div": "<div xmlns=\\"http://www.w3.org/1999/xhtml\\">Intelligent Patient Template</div>"
    },
    "active": true,`;
        // Generate identifiers
        if (context.identifiers.length > 0) {
            template += `
    "identifier": [`;
            context.identifiers.forEach((id, index) => {
                template += `
        {
            "use": "usual",
            "type": {
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                    "code": "${this.getIdentifierTypeCode(id.system)}",
                    "display": "${this.getIdentifierTypeDisplay(id.system)}"
                }]
            },
            "system": "${this.getIdentifierSystem(id.system)}",
            "value": "{{ ${this.getLiquidPath(id.path)} }}"
        }`;
                if (index < context.identifiers.length - 1)
                    template += ',';
            });
            template += `
    ],`;
        }
        // Generate name
        if (Object.keys(context.name).length > 0) {
            template += `
    "name": [`;
            if (context.name.text) {
                template += `
        {
            "use": "official",
            "text": "{{ ${this.getLiquidPath(context.name.text)} }}"
        }`;
            }
            else {
                template += `
        {
            "use": "official"`;
                if (context.name.family) {
                    template += `,
            "family": "{{ ${this.getLiquidPath(context.name.family)} }}"`;
                }
                if (context.name.given) {
                    template += `,
            "given": ["{{ ${this.getLiquidPath(context.name.given)} }}"]`;
                }
                if (context.name.prefix) {
                    template += `,
            "prefix": ["{{ ${this.getLiquidPath(context.name.prefix)} }}"]`;
                }
                if (context.name.suffix) {
                    template += `,
            "suffix": ["{{ ${this.getLiquidPath(context.name.suffix)} }}"]`;
                }
                template += `
        }`;
            }
            template += `
    ],`;
        }
        // Generate demographics
        if (context.demographics.gender) {
            template += `
    {% if ${this.getLiquidPath(context.demographics.gender.path)} -%}
    "gender": {% assign g = ${this.getLiquidPath(context.demographics.gender.path)} | downcase -%}`;
            if (context.demographics.gender.valueMap) {
                template += `
        {% case g -%}`;
                for (const [key, value] of Object.entries(context.demographics.gender.valueMap)) {
                    template += `
            {% when '${key}' -%}"${value}"`;
                }
                template += `
            {% else -%}"unknown"
        {% endcase -%},
    {% endif -%}`;
            }
            else {
                template += `"{{ g }}",
    {% endif -%}`;
            }
        }
        if (context.demographics.birthDate) {
            template += `
    {% if ${this.getLiquidPath(context.demographics.birthDate)} -%}
    "birthDate": "{{ ${this.getLiquidPath(context.demographics.birthDate)} }}",
    {% endif -%}`;
        }
        else if (context.demographics.age) {
            template += `
    {% if ${this.getLiquidPath(context.demographics.age)} -%}
    {% assign age = ${this.getLiquidPath(context.demographics.age)} -%}
    {% assign birthYear = 2025 | minus: age -%}
    "birthDate": "{{ birthYear }}-01-01",
    "_birthDate": {
        "extension": [{
            "url": "http://hl7.org/fhir/StructureDefinition/patient-birthTime-estimated",
            "valueBoolean": true
        }]
    },
    {% endif -%}`;
        }
        // Generate telecom
        if (context.telecom.length > 0) {
            template += `
    "telecom": [`;
            context.telecom.forEach((telecom, index) => {
                template += `
        {% if ${this.getLiquidPath(telecom.path)} -%}
        {
            "system": "${telecom.system}",
            "value": "{{ ${this.getLiquidPath(telecom.path)} }}",
            "use": "${telecom.use}"
        }`;
                if (index < context.telecom.length - 1) {
                    template += `{% if ${this.getLiquidPath(context.telecom[index + 1].path)} %},{% endif %}
        {% endif -%}`;
                }
                else {
                    template += `
        {% endif -%}`;
                }
            });
            template += `
    ],`;
        }
        // Generate address
        if (context.address.length > 0) {
            const addressComponents = this.groupAddressComponents(context.address);
            template += `
    "address": [`;
            Object.entries(addressComponents).forEach(([use, components], index) => {
                template += `
        {
            "use": "${use}",`;
                const lineComponents = components.filter(c => c.component === 'line');
                if (lineComponents.length > 0) {
                    template += `
            "line": [`;
                    lineComponents.forEach((comp, i) => {
                        template += `"{{ ${this.getLiquidPath(comp.path)} }}"`;
                        if (i < lineComponents.length - 1)
                            template += ', ';
                    });
                    template += `],`;
                }
                ['city', 'state', 'postalCode', 'country'].forEach(comp => {
                    const component = components.find(c => c.component === comp);
                    if (component) {
                        template += `
            "${comp}": "{{ ${this.getLiquidPath(component.path)} }}",`;
                    }
                });
                template = template.replace(/,$/, ''); // Remove trailing comma
                template += `
        }`;
                if (index < Object.keys(addressComponents).length - 1)
                    template += ',';
            });
            template += `
    ],`;
        }
        // Generate clinical extensions
        if (context.clinical.length > 0) {
            template += `
    "extension": [
        {
            "url": "http://hl7.org/fhir/StructureDefinition/patient-vitals",
            "extension": [`;
            context.clinical.forEach((vital, index) => {
                template += `
                {% if ${this.getLiquidPath(vital.path)} -%}
                {
                    "url": "${vital.path.split('.').pop()}",`;
                if (vital.code && vital.system) {
                    template += `
                    "valueQuantity": {
                        "value": {{ ${this.getLiquidPath(vital.path)} }},
                        "code": "${vital.code}",
                        "system": "${vital.system}"
                    }`;
                }
                else {
                    template += `
                    "valueString": "{{ ${this.getLiquidPath(vital.path)} }}"`;
                }
                template += `
                }`;
                if (index < context.clinical.length - 1)
                    template += `,`;
                template += `
                {% endif -%}`;
            });
            template += `
            ]
        }`;
            // Add emergency extensions if present
            if (context.emergency.length > 0) {
                context.emergency.forEach(emergency => {
                    template += `,
        {
            "url": "http://hl7.org/fhir/StructureDefinition/patient-${emergency.category}",
            "valueString": "{{ ${this.getLiquidPath(emergency.path)} }}"
        }`;
                });
            }
            template += `
    ],`;
        }
        // Generate generic extensions for unrecognized fields
        if (context.extensions.length > 0 && context.clinical.length === 0) {
            template += `
    "extension": [`;
            context.extensions.forEach((ext, index) => {
                template += `
        {% if ${this.getLiquidPath(ext.path)} -%}
        {
            "url": "${ext.url}",
            "value${ext.valueType.charAt(0).toUpperCase() + ext.valueType.slice(1)}": "{{ ${this.getLiquidPath(ext.path)} }}"
        }`;
                if (index < context.extensions.length - 1)
                    template += `,`;
                template += `
        {% endif -%}`;
            });
            template += `
    ],`;
        }
        // Close template
        template += `
    "managingOrganization": {
        "reference": "Organization/intelligent-system",
        "display": "Intelligent Template System"
    }
}`;
        return template;
    }
    getLiquidPath(path) {
        // Convert dot notation to Liquid notation
        return `msg.${path}`;
    }
    getIdentifierTypeCode(system) {
        // Use proper FHIR v2-0203 codes
        const typeMap = {
            'medical-record': 'MR', // Medical record number
            'uuid': 'U', // Unspecified identifier
            'passport': 'PPN', // Passport number
            'drivers-license': 'DL', // Driver's license number
            'employee-id': 'EI', // Employee number
            'student-id': 'SB', // Social Beneficiary Identifier
            'insurance': 'NIIP', // National Insurance Payor Identifier (Payor)
            'emergency': 'VN', // Visit number
            'unknown': 'U' // Unspecified
        };
        return typeMap[system] || 'MR';
    }
    getIdentifierSystem(system) {
        const systemMap = {
            'medical-record': 'urn:oid:2.16.840.1.113883.4.1', // US SSN OID as example MRN system
            'uuid': 'urn:ietf:rfc:3986',
            'passport': 'urn:oid:2.16.840.1.113883.4.330', // US Passport OID
            'drivers-license': 'urn:oid:2.16.840.1.113883.4.3', // US Driver License OID
            'employee-id': 'urn:oid:2.16.840.1.113883.4.6', // Employer Identification OID
            'student-id': 'urn:oid:2.16.840.1.113883.6.101', // Academic institution OID
            'insurance': 'urn:oid:2.16.840.1.113883.4.4' // US NPI OID for insurance
        };
        return systemMap[system] || 'urn:oid:2.16.840.1.113883.19.5'; // Generic healthcare facility OID
    }
    getIdentifierTypeDisplay(system) {
        // Use proper FHIR v2-0203 display names
        const displayMap = {
            'medical-record': 'Medical record number',
            'uuid': 'Unspecified identifier',
            'passport': 'Passport number',
            'drivers-license': 'Driver\'s license number',
            'employee-id': 'Employee number',
            'student-id': 'Social Beneficiary Identifier',
            'insurance': 'National Insurance Payor Identifier (Payor)',
            'emergency': 'Visit number',
            'unknown': 'Unspecified identifier'
        };
        return displayMap[system] || 'Medical record number';
    }
    groupAddressComponents(addressFields) {
        const grouped = {};
        for (const field of addressFields) {
            if (!grouped[field.use]) {
                grouped[field.use] = [];
            }
            grouped[field.use].push({
                path: field.path,
                component: field.component
            });
        }
        return grouped;
    }
    analyzeAndGenerate(sampleJson) {
        // Check if input is already FHIR-structured
        if (this.isFhirStructured(sampleJson)) {
            const template = this.generateFhirPassthroughTemplate(sampleJson);
            return {
                template,
                analysis: {
                    detectedFields: 0,
                    context: { type: 'FHIR-Structured', resourceType: sampleJson.resourceType },
                    fieldBreakdown: [],
                    isFhirStructured: true
                },
                confidence: 0.95 // High confidence for FHIR passthrough
            };
        }
        const detectedFields = this.detector.detectFields(sampleJson);
        const context = this.buildTemplateContext(detectedFields);
        const template = this.createLiquidTemplate(context);
        // Calculate overall confidence
        const totalConfidence = detectedFields.reduce((sum, field) => sum + field.bestMatch.confidence, 0);
        const averageConfidence = detectedFields.length > 0 ? totalConfidence / detectedFields.length : 0;
        return {
            template,
            analysis: {
                detectedFields: detectedFields.length,
                context,
                fieldBreakdown: detectedFields.map(f => ({
                    path: f.path,
                    confidence: f.bestMatch.confidence,
                    fhirPath: f.bestMatch.fhirPath
                })),
                isFhirStructured: false
            },
            confidence: averageConfidence
        };
    }
}
exports.IntelligentTemplateGenerator = IntelligentTemplateGenerator;
