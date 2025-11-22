import { useState } from 'react';
import { Flex, Box, Text, Button, Heading } from '@chakra-ui/react';

import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import WelcomeBanner from './WelcomeBanner';
import TextField from '../../components/TextField/TextField';
import messages from '../../utils/constants/messages';
import { themeColor } from '../../utils/constants/constants';
import Validation from '../../services/validation';
import {
  LOGIN_FAILED,
  TOAST_ERROR_STATUS,
} from '../../utils/constants/titleConstant';
import { showToast } from '../../components/Toast/ShowToast';
import { login } from '../../redux/slices/authSlice';
import routePaths from '../../routes/routePaths';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const loading = useSelector(state => state?.loader?.loading);
  const [data, setData] = useState({ email: '', password: '' });
  const [error, setError] = useState({ email: '', password: '' });
  const handleChange = e => {
    const { name, value } = e.target;
    setData(previous => ({
      ...previous,
      [name]: value,
    }));
    setError(previous => ({
      ...previous,
      [name]: '',
    }));
  };

  const handleForgotPassword = () => {
    navigate(routePaths.forgotPassword || '/forgot-password');
  };

  const handleSubmit = async () => {
    let emailControl = { value: data.email };
    let passwordControl = { value: data.password };

    emailControl = Validation.emailValidator(emailControl);
    passwordControl = Validation.passwordValidator(passwordControl);

    if (emailControl.invalidEmail || passwordControl.nullPassword) {
      setError({
        email: emailControl.invalidEmail ? messages.EMAIL_ERROR : '',
        password: passwordControl.nullPassword ? messages.PASSWORD_ERROR : '',
      });
      return;
    }

    setError({ email: '', password: '' });

    const loginData = { email: data.email, password: data.password };

    try {
      await dispatch(login({ user: loginData }));
      navigate(routePaths.InterviewDashboard);
    } catch (error) {
      showToast(
        TOAST_ERROR_STATUS,
        LOGIN_FAILED,
        error?.error || messages.SOMETHING_WENT_WRONG_ERROR,
      );
    }
  };

  return (
    <Flex
      w="100%"
      h="100vh"
      overflow="hidden"
      flexDirection={{ base: 'column', lg: 'row' }}>
      <Box
        w={{ base: '100%', lg: '40%' }}
        h="100%"
        display={{ base: 'none', lg: 'block' }}
        bg={themeColor.STROKE_COLOR}>
        <WelcomeBanner />
      </Box>
      <Box
        flex="1"
        h="100%"
        overflow="hidden"
        display="flex"
        alignItems="center"
        justifyContent="center"
        px={{ base: '1.5rem', lg: '3rem' }}
        py={{ base: '2rem', lg: '3rem' }}
        boxSizing="border-box">
        <Box
          w="80%"
          maxW="680px"
          bg={themeColor.WHITE_COLOR}
          rounded="2xl"
          boxShadow="2xl"
          px={{ base: 6, md: 12 }}
          py={{ base: 8, md: 12 }}>
          <Heading
            fontSize="3xl"
            mb={4}
            color={themeColor.PRIMARY_COLOR}
            textAlign="center">
            Login to your account
          </Heading>
          <Text
            fontSize="md"
            mb={6}
            color={themeColor.SECONDARY_TEXT_COLOR}
            textAlign="center">
            Access your account with your login credentials
          </Text>
          <Box>
            <Box mb={5}>
              <TextField
                label="Email"
                name="email"
                type="email"
                value={data.email}
                handleChange={handleChange}
                placeholder="demo@gmail.com"
                required
                error={error.email}
              />
            </Box>
            <Box mb={5}>
              <Flex justifyContent="space-between" alignItems="center" mb={2}>
                <Text fontSize="sm" fontWeight={400} mb={0}>
                  Password
                </Text>
                <Button
                  variant="link"
                  colorScheme="primary"
                  size="sm"
                  onClick={handleForgotPassword}>
                  Forgot password?
                </Button>
              </Flex>
              <TextField
                name="password"
                type="password"
                value={data.password}
                handleChange={handleChange}
                placeholder="*******"
                required
                error={error.password}
                noGap
              />
            </Box>
            <Button
              colorScheme="primary"
              size="lg"
              w="100%"
              mt={6}
              isLoading={loading}
              onClick={handleSubmit}>
              Login
            </Button>
          </Box>
        </Box>
      </Box>
    </Flex>
  );
};

export default Login;
