import React, { useState, useEffect } from 'react';
import { Search, FileText, Download, Eye, Loader2, Database } from 'lucide-react';
import { SampleFile, InputType, SampleContent } from '../types';
import { apiService } from '../services/api';
import './SampleDataBrowser.css';

interface SampleDataBrowserProps {
  inputType: InputType;
  onSampleSelect: (content: string, filename: string) => void;
}

const SampleDataBrowser: React.FC<SampleDataBrowserProps> = ({
  inputType,
  onSampleSelect,
}) => {
  const [samples, setSamples] = useState<SampleFile[]>([]);
  const [filteredSamples, setFilteredSamples] = useState<SampleFile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSample, setSelectedSample] = useState<SampleFile | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Load samples when input type changes
  useEffect(() => {
    const loadSamples = async () => {
      setLoading(true);
      try {
        const response = await apiService.getSamples(inputType);
        setSamples(response.samples);
        setFilteredSamples(response.samples);
        setSelectedSample(null);
        setPreviewContent('');
      } catch (err) {
        console.error('Failed to load samples:', err);
        setSamples([]);
        setFilteredSamples([]);
      } finally {
        setLoading(false);
      }
    };

    loadSamples();
  }, [inputType]);

  // Filter samples based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredSamples(samples);
    } else {
      const filtered = samples.filter(sample =>
        sample.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sample.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSamples(filtered);
    }
  }, [searchTerm, samples]);

  const handlePreview = async (sample: SampleFile) => {
    setPreviewLoading(true);
    setSelectedSample(sample);
    
    try {
      const content = await apiService.getSampleContent(inputType, sample.name);
      setPreviewContent(content.content);
    } catch (err) {
      console.error('Failed to load sample content:', err);
      setPreviewContent('Failed to load sample content');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUseSample = () => {
    if (selectedSample && previewContent) {
      onSampleSelect(previewContent, selectedSample.name);
    }
  };

  const getTypeColor = (type: string): string => {
    const colors: { [key: string]: string } = {
      'Admission/Discharge/Transfer': '#e53e3e',
      'Observation Result': '#3182ce',
      'Order Message': '#38a169',
      'Medical Document Management': '#805ad5',
      'Vaccination Update': '#dd6b20',
      'Scheduling Information': '#d69e2e',
      'Continuity of Care Document': '#0987a0',
      'Patient Resource': '#9f7aea',
      'FHIR Bundle': '#4299e1',
    };
    return colors[type] || '#718096';
  };

  const formatTypeShort = (type: string): string => {
    const shortNames: { [key: string]: string } = {
      'Admission/Discharge/Transfer': 'ADT',
      'Observation Result': 'ORU',
      'Order Message': 'ORM',
      'Medical Document Management': 'MDM',
      'Vaccination Update': 'VXU',
      'Scheduling Information': 'SIU',
      'Continuity of Care Document': 'CCD',
      'Patient Resource': 'Patient',
      'FHIR Bundle': 'Bundle',
    };
    return shortNames[type] || type.slice(0, 6);
  };

  return (
    <div className="sample-data-browser">
      <div className="browser-header">
        <div className="header-title">
          <Database size={20} />
          <h3>Sample Data Library</h3>
        </div>
        <p>Choose from pre-existing sample files to test conversions</p>
      </div>

      <div className="browser-content">
        {/* Search and Filter */}
        <div className="search-section">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search samples by name or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="samples-count">
            {filteredSamples.length} of {samples.length} samples
          </div>
        </div>

        <div className="browser-layout">
          {/* Sample List */}
          <div className="samples-list">
            {loading ? (
              <div className="loading-state">
                <Loader2 size={24} className="animate-spin" />
                <span>Loading samples...</span>
              </div>
            ) : filteredSamples.length > 0 ? (
              <div className="samples-grid">
                {filteredSamples.map((sample) => (
                  <div
                    key={sample.name}
                    className={`sample-card ${
                      selectedSample?.name === sample.name ? 'selected' : ''
                    }`}
                    onClick={() => handlePreview(sample)}
                  >
                    <div className="sample-header">
                      <div className="sample-info">
                        <FileText size={16} className="file-icon" />
                        <span className="sample-name">{sample.displayName}</span>
                      </div>
                      <div 
                        className="type-badge"
                        style={{ backgroundColor: getTypeColor(sample.type) }}
                      >
                        {formatTypeShort(sample.type)}
                      </div>
                    </div>
                    <div className="sample-details">
                      <span className="sample-type">{sample.type}</span>
                      <span className="sample-filename">{sample.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <FileText size={48} className="empty-icon" />
                <h4>No samples found</h4>
                <p>
                  {searchTerm 
                    ? 'Try adjusting your search terms'
                    : `No sample data available for ${inputType.toUpperCase()}`
                  }
                </p>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          {selectedSample && (
            <div className="preview-panel">
              <div className="preview-header">
                <div className="preview-info">
                  <h4>{selectedSample.displayName}</h4>
                  <p>{selectedSample.type}</p>
                </div>
                <div className="preview-actions">
                  <button
                    onClick={handleUseSample}
                    disabled={!previewContent || previewLoading}
                    className="use-sample-btn"
                  >
                    <Download size={16} />
                    Use This Sample
                  </button>
                </div>
              </div>
              
              <div className="preview-content">
                {previewLoading ? (
                  <div className="preview-loading">
                    <Loader2 size={20} className="animate-spin" />
                    <span>Loading preview...</span>
                  </div>
                ) : (
                  <pre className="preview-text">{previewContent}</pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SampleDataBrowser;