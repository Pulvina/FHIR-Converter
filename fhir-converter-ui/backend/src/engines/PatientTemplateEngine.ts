import { BaseTemplateEngine, FieldMapping, TemplateMetadata } from './BaseTemplateEngine';

/**
 * Patient-specific template engine for detecting and scoring Patient resource templates
 */
export class PatientTemplateEngine extends BaseTemplateEngine {
  protected resourceType = 'Patient';

  /**
   * Check if this engine can handle the given JSON data
   */
  public canHandle(jsonData: any): boolean {
    if (!jsonData || typeof jsonData !== 'object') {
      return false;
    }

    // Check for explicit FHIR Patient resource
    if (jsonData.resourceType === 'Patient') {
      return true;
    }

    // Check for patient-related field patterns (higher threshold for confidence)
    const patientIndicators = [
      // Name fields
      'firstName', 'first_name', 'lastName', 'last_name', 'givenName', 'familyName',
      'name.first', 'name.last', 'name.given', 'name.family',
      'patient.name', 'patient.firstName', 'patient.lastName',
      'demographics.firstName', 'demographics.lastName',

      // Patient identifiers
      'patientId', 'patient_id', 'PatientId', 'PATIENT_ID',
      'mrn', 'MRN', 'medical_record_number', 'medicalRecordNumber',
      'patient.id', 'patient.patientId',

      // Demographics
      'dateOfBirth', 'dob', 'DOB', 'birthDate', 'birth_date',
      'gender', 'sex', 'patient_gender', 'patientGender',
      'demographics.dateOfBirth', 'demographics.gender',

      // Patient-specific structures
      'patient', 'demographics', 'personalDetails'
    ];

    const structure = this.analyzeStructure(jsonData);
    const foundIndicators = patientIndicators.filter(indicator => 
      structure.allFields.some(field => field.toLowerCase().includes(indicator.toLowerCase()))
    );

    // Require at least 2 patient indicators to handle
    return foundIndicators.length >= 2;
  }

  protected initializeFieldSynonyms(): void {
    // First name variations
    this.fieldSynonyms.set('firstName', [
      'firstName', 'first_name', 'fname', 'givenName', 'given_name', 
      'forename', 'FirstName', 'FIRST_NAME', 'given'
    ]);
    
    // Last name variations
    this.fieldSynonyms.set('lastName', [
      'lastName', 'last_name', 'lname', 'surname', 'familyName', 
      'family_name', 'LastName', 'LAST_NAME', 'family'
    ]);
    
    // Date of birth variations
    this.fieldSynonyms.set('dateOfBirth', [
      'dateOfBirth', 'dob', 'DOB', 'birthDate', 'birth_date', 
      'birthdate', 'date_of_birth', 'DateOfBirth', 'BIRTH_DATE'
    ]);
    
    // Gender variations
    this.fieldSynonyms.set('gender', [
      'gender', 'sex', 'Gender', 'SEX', 'patient_gender', 'patientGender'
    ]);
    
    // Patient ID variations
    this.fieldSynonyms.set('patientId', [
      'patientId', 'patient_id', 'id', 'ID', 'PatientId', 'PATIENT_ID',
      'mrn', 'MRN', 'medical_record_number', 'medicalRecordNumber'
    ]);
    
    // Phone number variations
    this.fieldSynonyms.set('phoneNumber', [
      'phoneNumber', 'phone_number', 'phone', 'telephone', 'tel', 
      'PhoneNumber', 'PHONE_NUMBER', 'contact_number', 'contactNumber'
    ]);
    
    // Email variations
    this.fieldSynonyms.set('email', [
      'email', 'emailAddress', 'email_address', 'Email', 'EMAIL_ADDRESS'
    ]);
    
    // Address variations
    this.fieldSynonyms.set('address', [
      'address', 'Address', 'ADDRESS', 'street_address', 'streetAddress'
    ]);
  }

