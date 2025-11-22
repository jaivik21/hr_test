import * as yup from 'yup';
import { FILE_UPLOAD } from './constants/fileUploadConstants';

const fieldSchemas = {
  name: yup.string().required('Interview Title is required').trim(),

  question_count: yup
    .number()
    .typeError('Must be a number')
    .required('Number of Questions is required')
    .positive('Must be a positive number')
    .integer('Must be a whole number')
    .max(100, 'Cannot exceed 100 questions'),

  duration_minutes: yup
    .number()
    .typeError('Must be a number')
    .required('Duration is required')
    .positive('Must be a positive number')
    .max(480, 'Cannot exceed 480 minutes (8 hours)'),

  interviewer_id: yup
    .string()
    .required('Please select an Interviewer')
    .test('not-empty', 'Please select an Interviewer', value =>
      Boolean(value && value.trim()),
    ),

  description: yup
    .string()
    .required('Interview Description is required')
    .trim(),

  job_description: yup.string().required('Job Description is required').trim(),

  jd_file: yup
    .mixed()
    .nullable()
    .test('fileType', 'Only PDF files are allowed', value => {
      if (!value) return true;
      return value.type === 'application/pdf';
    })
    .test('fileSize', 'File size must not exceed 10MB', value => {
      if (!value) return true;
      return value.size <= FILE_UPLOAD.MAX_FILE_SIZE;
    }),
};

const step1Schema = yup.object().shape({
  name: fieldSchemas.name,
  question_count: fieldSchemas.question_count,
  duration_minutes: fieldSchemas.duration_minutes,
  interviewer_id: fieldSchemas.interviewer_id,
  description: fieldSchemas.description,
});

const step2Schema = yup.object().shape({
  job_description: fieldSchemas.job_description,
  jd_file: fieldSchemas.jd_file,
});

const parseYupErrors = yupError => {
  const errors = {};
  if (yupError.inner && yupError.inner.length > 0) {
    yupError.inner.forEach(err => {
      if (err.path) {
        errors[err.path] = err.message;
      }
    });
  } else if (yupError.path) {
    errors[yupError.path] = yupError.message;
  }
  return errors;
};

export const validateStep1BasicInfo = formData => {
  try {
    step1Schema.validateSync(formData, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (error) {
    return {
      isValid: false,
      errors: parseYupErrors(error),
    };
  }
};

export const validateStep2JobDescription = formData => {
  try {
    step2Schema.validateSync(formData, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (error) {
    return {
      isValid: false,
      errors: parseYupErrors(error),
    };
  }
};

export const validateCompleteInterviewData = interviewData => {
  const errors = {};

  // Validate Step 1
  try {
    step1Schema.validateSync(interviewData, { abortEarly: false });
  } catch (error) {
    Object.assign(errors, parseYupErrors(error));
  }

  // Validate Step 2
  try {
    step2Schema.validateSync(interviewData, { abortEarly: false });
  } catch (error) {
    Object.assign(errors, parseYupErrors(error));
  }

  const step1Fields = [
    'name',
    'question_count',
    'duration_minutes',
    'interviewer_id',
    'description',
  ];
  const step2Fields = ['job_description', 'jd_file'];

  const step1Errors = Object.keys(errors).filter(key =>
    step1Fields.includes(key),
  ).length;
  const step2Errors = Object.keys(errors).filter(key =>
    step2Fields.includes(key),
  ).length;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    summary: {
      totalErrors: Object.keys(errors).length,
      step1Errors,
      step2Errors,
    },
  };
};

export const getFirstErrorMessage = errors => {
  const firstKey = Object.keys(errors)[0];
  return errors[firstKey] || 'Validation failed';
};

export const validateField = (fieldName, value) => {
  const schema = fieldSchemas[fieldName];
  if (!schema) return null;

  try {
    schema.validateSync(value);
    return null;
  } catch (error) {
    return error.message;
  }
};

export default {
  validateStep1BasicInfo,
  validateStep2JobDescription,
  validateCompleteInterviewData,
  getFirstErrorMessage,
  validateField,
};
