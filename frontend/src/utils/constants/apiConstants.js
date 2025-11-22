// API Constants
export const HTTP_VERB = {
  GET: 'GET',
  POST: 'POST',
  DELETE: 'DELETE',
  PUT: 'PUT',
  PATCH: 'PATCH',
};

export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
};

// Default options for FormData conversion
export const FORM_DATA_OPTIONS = {
  CREATE: { skipEmpty: true, stringifyObjects: false },
  UPDATE: { skipEmpty: true, stringifyObjects: true },
};

export default {
  HTTP_VERB,
  CONTENT_TYPES,
  FORM_DATA_OPTIONS,
};
