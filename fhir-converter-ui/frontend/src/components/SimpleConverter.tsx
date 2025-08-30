import React, { useState, useEffect } from 'react';
import { Upload, FileText, Database, ArrowRight, Loader2, Download, Check, Shield, AlertTriangle, AlertCircle } from 'lucide-react';
import { ConversionRequest, ConversionResult, Template, SampleFile, InputType, OutputFormat } from '../types';
import { apiService } from '../services/api';
import './SimpleConverter.css';

const SimpleConverter: React.FC = () => {
  // Form state
  const [inputType, setInputType] = useState<InputType>('json');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('fhir');
  const [templateName, setTemplateName] = useState<string>('');
  const [inputMode, setInputMode] = useState<'sample' | 'upload' | 'text'>('sample');
  
  // Data
  const [templates, setTemplates] = useState<Template[]>([]);
  const [samples, setSamples] = useState<SampleFile[]>([]);
  const [selectedSample, setSelectedSample] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  
  // Results
  const [isConverting, setIsConverting] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [sampleContent, setSampleContent] = useState<string>('');
  
  // Validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validationError, setValidationError] = useState<string>('');

  // Load templates when input type changes
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await apiService.getTemplates(inputType);
        setTemplates(response.templates);
        setTemplateName('');
      } catch (err) {
        console.error('Failed to load templates:', err);
        setTemplates([]);
      }
    };
    loadTemplates();
  }, [inputType]);

  // Load samples when input type changes
  useEffect(() => {
    const loadSamples = async () => {
      try {
        const response = await apiService.getSamples(inputType);
        setSamples(response.samples);
        setSelectedSample('');
      } catch (err) {
        console.error('Failed to load samples:', err);
        setSamples([]);
      }
    };
    loadSamples();
  }, [inputType]);

  // Load sample content when sample is selected
  useEffect(() => {
    const loadSampleContent = async () => {
      if (selectedSample && inputMode === 'sample') {
        try {
          const response = await apiService.getSampleContent(inputType, selectedSample);
          setSampleContent(response.content);
        } catch (err) {
          console.error('Failed to load sample content:', err);
          setSampleContent('');
        }
      } else {
        setSampleContent('');
      }
    };
    loadSampleContent();
  }, [selectedSample, inputType, inputMode]);

  const handleConvert = async () => {
    setError('');
    setResult(null);
    setValidationResult(null);
    setValidationError('');
    setIsConverting(true);

    try {
      const conversionRequest: ConversionRequest = {
        inputType,
        outputFormat,
        templateName: templateName || undefined,
      };

      let conversionResult: ConversionResult;

      if (inputMode === 'sample' && selectedSample) {
        // Load sample content first
        const sampleContent = await apiService.getSampleContent(inputType, selectedSample);
        conversionResult = await apiService.convertText(sampleContent.content, conversionRequest);
      } else if (inputMode === 'upload' && uploadedFile) {
        conversionResult = await apiService.convertFile(uploadedFile, conversionRequest);
      } else if (inputMode === 'text' && textInput.trim()) {
        conversionResult = await apiService.convertText(textInput, conversionRequest);
      } else {
        throw new Error('Please provide input data');
      }

      setResult(conversionResult);
      
      if (!conversionResult.success && conversionResult.error) {
        setError(conversionResult.error);
      }
    } catch (err: any) {
      console.error('Conversion failed:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Conversion failed';
      setError(errorMessage);
    } finally {
      setIsConverting(false);
    }
  };

  const handleValidate = async () => {
    if (!result || !result.success) {
      setValidationError('No successful conversion result to validate');
      return;
    }

    setValidationError('');
    setValidationResult(null);
    setIsValidating(true);

    try {
      const response = await apiService.validateResource(result.data);
      setValidationResult(response.validation);
    } catch (err: any) {
      console.error('Validation failed:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Validation failed';
      setValidationError(errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  const canConvert = 
    (inputMode === 'sample' && selectedSample) ||
    (inputMode === 'upload' && uploadedFile) ||
    (inputMode === 'text' && textInput.trim());

  const handleCopy = async () => {
    if (!result) return;
    
    const content = typeof result.data === 'string' 
      ? result.data 
      : JSON.stringify(result.data, null, 2);
    
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    
    const content = typeof result.data === 'string' 
      ? result.data 
      : JSON.stringify(result.data, null, 2);
    
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fhir-conversion-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="simple-converter">
      <div className="converter-split">
        {/* Left Side - Input Configuration */}
        <div className="input-panel">
          <h2>Convert Healthcare Data</h2>
          
          {/* Conversion Direction */}
          <div className="form-section">
            <h3>Conversion Type</h3>
            <div className="conversion-flow">
              <div className="format-group">
                <label>From:</label>
                <select 
                  value={inputType} 
                  onChange={(e) => setInputType(e.target.value as InputType)}
                >
                  <option value="hl7v2">HL7v2</option>
                  <option value="ccda">C-CDA</option>
                  <option value="json">JSON</option>
                  <option value="stu3">FHIR STU3</option>
                  <option value="fhir">FHIR R4</option>
                </select>
              </div>
              
              <ArrowRight className="arrow" />
              
              <div className="format-group">
                <label>To:</label>
                <select 
                  value={outputFormat} 
                  onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                >
                  <option value="fhir">FHIR R4</option>
                  {inputType === 'fhir' && <option value="hl7v2">HL7v2</option>}
                </select>
              </div>
            </div>
          </div>

          {/* Template Selection */}
          <div className="form-section">
            <h3>Template</h3>
            <select 
              value={templateName} 
              onChange={(e) => setTemplateName(e.target.value)}
            >
              <option value="">Auto-detect</option>
              {templates.map((template) => (
                <option key={template.name} value={template.name}>
                  {template.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Input Data */}
          <div className="form-section">
            <h3>Input Data</h3>
            
            {/* Input Mode Tabs */}
            <div className="input-tabs">
              <button 
                className={inputMode === 'sample' ? 'active' : ''}
                onClick={() => setInputMode('sample')}
                title="Use pre-built sample data"
              >
                <Database size={16} />
                Sample
              </button>
              <button 
                className={inputMode === 'upload' ? 'active' : ''}
                onClick={() => setInputMode('upload')}
                title="Upload a file from your computer"
              >
                <Upload size={16} />
                Upload
              </button>
              <button 
                className={inputMode === 'text' ? 'active' : ''}
                onClick={() => setInputMode('text')}
                title="Paste or type data directly"
              >
                <FileText size={16} />
                Text
              </button>
            </div>

            {/* Input Content */}
            <div className="input-content">
              {inputMode === 'sample' && (
                <div className="input-section">
                  <label className="input-label">Choose Sample:</label>
                  <select 
                    value={selectedSample} 
                    onChange={(e) => setSelectedSample(e.target.value)}
                    className="input-select"
                  >
                    <option value="">Select a sample file...</option>
                    {samples.map((sample) => (
                      <option key={sample.name} value={sample.name}>
                        {sample.displayName}
                      </option>
                    ))}
                  </select>
                  {selectedSample && (
                    <div className="sample-preview">
                      <div className="sample-preview-header">
                        <span className="sample-name">Sample: {samples.find(s => s.name === selectedSample)?.displayName}</span>
                        <span className="sample-size">{sampleContent.length} characters</span>
                      </div>
                      {sampleContent && (
                        <div className="sample-content">
                          <pre className="sample-code">{sampleContent}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {inputMode === 'upload' && (
                <div className="input-section">
                  <label className="input-label">Select File:</label>
                  <div className="file-upload-area">
                    <input
                      type="file"
                      accept=".hl7,.ccda,.json,.xml,.txt"
                      onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                      id="file-input"
                      className="file-input"
                    />
                    <label htmlFor="file-input" className="file-upload-label">
                      <Upload size={20} />
                      <div>
                        {uploadedFile ? (
                          <>
                            <span className="file-name">{uploadedFile.name}</span>
                            <span className="file-size">({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                          </>
                        ) : (
                          <>
                            <span className="upload-text">Click to upload or drag and drop</span>
                            <span className="upload-hint">Supports: .hl7, .ccda, .json, .xml, .txt</span>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {inputMode === 'text' && (
                <div className="input-section">
                  <label className="input-label">Paste or Type Data:</label>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={`Paste your ${inputType.toUpperCase()} data here...\n\nExample for JSON:\n{\n  "PatientId": 12345,\n  "FirstName": "John",\n  "LastName": "Doe"\n}`}
                    rows={10}
                    className="text-input"
                  />
                  {textInput.trim() && (
                    <p className="input-hint">{textInput.trim().split('\n').length} lines, {textInput.length} characters</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Convert Button */}
          <div className="form-section">
            <button 
              onClick={handleConvert}
              disabled={!canConvert || isConverting}
              className="convert-button"
            >
              {isConverting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  Convert to {outputFormat.toUpperCase()}
                </>
              )}
            </button>
            
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Results */}
        <div className="results-panel">
          <h2>Conversion Result</h2>
          
          {!result && !isConverting && (
            <div className="empty-results">
              <p>Configure your conversion settings and click "Convert" to see results here.</p>
            </div>
          )}

          {result && (
            <div className="result-content">
              {result.success ? (
                <div>
                  <div className="result-header">
                    <span className="success-badge">✓ Success</span>
                    <div className="result-actions">
                      <button 
                        onClick={handleCopy}
                        className={`action-button ${isCopied ? 'copied' : ''}`}
                      >
                        {isCopied ? (
                          <>
                            <Check size={16} />
                            Copied!
                          </>
                        ) : (
                          <>
                            Copy Result
                          </>
                        )}
                      </button>
                      <button 
                        onClick={handleDownload}
                        className="action-button download-button"
                      >
                        <Download size={16} />
                        Download JSON
                      </button>
                      <button 
                        onClick={handleValidate}
                        disabled={isValidating}
                        className="action-button validate-button"
                      >
                        {isValidating ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Validating...
                          </>
                        ) : (
                          <>
                            <Shield size={16} />
                            Validate FHIR
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <pre className="result-data">
                    {typeof result.data === 'string' 
                      ? result.data 
                      : JSON.stringify(result.data, null, 2)
                    }
                  </pre>

                  {/* Validation Results */}
                  {validationResult && (
                    <div className="validation-results">
                      <div className="validation-header">
                        <h3>
                          {validationResult.valid ? (
                            <>
                              <Shield size={16} className="validation-icon valid" />
                              FHIR Validation: Valid
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={16} className="validation-icon invalid" />
                              FHIR Validation: Invalid
                            </>
                          )}
                        </h3>
                      </div>

                      {validationResult.errors && validationResult.errors.length > 0 && (
                        <div className="validation-section">
                          <h4 className="validation-subheader">
                            <AlertCircle size={14} />
                            Errors ({validationResult.errors.length})
                          </h4>
                          <ul className="validation-list errors">
                            {validationResult.errors.map((error: any, index: number) => (
                              <li key={index} className="validation-item error">
                                <span className="validation-message">{error.message}</span>
                                {error.path && <span className="validation-path">at {error.path}</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {validationResult.warnings && validationResult.warnings.length > 0 && (
                        <div className="validation-section">
                          <h4 className="validation-subheader">
                            <AlertTriangle size={14} />
                            Warnings ({validationResult.warnings.length})
                          </h4>
                          <ul className="validation-list warnings">
                            {validationResult.warnings.map((warning: any, index: number) => (
                              <li key={index} className="validation-item warning">
                                <span className="validation-message">{warning.message}</span>
                                {warning.path && <span className="validation-path">at {warning.path}</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {validationResult.valid && 
                       validationResult.errors.length === 0 && 
                       validationResult.warnings.length === 0 && (
                        <div className="validation-section">
                          <p className="validation-success">
                            ✓ The FHIR resource passed all validation checks
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {validationError && (
                    <div className="validation-results">
                      <div className="validation-header">
                        <h3>
                          <AlertCircle size={16} className="validation-icon invalid" />
                          Validation Error
                        </h3>
                      </div>
                      <div className="validation-error">
                        {validationError}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="error-result">
                  <span className="error-badge">✗ Error</span>
                  <p>{result.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleConverter;