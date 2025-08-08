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
  Stack,
  Fade,
  Grow,
  Slide,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Login as LoginIcon,
  PersonAdd as SignupIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Star as StarIcon,
  ArrowBack as BackIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
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
      setTimeout(() => navigate('/'), 1500);
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
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      py: 4
    }}>
      <Container maxWidth="sm">
        <Fade in timeout={800}>
          <Box>
            {/* Back Button */}
            <Grow in timeout={1000}>
              <Button
                startIcon={<BackIcon />}
                onClick={() => navigate('/')}
                sx={{
                  mb: 4,
                  color: '#94A3B8',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  textTransform: 'none',
                  '&:hover': {
                    color: '#6366F1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    transform: 'translateX(-4px)'
                  },
                  transition: 'all 0.3s ease-in-out'
                }}
              >
                Back to Home
              </Button>
            </Grow>

            {/* Title */}
            <Grow in timeout={1200}>
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography 
                  variant="h3" 
                  component="h1" 
                  sx={{ 
                    fontWeight: 700, 
                    color: '#F8FAFC',
                    fontSize: { xs: '2rem', md: '2.5rem' },
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2
                  }}
                >
                  <StarIcon sx={{ 
                    fontSize: { xs: 32, md: 40 }, 
                    color: '#6366F1',
                    filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.4))'
                  }} />
                  Welcome to Resume Forge
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: '#94A3B8',
                    fontSize: '1rem',
                    maxWidth: '400px',
                    mx: 'auto'
                  }}
                >
                  Sign in to your account or create a new one to get started
                </Typography>
              </Box>
            </Grow>

            <Slide direction="up" in timeout={1400}>
              <Paper 
                elevation={12} 
                sx={{ 
                  width: '100%', 
                  p: { xs: 3, md: 4 },
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: 3,
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'linear-gradient(90deg, #6366F1, #8B5CF6, #EC4899)',
                    animation: 'shimmer 3s infinite'
                  }
                }}
              >
                <Tabs 
                  value={activeTab} 
                  onChange={handleTabChange} 
                  centered
                  sx={{ 
                    mb: 3,
                    '& .MuiTab-root': {
                      color: '#94A3B8',
                      fontWeight: 600,
                      fontSize: '1rem',
                      textTransform: 'none',
                      minHeight: 56,
                      '&.Mui-selected': {
                        color: '#6366F1'
                      }
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: '#6366F1',
                      height: 3,
                      borderRadius: 2
                  }
                }}
                >
                  <Tab 
                    label="Sign In" 
                    icon={<LoginIcon />} 
                    iconPosition="start"
                  />
                  <Tab 
                    label="Create Account" 
                    icon={<SignupIcon />} 
                    iconPosition="start"
                  />
                </Tabs>

                {error && (
                  <Fade in>
                    <Alert 
                      severity="error" 
                      sx={{ 
                        mb: 3, 
                        borderRadius: 2,
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#FCA5A5'
                      }}
                    >
                      {error}
                    </Alert>
                  </Fade>
                )}

                {success && (
                  <Fade in>
                    <Alert 
                      severity="success" 
                      sx={{ 
                        mb: 3, 
                        borderRadius: 2,
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        color: '#86EFAC'
                      }}
                    >
                      {success}
                    </Alert>
                  </Fade>
                )}

                {/* Login Tab */}
                <TabPanel value={activeTab} index={0}>
                  <Grow in timeout={300}>
                    <form onSubmit={handleLogin}>
                      <Stack spacing={3}>
                        <TextField
                          label="Email Address"
                          type="email"
                          fullWidth
                          required
                          value={loginData.email}
                          onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                          disabled={loading}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <EmailIcon sx={{ color: '#6366F1', fontSize: 20 }} />
                              </InputAdornment>
                            )
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                                borderWidth: 2,
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                                borderWidth: 2,
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              fontWeight: 500,
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                              fontSize: '1rem',
                              '&:-webkit-autofill': {
                                '-webkit-box-shadow': '0 0 0 100px rgba(15, 23, 42, 0.3) inset',
                                '-webkit-text-fill-color': '#F8FAFC',
                                'transition': 'background-color 5000s ease-in-out 0s',
                              },
                              '&:-webkit-autofill:hover': {
                                '-webkit-box-shadow': '0 0 0 100px rgba(15, 23, 42, 0.3) inset',
                              },
                              '&:-webkit-autofill:focus': {
                                '-webkit-box-shadow': '0 0 0 100px rgba(15, 23, 42, 0.3) inset',
                              },
                            },
                          }}
                        />
                        <TextField
                          label="Password"
                          type={showPassword ? 'text' : 'password'}
                          fullWidth
                          required
                          value={loginData.password}
                          onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                          disabled={loading}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LockIcon sx={{ color: '#6366F1', fontSize: 20 }} />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowPassword(!showPassword)}
                                  edge="end"
                                  sx={{ color: '#94A3B8' }}
                                >
                                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                              </InputAdornment>
                            )
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                                borderWidth: 2,
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                                borderWidth: 2,
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              fontWeight: 500,
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                              fontSize: '1rem',
                              '&:-webkit-autofill': {
                                '-webkit-box-shadow': '0 0 0 100px rgba(15, 23, 42, 0.3) inset',
                                '-webkit-text-fill-color': '#F8FAFC',
                                'transition': 'background-color 5000s ease-in-out 0s',
                              },
                              '&:-webkit-autofill:hover': {
                                '-webkit-box-shadow': '0 0 0 100px rgba(15, 23, 42, 0.3) inset',
                              },
                              '&:-webkit-autofill:focus': {
                                '-webkit-box-shadow': '0 0 0 100px rgba(15, 23, 42, 0.3) inset',
                              },
                            },
                          }}
                        />
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          fullWidth
                          disabled={loading}
                          endIcon={loading ? <CircularProgress size={20} /> : <ArrowIcon />}
                          sx={{ 
                            py: 1.5,
                            borderRadius: 2,
                            fontSize: '1rem',
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)',
                              boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
                              transform: 'translateY(-2px)'
                            },
                            '&:disabled': {
                              background: 'rgba(99, 102, 241, 0.3)',
                              transform: 'none'
                            },
                            transition: 'all 0.3s ease-in-out',
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: '-100%',
                              width: '100%',
                              height: '100%',
                              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                              transition: 'left 0.5s',
                            },
                            '&:hover::before': {
                              left: '100%',
                            }
                          }}
                        >
                          {loading ? 'Signing In...' : 'Sign In'}
                        </Button>
                      </Stack>
                    </form>
                  </Grow>
                </TabPanel>

                {/* Signup Tab */}
                <TabPanel value={activeTab} index={1}>
                  <Grow in timeout={300}>
                    <form onSubmit={handleSignup}>
                      <Stack spacing={3}>
                        <TextField
                          label="Full Name"
                          fullWidth
                          value={signupData.displayName}
                          onChange={(e) => setSignupData({...signupData, displayName: e.target.value})}
                          disabled={loading}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PersonIcon sx={{ color: '#6366F1', fontSize: 20 }} />
                              </InputAdornment>
                            )
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                                borderWidth: 2,
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                                borderWidth: 2,
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              fontWeight: 500,
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                              fontSize: '1rem',
                            },
                          }}
                        />
                        <TextField
                          label="Email Address"
                          type="email"
                          fullWidth
                          required
                          value={signupData.email}
                          onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                          disabled={loading}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <EmailIcon sx={{ color: '#6366F1', fontSize: 20 }} />
                              </InputAdornment>
                            )
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                                borderWidth: 2,
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                                borderWidth: 2,
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              fontWeight: 500,
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                              fontSize: '1rem',
                            },
                          }}
                        />
                        <TextField
                          label="Password"
                          type={showPassword ? 'text' : 'password'}
                          fullWidth
                          required
                          value={signupData.password}
                          onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                          disabled={loading}
                          helperText="At least 6 characters"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LockIcon sx={{ color: '#6366F1', fontSize: 20 }} />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowPassword(!showPassword)}
                                  edge="end"
                                  sx={{ color: '#94A3B8' }}
                                >
                                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                              </InputAdornment>
                            )
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                                borderWidth: 2,
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                                borderWidth: 2,
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              fontWeight: 500,
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                              fontSize: '1rem',
                            },
                            '& .MuiFormHelperText-root': {
                              color: '#64748B',
                              fontSize: '0.8rem',
                            },
                          }}
                        />
                        <TextField
                          label="Confirm Password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          fullWidth
                          required
                          value={signupData.confirmPassword}
                          onChange={(e) => setSignupData({...signupData, confirmPassword: e.target.value})}
                          disabled={loading}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <LockIcon sx={{ color: '#6366F1', fontSize: 20 }} />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  edge="end"
                                  sx={{ color: '#94A3B8' }}
                                >
                                  {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                              </InputAdornment>
                            )
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                                borderWidth: 2,
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                                borderWidth: 2,
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              fontWeight: 500,
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                              fontSize: '1rem',
                            },
                          }}
                        />
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          fullWidth
                          disabled={loading}
                          endIcon={loading ? <CircularProgress size={20} /> : <ArrowIcon />}
                          sx={{ 
                            py: 1.5,
                            borderRadius: 2,
                            fontSize: '1rem',
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)',
                              boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
                              transform: 'translateY(-2px)'
                            },
                            '&:disabled': {
                              background: 'rgba(99, 102, 241, 0.3)',
                              transform: 'none'
                            },
                            transition: 'all 0.3s ease-in-out',
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: '-100%',
                              width: '100%',
                              height: '100%',
                              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                              transition: 'left 0.5s',
                            },
                            '&:hover::before': {
                              left: '100%',
                            }
                          }}
                        >
                          {loading ? 'Creating Account...' : 'Create Account'}
                        </Button>
                      </Stack>
                    </form>
                  </Grow>
                </TabPanel>
              </Paper>
            </Slide>
          </Box>
        </Fade>

        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          
          /* Fix autofill background issues */
          input:-webkit-autofill,
          input:-webkit-autofill:hover,
          input:-webkit-autofill:focus,
          input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 100px rgba(15, 23, 42, 0.3) inset !important;
            -webkit-text-fill-color: #F8FAFC !important;
            transition: background-color 5000s ease-in-out 0s !important;
            background-color: rgba(15, 23, 42, 0.3) !important;
          }
          
          /* Additional autofill overrides for Material-UI */
          .MuiInputBase-input:-webkit-autofill {
            -webkit-box-shadow: 0 0 0 100px rgba(15, 23, 42, 0.3) inset !important;
            -webkit-text-fill-color: #F8FAFC !important;
            transition: background-color 5000s ease-in-out 0s !important;
            background-color: rgba(15, 23, 42, 0.3) !important;
          }
        `}</style>
      </Container>
    </Box>
  );
};

export default AuthPage;