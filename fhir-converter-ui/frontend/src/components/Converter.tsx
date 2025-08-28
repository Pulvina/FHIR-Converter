import React, { useState, useEffect } from 'react';
import { Upload, FileText, Settings, Loader2, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { ConversionRequest, ConversionResult, Template, ConversionMode, ConversionDirection, InputType, OutputFormat } from '../types';
import { apiService } from '../services/api';
import ConversionResults from './ConversionResults';
import ConversionDirectionSelector from './ConversionDirectionSelector';
import SampleDataBrowser from './SampleDataBrowser';
import './Converter.css';

const Converter: React.FC = () => {
  // Step state
  const [currentStep, setCurrentStep] = useState(1);
  
  // Conversion configuration
  const [selectedDirection, setSelectedDirection] = useState<ConversionDirection | null>(null);
  const [mode, setMode] = useState<ConversionMode>('sample');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [templateName, setTemplateName] = useState<string>('');
  const [templates, setTemplates] = useState<Template[]>([]);
  
  // UI state
  const [isConverting, setIsConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load templates when direction changes
  useEffect(() => {
    const loadTemplates = async () => {
      if (!selectedDirection) {
        setTemplates([]);
        return;
      }
      
      try {
        const response = await apiService.getTemplates(selectedDirection.from);
        setTemplates(response.templates);
        setTemplateName(''); // Reset template selection
      } catch (err) {
        console.error('Failed to load templates:', err);
        setTemplates([]);
      }
    };

    loadTemplates();
  }, [selectedDirection]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
    setError('');
  };

  const handleTextInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(event.target.value);
    setError('');
  };

  const handleSampleSelect = (content: string, filename: string) => {
    setTextInput(content);
    setMode('text'); // Switch to text mode to show the loaded sample
    setError('');
  };

  const handleDirectionChange = (direction: ConversionDirection) => {
    setSelectedDirection(direction);
    setCurrentStep(2);
    setError('');
    setConversionResult(null);
  };

  const handleBackToDirection = () => {
    setCurrentStep(1);
    setSelectedDirection(null);
    setMode('sample');
    setTextInput('');
    setSelectedFile(null);
    setError('');
    setConversionResult(null);
  };

  const handleConvert = async () => {
    if (!selectedDirection) {
      setError('Please select a conversion direction');
      return;
    }

    setError('');
    setConversionResult(null);

    if (mode === 'file' && !selectedFile) {
      setError('Please select a file to convert');
      return;
    }

    if ((mode === 'text' || mode === 'sample') && !textInput.trim()) {
      setError('Please enter text or select a sample to convert');
      return;
    }

    setIsConverting(true);

    try {
      const conversionRequest: ConversionRequest = {
        inputType: selectedDirection.from,
        outputFormat: selectedDirection.to,
        templateName: templateName || undefined,
      };

      let result: ConversionResult;
      if (mode === 'file' && selectedFile) {
        result = await apiService.convertFile(selectedFile, conversionRequest);
      } else {
        result = await apiService.convertText(textInput, conversionRequest);
      }

      setConversionResult(result);
      
      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch (err: any) {
      console.error('Conversion failed:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Conversion failed';
      setError(errorMessage);
    } finally {
      setIsConverting(false);
    }
  };

  const canConvert = selectedDirection && (
    mode === 'file' ? selectedFile : textInput.trim()
  );

  if (currentStep === 1) {
    return (
      <div className="converter">
        <div className="converter-header">
          <h2>FHIR Converter</h2>
          <p>Convert healthcare data between different formats using Microsoft's FHIR Converter</p>
        </div>

        <div className="converter-content">
          <ConversionDirectionSelector
            selectedDirection={selectedDirection}
            onDirectionChange={handleDirectionChange}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="converter">
      <div className="converter-header">
        <div className="step-navigation">
          <button onClick={handleBackToDirection} className="back-btn">
            ← Back to Conversion Types
          </button>
          <div className="selected-conversion">
            <span>Converting: {selectedDirection?.label}</span>
          </div>
        </div>
      </div>

      <div className="converter-content">
        <div className="converter-form">
          {/* Input Mode Selection */}
          <div className="mode-toggle">
            <button
              type="button"
              className={`mode-btn ${mode === 'sample' ? 'active' : ''}`}
              onClick={() => setMode('sample')}
            >
              <Database size={16} />
              Sample Data
            </button>
            <button
              type="button"
              className={`mode-btn ${mode === 'file' ? 'active' : ''}`}
              onClick={() => setMode('file')}
            >
              <Upload size={16} />
              File Upload
            </button>
            <button
              type="button"
              className={`mode-btn ${mode === 'text' ? 'active' : ''}`}
              onClick={() => setMode('text')}
            >
              <FileText size={16} />
              Text Input
            </button>
          </div>

          {/* Input Section */}
          <div className="input-section">
            {mode === 'sample' && selectedDirection && (
              <SampleDataBrowser
                inputType={selectedDirection.from}
                onSampleSelect={handleSampleSelect}
              />
            )}
            
            {mode === 'file' && (
              <div className="file-upload">
                <label htmlFor="file-input" className="file-upload-label">
                  <div className="file-upload-content">
                    <Upload size={24} />
                    <span>
                      {selectedFile ? selectedFile.name : 'Click to select file or drag and drop'}
                    </span>
                    <small>Supported: .hl7, .ccda, .json, .xml, .txt</small>
                  </div>
                </label>
                <input
                  id="file-input"
                  type="file"
                  accept=".hl7,.ccda,.json,.xml,.txt"
                  onChange={handleFileSelect}
                  className="file-input"
                />
              </div>
            )}
            
            {mode === 'text' && (
              <div className="text-input">
                <label htmlFor="text-input" className="text-input-label">
                  {selectedDirection?.from.toUpperCase()} Input
                </label>
                <textarea
                  id="text-input"
                  value={textInput}
                  onChange={handleTextInputChange}
                  placeholder={`Paste your ${selectedDirection?.from.toUpperCase()} data here...`}
                  className="text-input-field"
                  rows={12}
                />
              </div>
            )}
          </div>

          {/* Advanced Options */}
          {(mode === 'file' || mode === 'text' || (mode === 'sample' && textInput)) && (
            <div className="advanced-section">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="advanced-toggle"
              >
                <Settings size={16} />
                Advanced Options
              </button>
              
              {showAdvanced && (
                <div className="advanced-options">
                  <div className="format-group">
                    <label htmlFor="template" className="format-label">
                      Template (Optional)
                    </label>
                    <select
                      id="template"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="format-select"
                    >
                      <option value="">Auto-detect template</option>
                      {templates.map((template) => (
                        <option key={template.name} value={template.name}>
                          {template.displayName}
                        </option>
                      ))}
                    </select>
                    <small className="format-help">
                      Leave blank to automatically select the best template, or choose a specific one
                    </small>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Convert Button */}
          {(mode === 'file' || mode === 'text' || (mode === 'sample' && textInput)) && (
            <button
              onClick={handleConvert}
              disabled={!canConvert || isConverting}
              className="convert-btn"
            >
              {isConverting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Convert to {selectedDirection?.to.toUpperCase()}
                </>
              )}
            </button>
          )}
        </div>

        {/* Results */}
        {conversionResult && (
          <ConversionResults result={conversionResult} />
        )}
      </div>
    </div>
  );
};

export default Converter;