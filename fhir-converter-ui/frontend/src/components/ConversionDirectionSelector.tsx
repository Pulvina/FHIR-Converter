import React from 'react';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { ConversionDirection, InputType, OutputFormat } from '../types';
import './ConversionDirectionSelector.css';

interface ConversionDirectionSelectorProps {
  selectedDirection: ConversionDirection | null;
  onDirectionChange: (direction: ConversionDirection) => void;
}

const ConversionDirectionSelector: React.FC<ConversionDirectionSelectorProps> = ({
  selectedDirection,
  onDirectionChange,
}) => {
  const conversionDirections: ConversionDirection[] = [
    {
      from: 'hl7v2',
      to: 'fhir',
      label: 'HL7v2 → FHIR R4',
      description: 'Convert HL7 version 2 messages to FHIR R4 format',
      supported: true,
    },
    {
      from: 'ccda',
      to: 'fhir',
      label: 'C-CDA → FHIR R4',
      description: 'Convert Clinical Document Architecture to FHIR R4',
      supported: true,
    },
    {
      from: 'json',
      to: 'fhir',
      label: 'JSON → FHIR R4',
      description: 'Convert generic JSON data to FHIR R4 format',
      supported: true,
    },
    {
      from: 'stu3',
      to: 'fhir',
      label: 'FHIR STU3 → R4',
      description: 'Upgrade FHIR STU3 resources to R4 format',
      supported: true,
    },
    {
      from: 'fhir',
      to: 'hl7v2',
      label: 'FHIR R4 → HL7v2',
      description: 'Convert FHIR R4 resources back to HL7v2 (Preview)',
      supported: true,
    },
  ];

  const formatName = (type: InputType | OutputFormat): string => {
    const names = {
      hl7v2: 'HL7v2',
      ccda: 'C-CDA',
      json: 'JSON',
      stu3: 'FHIR STU3',
      fhir: 'FHIR R4',
    };
    return names[type] || type;
  };

  const formatColor = (type: InputType | OutputFormat): string => {
    const colors = {
      hl7v2: '#e53e3e',
      ccda: '#dd6b20',
      json: '#38a169',
      stu3: '#3182ce',
      fhir: '#805ad5',
    };
    return colors[type] || '#718096';
  };

  return (
    <div className="conversion-direction-selector">
      <h3>Choose Conversion Type</h3>
      <p>Select the type of conversion you want to perform:</p>
      
      <div className="direction-grid">
        {conversionDirections.map((direction) => (
          <div
            key={`${direction.from}-${direction.to}`}
            className={`direction-card ${
              selectedDirection?.from === direction.from && 
              selectedDirection?.to === direction.to ? 'selected' : ''
            } ${!direction.supported ? 'disabled' : ''}`}
            onClick={() => direction.supported && onDirectionChange(direction)}
          >
            <div className="direction-flow">
              <span 
                className="format-badge"
                style={{ backgroundColor: formatColor(direction.from) }}
              >
                {formatName(direction.from)}
              </span>
              <ArrowRight size={16} className="arrow-icon" />
              <span 
                className="format-badge"
                style={{ backgroundColor: formatColor(direction.to) }}
              >
                {formatName(direction.to)}
              </span>
            </div>
            
            <h4 className="direction-title">{direction.label}</h4>
            <p className="direction-description">{direction.description}</p>
            
            {selectedDirection?.from === direction.from && 
             selectedDirection?.to === direction.to && (
              <div className="selected-indicator">
                <CheckCircle size={16} />
                Selected
              </div>
            )}
            
            {!direction.supported && (
              <div className="disabled-indicator">
                Coming Soon
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversionDirectionSelector;