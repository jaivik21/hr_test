import { createSlice } from '@reduxjs/toolkit';
import { loginApi } from '../../api/AuthService';
import Storage from '../../services/Storage';
import { setLoadingState } from './loaderSlice';
import { dateConstants } from '../../utils/constants/dateConstants';

export const login =
  ({ user }) =>
  async dispatch => {
    dispatch(setLoadingState(true));
    try {
      const res = await loginApi(user);
      dispatch(loginSuccess(res.body));
      return res.body;
    } catch (error) {
      dispatch(loginRejected(error?.error));
      throw error;
    } finally {
      dispatch(setLoadingState(false));
    }
  };

const storedAuth = Storage?.getLoginUserData();
const initialState = {
  user: storedAuth?.user || null,
  token: storedAuth?.accessToken || null,
  tokenType: storedAuth?.tokenType || 'Bearer',
  loading: false,
  error: null,
  isAuthenticated: Boolean(storedAuth?.accessToken),
  isHydrated: Boolean(storedAuth),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action) {
      const { access_token, token_type, user } = action.payload || {};
      state.user = user || null;
      state.loading = false;
      state.token = access_token || null;
      state.tokenType = token_type || 'Bearer';
      state.isAuthenticated = Boolean(access_token);
      state.error = null;
      state.isHydrated = true;
      state.timeZone =
        user?.time_zone || dateConstants.TIMEZONE_CONST_ASIA_KOLKATA;
      Storage.setLoginUserData({
        user,
        accessToken: access_token,
        tokenType: token_type || 'Bearer',
      });
    },

    loginRejected(state, action) {
      state.user = null;
      state.loading = false;
      state.error = action?.payload;
      state.isAuthenticated = false;
      state.token = null;
      state.tokenType = null;
      state.isHydrated = true;
    },

    loadUserFromStorage(state) {
      const storedAuthData = Storage?.getLoginUserData();
      if (storedAuthData?.accessToken) {
        state.user = storedAuthData.user;
        state.token = storedAuthData.accessToken;
        state.tokenType = storedAuthData.tokenType || 'Bearer';
        state.isAuthenticated = true;
      } else {
        state.user = null;
        state.token = null;
        state.tokenType = null;
        state.isAuthenticated = false;
      }
      state.isHydrated = true;
    },

    logout(state) {
      state.user = null;
      state.token = null;
      state.tokenType = null;
      state.isAuthenticated = false;
      state.isHydrated = true;
      Storage.clearLocalStorage();
    },
  },
});

export const { loadUserFromStorage, logout, loginSuccess, loginRejected } =
  authSlice.actions;

export default authSlice.reducer;
