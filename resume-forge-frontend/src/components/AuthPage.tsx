import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const AuthPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  // Signup form state
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });

  const { login, signup } = useAuth();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(loginData.email, loginData.password);
      setSuccess('Login successful! Redirecting...');
    } catch (error: any) {
      setError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (signupData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      await signup(signupData.email, signupData.password, signupData.displayName);
      setSuccess('Account created successfully! Please log in.');
      setActiveTab(0); // Switch to login tab
      setSignupData({ email: '', password: '', confirmPassword: '', displayName: '' });
    } catch (error: any) {
      setError(error.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '80vh',
        justifyContent: 'center'
      }}>
        <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 600, color: 'primary.main' }}>
          Welcome to Resume Forge
        </Typography>

        <Paper elevation={3} sx={{ width: '100%', p: 4 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            centered
            sx={{ mb: 2 }}
          >
            <Tab label="Login" />
            <Tab label="Sign Up" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {/* Login Tab */}
          <TabPanel value={activeTab} index={0}>
            <form onSubmit={handleLogin}>
              <Stack spacing={3}>
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  required
                  value={loginData.email}
                  onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                  disabled={loading}
                />
                <TextField
                  label="Password"
                  type="password"
                  fullWidth
                  required
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  disabled={loading}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{ py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Login'}
                </Button>
              </Stack>
            </form>
          </TabPanel>

          {/* Signup Tab */}
          <TabPanel value={activeTab} index={1}>
            <form onSubmit={handleSignup}>
              <Stack spacing={3}>
                <TextField
                  label="Display Name"
                  fullWidth
                  value={signupData.displayName}
                  onChange={(e) => setSignupData({...signupData, displayName: e.target.value})}
                  disabled={loading}
                />
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  required
                  value={signupData.email}
                  onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                  disabled={loading}
                />
                <TextField
                  label="Password"
                  type="password"
                  fullWidth
                  required
                  value={signupData.password}
                  onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                  disabled={loading}
                  helperText="At least 6 characters"
                />
                <TextField
                  label="Confirm Password"
                  type="password"
                  fullWidth
                  required
                  value={signupData.confirmPassword}
                  onChange={(e) => setSignupData({...signupData, confirmPassword: e.target.value})}
                  disabled={loading}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{ py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Create Account'}
                </Button>
              </Stack>
            </form>
          </TabPanel>
        </Paper>
      </Box>
    </Container>
  );
};

export default AuthPage;