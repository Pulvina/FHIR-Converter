export type InputType = 'hl7v2' | 'ccda' | 'json' | 'stu3' | 'fhir';
export type OutputFormat = 'fhir' | 'hl7v2';

export interface ConversionRequest {
  inputType: InputType;
  outputFormat?: OutputFormat;
  templateName?: string;
}

export interface ConversionResult {
  success: boolean;
  data?: any;
  error?: string;
  inputType: string;
  outputFormat: string;
  templateUsed?: string;
}

export interface Template {
  name: string;
  displayName: string;
}

export interface TemplateResponse {
  templates: Template[];
}

export interface SampleFile {
  name: string;
  displayName: string;
  type: string;
  size: number;
}

export interface SampleResponse {
  samples: SampleFile[];
}

export interface SampleContent {
  content: string;
  filename: string;
  size: number;
  type: string;
}

export type ConversionMode = 'file' | 'text' | 'sample';

export interface ConversionDirection {
  from: InputType;
  to: OutputFormat;
  label: string;
  description: string;
  supported: boolean;
}