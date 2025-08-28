"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const child_process_1 = require("child_process");
const uuid_1 = require("uuid");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path_1.default.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueId = (0, uuid_1.v4)();
        cb(null, `${uniqueId}_${file.originalname}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.hl7', '.ccda', '.json', '.xml', '.txt'];
        const fileExt = path_1.default.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(fileExt) || file.mimetype === 'text/plain' || file.mimetype === 'application/json') {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Allowed types: .hl7, .ccda, .json, .xml, .txt'));
        }
    }
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'FHIR Converter API is running' });
});
// Get available templates for a conversion type
app.get('/api/templates/:inputType', async (req, res) => {
    try {
        const { inputType } = req.params;
        const templatesPath = path_1.default.resolve('../../data/Templates');
        let templateDir;
        switch (inputType.toLowerCase()) {
            case 'hl7v2':
                templateDir = path_1.default.join(templatesPath, 'Hl7v2');
                break;
            case 'ccda':
                templateDir = path_1.default.join(templatesPath, 'Ccda');
                break;
            case 'json':
                templateDir = path_1.default.join(templatesPath, 'Json');
                break;
            case 'stu3':
                templateDir = path_1.default.join(templatesPath, 'Stu3ToR4');
                break;
            default:
                return res.status(400).json({ error: 'Invalid input type' });
        }
        if (await fs_extra_1.default.pathExists(templateDir)) {
            const files = await fs_extra_1.default.readdir(templateDir);
            const templates = files
                .filter(file => file.endsWith('.liquid'))
                .map(file => ({
                name: file,
                displayName: file.replace('.liquid', '').replace(/_/g, ' ')
            }));
            res.json({ templates });
        }
        else {
            res.json({ templates: [] });
        }
    }
    catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});
// Get available sample data files
app.get('/api/samples/:inputType', async (req, res) => {
    try {
        const { inputType } = req.params;
        const samplesPath = path_1.default.resolve('../../data/SampleData');
        let sampleDir;
        switch (inputType.toLowerCase()) {
            case 'hl7v2':
                sampleDir = path_1.default.join(samplesPath, 'Hl7v2');
                break;
            case 'ccda':
                sampleDir = path_1.default.join(samplesPath, 'Ccda');
                break;
            case 'json':
                sampleDir = path_1.default.join(samplesPath, 'Json');
                break;
            case 'stu3':
                sampleDir = path_1.default.join(samplesPath, 'Stu3');
                break;
            case 'fhir':
                sampleDir = path_1.default.join(samplesPath, 'FHIR');
                break;
            default:
                return res.status(400).json({ error: 'Invalid input type' });
        }
        if (await fs_extra_1.default.pathExists(sampleDir)) {
            const files = await fs_extra_1.default.readdir(sampleDir);
            const samples = files
                .filter(file => !file.startsWith('.'))
                .map(file => ({
                name: file,
                displayName: file.replace(/\.(hl7|ccda|json)$/, '').replace(/-/g, ' '),
                type: getFileDescription(file),
                size: 0 // We'll add size info if needed
            }));
            res.json({ samples });
        }
        else {
            res.json({ samples: [] });
        }
    }
    catch (error) {
        console.error('Error fetching samples:', error);
        res.status(500).json({ error: 'Failed to fetch samples' });
    }
});
// Get sample file content
app.get('/api/samples/:inputType/:filename', async (req, res) => {
    try {
        const { inputType, filename } = req.params;
        const samplesPath = path_1.default.resolve('../../data/SampleData');
        let sampleDir;
        switch (inputType.toLowerCase()) {
            case 'hl7v2':
                sampleDir = path_1.default.join(samplesPath, 'Hl7v2');
                break;
            case 'ccda':
                sampleDir = path_1.default.join(samplesPath, 'Ccda');
                break;
            case 'json':
                sampleDir = path_1.default.join(samplesPath, 'Json');
                break;
            case 'stu3':
                sampleDir = path_1.default.join(samplesPath, 'Stu3');
                break;
            case 'fhir':
                sampleDir = path_1.default.join(samplesPath, 'FHIR');
                break;
            default:
                return res.status(400).json({ error: 'Invalid input type' });
        }
        const filePath = path_1.default.join(sampleDir, filename);
        // Security check - ensure the file is within the samples directory
        if (!filePath.startsWith(sampleDir)) {
            return res.status(400).json({ error: 'Invalid file path' });
        }
        if (await fs_extra_1.default.pathExists(filePath)) {
            const content = await fs_extra_1.default.readFile(filePath, 'utf8');
            const stats = await fs_extra_1.default.stat(filePath);
            res.json({
                content,
                filename,
                size: stats.size,
                type: getFileDescription(filename)
            });
        }
        else {
            res.status(404).json({ error: 'Sample file not found' });
        }
    }
    catch (error) {
        console.error('Error reading sample file:', error);
        res.status(500).json({ error: 'Failed to read sample file' });
    }
});
function getFileDescription(filename) {
    const name = filename.toLowerCase();
    // HL7v2 message types
    if (name.includes('adt'))
        return 'Admission/Discharge/Transfer';
    if (name.includes('oru'))
        return 'Observation Result';
    if (name.includes('orm'))
        return 'Order Message';
    if (name.includes('mdm'))
        return 'Medical Document Management';
    if (name.includes('vxu'))
        return 'Vaccination Update';
    if (name.includes('siu'))
        return 'Scheduling Information';
    if (name.includes('bar'))
        return 'Billing Account Record';
    if (name.includes('dft'))
        return 'Detail Financial Transaction';
    // C-CDA document types  
    if (name.includes('ccd'))
        return 'Continuity of Care Document';
    if (name.includes('consultation'))
        return 'Consultation Note';
    if (name.includes('discharge'))
        return 'Discharge Summary';
    if (name.includes('history'))
        return 'History and Physical';
    if (name.includes('operative'))
        return 'Operative Note';
    if (name.includes('procedure'))
        return 'Procedure Note';
    if (name.includes('progress'))
        return 'Progress Note';
    if (name.includes('referral'))
        return 'Referral Note';
    if (name.includes('transfer'))
        return 'Transfer Summary';
    // FHIR/JSON
    if (name.includes('patient'))
        return 'Patient Resource';
    if (name.includes('observation'))
        return 'Observation Resource';
    if (name.includes('bundle'))
        return 'FHIR Bundle';
    if (name.includes('charge'))
        return 'Charge Item';
    return 'Healthcare Document';
}
// File conversion endpoint
app.post('/api/convert', upload.single('file'), async (req, res) => {
    let tempOutputPath = null;
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const { inputType, outputFormat = 'fhir', templateName } = req.body;
        if (!inputType) {
            return res.status(400).json({ error: 'Input type is required' });
        }
        const inputFilePath = req.file.path;
        const outputFileName = `converted_${(0, uuid_1.v4)()}.json`;
        tempOutputPath = path_1.default.join(__dirname, '../temp', outputFileName);
        // Ensure temp directory exists
        await fs_extra_1.default.ensureDir(path_1.default.dirname(tempOutputPath));
        const result = await convertFile(inputFilePath, tempOutputPath, inputType, outputFormat, templateName);
        // Clean up input file
        await fs_extra_1.default.remove(inputFilePath);
        res.json(result);
    }
    catch (error) {
        console.error('Conversion error:', error);
        // Clean up files
        if (req.file?.path) {
            await fs_extra_1.default.remove(req.file.path).catch(() => { });
        }
        res.status(500).json({
            success: false,
            error: error.message || 'Conversion failed',
            inputType: req.body.inputType || 'unknown',
            outputFormat: req.body.outputFormat || 'fhir'
        });
    }
    finally {
        // Clean up temp output file after a delay
        if (tempOutputPath) {
            setTimeout(async () => {
                try {
                    await fs_extra_1.default.remove(tempOutputPath);
                }
                catch (error) {
                    console.error('Failed to clean up temp file:', error);
                }
            }, 30000); // Clean up after 30 seconds
        }
    }
});
// Text input conversion endpoint
app.post('/api/convert/text', async (req, res) => {
    let tempInputPath = null;
    let tempOutputPath = null;
    try {
        const { inputText, inputType, outputFormat = 'fhir', templateName } = req.body;
        if (!inputText || !inputType) {
            return res.status(400).json({ error: 'Input text and type are required' });
        }
        // Create temporary input file
        const inputFileName = `temp_input_${(0, uuid_1.v4)()}.txt`;
        tempInputPath = path_1.default.join(__dirname, '../temp', inputFileName);
        const outputFileName = `converted_${(0, uuid_1.v4)()}.json`;
        tempOutputPath = path_1.default.join(__dirname, '../temp', outputFileName);
        // Ensure temp directory exists
        await fs_extra_1.default.ensureDir(path_1.default.dirname(tempInputPath));
        // Write input text to temporary file
        await fs_extra_1.default.writeFile(tempInputPath, inputText, 'utf8');
        const result = await convertFile(tempInputPath, tempOutputPath, inputType, outputFormat, templateName);
        res.json(result);
    }
    catch (error) {
        console.error('Text conversion error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Conversion failed',
            inputType: req.body.inputType || 'unknown',
            outputFormat: req.body.outputFormat || 'fhir'
        });
    }
    finally {
        // Clean up temp files
        if (tempInputPath) {
            await fs_extra_1.default.remove(tempInputPath).catch(() => { });
        }
        if (tempOutputPath) {
            setTimeout(async () => {
                try {
                    await fs_extra_1.default.remove(tempOutputPath);
                }
                catch (error) {
                    console.error('Failed to clean up temp file:', error);
                }
            }, 30000);
        }
    }
});
async function convertFile(inputPath, outputPath, inputType, outputFormat, templateName) {
    return new Promise(async (resolve, reject) => {
        try {
            // Path to the FHIR Converter CLI tool
            const converterPath = path_1.default.resolve('../../src/Microsoft.Health.Fhir.Liquid.Converter.Tool/bin/Debug/net8.0/Microsoft.Health.Fhir.Liquid.Converter.Tool.exe');
            const baseTemplatesPath = path_1.default.resolve('../../data/Templates');
            // Get the specific template directory based on input type (use absolute paths)
            let templatesPath;
            switch (inputType.toLowerCase()) {
                case 'hl7v2':
                    templatesPath = path_1.default.resolve(baseTemplatesPath, 'Hl7v2');
                    break;
                case 'ccda':
                    templatesPath = path_1.default.resolve(baseTemplatesPath, 'Ccda');
                    break;
                case 'json':
                    templatesPath = path_1.default.resolve(baseTemplatesPath, 'Json');
                    break;
                case 'stu3':
                    templatesPath = path_1.default.resolve(baseTemplatesPath, 'Stu3ToR4');
                    break;
                case 'fhir':
                    templatesPath = path_1.default.resolve(baseTemplatesPath, 'FhirToHl7v2');
                    break;
                default:
                    templatesPath = path_1.default.resolve(baseTemplatesPath, 'Hl7v2');
            }
            console.log(`Using template directory: ${templatesPath}`);
            // Check if template directory and template file exist
            const templateExists = await fs_extra_1.default.pathExists(templatesPath);
            console.log(`Template directory exists: ${templateExists}`);
            if (templateName) {
                const templateFilePath = path_1.default.join(templatesPath, templateName);
                const templateFileExists = await fs_extra_1.default.pathExists(templateFilePath);
                console.log(`Template file '${templateName}' exists: ${templateFileExists}`);
            }
            // Build command arguments for the convert subcommand (ensure all paths are absolute)
            const args = [
                'convert',
                '-d', templatesPath,
                '-n', path_1.default.resolve(inputPath),
                '-f', path_1.default.resolve(outputPath)
            ];
            // Add root template if specified, otherwise use a default
            // IMPORTANT: Remove .liquid extension as CLI tool expects name without extension
            if (templateName) {
                const templateNameWithoutExt = templateName.replace('.liquid', '');
                args.push('-r', templateNameWithoutExt);
            }
            else {
                // We need to provide a root template. Let's use defaults based on input type
                let defaultTemplate = '';
                switch (inputType.toLowerCase()) {
                    case 'hl7v2':
                        defaultTemplate = 'ADT_A01'; // Default HL7v2 template (no .liquid extension)
                        break;
                    case 'ccda':
                        defaultTemplate = 'CCD'; // Default C-CDA template
                        break;
                    case 'json':
                        defaultTemplate = 'ExamplePatient'; // Default JSON template
                        break;
                    case 'stu3':
                        defaultTemplate = 'Patient'; // Default STU3 template
                        break;
                    default:
                        defaultTemplate = 'ADT_A01';
                }
                args.push('-r', defaultTemplate);
            }
            console.log('Running converter with args:', args);
            const converterProcess = (0, child_process_1.spawn)(converterPath, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: 30000, // 30 second timeout
                cwd: path_1.default.resolve('../../') // Set working directory to FHIR-Converter root
            });
            let stdout = '';
            let stderr = '';
            converterProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            converterProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            converterProcess.on('close', async (code) => {
                try {
                    if (code === 0) {
                        // Check if output file was created and read it
                        if (await fs_extra_1.default.pathExists(outputPath)) {
                            const outputData = await fs_extra_1.default.readFile(outputPath, 'utf8');
                            try {
                                const parsedData = JSON.parse(outputData);
                                // Extract FHIR resource from wrapper if it exists
                                let fhirData = parsedData;
                                if (parsedData.Status === 'OK' && parsedData.FhirResource) {
                                    fhirData = parsedData.FhirResource;
                                }
                                // Add narrative text block to FHIR resources
                                if (fhirData && typeof fhirData === 'object' && fhirData.resourceType) {
                                    fhirData = addNarrativeText(fhirData);
                                }
                                resolve({
                                    success: true,
                                    data: fhirData,
                                    inputType,
                                    outputFormat,
                                    templateUsed: templateName
                                });
                            }
                            catch (parseError) {
                                // If it's not JSON, return as text
                                resolve({
                                    success: true,
                                    data: outputData,
                                    inputType,
                                    outputFormat,
                                    templateUsed: templateName
                                });
                            }
                        }
                        else {
                            reject(new Error('Conversion completed but no output file was generated'));
                        }
                    }
                    else {
                        const errorMessage = stderr || stdout || `Converter process exited with code ${code}`;
                        reject(new Error(`Conversion failed: ${errorMessage}`));
                    }
                }
                catch (error) {
                    reject(error);
                }
            });
            converterProcess.on('error', (error) => {
                reject(new Error(`Failed to start converter process: ${error.message}`));
            });
        }
        catch (error) {
            reject(error);
        }
    });
}
function addNarrativeText(fhirResource) {
    // Don't overwrite existing narrative
    if (fhirResource.text) {
        return fhirResource;
    }
    let narrativeText = '';
    switch (fhirResource.resourceType) {
        case 'Patient':
            narrativeText = generatePatientNarrative(fhirResource);
            break;
        case 'Observation':
            narrativeText = generateObservationNarrative(fhirResource);
            break;
        case 'Condition':
            narrativeText = generateConditionNarrative(fhirResource);
            break;
        case 'Procedure':
            narrativeText = generateProcedureNarrative(fhirResource);
            break;
        case 'Encounter':
            narrativeText = generateEncounterNarrative(fhirResource);
            break;
        case 'DiagnosticReport':
            narrativeText = generateDiagnosticReportNarrative(fhirResource);
            break;
        case 'Medication':
            narrativeText = generateMedicationNarrative(fhirResource);
            break;
        case 'Immunization':
            narrativeText = generateImmunizationNarrative(fhirResource);
            break;
        default:
            narrativeText = `${fhirResource.resourceType} resource with ID: ${fhirResource.id || 'unknown'}.`;
    }
    // Create a copy and add the narrative
    const resourceWithNarrative = { ...fhirResource };
    // Insert text block after id (if id exists) or at the beginning
    const orderedResource = {};
    if (fhirResource.resourceType) {
        orderedResource.resourceType = fhirResource.resourceType;
    }
    if (fhirResource.id) {
        orderedResource.id = fhirResource.id;
    }
    // Add narrative text
    orderedResource.text = {
        status: 'generated',
        div: `<div xmlns="http://www.w3.org/1999/xhtml">${narrativeText}</div>`
    };
    // Add remaining properties
    Object.keys(fhirResource).forEach(key => {
        if (key !== 'resourceType' && key !== 'id' && key !== 'text') {
            orderedResource[key] = fhirResource[key];
        }
    });
    return orderedResource;
}
function generatePatientNarrative(patient) {
    let text = 'Patient';
    // Add name
    if (patient.name && patient.name[0]) {
        const name = patient.name[0];
        if (name.family || name.given) {
            const given = name.given ? name.given.join(' ') : '';
            const family = name.family || '';
            text += ` <b>${given} ${family}`.trim() + '</b>';
        }
    }
    // Add gender
    if (patient.gender) {
        text += ` (${patient.gender})`;
    }
    // Add birth date
    if (patient.birthDate) {
        text += `, born ${patient.birthDate}`;
    }
    // Add MRN from identifiers
    if (patient.identifier) {
        const mrn = patient.identifier.find((id) => id.type && id.type.coding && id.type.coding.some((c) => c.code === 'MR'));
        if (mrn && mrn.value) {
            text += `. MRN: ${mrn.value}`;
        }
    }
    // Add phone numbers
    if (patient.telecom) {
        const phones = patient.telecom.filter((t) => t.system === 'phone').map((t) => t.value);
        if (phones.length > 0) {
            text += `. Phone${phones.length > 1 ? 's' : ''}: ${phones.join(', ')}`;
        }
    }
    // Add managing organization
    if (patient.managingOrganization && patient.managingOrganization.display) {
        text += `. Managing org: ${patient.managingOrganization.display}`;
    }
    // Add deceased info
    if (patient.deceasedDateTime) {
        text += `. Deceased: ${patient.deceasedDateTime}`;
    }
    else if (patient.deceasedBoolean) {
        text += '. Deceased: true';
    }
    return text + '.';
}
function generateObservationNarrative(observation) {
    let text = 'Observation';
    if (observation.code && observation.code.text) {
        text += `: ${observation.code.text}`;
    }
    else if (observation.code && observation.code.coding && observation.code.coding[0]) {
        text += `: ${observation.code.coding[0].display || observation.code.coding[0].code}`;
    }
    if (observation.valueQuantity) {
        text += ` = ${observation.valueQuantity.value}`;
        if (observation.valueQuantity.unit) {
            text += ` ${observation.valueQuantity.unit}`;
        }
    }
    else if (observation.valueString) {
        text += ` = ${observation.valueString}`;
    }
    else if (observation.valueCodeableConcept) {
        text += ` = ${observation.valueCodeableConcept.text || observation.valueCodeableConcept.coding?.[0]?.display}`;
    }
    if (observation.effectiveDateTime) {
        text += ` (${observation.effectiveDateTime})`;
    }
    return text + '.';
}
function generateConditionNarrative(condition) {
    let text = 'Condition';
    if (condition.code && condition.code.text) {
        text += `: ${condition.code.text}`;
    }
    else if (condition.code && condition.code.coding && condition.code.coding[0]) {
        text += `: ${condition.code.coding[0].display || condition.code.coding[0].code}`;
    }
    if (condition.clinicalStatus) {
        text += ` (${condition.clinicalStatus.text || condition.clinicalStatus.coding?.[0]?.display || 'status unknown'})`;
    }
    return text + '.';
}
function generateProcedureNarrative(procedure) {
    let text = 'Procedure';
    if (procedure.code && procedure.code.text) {
        text += `: ${procedure.code.text}`;
    }
    else if (procedure.code && procedure.code.coding && procedure.code.coding[0]) {
        text += `: ${procedure.code.coding[0].display || procedure.code.coding[0].code}`;
    }
    if (procedure.performedDateTime) {
        text += ` performed on ${procedure.performedDateTime}`;
    }
    return text + '.';
}
function generateEncounterNarrative(encounter) {
    let text = 'Encounter';
    if (encounter.class && encounter.class.display) {
        text += ` (${encounter.class.display})`;
    }
    if (encounter.period && encounter.period.start) {
        text += ` started ${encounter.period.start}`;
        if (encounter.period.end) {
            text += `, ended ${encounter.period.end}`;
        }
    }
    return text + '.';
}
function generateDiagnosticReportNarrative(report) {
    let text = 'Diagnostic Report';
    if (report.code && report.code.text) {
        text += `: ${report.code.text}`;
    }
    else if (report.code && report.code.coding && report.code.coding[0]) {
        text += `: ${report.code.coding[0].display || report.code.coding[0].code}`;
    }
    if (report.effectiveDateTime) {
        text += ` (${report.effectiveDateTime})`;
    }
    return text + '.';
}
function generateMedicationNarrative(medication) {
    let text = 'Medication';
    if (medication.code && medication.code.text) {
        text += `: ${medication.code.text}`;
    }
    else if (medication.code && medication.code.coding && medication.code.coding[0]) {
        text += `: ${medication.code.coding[0].display || medication.code.coding[0].code}`;
    }
    return text + '.';
}
function generateImmunizationNarrative(immunization) {
    let text = 'Immunization';
    if (immunization.vaccineCode && immunization.vaccineCode.text) {
        text += `: ${immunization.vaccineCode.text}`;
    }
    else if (immunization.vaccineCode && immunization.vaccineCode.coding && immunization.vaccineCode.coding[0]) {
        text += `: ${immunization.vaccineCode.coding[0].display || immunization.vaccineCode.coding[0].code}`;
    }
    if (immunization.occurrenceDateTime) {
        text += ` given on ${immunization.occurrenceDateTime}`;
    }
    return text + '.';
}
// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});
app.listen(PORT, () => {
    console.log(`🚀 FHIR Converter Backend running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
});
exports.default = app;
