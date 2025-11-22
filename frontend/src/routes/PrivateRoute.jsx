import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';

import routePaths from './routePaths';
import PageContainer from '../components/pageContainer/PageContainer';

const PrivateRoute = ({
  authenticated,
  children,
  back,
  title,
  permissionKey,
  isPrivate,
}) => {
  if (!isPrivate) {
    return children;
  }

  if (!authenticated) {
    return <Navigate to={routePaths.login} replace />;
  }

  return (
    <PageContainer
      back={back}
      title={title}
      permissionKey={permissionKey || ''}>
      {children}
    </PageContainer>
  );
};

PrivateRoute.propTypes = {
  authenticated: PropTypes.bool,
  children: PropTypes.node.isRequired,
  back: PropTypes.string,
  title: PropTypes.string,
  permissionKey: PropTypes.string,
  isPrivate: PropTypes.bool,
};

export default PrivateRoute;
