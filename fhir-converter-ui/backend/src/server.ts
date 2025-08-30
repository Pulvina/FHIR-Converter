import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { ModularTemplateEngine } from './ModularTemplateEngine';
import { ValuesetService } from './services/ValuesetService';
import { IntelligentTemplateService } from './services/IntelligentTemplateService';
import { validationService } from './services/validationService';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize modular template detection engine
const templateEngine = new ModularTemplateEngine();

// Initialize valueset service
const valuesetService = ValuesetService.getInstance();

// Initialize intelligent template service
const intelligentTemplateService = IntelligentTemplateService.getInstance();

app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    cb(null, `${uniqueId}_${file.originalname}`);
  },
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.hl7', '.ccda', '.json', '.xml', '.txt'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt) || file.mimetype === 'text/plain' || file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed types: .hl7, .ccda, .json, .xml, .txt'));
    }
  }
});

interface ConversionRequest {
  inputType: 'hl7v2' | 'ccda' | 'json' | 'stu3';
  outputFormat?: 'fhir' | 'hl7v2';
  templateName?: string;
}

interface ConversionResult {
  success: boolean;
  data?: any;
  error?: string;
  inputType: string;
  outputFormat: string;
  templateUsed?: string;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'FHIR Converter API is running' });
});

// Get available templates for a conversion type
app.get('/api/templates/:inputType', async (req, res) => {
  try {
    const { inputType } = req.params;
    const templatesPath = path.resolve('../../data/Templates');
    
    let templateDir: string;
    switch (inputType.toLowerCase()) {
      case 'hl7v2':
        templateDir = path.join(templatesPath, 'Hl7v2');
        break;
      case 'ccda':
        templateDir = path.join(templatesPath, 'Ccda');
        break;
      case 'json':
        templateDir = path.join(templatesPath, 'Json');
        break;
      case 'stu3':
        templateDir = path.join(templatesPath, 'Stu3ToR4');
        break;
      default:
        return res.status(400).json({ error: 'Invalid input type' });
    }

    if (await fs.pathExists(templateDir)) {
      let templates: any[] = [];
      
      // Get templates from main directory
      const files = await fs.readdir(templateDir);
      const mainTemplates = files
        .filter(file => file.endsWith('.liquid'))
        .map(file => ({
          name: file,
          displayName: file.replace('.liquid', '').replace(/_/g, ' ')
        }));
      
      templates = [...templates, ...mainTemplates];
      
      // For JSON templates, also include Patient subfolder
      if (inputType.toLowerCase() === 'json') {
        const patientDir = path.join(templateDir, 'Patient');
        if (await fs.pathExists(patientDir)) {
          const patientFiles = await fs.readdir(patientDir);
          const patientTemplates = patientFiles
            .filter(file => file.endsWith('.liquid'))
            .map(file => ({
              name: file,
              displayName: file.replace('.liquid', '').replace(/_/g, ' ') + ' (Patient)'
            }));
          
          templates = [...templates, ...patientTemplates];
        }
      }
      
      res.json({ templates });
    } else {
      res.json({ templates: [] });
    }
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get available sample data files
app.get('/api/samples/:inputType', async (req, res) => {
  try {
    const { inputType } = req.params;
    const samplesPath = path.resolve('../../data/SampleData');
    
    let sampleDir: string;
    switch (inputType.toLowerCase()) {
      case 'hl7v2':
        sampleDir = path.join(samplesPath, 'Hl7v2');
        break;
      case 'ccda':
        sampleDir = path.join(samplesPath, 'Ccda');
        break;
      case 'json':
        sampleDir = path.join(samplesPath, 'Json');
        break;
      case 'stu3':
        sampleDir = path.join(samplesPath, 'Stu3');
        break;
      case 'fhir':
        sampleDir = path.join(samplesPath, 'FHIR');
        break;
      default:
        return res.status(400).json({ error: 'Invalid input type' });
    }

    if (await fs.pathExists(sampleDir)) {
      const samples: any[] = [];
      
      // Helper function to scan directory recursively
      const scanDirectory = async (dir: string, prefix: string = '') => {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
          if (item.name.startsWith('.')) continue;
          
          const itemPath = path.join(dir, item.name);
          
          if (item.isDirectory()) {
            // Recursively scan subdirectories
            const folderPrefix = prefix ? `${prefix}/${item.name}` : item.name;
            await scanDirectory(itemPath, folderPrefix);
          } else if (item.isFile()) {
            // Add file to samples
            const fileName = prefix ? `${prefix}/${item.name}` : item.name;
            const displayName = item.name.replace(/\.(hl7|ccda|json)$/, '').replace(/-/g, ' ');
            const folderName = prefix ? ` (${prefix})` : '';
            
            samples.push({
              name: fileName,
              displayName: `${displayName}${folderName}`,
              type: getFileDescription(item.name),
              size: 0
            });
          }
        }
      };
      
      await scanDirectory(sampleDir);
      res.json({ samples });
    } else {
      res.json({ samples: [] });
    }
  } catch (error) {
    console.error('Error fetching samples:', error);
    res.status(500).json({ error: 'Failed to fetch samples' });
  }
});

// Get sample file content
app.get('/api/samples/:inputType/:filename', async (req, res) => {
  try {
    const { inputType, filename } = req.params;
    const samplesPath = path.resolve('../../data/SampleData');
    
    let sampleDir: string;
    switch (inputType.toLowerCase()) {
      case 'hl7v2':
        sampleDir = path.join(samplesPath, 'Hl7v2');
        break;
      case 'ccda':
        sampleDir = path.join(samplesPath, 'Ccda');
        break;
      case 'json':
        sampleDir = path.join(samplesPath, 'Json');
        break;
      case 'stu3':
        sampleDir = path.join(samplesPath, 'Stu3');
        break;
      case 'fhir':
        sampleDir = path.join(samplesPath, 'FHIR');
        break;
      default:
        return res.status(400).json({ error: 'Invalid input type' });
    }

    const filePath = path.join(sampleDir, filename);
    
    // Security check - ensure the file is within the samples directory
    if (!filePath.startsWith(sampleDir)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    if (await fs.pathExists(filePath)) {
      const content = await fs.readFile(filePath, 'utf8');
      const stats = await fs.stat(filePath);
      
      res.json({ 
        content,
        filename,
        size: stats.size,
        type: getFileDescription(filename)
      });
    } else {
      res.status(404).json({ error: 'Sample file not found' });
    }
  } catch (error) {
    console.error('Error reading sample file:', error);
    res.status(500).json({ error: 'Failed to read sample file' });
  }
});

function getFileDescription(filename: string): string {
  const name = filename.toLowerCase();
  
  // HL7v2 message types
  if (name.includes('adt')) return 'Admission/Discharge/Transfer';
  if (name.includes('oru')) return 'Observation Result';
  if (name.includes('orm')) return 'Order Message';
  if (name.includes('mdm')) return 'Medical Document Management';
  if (name.includes('vxu')) return 'Vaccination Update';
  if (name.includes('siu')) return 'Scheduling Information';
  if (name.includes('bar')) return 'Billing Account Record';
  if (name.includes('dft')) return 'Detail Financial Transaction';
  
  // C-CDA document types  
  if (name.includes('ccd')) return 'Continuity of Care Document';
  if (name.includes('consultation')) return 'Consultation Note';
  if (name.includes('discharge')) return 'Discharge Summary';
  if (name.includes('history')) return 'History and Physical';
  if (name.includes('operative')) return 'Operative Note';
  if (name.includes('procedure')) return 'Procedure Note';
  if (name.includes('progress')) return 'Progress Note';
  if (name.includes('referral')) return 'Referral Note';
  if (name.includes('transfer')) return 'Transfer Summary';
  
  // FHIR/JSON
  if (name.includes('patient')) return 'Patient Resource';
  if (name.includes('observation')) return 'Observation Resource';
  if (name.includes('bundle')) return 'FHIR Bundle';
  if (name.includes('charge')) return 'Charge Item';
  
  return 'Healthcare Document';
}

// File conversion endpoint
app.post('/api/convert', upload.single('file'), async (req, res) => {
  let tempOutputPath: string | null = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { inputType, outputFormat = 'fhir', templateName } = req.body as ConversionRequest;
    
    if (!inputType) {
      return res.status(400).json({ error: 'Input type is required' });
    }

    const inputFilePath = req.file.path;
    const outputFileName = `converted_${uuidv4()}.json`;
    tempOutputPath = path.join(__dirname, '../temp', outputFileName);
    
    // Ensure temp directory exists
    await fs.ensureDir(path.dirname(tempOutputPath));

    const result = await convertFile(inputFilePath, tempOutputPath, inputType, outputFormat, templateName);
    
    // Clean up input file
    await fs.remove(inputFilePath);
    
    res.json(result);
    
  } catch (error: any) {
    console.error('Conversion error:', error);
    
    // Clean up files
    if (req.file?.path) {
      await fs.remove(req.file.path).catch(() => {});
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Conversion failed',
      inputType: req.body.inputType || 'unknown',
      outputFormat: req.body.outputFormat || 'fhir'
    } as ConversionResult);
  } finally {
    // Clean up temp output file after a delay
    if (tempOutputPath) {
      setTimeout(async () => {
        try {
          await fs.remove(tempOutputPath!);
        } catch (error) {
          console.error('Failed to clean up temp file:', error);
        }
      }, 30000); // Clean up after 30 seconds
    }
  }
});

// Text input conversion endpoint
app.post('/api/convert/text', async (req, res) => {
  let tempInputPath: string | null = null;
  let tempOutputPath: string | null = null;
  
  try {
    const { inputText, inputType, outputFormat = 'fhir', templateName } = req.body;
    
    if (!inputText || !inputType) {
      return res.status(400).json({ error: 'Input text and type are required' });
    }

    // Create temporary input file
    const inputFileName = `temp_input_${uuidv4()}.txt`;
    tempInputPath = path.join(__dirname, '../temp', inputFileName);
    const outputFileName = `converted_${uuidv4()}.json`;
    tempOutputPath = path.join(__dirname, '../temp', outputFileName);
    
    // Ensure temp directory exists
    await fs.ensureDir(path.dirname(tempInputPath));
    
    // Write input text to temporary file
    await fs.writeFile(tempInputPath, inputText, 'utf8');

    // Auto-detect template for JSON input if no template specified
    let finalTemplateName = templateName;
    if (!templateName && inputType.toLowerCase() === 'json') {
      try {
        const parsedInput = JSON.parse(inputText);
        
        // Try intelligent system first
        console.log('🧠 Attempting intelligent template generation...');
        const intelligentResult = await intelligentTemplateService.processIntelligentConversion(parsedInput);
        
        if (intelligentResult.success && intelligentResult.confidence > 0.6) {
          console.log(`✨ Intelligent system succeeded with ${(intelligentResult.confidence * 100).toFixed(1)}% confidence`);
          
          // Use the intelligent template
          finalTemplateName = intelligentResult.generatedTemplateName;
          console.log(`Using intelligent template: ${finalTemplateName}`);
        } else {
          console.log(`🔄 Intelligent system failed (${(intelligentResult.confidence * 100).toFixed(1)}% confidence), falling back to static templates...`);
          
          // Fallback to static template detection
          const analysis = templateEngine.selectBestTemplate(parsedInput);
          
          console.log(`Template analysis result: ${analysis.selected.templateName} (confidence: ${analysis.selected.confidence}%)`);
          
          if (analysis.selected.confidence >= 30) {
            finalTemplateName = analysis.selected.templateName;
            console.log(`Auto-selected template: ${finalTemplateName} (confidence: ${analysis.selected.confidence}%)`);
          } else {
            console.log(`Confidence too low (${analysis.selected.confidence}%), falling back to ExamplePatient`);
          }
        }
      } catch (error) {
        console.warn('Failed to auto-detect template:', error);
      }
    }

    const result = await convertFile(tempInputPath, tempOutputPath, inputType, outputFormat, finalTemplateName);
    
    res.json(result);
    
  } catch (error: any) {
    console.error('Text conversion error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Conversion failed',
      inputType: req.body.inputType || 'unknown',
      outputFormat: req.body.outputFormat || 'fhir'
    } as ConversionResult);
  } finally {
    // Clean up temp files
    if (tempInputPath) {
      await fs.remove(tempInputPath).catch(() => {});
    }
    if (tempOutputPath) {
      setTimeout(async () => {
        try {
          await fs.remove(tempOutputPath!);
        } catch (error) {
          console.error('Failed to clean up temp file:', error);
        }
      }, 30000);
    }
  }
});

