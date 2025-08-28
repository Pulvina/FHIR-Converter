# FHIR Converter UI

A modern web interface for Microsoft's FHIR Converter, enabling easy conversion between healthcare data formats and FHIR.

## Features

- **Multiple Input Methods**: File upload or text input
- **Format Support**: HL7v2, C-CDA, JSON, FHIR STU3 → FHIR R4
- **Template Selection**: Choose specific templates for conversions
- **Real-time Results**: Instant conversion with formatted output
- **Download & Copy**: Export results or copy to clipboard
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

Before running this application, ensure you have:

1. **Node.js** (v16 or higher)
2. **Microsoft FHIR Converter CLI** built and available
3. **.NET 6.0 Runtime** (for running the FHIR Converter)

### Setting up Microsoft FHIR Converter

1. Build the entire FHIR Converter solution (this builds all dependencies):
   ```bash
   # From the root FHIR-Converter directory
   dotnet build Fhir.Liquid.Converter.sln
   ```
   
   This builds all projects:
   - `Microsoft.Health.Fhir.Liquid.Converter` (Core converter library)
   - `Microsoft.Health.Fhir.TemplateManagement` (Template handling)
   - `Microsoft.Health.Fhir.Liquid.Converter.Tool` (CLI executable we use)

2. Verify the executable exists at:
   ```
   src/Microsoft.Health.Fhir.Liquid.Converter.Tool/bin/Debug/net8.0/Microsoft.Health.Fhir.Liquid.Converter.Tool.exe
   ```

## Installation

1. Navigate to the UI project directory:
   ```bash
   cd fhir-converter-ui
   ```

2. Install dependencies for both backend and frontend:
   ```bash
   npm run install-deps
   ```

   Or install individually:
   ```bash
   # Backend dependencies
   npm run install-backend
   
   # Frontend dependencies  
   npm run install-frontend
   ```

## Running the Application

### Development Mode

Start both backend and frontend in development mode:

```bash
npm start
# or
npm run dev
```

This will start:
- Backend API server on `http://localhost:3001`
- Frontend React app on `http://localhost:3000`

### Production Mode

1. Build both applications:
   ```bash
   npm run build
   ```

2. Start the backend:
   ```bash
   cd backend && npm start
   ```

3. Serve the frontend build (use a static file server like `serve`):
   ```bash
   cd frontend && npx serve -s build -l 3000
   ```

### Individual Components

Start components separately if needed:

```bash
# Backend only
npm run start-backend

# Frontend only
npm run start-frontend
```

## API Endpoints

The backend provides the following endpoints:

- `GET /health` - Health check
- `GET /api/templates/:inputType` - Get available templates
- `POST /api/convert` - Convert uploaded file
- `POST /api/convert/text` - Convert text input

## Configuration

### Environment Variables

Create a `.env` file in the frontend directory to customize settings:

```env
# Frontend (.env in frontend/)
REACT_APP_API_URL=http://localhost:3001
```

Create a `.env` file in the backend directory:

```env
# Backend (.env in backend/)
PORT=3001
```

### File Path Configuration

If the FHIR Converter CLI is located elsewhere, update the `converterPath` in:
```
backend/src/server.ts
```

## Supported Conversions

| Input Format | Output Format | Description |
|--------------|---------------|-------------|
| HL7v2 | FHIR R4 | HL7 version 2 messages to FHIR |
| C-CDA | FHIR R4 | Clinical Document Architecture to FHIR |
| JSON | FHIR R4 | Generic JSON to FHIR format |
| FHIR STU3 | FHIR R4 | Upgrade FHIR STU3 to R4 |

## File Upload Limits

- Maximum file size: 10MB
- Supported file types: `.hl7`, `.ccda`, `.json`, `.xml`, `.txt`

## Troubleshooting

### Common Issues

1. **Conversion fails with "Converter process not found"**
   - Ensure the FHIR Converter CLI is built
   - Check the path in `backend/src/server.ts`
   - Verify .NET 6.0 runtime is installed

2. **Templates not loading**
   - Verify the templates directory path exists
   - Check that template files have `.liquid` extension

3. **CORS errors**
   - Ensure backend is running on port 3001
   - Check CORS configuration in `backend/src/server.ts`

4. **Module not found errors**
   - Run `npm run install-deps` to reinstall dependencies
   - For frontend, try `npm install --legacy-peer-deps`

### Debug Mode

Enable verbose logging by setting environment variables:

```bash
# Backend logging
export NODE_ENV=development

# Run with debug output
npm run start-backend
```

## Development

### Project Structure

```
fhir-converter-ui/
├── backend/                 # Node.js API server
│   ├── src/
│   │   └── server.ts       # Main server file
│   ├── uploads/            # Temporary file uploads
│   ├── temp/               # Temporary conversion files
│   └── package.json
├── frontend/               # React TypeScript app
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript types
│   │   └── App.tsx
│   └── package.json
└── package.json           # Root package with scripts
```

### Testing

Run tests for both components:

```bash
npm test
```

Or individually:
```bash
npm run test-backend
npm run test-frontend
```

## Security Considerations

- Files are temporarily stored and cleaned up after conversion
- Input validation is performed on file types and sizes
- CORS is configured for development (update for production)
- Consider implementing authentication for production use

## License

This project builds upon Microsoft's open-source FHIR Converter.
- UI Components: MIT License
- FHIR Converter: MIT License (Microsoft)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Submit a pull request

## Support

For issues related to:
- **UI/Frontend**: Check browser console and network tabs
- **Backend/API**: Check backend logs and file permissions
- **FHIR Conversion**: Refer to Microsoft FHIR Converter documentation