  protected loadTemplateMetadata(): void {
    // Basic flat structure template
    this.templates.set('PatientBasic', {
      name: 'PatientBasic',
      description: 'Simple flat JSON structure with basic patient fields',
      resourceType: 'Patient',
      priority: 1,
      structurePatterns: {
        maxDepth: 1,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['firstName', 'lastName', 'patientId']
      },
      fieldMappings: [
        {
          fhirField: 'name.given',
          jsonPatterns: this.fieldSynonyms.get('firstName') || [],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'name.family',
          jsonPatterns: this.fieldSynonyms.get('lastName') || [],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'id',
          jsonPatterns: this.fieldSynonyms.get('patientId') || [],
          weight: 8,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'birthDate',
          jsonPatterns: this.fieldSynonyms.get('dateOfBirth') || [],
          weight: 7,
          required: false,
          dataType: 'date'
        },
        {
          fhirField: 'gender',
          jsonPatterns: this.fieldSynonyms.get('gender') || [],
          weight: 5,
          required: false,
          dataType: 'string'
        },
        {
          fhirField: 'telecom',
          jsonPatterns: this.fieldSynonyms.get('phoneNumber') || [],
          weight: 3,
          required: false,
          dataType: 'string'
        }
      ]
    });

    // Nested structure template
    this.templates.set('PatientNested', {
      name: 'PatientNested',
      description: 'Nested JSON structure with objects and arrays',
      resourceType: 'Patient',
      priority: 2,
      structurePatterns: {
        maxDepth: 3,
        hasArrays: true,
        hasNestedObjects: true,
        expectedFields: ['patient', 'name', 'contact']
      },
      fieldMappings: [
        {
          fhirField: 'name.given',
          jsonPatterns: ['patient.name.first', 'name.first', 'patient.firstName', 'name.given'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'name.family',
          jsonPatterns: ['patient.name.last', 'name.last', 'patient.lastName', 'name.family'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'id',
          jsonPatterns: ['patient.id', 'patient.patientId', 'id', 'patientInfo.id'],
          weight: 8,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'telecom',
          jsonPatterns: ['contact.phone', 'patient.contact.phone', 'contact.phoneNumbers', 'phoneNumbers'],
          weight: 5,
          required: false,
          dataType: 'array'
        },
        {
          fhirField: 'birthDate',
          jsonPatterns: ['patient.birthDate', 'demographics.birthDate', 'patient.dob'],
          weight: 7,
          required: false,
          dataType: 'date'
        }
      ]
    });

    // EHR-style template
    this.templates.set('PatientEHR', {
      name: 'PatientEHR',
      description: 'EHR-style JSON with medical identifiers and codes',
      resourceType: 'Patient',
      priority: 3,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: true,
        hasNestedObjects: true,
        expectedFields: ['mrn', 'identifiers', 'demographics']
      },
      fieldMappings: [
        {
          fhirField: 'identifier',
          jsonPatterns: ['mrn', 'MRN', 'identifiers', 'medicalRecordNumber'],
          weight: 12,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'name.given',
          jsonPatterns: ['demographics.firstName', 'name.first', 'patientName.first'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'name.family',
          jsonPatterns: ['demographics.lastName', 'name.last', 'patientName.last'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'birthDate',
          jsonPatterns: ['demographics.dateOfBirth', 'demographics.dob', 'birthInfo.date'],
          weight: 7,
          required: false,
          dataType: 'date'
        },
        {
          fhirField: 'gender',
          jsonPatterns: ['demographics.gender', 'demographics.sex', 'personalDetails.gender'],
          weight: 5,
          required: false,
          dataType: 'string'
        }
      ]
    });

    // Complex nested template for deep structures
    this.templates.set('PatientComplex', {
      name: 'PatientComplex',
      description: 'Complex nested structure with deep objects and arrays',
      resourceType: 'Patient',
      priority: 4,
      structurePatterns: {
        maxDepth: 4,
        hasArrays: true,
        hasNestedObjects: true,
        expectedFields: ['patientInfo', 'personalDetails', 'contactDetails']
      },
      fieldMappings: [
        {
          fhirField: 'name.given',
          jsonPatterns: ['patientInfo.personalDetails.name.given', 'personalDetails.name.given'],
          weight: 10,
          required: true,
          dataType: 'array'
        },
        {
          fhirField: 'name.family',
          jsonPatterns: ['patientInfo.personalDetails.name.family', 'personalDetails.name.family'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'id',
          jsonPatterns: ['patientInfo.id', 'id'],
          weight: 8,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'birthDate',
          jsonPatterns: ['patientInfo.personalDetails.birthInfo.date', 'personalDetails.birthInfo.date'],
          weight: 7,
          required: false,
          dataType: 'date'
        },
        {
          fhirField: 'telecom',
          jsonPatterns: ['patientInfo.contactDetails', 'contactDetails'],
          weight: 5,
          required: false,
          dataType: 'array'
        }
      ]
    });

    // Array-based template for patients within arrays
    this.templates.set('PatientArray', {
      name: 'PatientArray',
      description: 'JSON structure with patients contained within arrays or collections',
      resourceType: 'Patient',
      priority: 5,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: true,
        hasNestedObjects: true,
        expectedFields: ['patients', 'facilityInfo']
      },
      fieldMappings: [
        {
          fhirField: 'name.given',
          jsonPatterns: ['patients[0].givenName', 'patients[0].firstName', 'patients.0.givenName', 'patients.0.firstName'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'name.family',
          jsonPatterns: ['patients[0].familyName', 'patients[0].lastName', 'patients.0.familyName', 'patients.0.lastName'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'id',
          jsonPatterns: ['patients[0].patientId', 'patients[0].id', 'patients.0.patientId', 'patients.0.id'],
          weight: 8,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'birthDate',
          jsonPatterns: ['patients[0].birthDate', 'patients[0].dob', 'patients.0.birthDate', 'patients.0.dob'],
          weight: 7,
          required: false,
          dataType: 'date'
        },
        {
          fhirField: 'gender',
          jsonPatterns: ['patients[0].sex', 'patients[0].gender', 'patients.0.sex', 'patients.0.gender'],
          weight: 5,
          required: false,
          dataType: 'string'
        },
        {
          fhirField: 'telecom',
          jsonPatterns: ['patients[0].phoneNumbers', 'patients.0.phoneNumbers'],
          weight: 3,
          required: false,
          dataType: 'array'
        }
      ]
    });

    // Minimal template for sparse data
    this.templates.set('PatientMinimal', {
      name: 'PatientMinimal',
      description: 'Minimal JSON structure with only basic required fields',
      resourceType: 'Patient',
      priority: 6,
      structurePatterns: {
        maxDepth: 1,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['id', 'name']
      },
      fieldMappings: [
        {
          fhirField: 'id',
          jsonPatterns: ['id', 'patientId', 'patient_id'],
          weight: 8,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'name',
          jsonPatterns: ['name', 'fullName', 'patientName'],
          weight: 12,
          required: false,
          dataType: 'string'
        },
        {
          fhirField: 'name.given',
          jsonPatterns: ['firstName', 'first_name'],
          weight: 5,
          required: false,
          dataType: 'string'
        },
        {
          fhirField: 'name.family',
          jsonPatterns: ['lastName', 'last_name'],
          weight: 5,
          required: false,
          dataType: 'string'
        },
        {
          fhirField: 'birthDate',
          jsonPatterns: ['dob', 'dateOfBirth', 'birthDate'],
          weight: 4,
          required: false,
          dataType: 'date'
        },
        {
          fhirField: 'gender',
          jsonPatterns: ['gender', 'sex'],
          weight: 3,
          required: false,
          dataType: 'string'
        }
      ]
    });

    // Research study participant template
    this.templates.set('PatientResearch', {
      name: 'PatientResearch',
      description: 'JSON structure for research study participants',
      resourceType: 'Patient',
      priority: 7,
      structurePatterns: {
        maxDepth: 3,
        hasArrays: false,
        hasNestedObjects: true,
        expectedFields: ['subjectId', 'demographics', 'studyParticipation']
      },
      fieldMappings: [
        {
          fhirField: 'id',
          jsonPatterns: ['subjectId', 'participantId', 'subject_id', 'participant_id'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'gender',
          jsonPatterns: ['demographics.gender', 'demographics.sex'],
          weight: 5,
          required: false,
          dataType: 'string'
        },
        {
          fhirField: 'age',
          jsonPatterns: ['demographics.age', 'age'],
          weight: 5,
          required: false,
          dataType: 'number'
        },
        {
          fhirField: 'ethnicity',
          jsonPatterns: ['demographics.ethnicity', 'ethnicity'],
          weight: 4,
          required: false,
          dataType: 'string'
        },
        {
          fhirField: 'studyName',
          jsonPatterns: ['studyParticipation.studyName', 'study.name'],
          weight: 8,
          required: false,
          dataType: 'string'
        },
        {
          fhirField: 'enrolledDate',
          jsonPatterns: ['studyParticipation.enrolledDate', 'study.enrollmentDate'],
          weight: 6,
          required: false,
          dataType: 'date'
        },
        {
          fhirField: 'lifestyle',
          jsonPatterns: ['lifestyle', 'lifestyleFactors'],
          weight: 5,
          required: false,
          dataType: 'object'
        },
        {
          fhirField: 'consent',
          jsonPatterns: ['studyParticipation.consentSigned', 'consent.signed'],
          weight: 4,
          required: false,
          dataType: 'boolean'
        }
      ]
    });

    // Identifier-focused templates
    this.templates.set('PatientMRN', {
      name: 'PatientMRN',
      description: 'Patient with Medical Record Number identifier',
      resourceType: 'Patient',
      priority: 8,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['mrn', 'MRN', 'medicalRecordNumber']
      },
      fieldMappings: [
        {
          fhirField: 'identifier',
          jsonPatterns: ['mrn', 'MRN', 'medicalRecordNumber', 'medical_record_number'],
          weight: 12,
          required: true,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientSSN', {
      name: 'PatientSSN',
      description: 'Patient with Social Security Number',
      resourceType: 'Patient',
      priority: 9,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['ssn', 'SSN', 'socialSecurityNumber']
      },
      fieldMappings: [
        {
          fhirField: 'identifier',
          jsonPatterns: ['ssn', 'SSN', 'socialSecurityNumber', 'social_security_number'],
          weight: 12,
          required: true,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientDriverLicense', {
      name: 'PatientDriverLicense',
      description: 'Patient with Driver License identifier',
      resourceType: 'Patient',
      priority: 10,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['driverLicense', 'driversLicense', 'dlNumber']
      },
      fieldMappings: [
        {
          fhirField: 'identifier',
          jsonPatterns: ['driverLicense', 'driversLicense', 'dlNumber', 'driver_license_number'],
          weight: 12,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'address.state',
          jsonPatterns: ['dlState', 'state'],
          weight: 5,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientPassport', {
      name: 'PatientPassport',
      description: 'Patient with Passport identifier',
      resourceType: 'Patient',
      priority: 11,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['passport', 'passportNumber']
      },
      fieldMappings: [
        {
          fhirField: 'identifier',
          jsonPatterns: ['passport', 'passportNumber', 'passport_number'],
          weight: 12,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'nationality',
          jsonPatterns: ['nationality', 'country', 'passportCountry'],
          weight: 6,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientNationalID', {
      name: 'PatientNationalID',
      description: 'Patient with National ID identifier',
      resourceType: 'Patient',
      priority: 12,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['nationalId', 'nationalID', 'nin']
      },
      fieldMappings: [
        {
          fhirField: 'identifier',
          jsonPatterns: ['nationalId', 'nationalID', 'nin', 'national_id', 'nhsNumber'],
          weight: 12,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'country',
          jsonPatterns: ['country'],
          weight: 4,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientInsurance', {
      name: 'PatientInsurance',
      description: 'Patient with Insurance/Member ID',
      resourceType: 'Patient',
      priority: 13,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['insuranceId', 'memberId', 'policyNumber']
      },
      fieldMappings: [
        {
          fhirField: 'identifier',
          jsonPatterns: ['insuranceId', 'memberId', 'policyNumber', 'insurance_id'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'assigner',
          jsonPatterns: ['insuranceProvider', 'insurer'],
          weight: 6,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientEmployee', {
      name: 'PatientEmployee',
      description: 'Patient with Employee ID',
      resourceType: 'Patient',
      priority: 14,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['employeeId', 'employeeNumber', 'staffId']
      },
      fieldMappings: [
        {
          fhirField: 'identifier',
          jsonPatterns: ['employeeId', 'employeeNumber', 'staffId', 'employee_id'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'employer',
          jsonPatterns: ['company', 'employer'],
          weight: 5,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientStudent', {
      name: 'PatientStudent',
      description: 'Patient with Student ID',
      resourceType: 'Patient',
      priority: 15,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['studentId', 'studentNumber', 'universityId']
      },
      fieldMappings: [
        {
          fhirField: 'identifier',
          jsonPatterns: ['studentId', 'studentNumber', 'universityId', 'student_id'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'school',
          jsonPatterns: ['school', 'university', 'institution'],
          weight: 5,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientUUID', {
      name: 'PatientUUID',
      description: 'Patient with UUID/System ID',
      resourceType: 'Patient',
      priority: 16,
      structurePatterns: {
        maxDepth: 3,
        hasArrays: false,
        hasNestedObjects: true,
        expectedFields: ['uuid', 'guid', 'systemId']
      },
      fieldMappings: [
        {
          fhirField: 'identifier',
          jsonPatterns: ['uuid', 'guid', 'systemId', 'recordId'],
          weight: 8,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'system',
          jsonPatterns: ['system', 'systemName'],
          weight: 4,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientMultipleIDs', {
      name: 'PatientMultipleIDs',
      description: 'Patient with multiple identifiers',
      resourceType: 'Patient',
      priority: 17,
      structurePatterns: {
        maxDepth: 3,
        hasArrays: true,
        hasNestedObjects: true,
        expectedFields: ['identifiers', 'ids']
      },
      fieldMappings: [
        {
          fhirField: 'identifier',
          jsonPatterns: ['identifiers', 'ids'],
          weight: 15,
          required: true,
          dataType: 'array'
        },
        {
          fhirField: 'primaryId',
          jsonPatterns: ['primaryId', 'identifiers[0].value', 'ids[0]'],
          weight: 8,
          required: false,
          dataType: 'string'
        }
      ]
    });

    // Name-focused templates
    this.templates.set('PatientSingleName', {
      name: 'PatientSingleName',
      description: 'Patient with single name field',
      resourceType: 'Patient',
      priority: 18,
      structurePatterns: {
        maxDepth: 1,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['name', 'fullName', 'patientName']
      },
      fieldMappings: [
        {
          fhirField: 'name',
          jsonPatterns: ['name', 'fullName', 'patientName', 'patient_name'],
          weight: 12,
          required: true,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientGivenFamily', {
      name: 'PatientGivenFamily',
      description: 'Patient with separate given/family names',
      resourceType: 'Patient',
      priority: 19,
      structurePatterns: {
        maxDepth: 1,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['firstName', 'lastName', 'givenName', 'familyName']
      },
      fieldMappings: [
        {
          fhirField: 'name.given',
          jsonPatterns: ['firstName', 'givenName', 'given', 'first_name'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'name.family',
          jsonPatterns: ['lastName', 'familyName', 'surname', 'last_name'],
          weight: 10,
          required: true,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientTitledName', {
      name: 'PatientTitledName',
      description: 'Patient with titles and suffixes',
      resourceType: 'Patient',
      priority: 20,
      structurePatterns: {
        maxDepth: 1,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['prefix', 'title', 'suffix']
      },
      fieldMappings: [
        {
          fhirField: 'name.prefix',
          jsonPatterns: ['prefix', 'title'],
          weight: 8,
          required: false,
          dataType: 'string'
        },
        {
          fhirField: 'name.suffix',
          jsonPatterns: ['suffix', 'suffixName'],
          weight: 8,
          required: false,
          dataType: 'string'
        },
        {
          fhirField: 'name.given',
          jsonPatterns: ['firstName', 'givenName'],
          weight: 10,
          required: true,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientMultipleNames', {
      name: 'PatientMultipleNames',
      description: 'Patient with array of names',
      resourceType: 'Patient',
      priority: 21,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: true,
        hasNestedObjects: true,
        expectedFields: ['names']
      },
      fieldMappings: [
        {
          fhirField: 'name',
          jsonPatterns: ['names'],
          weight: 15,
          required: true,
          dataType: 'array'
        }
      ]
    });

    this.templates.set('PatientMaidenName', {
      name: 'PatientMaidenName',
      description: 'Patient with maiden/birth name',
      resourceType: 'Patient',
      priority: 22,
      structurePatterns: {
        maxDepth: 1,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['maidenName', 'birthName']
      },
      fieldMappings: [
        {
          fhirField: 'name.maiden',
          jsonPatterns: ['maidenName', 'birthName', 'maiden_name'],
          weight: 12,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'name.family',
          jsonPatterns: ['lastName', 'currentLastName', 'marriedName'],
          weight: 8,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientInternationalName', {
      name: 'PatientInternationalName',
      description: 'Patient with cultural/international name format',
      resourceType: 'Patient',
      priority: 23,
      structurePatterns: {
        maxDepth: 1,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['culture', 'nameOrder', 'language']
      },
      fieldMappings: [
        {
          fhirField: 'name.culture',
          jsonPatterns: ['culture', 'nameOrder', 'language'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'name.native',
          jsonPatterns: ['nativeName', 'originalName', 'transliterationName'],
          weight: 8,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientNickname', {
      name: 'PatientNickname',
      description: 'Patient with nickname/alias',
      resourceType: 'Patient',
      priority: 24,
      structurePatterns: {
        maxDepth: 1,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['nickname', 'alias', 'knownAs']
      },
      fieldMappings: [
        {
          fhirField: 'name.nickname',
          jsonPatterns: ['nickname', 'alias', 'knownAs', 'known_as'],
          weight: 10,
          required: true,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientProfessionalName', {
      name: 'PatientProfessionalName',
      description: 'Patient with professional/legal names',
      resourceType: 'Patient',
      priority: 25,
      structurePatterns: {
        maxDepth: 1,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['legalName', 'professionalName', 'businessName']
      },
      fieldMappings: [
        {
          fhirField: 'name.legal',
          jsonPatterns: ['legalName', 'legal_name'],
          weight: 12,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'name.professional',
          jsonPatterns: ['professionalName', 'businessName', 'stageName'],
          weight: 8,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientNestedName', {
      name: 'PatientNestedName',
      description: 'Patient with nested name structure',
      resourceType: 'Patient',
      priority: 26,
      structurePatterns: {
        maxDepth: 3,
        hasArrays: false,
        hasNestedObjects: true,
        expectedFields: ['personalInfo', 'demographics', 'patient']
      },
      fieldMappings: [
        {
          fhirField: 'name.nested',
          jsonPatterns: ['personalInfo.name', 'demographics.name', 'patient.name'],
          weight: 12,
          required: true,
          dataType: 'object'
        }
      ]
    });

    this.templates.set('PatientEmergencyName', {
      name: 'PatientEmergencyName',
      description: 'Patient with emergency contact names',
      resourceType: 'Patient',
      priority: 27,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: true,
        expectedFields: ['emergencyContact']
      },
      fieldMappings: [
        {
          fhirField: 'contact.name',
          jsonPatterns: ['emergencyContact.name', 'emergency_contact.name'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'name',
          jsonPatterns: ['patientName', 'name', 'fullName'],
          weight: 8,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientPhone', {
      name: 'PatientPhone',
      description: 'Patient with phone contact information',
      resourceType: 'Patient',
      priority: 28,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['phone', 'phoneNumber', 'mobilePhone', 'homePhone', 'workPhone']
      },
      fieldMappings: [
        {
          fhirField: 'telecom.phone',
          jsonPatterns: ['phone', 'phoneNumber', 'mobilePhone', 'homePhone', 'workPhone'],
          weight: 12,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'telecom.system',
          jsonPatterns: ['phoneType'],
          weight: 5,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientEmail', {
      name: 'PatientEmail',
      description: 'Patient with email contact information',
      resourceType: 'Patient',
      priority: 29,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['email', 'emailAddress', 'personalEmail', 'workEmail']
      },
      fieldMappings: [
        {
          fhirField: 'telecom.email',
          jsonPatterns: ['email', 'emailAddress', 'personalEmail', 'workEmail'],
          weight: 12,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'telecom.system',
          jsonPatterns: ['emailType'],
          weight: 5,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientMultipleContact', {
      name: 'PatientMultipleContact',
      description: 'Patient with multiple contact methods',
      resourceType: 'Patient',
      priority: 30,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['mobilePhone', 'homePhone', 'workPhone', 'personalEmail', 'workEmail']
      },
      fieldMappings: [
        {
          fhirField: 'telecom.multiple',
          jsonPatterns: ['mobilePhone', 'homePhone', 'workPhone', 'personalEmail', 'workEmail', 'fax'],
          weight: 15,
          required: true,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientFax', {
      name: 'PatientFax',
      description: 'Patient with fax contact information',
      resourceType: 'Patient',
      priority: 31,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['fax', 'faxNumber']
      },
      fieldMappings: [
        {
          fhirField: 'telecom.fax',
          jsonPatterns: ['fax', 'faxNumber'],
          weight: 10,
          required: true,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientUrl', {
      name: 'PatientUrl',
      description: 'Patient with website/URL contact information',
      resourceType: 'Patient',
      priority: 32,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['website', 'url', 'personalWebsite', 'socialMedia']
      },
      fieldMappings: [
        {
          fhirField: 'telecom.url',
          jsonPatterns: ['website', 'url', 'personalWebsite', 'socialMedia'],
          weight: 10,
          required: true,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientNestedContact', {
      name: 'PatientNestedContact',
      description: 'Patient with nested contact structures',
      resourceType: 'Patient',
      priority: 33,
      structurePatterns: {
        maxDepth: 3,
        hasArrays: false,
        hasNestedObjects: true,
        expectedFields: ['contact', 'contactInfo', 'personalInfo']
      },
      fieldMappings: [
        {
          fhirField: 'telecom.nested',
          jsonPatterns: ['contact.primary', 'contactInfo.phone', 'personalInfo.contact'],
          weight: 12,
          required: true,
          dataType: 'object'
        }
      ]
    });

    this.templates.set('PatientMobileOnly', {
      name: 'PatientMobileOnly',
      description: 'Patient with mobile-only contact information',
      resourceType: 'Patient',
      priority: 34,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['mobile', 'mobilePhone', 'cellPhone']
      },
      fieldMappings: [
        {
          fhirField: 'telecom.mobile',
          jsonPatterns: ['mobile', 'mobilePhone', 'cellPhone', 'sms', 'smsPhone'],
          weight: 12,
          required: true,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientContactArray', {
      name: 'PatientContactArray',
      description: 'Patient with contact information as arrays',
      resourceType: 'Patient',
      priority: 35,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: true,
        hasNestedObjects: true,
        expectedFields: ['phoneNumbers', 'emails', 'contacts']
      },
      fieldMappings: [
        {
          fhirField: 'telecom.array',
          jsonPatterns: ['phoneNumbers', 'emails', 'contacts'],
          weight: 15,
          required: true,
          dataType: 'array'
        }
      ]
    });

    this.templates.set('PatientEmergencyContact', {
      name: 'PatientEmergencyContact',
      description: 'Patient with emergency contact telecom information',
      resourceType: 'Patient',
      priority: 36,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: true,
        expectedFields: ['emergencyContact', 'emergency', 'contactPerson']
      },
      fieldMappings: [
        {
          fhirField: 'contact.telecom',
          jsonPatterns: ['emergencyContact.phone', 'emergency.phone', 'contactPerson.phone'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'telecom',
          jsonPatterns: ['phone', 'email'],
          weight: 8,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientTelecomPriority', {
      name: 'PatientTelecomPriority',
      description: 'Patient with prioritized contact methods',
      resourceType: 'Patient',
      priority: 37,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['primaryPhone', 'preferredPhone', 'secondaryPhone', 'primaryEmail']
      },
      fieldMappings: [
        {
          fhirField: 'telecom.priority',
          jsonPatterns: ['primaryPhone', 'preferredPhone', 'secondaryPhone', 'primaryEmail', 'preferredEmail'],
          weight: 12,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'telecom.rank',
          jsonPatterns: ['emergencyPhone'],
          weight: 8,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientSimpleAddress', {
      name: 'PatientSimpleAddress',
      description: 'Patient with simple address format',
      resourceType: 'Patient',
      priority: 38,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['address', 'street', 'city', 'state', 'zip']
      },
      fieldMappings: [
        {
          fhirField: 'address.line',
          jsonPatterns: ['address', 'street', 'streetAddress', 'addressLine1'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'address.city',
          jsonPatterns: ['city', 'town'],
          weight: 8,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'address.state',
          jsonPatterns: ['state', 'province'],
          weight: 6,
          required: false,
          dataType: 'string'
        },
        {
          fhirField: 'address.postalCode',
          jsonPatterns: ['zip', 'zipCode', 'postalCode'],
          weight: 6,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientMultipleAddress', {
      name: 'PatientMultipleAddress',
      description: 'Patient with multiple addresses',
      resourceType: 'Patient',
      priority: 39,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: true,
        expectedFields: ['homeAddress', 'workAddress', 'mailingAddress']
      },
      fieldMappings: [
        {
          fhirField: 'address.home',
          jsonPatterns: ['homeAddress', 'residentialAddress'],
          weight: 12,
          required: true,
          dataType: 'object'
        },
        {
          fhirField: 'address.work',
          jsonPatterns: ['workAddress', 'businessAddress'],
          weight: 10,
          required: false,
          dataType: 'object'
        },
        {
          fhirField: 'address.mailing',
          jsonPatterns: ['mailingAddress', 'shippingAddress'],
          weight: 8,
          required: false,
          dataType: 'object'
        }
      ]
    });

    this.templates.set('PatientInternationalAddress', {
      name: 'PatientInternationalAddress',
      description: 'Patient with international address format',
      resourceType: 'Patient',
      priority: 40,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['buildingNumber', 'buildingName', 'country', 'countryCode']
      },
      fieldMappings: [
        {
          fhirField: 'address.international',
          jsonPatterns: ['buildingNumber', 'buildingName', 'district', 'prefecture'],
          weight: 10,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'address.country',
          jsonPatterns: ['country', 'countryCode'],
          weight: 12,
          required: true,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientNestedAddress', {
      name: 'PatientNestedAddress',
      description: 'Patient with nested address structures',
      resourceType: 'Patient',
      priority: 41,
      structurePatterns: {
        maxDepth: 3,
        hasArrays: false,
        hasNestedObjects: true,
        expectedFields: ['addressInfo', 'personalInfo', 'demographics']
      },
      fieldMappings: [
        {
          fhirField: 'address.nested',
          jsonPatterns: ['addressInfo.street', 'personalInfo.address', 'demographics.address'],
          weight: 12,
          required: true,
          dataType: 'object'
        }
      ]
    });

    this.templates.set('PatientAddressArray', {
      name: 'PatientAddressArray',
      description: 'Patient with address information as arrays',
      resourceType: 'Patient',
      priority: 42,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: true,
        hasNestedObjects: true,
        expectedFields: ['addresses', 'addressList']
      },
      fieldMappings: [
        {
          fhirField: 'address.array',
          jsonPatterns: ['addresses', 'addressList'],
          weight: 15,
          required: true,
          dataType: 'array'
        }
      ]
    });

    this.templates.set('PatientUSAddress', {
      name: 'PatientUSAddress',
      description: 'Patient with US-specific address format',
      resourceType: 'Patient',
      priority: 43,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['streetNumber', 'county', 'congressionalDistrict']
      },
      fieldMappings: [
        {
          fhirField: 'address.us',
          jsonPatterns: ['streetNumber', 'county', 'congressionalDistrict'],
          weight: 10,
          required: true,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientPOBox', {
      name: 'PatientPOBox',
      description: 'Patient with PO Box address',
      resourceType: 'Patient',
      priority: 44,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['poBox', 'postOfficeBox', 'mailbox']
      },
      fieldMappings: [
        {
          fhirField: 'address.pobox',
          jsonPatterns: ['poBox', 'postOfficeBox', 'mailbox'],
          weight: 12,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'address.postOffice',
          jsonPatterns: ['postOffice'],
          weight: 5,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientRuralAddress', {
      name: 'PatientRuralAddress',
      description: 'Patient with rural address format',
      resourceType: 'Patient',
      priority: 45,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['ruralRoute', 'route', 'roadName', 'propertyName']
      },
      fieldMappings: [
        {
          fhirField: 'address.rural',
          jsonPatterns: ['ruralRoute', 'route', 'roadName', 'propertyName', 'farmName'],
          weight: 12,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'address.geolocation',
          jsonPatterns: ['gpsCoordinates', 'latitude', 'longitude'],
          weight: 8,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientTemporaryAddress', {
      name: 'PatientTemporaryAddress',
      description: 'Patient with temporary address',
      resourceType: 'Patient',
      priority: 46,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: true,
        expectedFields: ['temporaryAddress', 'currentAddress', 'hotelName', 'shelterName']
      },
      fieldMappings: [
        {
          fhirField: 'address.temporary',
          jsonPatterns: ['temporaryAddress', 'currentAddress', 'hotelName', 'shelterName'],
          weight: 12,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'address.period',
          jsonPatterns: ['startDate', 'endDate', 'duration'],
          weight: 8,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientMilitaryAddress', {
      name: 'PatientMilitaryAddress',
      description: 'Patient with military address format',
      resourceType: 'Patient',
      priority: 47,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['unit', 'building', 'barracks', 'baseName', 'apo', 'fpo']
      },
      fieldMappings: [
        {
          fhirField: 'address.military',
          jsonPatterns: ['unit', 'building', 'barracks', 'baseName', 'installation'],
          weight: 12,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'address.militaryCode',
          jsonPatterns: ['apo', 'fpo', 'militaryState'],
          weight: 10,
          required: false,
          dataType: 'string'
        },
        {
          fhirField: 'extension.military',
          jsonPatterns: ['branch', 'rank', 'deployment'],
          weight: 8,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientValuesetEnhanced', {
      name: 'PatientValuesetEnhanced',
      description: 'Patient template with full valueset validation and normalization',
      resourceType: 'Patient',
      priority: 48,
      structurePatterns: {
        maxDepth: 2,
        hasArrays: false,
        hasNestedObjects: false,
        expectedFields: ['nameType', 'phoneType', 'addressType', 'maritalStatus']
      },
      fieldMappings: [
        {
          fhirField: 'name.use.valueset',
          jsonPatterns: ['nameType', 'nameUse'],
          weight: 8,
          required: false,
          dataType: 'string'
        },
        {
          fhirField: 'telecom.use.valueset',
          jsonPatterns: ['phoneType', 'emailType', 'phoneUse', 'emailUse'],
          weight: 8,
          required: false,
          dataType: 'string'
        },
        {
          fhirField: 'address.use.valueset',
          jsonPatterns: ['addressType', 'addressUse', 'addressCategory'],
          weight: 8,
          required: false,
          dataType: 'string'
        },
        {
          fhirField: 'gender.valueset',
          jsonPatterns: ['gender', 'sex'],
          weight: 6,
          required: false,
          dataType: 'string'
        },
        {
          fhirField: 'maritalStatus.valueset',
          jsonPatterns: ['maritalStatus', 'marriageStatus'],
          weight: 6,
          required: false,
          dataType: 'string'
        }
      ]
    });

    this.templates.set('PatientEMS', {
      name: 'PatientEMS',
      description: 'Emergency Medical Services patient with case ID and vitals',
      resourceType: 'Patient',
      priority: 49, // Higher priority than other templates
      structurePatterns: {
        maxDepth: 3,
        hasArrays: false,
        hasNestedObjects: true,
        expectedFields: ['caseId', 'patient', 'vitals', 'incidentLocation', 'transportedTo']
      },
      fieldMappings: [
        {
          fhirField: 'identifier.caseId',
          jsonPatterns: ['caseId'],
          weight: 15,
          required: true,
          dataType: 'string'
        },
        {
          fhirField: 'patient.nested',
          jsonPatterns: ['patient.sex', 'patient.ageEstimate', 'patient.unidentified'],
          weight: 12,
          required: true,
          dataType: 'object'
        },
        {
          fhirField: 'vitals.extension',
          jsonPatterns: ['vitals.heartRate', 'vitals.respiratoryRate', 'vitals.bloodPressure'],
          weight: 10,
          required: false,
          dataType: 'object'
        },
        {
          fhirField: 'location.incident',
          jsonPatterns: ['incidentLocation.lat', 'incidentLocation.lng', 'incidentLocation.description'],
          weight: 8,
          required: false,
          dataType: 'object'
        },
        {
          fhirField: 'transport.destination',
          jsonPatterns: ['transportedTo'],
          weight: 6,
          required: false,
          dataType: 'string'
        }
      ]
    });
  }
}