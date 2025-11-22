import { useEffect, useState } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import NiceModal from '@ebay/nice-modal-react';

import './App.css';

import routes from './routes/routes';
import getTheme from './theme/theme';
import registerModals from './config/modals';
import Loader from './components/Loader/Loader';
import routePaths from './routes/routePaths';
import { loadUserFromStorage } from './redux/slices/authSlice';
import modals from './utils/constants/modals';
import PrivateRoute from './routes/PrivateRoute';

registerModals();

const App = () => {
  const dispatch = useDispatch();
  const loader = useSelector(state => state.loader);
  const authenticated = useSelector(state => state.auth.isAuthenticated);
  const authHydrated = useSelector(state => state.auth.isHydrated);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    dispatch(loadUserFromStorage());
  }, [dispatch]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      NiceModal.hide(modals.noInternetConnectModal);
    };

    const handleOffline = () => {
      setIsOnline(false);
      NiceModal.show(modals.noInternetConnectModal);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      NiceModal.hide(modals.noInternetConnectModal);
    }
  }, [isOnline]);

  const theme = getTheme();

  return (
    <ChakraProvider
      theme={theme}
      toastOptions={{ defaultOptions: { position: 'top-right' } }}>
      <NiceModal.Provider>
        <Loader
          isLoading={loader.loading || !authHydrated}
          text={loader.loadingText}
        />

        <Routes>
          {routes?.map(
            (
              {
                path,
                component: Component,
                title,
                back,
                permissionKey,
                isPrivate = false,
                redirectWhenAuthenticated = false,
              },
              index,
            ) => {
              const routeKey = `route-${path}-${index}`;

              if (redirectWhenAuthenticated && authenticated) {
                return (
                  <Route
                    key={routeKey}
                    path={path}
                    element={
                      <Navigate to={routePaths.InterviewDashboard} replace />
                    }
                  />
                );
              }

              return (
                <Route
                  key={routeKey}
                  path={path}
                  element={
                    <PrivateRoute
                      authenticated={authenticated}
                      title={title}
                      back={back}
                      permissionKey={permissionKey}
                      isPrivate={isPrivate}>
                      <Component />
                    </PrivateRoute>
                  }
                />
              );
            },
          )}

          <Route
            path="*"
            element={
              <Navigate
                to={
                  authenticated
                    ? routePaths.InterviewDashboard
                    : routePaths.login
                }
                replace
              />
            }
          />
        </Routes>
      </NiceModal.Provider>
    </ChakraProvider>
  );
};

export default App;