// Template analysis endpoint
app.post('/api/analyze-template', async (req, res) => {
  try {
    const { jsonData } = req.body;
    
    if (!jsonData) {
      return res.status(400).json({ error: 'JSON data is required' });
    }

    // Parse JSON if it's a string
    let parsedData = jsonData;
    if (typeof jsonData === 'string') {
      try {
        parsedData = JSON.parse(jsonData);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid JSON format' });
      }
    }

    // Perform comprehensive modular analysis
    const fullAnalysis = templateEngine.analyzeJson(parsedData);

    res.json({
      success: true,
      analysis: {
        resourceDetection: fullAnalysis.resourceDetection,
        selectedResourceType: fullAnalysis.selectedResourceType,
        structure: fullAnalysis.structureAnalysis,
        recommendation: fullAnalysis.recommendation,
        selectedTemplate: fullAnalysis.templateAnalysis?.selected || null,
        alternativeTemplates: fullAnalysis.templateAnalysis?.alternatives || [],
        allScores: templateEngine.scoreTemplates(parsedData)
      }
    });
    
  } catch (error: any) {
    console.error('Template analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Template analysis failed'
    });
  }
});

async function convertFile(
  inputPath: string, 
  outputPath: string, 
  inputType: string, 
  outputFormat: string,
  templateName?: string
): Promise<ConversionResult> {
  return new Promise(async (resolve, reject) => {
    try {
      // Path to the FHIR Converter CLI tool (relative to backend working directory)
      const converterPath = path.resolve('../../src/Microsoft.Health.Fhir.Liquid.Converter.Tool/bin/Debug/net8.0/Microsoft.Health.Fhir.Liquid.Converter.Tool.exe');
      const baseTemplatesPath = path.resolve('../../data/Templates');
      
      // Get the specific template directory based on input type (use absolute paths)
      let templatesPath: string;
      switch (inputType.toLowerCase()) {
        case 'hl7v2':
          templatesPath = path.resolve(baseTemplatesPath, 'Hl7v2');
          break;
        case 'ccda':
          templatesPath = path.resolve(baseTemplatesPath, 'Ccda');
          break;
        case 'json':
          // Use Patient subfolder for Patient resources, otherwise use main Json folder
          if (templateName && templateName.startsWith('Patient')) {
            templatesPath = path.resolve(baseTemplatesPath, 'Json', 'Patient');
          } else {
            templatesPath = path.resolve(baseTemplatesPath, 'Json');
          }
          break;
        case 'stu3':
          templatesPath = path.resolve(baseTemplatesPath, 'Stu3ToR4');
          break;
        case 'fhir':
          templatesPath = path.resolve(baseTemplatesPath, 'FhirToHl7v2');
          break;
        default:
          templatesPath = path.resolve(baseTemplatesPath, 'Hl7v2');
      }
      
      console.log(`Using template directory: ${templatesPath}`);
      
      // Check if template directory and template file exist
      const templateExists = await fs.pathExists(templatesPath);
      console.log(`Template directory exists: ${templateExists}`);
      
      if (templateName) {
        const templateFilePath = path.join(templatesPath, templateName);
        const templateFileExists = await fs.pathExists(templateFilePath);
        console.log(`Template file '${templateName}' exists: ${templateFileExists}`);
      }
      
      // Build command arguments for the convert subcommand (ensure all paths are absolute)
      const args: string[] = [
        'convert',
        '-d', templatesPath,
        '-n', path.resolve(inputPath),
        '-f', path.resolve(outputPath)
      ];

      // Add root template if specified, otherwise use a default
      // IMPORTANT: Remove .liquid extension as CLI tool expects name without extension
      if (templateName) {
        const templateNameWithoutExt = templateName.replace('.liquid', '');
        args.push('-r', templateNameWithoutExt);
      } else {
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
      
      const converterProcess = spawn(converterPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 30000, // 30 second timeout
        cwd: path.resolve('../../') // Set working directory to FHIR-Converter root
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
            if (await fs.pathExists(outputPath)) {
              const outputData = await fs.readFile(outputPath, 'utf8');
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
              } catch (parseError) {
                // If it's not JSON, return as text
                resolve({
                  success: true,
                  data: outputData,
                  inputType,
                  outputFormat,
                  templateUsed: templateName
                });
              }
            } else {
              reject(new Error('Conversion completed but no output file was generated'));
            }
          } else {
            const errorMessage = stderr || stdout || `Converter process exited with code ${code}`;
            reject(new Error(`Conversion failed: ${errorMessage}`));
          }
        } catch (error) {
          reject(error);
        }
      });

      converterProcess.on('error', (error) => {
        reject(new Error(`Failed to start converter process: ${error.message}`));
      });

    } catch (error) {
      reject(error);
    }
  });
}

