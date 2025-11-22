import { combineReducers } from '@reduxjs/toolkit';
import themeReducer from './slices/themeSlice';
import loaderReducer from './slices/loaderSlice';
import candidateReducer from './slices/candidateSlice';
import authReducer from './slices/authSlice';
import interviewsReducer from './slices/interviewsSlice';
import interviewReducer from './slices/interviewSlice';

const appReducer = combineReducers({
  theme: themeReducer,
  loader: loaderReducer,
  candidate: candidateReducer,
  auth: authReducer,
  interviews: interviewsReducer,
  interview: interviewReducer,
  // Add more slices here
});

const rootReducer = (state, action) => {
  if (action.type === 'RESET_STATE') {
    state = undefined;
  }
  return appReducer(state, action);
};

export default rootReducer;
