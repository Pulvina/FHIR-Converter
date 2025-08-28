import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, Download, Copy, Eye, Code, FileText } from 'lucide-react';
import { ConversionResult } from '../types';
import './ConversionResults.css';

interface ConversionResultsProps {
  result: ConversionResult;
}

const ConversionResults: React.FC<ConversionResultsProps> = ({ result }) => {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [copied, setCopied] = useState(false);

  const handleCopyToClipboard = async () => {
    try {
      const textToCopy = typeof result.data === 'string' 
        ? result.data 
        : JSON.stringify(result.data, null, 2);
      
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleDownload = () => {
    const content = typeof result.data === 'string' 
      ? result.data 
      : JSON.stringify(result.data, null, 2);
    
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted_${result.inputType}_to_${result.outputFormat}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderFormattedData = () => {
    if (typeof result.data === 'string') {
      return <pre className="formatted-text">{result.data}</pre>;
    }

    try {
      return (
        <pre className="formatted-json">
          {JSON.stringify(result.data, null, 2)}
        </pre>
      );
    } catch (err) {
      return <pre className="formatted-text">{String(result.data)}</pre>;
    }
  };

  const renderRawData = () => {
    const rawContent = typeof result.data === 'string' 
      ? result.data 
      : JSON.stringify(result.data);
    
    return <pre className="raw-text">{rawContent}</pre>;
  };

  if (!result.success && result.error) {
    return (
      <div className="conversion-results error">
        <div className="result-header">
          <div className="result-status">
            <AlertTriangle size={20} className="status-icon error-icon" />
            <h3>Conversion Failed</h3>
          </div>
        </div>
        <div className="result-content">
          <div className="error-details">
            <p><strong>Error:</strong> {result.error}</p>
            <p><strong>Input Type:</strong> {result.inputType}</p>
            <p><strong>Output Format:</strong> {result.outputFormat}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="conversion-results success">
      <div className="result-header">
        <div className="result-status">
          <CheckCircle size={20} className="status-icon success-icon" />
          <div className="status-text">
            <h3>Conversion Successful</h3>
            <p>
              Converted from {result.inputType.toUpperCase()} to {result.outputFormat?.toUpperCase() || 'FHIR'}
              {result.templateUsed && ` using ${result.templateUsed}`}
            </p>
          </div>
        </div>
        
        <div className="result-actions">
          <button
            onClick={handleCopyToClipboard}
            className="action-btn"
            title="Copy to clipboard"
          >
            <Copy size={16} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="action-btn"
            title="Download file"
          >
            <Download size={16} />
            Download
          </button>
        </div>
      </div>

      <div className="result-controls">
        <div className="view-toggle">
          <button
            onClick={() => setViewMode('formatted')}
            className={`toggle-btn ${viewMode === 'formatted' ? 'active' : ''}`}
          >
            <Eye size={14} />
            Formatted
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`toggle-btn ${viewMode === 'raw' ? 'active' : ''}`}
          >
            <Code size={14} />
            Raw
          </button>
        </div>
      </div>

      <div className="result-content">
        <div className="result-data">
          {viewMode === 'formatted' ? renderFormattedData() : renderRawData()}
        </div>
      </div>

      <div className="result-info">
        <div className="info-item">
          <FileText size={14} />
          <span>Input: {result.inputType.toUpperCase()}</span>
        </div>
        <div className="info-item">
          <FileText size={14} />
          <span>Output: {result.outputFormat?.toUpperCase() || 'FHIR'}</span>
        </div>
        {result.templateUsed && (
          <div className="info-item">
            <Code size={14} />
            <span>Template: {result.templateUsed}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversionResults;