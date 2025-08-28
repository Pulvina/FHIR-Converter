import axios from 'axios';
import { ConversionRequest, ConversionResult, TemplateResponse, SampleResponse, SampleContent, InputType } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 second timeout
});

export const apiService = {
  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  // Get available templates for a conversion type
  getTemplates: async (inputType: string): Promise<TemplateResponse> => {
    const response = await api.get(`/api/templates/${inputType}`);
    return response.data;
  },

  // Convert file
  convertFile: async (
    file: File,
    conversionRequest: ConversionRequest
  ): Promise<ConversionResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('inputType', conversionRequest.inputType);
    if (conversionRequest.outputFormat) {
      formData.append('outputFormat', conversionRequest.outputFormat);
    }
    if (conversionRequest.templateName) {
      formData.append('templateName', conversionRequest.templateName);
    }

    const response = await api.post('/api/convert', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Convert text input
  convertText: async (
    inputText: string,
    conversionRequest: ConversionRequest
  ): Promise<ConversionResult> => {
    const response = await api.post('/api/convert/text', {
      inputText,
      ...conversionRequest,
    });
    return response.data;
  },

  // Get available sample files for a conversion type
  getSamples: async (inputType: InputType): Promise<SampleResponse> => {
    const response = await api.get(`/api/samples/${inputType}`);
    return response.data;
  },

  // Get sample file content
  getSampleContent: async (inputType: InputType, filename: string): Promise<SampleContent> => {
    const response = await api.get(`/api/samples/${inputType}/${filename}`);
    return response.data;
  },
};

export default apiService;