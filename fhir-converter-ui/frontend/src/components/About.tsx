import React from 'react';
import { Activity, ArrowRight, CheckCircle, ExternalLink } from 'lucide-react';
import './About.css';

const About: React.FC = () => {
  const supportedConversions = [
    { from: 'HL7v2', to: 'FHIR R4', description: 'Convert HL7 version 2 messages to FHIR' },
    { from: 'C-CDA', to: 'FHIR R4', description: 'Convert Clinical Document Architecture to FHIR' },
    { from: 'JSON', to: 'FHIR R4', description: 'Convert generic JSON to FHIR format' },
    { from: 'FHIR STU3', to: 'FHIR R4', description: 'Upgrade from FHIR STU3 to R4' },
  ];

  const features = [
    'File upload and text input support',
    'Multiple healthcare data format conversions',
    'Template-based transformation engine',
    'Real-time conversion results',
    'Download and copy converted data',
    'Advanced template selection',
  ];

  return (
    <div className="about">
      <div className="about-hero">
        <Activity size={48} className="hero-icon" />
        <h1>About FHIR Converter</h1>
        <p className="hero-description">
          Convert healthcare data between legacy formats and FHIR (Fast Healthcare Interoperability Resources) 
          using Microsoft's open-source FHIR Converter with a modern web interface.
        </p>
      </div>

      <div className="about-content">
        <section className="about-section">
          <h2>What is FHIR?</h2>
          <p>
            FHIR (Fast Healthcare Interoperability Resources) is a standard for health information exchange, 
            developed by HL7. It enables healthcare applications to share data easily and consistently, 
            improving interoperability across different healthcare systems.
          </p>
        </section>

        <section className="about-section">
          <h2>Supported Conversions</h2>
          <div className="conversions-grid">
            {supportedConversions.map((conversion, index) => (
              <div key={index} className="conversion-card">
                <div className="conversion-flow">
                  <span className="format-badge from">{conversion.from}</span>
                  <ArrowRight size={16} className="arrow-icon" />
                  <span className="format-badge to">{conversion.to}</span>
                </div>
                <p className="conversion-description">{conversion.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <h2>Key Features</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-item">
                <CheckCircle size={16} className="feature-icon" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <h2>Technology Stack</h2>
          <div className="tech-stack">
            <div className="tech-item">
              <h3>Backend</h3>
              <ul>
                <li>Microsoft FHIR Converter (.NET)</li>
                <li>Node.js API Server</li>
                <li>Liquid Templates</li>
                <li>TypeScript</li>
              </ul>
            </div>
            <div className="tech-item">
              <h3>Frontend</h3>
              <ul>
                <li>React 18</li>
                <li>TypeScript</li>
                <li>React Router</li>
                <li>Lucide React Icons</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>Open Source</h2>
          <p>
            This application is built on top of Microsoft's open-source FHIR Converter project. 
            The converter uses Liquid templates and supports custom template creation for 
            specific conversion requirements.
          </p>
          <div className="links">
            <a 
              href="https://github.com/microsoft/FHIR-Converter" 
              target="_blank" 
              rel="noopener noreferrer"
              className="external-link"
            >
              <ExternalLink size={16} />
              Microsoft FHIR Converter
            </a>
            <a 
              href="https://www.hl7.org/fhir/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="external-link"
            >
              <ExternalLink size={16} />
              FHIR Specification
            </a>
          </div>
        </section>

        <section className="about-section">
          <h2>Usage Guidelines</h2>
          <div className="usage-guidelines">
            <div className="guideline">
              <h4>Data Privacy</h4>
              <p>Always ensure PHI (Protected Health Information) is handled according to your organization's privacy policies.</p>
            </div>
            <div className="guideline">
              <h4>Validation</h4>
              <p>Converted FHIR resources should be validated against the FHIR specification before use in production systems.</p>
            </div>
            <div className="guideline">
              <h4>Templates</h4>
              <p>Use appropriate templates for your specific HL7 version and implementation requirements.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;