function addNarrativeText(fhirResource: any): any {
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
  const orderedResource: any = {};
  
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

function generatePatientNarrative(patient: any): string {
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
    const mrn = patient.identifier.find((id: any) => 
      id.type && id.type.coding && id.type.coding.some((c: any) => c.code === 'MR')
    );
    if (mrn && mrn.value) {
      text += `. MRN: ${mrn.value}`;
    }
  }
  
  // Add phone numbers
  if (patient.telecom) {
    const phones = patient.telecom.filter((t: any) => t.system === 'phone').map((t: any) => t.value);
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
  } else if (patient.deceasedBoolean) {
    text += '. Deceased: true';
  }
  
  return text + '.';
}

function generateObservationNarrative(observation: any): string {
  let text = 'Observation';
  
  if (observation.code && observation.code.text) {
    text += `: ${observation.code.text}`;
  } else if (observation.code && observation.code.coding && observation.code.coding[0]) {
    text += `: ${observation.code.coding[0].display || observation.code.coding[0].code}`;
  }
  
  if (observation.valueQuantity) {
    text += ` = ${observation.valueQuantity.value}`;
    if (observation.valueQuantity.unit) {
      text += ` ${observation.valueQuantity.unit}`;
    }
  } else if (observation.valueString) {
    text += ` = ${observation.valueString}`;
  } else if (observation.valueCodeableConcept) {
    text += ` = ${observation.valueCodeableConcept.text || observation.valueCodeableConcept.coding?.[0]?.display}`;
  }
  
  if (observation.effectiveDateTime) {
    text += ` (${observation.effectiveDateTime})`;
  }
  
  return text + '.';
}

