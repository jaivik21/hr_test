import axios from 'axios';
import qs from 'qs';
import { API_URL as BASE_URL } from '../config/config';
import messages from '../utils/constants/messages';
import { API_KEY } from '../config/config';
import { objectToFormData as createFormData } from '../utils/helper';
import { HTTP_VERB, CONTENT_TYPES } from '../utils/constants/apiConstants';
import Storage from '../services/Storage';

class Api {
  static async get(uri, params = {}) {
    let uriWithParams = uri;

    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          searchParams.append(key, value);
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        uriWithParams = `${uri}${uri.includes('?') ? '&' : '?'}${queryString}`;
      }
    }

    const requestData = Api.buildRequest({ httpVerb: HTTP_VERB.GET });
    return Api.performRequest(uriWithParams, requestData);
  }

  static async post(
    uri,
    body,
    apiHeader = {},
    contentType = CONTENT_TYPES.JSON,
    params,
  ) {
    const requestData = Api.buildRequest({
      httpVerb: HTTP_VERB.POST,
      body,
      apiHeader,
      contentType,
    });
    return Api.performRequest(uri, requestData, params);
  }

  static async delete(
    uri,
    body,
    apiHeader = {},
    contentType = CONTENT_TYPES.JSON,
  ) {
    const requestData = Api.buildRequest({
      httpVerb: HTTP_VERB.DELETE,
      body,
      apiHeader,
      contentType,
    });
    return Api.performRequest(uri, requestData);
  }

  static async put(
    uri,
    body,
    apiHeader = {},
    contentType = CONTENT_TYPES.JSON,
  ) {
    const requestData = Api.buildRequest({
      httpVerb: HTTP_VERB.PUT,
      body,
      apiHeader,
      contentType,
    });
    return Api.performRequest(uri, requestData);
  }

  static async patch(
    uri,
    body,
    apiHeader = {},
    contentType = CONTENT_TYPES.JSON,
  ) {
    const requestData = Api.buildRequest({
      httpVerb: HTTP_VERB.PATCH,
      body,
      apiHeader,
      contentType,
    });
    return Api.performRequest(uri, requestData);
  }

  static buildRequest({
    httpVerb,
    body,
    apiHeader = {},
    contentType = CONTENT_TYPES.JSON,
  }) {
    const headers = {
      'content-type': contentType || 'application/json',
    };

    // Handle data based on content type
    let data;
    if (contentType === CONTENT_TYPES.JSON) {
      data = body ? JSON.stringify(body) : undefined;
    } else if (contentType === CONTENT_TYPES.FORM_DATA) {
      data = body; // FormData should be passed as-is
    } else {
      data = body ? qs.stringify(body) : undefined;
    }

    const storedAuth = Storage.getLoginUserData();
    if (storedAuth?.accessToken) {
      const tokenType = storedAuth?.tokenType
        ? `${storedAuth.tokenType
            .charAt(0)
            .toUpperCase()}${storedAuth.tokenType.slice(1)}`
        : 'Bearer';
      headers.Authorization = `${tokenType} ${storedAuth.accessToken}`;
      headers.API_KEY = API_KEY;
    }

    const allHeaders = { ...headers, ...apiHeader };

    // For multipart/form-data, don't set content-type header - let browser set it with boundary
    if (contentType?.includes('multipart/form-data')) {
      delete allHeaders['content-type'];
    }

    return {
      method: httpVerb,
      headers: { ...allHeaders },
      data,
    };
  }

  // Helper method to convert object to FormData (delegates to utility function)
  static objectToFormData(data, options = {}) {
    return createFormData(data, options);
  }

  static async performRequest(uri, requestData = {}, params) {
    const url = `${BASE_URL}${uri}`;

    try {
      console.log('API Request:', { url, ...requestData, params });
      const response = await axios(url, { ...requestData, params });
      return {
        body: response.data,
        status: response.status,
        error: null,
      };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.error?.code ||
        messages.SOMETHING_WENT_WRONG_ERROR;

      throw {
        body: null,
        error: errorMessage,
        status: error?.response?.status || 500,
      };
    }
  }
}

export default Api;
