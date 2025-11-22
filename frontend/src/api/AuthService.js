import APIService from './APIService';
const LOGIN = '/api/auth/login';
const LOGOUT = '/api/v1/auth/logout';

export const loginApi = user => {
  return APIService.post(LOGIN, user, {}, 'application/json');
};
export const logoutApi = () => {
  return APIService.post(LOGOUT);
};