function generateConditionNarrative(condition: any): string {
  let text = 'Condition';
  
  if (condition.code && condition.code.text) {
    text += `: ${condition.code.text}`;
  } else if (condition.code && condition.code.coding && condition.code.coding[0]) {
    text += `: ${condition.code.coding[0].display || condition.code.coding[0].code}`;
  }
  
  if (condition.clinicalStatus) {
    text += ` (${condition.clinicalStatus.text || condition.clinicalStatus.coding?.[0]?.display || 'status unknown'})`;
  }
  
  return text + '.';
}

function generateProcedureNarrative(procedure: any): string {
  let text = 'Procedure';
  
  if (procedure.code && procedure.code.text) {
    text += `: ${procedure.code.text}`;
  } else if (procedure.code && procedure.code.coding && procedure.code.coding[0]) {
    text += `: ${procedure.code.coding[0].display || procedure.code.coding[0].code}`;
  }
  
  if (procedure.performedDateTime) {
    text += ` performed on ${procedure.performedDateTime}`;
  }
  
  return text + '.';
}

function generateEncounterNarrative(encounter: any): string {
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

function generateDiagnosticReportNarrative(report: any): string {
  let text = 'Diagnostic Report';
  
  if (report.code && report.code.text) {
    text += `: ${report.code.text}`;
  } else if (report.code && report.code.coding && report.code.coding[0]) {
    text += `: ${report.code.coding[0].display || report.code.coding[0].code}`;
  }
  
  if (report.effectiveDateTime) {
    text += ` (${report.effectiveDateTime})`;
  }
  
  return text + '.';
}

function generateMedicationNarrative(medication: any): string {
  let text = 'Medication';
  
  if (medication.code && medication.code.text) {
    text += `: ${medication.code.text}`;
  } else if (medication.code && medication.code.coding && medication.code.coding[0]) {
    text += `: ${medication.code.coding[0].display || medication.code.coding[0].code}`;
  }
  
  return text + '.';
}

function generateImmunizationNarrative(immunization: any): string {
  let text = 'Immunization';
  
  if (immunization.vaccineCode && immunization.vaccineCode.text) {
    text += `: ${immunization.vaccineCode.text}`;
  } else if (immunization.vaccineCode && immunization.vaccineCode.coding && immunization.vaccineCode.coding[0]) {
    text += `: ${immunization.vaccineCode.coding[0].display || immunization.vaccineCode.coding[0].code}`;
  }
  
  if (immunization.occurrenceDateTime) {
    text += ` given on ${immunization.occurrenceDateTime}`;
  }
  
  return text + '.';
}

// Intelligent template generation endpoints
app.post('/api/intelligent/analyze', async (req, res) => {
  try {
    const { jsonInput } = req.body;
    
    if (!jsonInput) {
      return res.status(400).json({ error: 'JSON input is required' });
    }

    const analysis = await intelligentTemplateService.getTemplateAnalysis(jsonInput);
    res.json(analysis);
  } catch (error) {
    console.error('Error in intelligent analysis:', error);
    res.status(500).json({ error: 'Failed to analyze input structure' });
  }
});

app.post('/api/intelligent/convert', async (req, res) => {
  try {
    const { jsonInput } = req.body;
    
    if (!jsonInput) {
      return res.status(400).json({ error: 'JSON input is required' });
    }

    console.log('Processing intelligent conversion for input...');
    const result = await intelligentTemplateService.processIntelligentConversion(jsonInput);
    
    res.json(result);
  } catch (error) {
    console.error('Error in intelligent conversion:', error);
    res.status(500).json({ error: 'Failed to process intelligent conversion' });
  }
});

app.get('/api/intelligent/cache-stats', (req, res) => {
  try {
    const stats = intelligentTemplateService.getCacheStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache statistics' });
  }
});

app.delete('/api/intelligent/cleanup', async (req, res) => {
  try {
    await intelligentTemplateService.cleanupGeneratedTemplates();
    res.json({ message: 'Generated templates cleaned up successfully' });
  } catch (error) {
    console.error('Error cleaning up templates:', error);
    res.status(500).json({ error: 'Failed to cleanup generated templates' });
  }
});

// Valueset validation endpoints
app.get('/api/valuesets', (req, res) => {
  try {
    const allValidCodes = valuesetService.getAllValidCodes();
    res.json(allValidCodes);
  } catch (error) {
    console.error('Error getting valuesets:', error);
    res.status(500).json({ error: 'Failed to retrieve valuesets' });
  }
});

app.post('/api/validate/gender', (req, res) => {
  try {
    const { value } = req.body;
    const normalized = valuesetService.normalizeGender(value);
    const isValid = valuesetService.isValidGender(normalized);
    const display = valuesetService.getGenderDisplay(normalized);
    
    res.json({
      original: value,
      normalized,
      isValid,
      display
    });
  } catch (error) {
    console.error('Error validating gender:', error);
    res.status(500).json({ error: 'Failed to validate gender' });
  }
});

app.post('/api/validate/name-use', (req, res) => {
  try {
    const { value } = req.body;
    const normalized = valuesetService.normalizeNameUse(value);
    const isValid = valuesetService.isValidNameUse(normalized);
    const display = valuesetService.getNameUseDisplay(normalized);
    
    res.json({
      original: value,
      normalized,
      isValid,
      display
    });
  } catch (error) {
    console.error('Error validating name use:', error);
    res.status(500).json({ error: 'Failed to validate name use' });
  }
});

app.post('/api/validate/contact-point', (req, res) => {
  try {
    const { system, use } = req.body;
    const normalizedSystem = valuesetService.normalizeContactPointSystem(system);
    const normalizedUse = valuesetService.normalizeContactPointUse(use);
    
    const systemValid = valuesetService.isValidContactPointSystem(normalizedSystem);
    const useValid = valuesetService.isValidContactPointUse(normalizedUse);
    
    const systemDisplay = valuesetService.getContactPointSystemDisplay(normalizedSystem);
    const useDisplay = valuesetService.getContactPointUseDisplay(normalizedUse);
    
    res.json({
      system: {
        original: system,
        normalized: normalizedSystem,
        isValid: systemValid,
        display: systemDisplay
      },
      use: {
        original: use,
        normalized: normalizedUse,
        isValid: useValid,
        display: useDisplay
      }
    });
  } catch (error) {
    console.error('Error validating contact point:', error);
    res.status(500).json({ error: 'Failed to validate contact point' });
  }
});

app.post('/api/validate/address', (req, res) => {
  try {
    const { use, type } = req.body;
    const normalizedUse = valuesetService.normalizeAddressUse(use);
    const normalizedType = valuesetService.normalizeAddressType(type);
    
    const useValid = valuesetService.isValidAddressUse(normalizedUse);
    const typeValid = valuesetService.isValidAddressType(normalizedType);
    
    const useDisplay = valuesetService.getAddressUseDisplay(normalizedUse);
    const typeDisplay = valuesetService.getAddressTypeDisplay(normalizedType);
    
    res.json({
      use: {
        original: use,
        normalized: normalizedUse,
        isValid: useValid,
        display: useDisplay
      },
      type: {
        original: type,
        normalized: normalizedType,
        isValid: typeValid,
        display: typeDisplay
      }
    });
  } catch (error) {
    console.error('Error validating address:', error);
    res.status(500).json({ error: 'Failed to validate address' });
  }
});

// FHIR Validation endpoints
app.post('/api/validate/resource', async (req, res) => {
  try {
    const { resource } = req.body;
    
    if (!resource) {
      return res.status(400).json({ error: 'Resource is required' });
    }

    const validationResult = await validationService.validateResource(resource);
    
    res.json({
      success: true,
      validation: validationResult
    });
  } catch (error: any) {
    console.error('Error validating resource:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to validate resource' 
    });
  }
});

app.post('/api/validate/resources', async (req, res) => {
  try {
    const { resources } = req.body;
    
    if (!resources || !Array.isArray(resources)) {
      return res.status(400).json({ error: 'Resources array is required' });
    }

    const validationResults = await validationService.validateResources(resources);
    
    res.json({
      success: true,
      validations: validationResults
    });
  } catch (error: any) {
    console.error('Error validating resources:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to validate resources' 
    });
  }
});

app.post('/api/validate/bundle', async (req, res) => {
  try {
    const { bundle } = req.body;
    
    if (!bundle) {
      return res.status(400).json({ error: 'Bundle is required' });
    }

    const validationResult = await validationService.validateBundle(bundle);
    
    res.json({
      success: true,
      validation: validationResult
    });
  } catch (error: any) {
    console.error('Error validating bundle:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to validate bundle' 
    });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 FHIR Converter Backend running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
});

export default app;

