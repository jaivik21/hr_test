import { StorageKeys } from '../utils/constants/localStorageKeys';

// Local Storage
function setLocalItem(key, value) {
  localStorage.setItem(key, value);
}

function getLocalItem(key) {
  return localStorage.getItem(key);
}

// Session Storage helpers
function setSessionItem(key, value) {
  sessionStorage.setItem(key, value);
}

function getSessionItem(key) {
  return sessionStorage.getItem(key);
}

function removeSessionItem(key) {
  return sessionStorage.removeItem(key);
}

export default class Storage {
  // Theme color data - DEPRECATED: Theme is now static
  // Keeping these methods for backward compatibility only
  static setThemeColorData() {
    // No-op: Theme colors are now fixed in theme.jsx
    console.warn(
      'setThemeColorData is deprecated. Theme colors are now static.',
    );
  }

  static getThemeColorData() {
    // Returns null: Theme colors are now fixed in theme.jsx
    return null;
  }

  // Clear Local Storage
  static clearLocalStorage() {
    return localStorage.clear();
  }

  // Generic Local Storage methods
  static setItem(key, value) {
    setLocalItem(key, JSON.stringify(value));
  }

  static getItem(key) {
    const data = getLocalItem(key);
    return data ? JSON.parse(data) : null;
  }

  // Generic Session Storage methods
  static setSessionItem(key, value) {
    setSessionItem(key, String(value));
  }

  static getSessionItem(key) {
    return getSessionItem(key);
  }

  static removeSessionItem(key) {
    removeSessionItem(key);
  }
  static getLoginUserData() {
    let data = getLocalItem(StorageKeys.LMS_LOGIN_USER_DATA);
    return data ? JSON.parse(data) : null;
  }
  // Login user data
  static setLoginUserData(userInfo) {
    setLocalItem(StorageKeys.LMS_LOGIN_USER_DATA, JSON.stringify(userInfo));
  }

  static setRowsPerPageForTable(size) {
    setLocalItem(StorageKeys.LMS_ROWS_PER_PAGE_FOR_TABLE, size);
  }
  //Get rowsPerPageForTable
  static getRowsPerPageForTable() {
    const size = getLocalItem(StorageKeys.LMS_ROWS_PER_PAGE_FOR_TABLE);
    return size;
  }

  // Interview Wizard Step Management
  static setInterviewStep(step) {
    setLocalItem(StorageKeys.INTERVIEW_STEP, step);
  }

  static getInterviewStep() {
    const data = getLocalItem(StorageKeys.INTERVIEW_STEP);
    return data ? JSON.parse(data) : null;
  }

  static clearInterviewStep() {
    localStorage.removeItem(StorageKeys.INTERVIEW_STEP);
  }

  // Sidebar state
  static setIsSideBarOpen(open) {
    setLocalItem(StorageKeys.IS_SIDEBAR_OPEN, String(open));
  }

  static getIsSideBarOpen() {
    return getLocalItem(StorageKeys.IS_SIDEBAR_OPEN);
  }
}
