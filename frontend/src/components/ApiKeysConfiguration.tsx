import React, { useState, useCallback, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  IconButton, 
  InputAdornment,
  Collapse,
  CircularProgress,
  Zoom,
} from '@mui/material';
import {
  Key as KeyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import apiClient from '../utils/apiClient';
import { toast } from 'react-hot-toast';

interface ApiKeysConfigurationProps {
  userInfo: { accountTier?: string; email?: string; displayName?: string } | null;
  selectedProvider: 'openai' | 'groq-google';
  onProviderChange: (provider: 'openai' | 'groq-google') => void;
  onApiConfigChange?: (apiConfig: {
    hasOpenAiKey?: boolean;
    hasGroqKey?: boolean;
    hasGoogleGenAiKey?: boolean;
  }) => void;
}

interface UserApiConfig {
  hasOpenAiKey?: boolean;
  hasGroqKey?: boolean;
  hasGoogleGenAiKey?: boolean;
  openAiKey?: string;
  groqKey?: string;
  googleGenAiKey?: string;
  timestamp?: string;
  lastUpdated?: string;
}

interface LoadingStates {
  openAiKey: boolean;
  groqKey: boolean;
  googleGenAiKey: boolean;
}

const ApiKeysConfiguration: React.FC<ApiKeysConfigurationProps> = ({ 
  userInfo, 
  selectedProvider, 
  onProviderChange, 
  onApiConfigChange 
}: ApiKeysConfigurationProps) => {
  const [userApiConfig, setUserApiConfig] = useState<UserApiConfig | null>(null);
  const [openAiKey, setOpenAiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [googleGenAiKey, setGoogleGenAiKey] = useState('');
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showGoogleGenAiKey, setShowGoogleGenAiKey] = useState(false);
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    openAiKey: false,
    groqKey: false,
    googleGenAiKey: false
  });
  const [showApiConfig, setShowApiConfig] = useState(false);

  const loadUserApiConfig = useCallback(async () => {
    try {
      const response = await apiClient.get('/apiConfig');
      if (response.data.success) {
        setUserApiConfig(response.data.apiData);
        // Notify parent component of API config changes
        if (onApiConfigChange) {
          onApiConfigChange(response.data.apiData);
        }
      }
    } catch (error) {
      console.error('Error loading API config:', error);
    }
  }, [onApiConfigChange]);

  useEffect(() => {
    loadUserApiConfig();
  }, [loadUserApiConfig]);

  const setLoadingState = (key: keyof LoadingStates, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  };

  const handleSaveIndividualKey = async (key: string, value: string) => {
    const loadingKey = key as keyof LoadingStates;
    setLoadingState(loadingKey, true);
    
    try {
      const response = await apiClient.post('/apiConfig', {
        [key]: value
      });
      
      if (response.data.success) {
        await loadUserApiConfig();
        
        // Show provider-specific success message
        const getSuccessMessage = (keyType: string) => {
          switch (keyType) {
            case 'openAiKey': return 'OpenAI API key updated successfully!';
            case 'groqKey': return 'Groq API key updated successfully!';
            case 'googleGenAiKey': return 'Google Gen AI key updated successfully!';
            default: return 'API key updated successfully!';
          }
        };
        
        toast.success(getSuccessMessage(key), { icon: <SuccessIcon /> });
        
        // Clear the input field after successful save
        if (key === 'openAiKey') setOpenAiKey('');
        if (key === 'groqKey') setGroqKey('');
        if (key === 'googleGenAiKey') setGoogleGenAiKey('');
      } else {
        // Handle specific backend validation errors
        const errorDetail = response.data.detail || response.data.error || '';
        if (errorDetail.includes('INVALID_API_KEY')) {
          const getInvalidKeyMessage = (keyType: string) => {
            switch (keyType) {
              case 'openAiKey': return 'Invalid OpenAI API key format. Please check your key.';
              case 'groqKey': return 'Invalid Groq API key format. Please check your key.';
              case 'googleGenAiKey': return 'Invalid Google Gen AI key format. Please check your key.';
              default: return 'Invalid API key format. Please check your key.';
            }
          };
          toast.error(getInvalidKeyMessage(key), { duration: 5000, icon: <KeyIcon /> });
        } else {
          const getGenericErrorMessage = (keyType: string) => {
            switch (keyType) {
              case 'openAiKey': return 'Failed to save OpenAI key.';
              case 'groqKey': return 'Failed to save Groq key.';
              case 'googleGenAiKey': return 'Failed to save Google Gen AI key.';
              default: return 'Failed to save API key.';
            }
          };
          toast.error(getGenericErrorMessage(key), { icon: <ErrorIcon /> });
        }
      }
    } catch (error) {
      console.error('Error updating key:', error);
      const errorResponse = error as { response?: { data?: { detail?: string } } };
      
      if (errorResponse.response?.data?.detail?.includes('INVALID_API_KEY')) {
        const getInvalidKeyMessage = (keyType: string) => {
          switch (keyType) {
            case 'openAiKey': return 'Invalid OpenAI API key. Please verify your key.';
            case 'groqKey': return 'Invalid Groq API key. Please verify your key.';
            case 'googleGenAiKey': return 'Invalid Google Gen AI key. Please verify your key.';
            default: return 'Invalid API key. Please verify your key.';
          }
        };
        toast.error(getInvalidKeyMessage(key), { duration: 5000, icon: <KeyIcon /> });
      } else {
        const getErrorMessage = (keyType: string) => {
          switch (keyType) {
            case 'openAiKey': return 'Error saving OpenAI key. Please try again.';
            case 'groqKey': return 'Error saving Groq key. Please try again.';
            case 'googleGenAiKey': return 'Error saving Google Gen AI key. Please try again.';
            default: return 'Error saving API key. Please try again.';
          }
        };
        toast.error(getErrorMessage(key), { icon: <ErrorIcon /> });
      }
    } finally {
      setLoadingState(loadingKey, false);
    }
  };

  const handleDeleteIndividualKey = async (key: string) => {
    const loadingKey = key as keyof LoadingStates;
    setLoadingState(loadingKey, true);
    
    try {
      const response = await apiClient.post('/apiConfig', {
        [key]: '' // Empty key to delete
      });
      
      if (response.data.success) {
        await loadUserApiConfig();
        
        // Show provider-specific delete success message
        const getDeleteSuccessMessage = (keyType: string) => {
          switch (keyType) {
            case 'openAiKey': return 'OpenAI API key deleted successfully!';
            case 'groqKey': return 'Groq API key deleted successfully!';
            case 'googleGenAiKey': return 'Google Gen AI key deleted successfully!';
            default: return 'API key deleted successfully!';
          }
        };
        
        toast.success(getDeleteSuccessMessage(key), { icon: <SuccessIcon /> });
      } else {
        const getDeleteErrorMessage = (keyType: string) => {
          switch (keyType) {
            case 'openAiKey': return 'Failed to delete OpenAI key.';
            case 'groqKey': return 'Failed to delete Groq key.';
            case 'googleGenAiKey': return 'Failed to delete Google Gen AI key.';
            default: return 'Failed to delete API key.';
          }
        };
        toast.error(getDeleteErrorMessage(key), { icon: <ErrorIcon /> });
      }
    } catch (error) {
      console.error('Error deleting key:', error);
      const getDeleteErrorMessage = (keyType: string) => {
        switch (keyType) {
          case 'openAiKey': return 'Error deleting OpenAI key. Please try again.';
          case 'groqKey': return 'Error deleting Groq key. Please try again.';
          case 'googleGenAiKey': return 'Error deleting Google Gen AI key. Please try again.';
          default: return 'Error deleting API key. Please try again.';
        }
      };
      toast.error(getDeleteErrorMessage(key), { icon: <ErrorIcon /> });
    } finally {
      setLoadingState(loadingKey, false);
    }
  };

  // Only show for FREE tier users
  if (userInfo?.accountTier !== 'FREE') {
    return null;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Paper
        elevation={2}
        sx={{
          background: (!!userApiConfig?.hasOpenAiKey || !!userApiConfig?.hasGroqKey || !!userApiConfig?.hasGoogleGenAiKey) 
            ? 'rgba(34, 197, 94, 0.1)' 
            : 'rgba(239, 68, 68, 0.1)',
          border: (!!userApiConfig?.hasOpenAiKey || !!userApiConfig?.hasGroqKey || !!userApiConfig?.hasGoogleGenAiKey) 
            ? '1px solid rgba(34, 197, 94, 0.3)' 
            : '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 2,
          backdropFilter: 'blur(10px)',
          width: '100%',
          overflow: 'hidden'
        }}
      >
        {/* Collapsible Header */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            p: 3,
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.02)'
            },
            transition: 'background-color 0.2s ease'
          }}
          onClick={() => setShowApiConfig(!showApiConfig)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <KeyIcon sx={{ 
              color: (!!userApiConfig?.hasOpenAiKey || !!userApiConfig?.hasGroqKey || !!userApiConfig?.hasGoogleGenAiKey) 
                ? '#22C55E' 
                : '#EF4444',
              fontSize: 24
            }} />
            <Typography variant="h6" sx={{ 
              color: '#F8FAFC', 
              fontWeight: 600,
              fontSize: '1.1rem'
            }}>
              AI Provider & API Keys
            </Typography>
            
            {/* Provider Selection Bubbles in Header - Only when dropdown is closed */}
            {!showApiConfig && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                {/* Chat-GPT Bubble */}
                <Box
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent dropdown from opening
                    if (userInfo?.accountTier !== 'FREE' || userApiConfig?.hasOpenAiKey) {
                      onProviderChange('openai');
                    }
                  }}
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: 2.5,
                    cursor: (userInfo?.accountTier !== 'FREE' || userApiConfig?.hasOpenAiKey) ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease',
                    border: '2px solid',
                    opacity: (userInfo?.accountTier !== 'FREE' || userApiConfig?.hasOpenAiKey) ? 1 : 0.5,
                    ...(userInfo?.accountTier !== 'FREE' || userApiConfig?.hasOpenAiKey)
                      ? {
                          borderColor: selectedProvider === 'openai' ? '#6366F1' : 'rgba(99, 102, 241, 0.3)',
                          background: selectedProvider === 'openai' 
                            ? 'rgba(99, 102, 241, 0.15)' 
                            : 'rgba(99, 102, 241, 0.05)',
                          '&:hover': {
                            borderColor: '#6366F1',
                            background: 'rgba(99, 102, 241, 0.1)',
                            transform: 'scale(1.05)',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                          }
                        }
                      : {
                          borderColor: 'rgba(100, 116, 139, 0.3)',
                          background: 'rgba(100, 116, 139, 0.05)',
                        }
                  }}
                >
                  <Typography sx={{
                    color: (userInfo?.accountTier !== 'FREE' || userApiConfig?.hasOpenAiKey) 
                      ? (selectedProvider === 'openai' ? '#6366F1' : '#E2E8F0')
                      : '#64748B',
                    fontWeight: 600,
                    fontSize: '0.8rem'
                  }}>
                    Chat-GPT
                  </Typography>
                </Box>

                {/* Groq & Google Bubble */}
                <Box
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent dropdown from opening
                    if (userInfo?.accountTier !== 'FREE' || (userApiConfig?.hasGroqKey && userApiConfig?.hasGoogleGenAiKey)) {
                      onProviderChange('groq-google');
                    }
                  }}
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: 2.5,
                    cursor: (userInfo?.accountTier !== 'FREE' || (userApiConfig?.hasGroqKey && userApiConfig?.hasGoogleGenAiKey)) ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease',
                    border: '2px solid',
                    opacity: (userInfo?.accountTier !== 'FREE' || (userApiConfig?.hasGroqKey && userApiConfig?.hasGoogleGenAiKey)) ? 1 : 0.5,
                    ...(userInfo?.accountTier !== 'FREE' || (userApiConfig?.hasGroqKey && userApiConfig?.hasGoogleGenAiKey))
                      ? {
                          borderColor: selectedProvider === 'groq-google' ? '#10B981' : 'rgba(16, 185, 129, 0.3)',
                          background: selectedProvider === 'groq-google' 
                            ? 'rgba(16, 185, 129, 0.15)' 
                            : 'rgba(16, 185, 129, 0.05)',
                          '&:hover': {
                            borderColor: '#10B981',
                            background: 'rgba(16, 185, 129, 0.1)',
                            transform: 'scale(1.05)',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                          }
                        }
                      : {
                          borderColor: 'rgba(100, 116, 139, 0.3)',
                          background: 'rgba(100, 116, 139, 0.05)',
                        }
                  }}
                >
                  <Typography sx={{
                    color: (userInfo?.accountTier !== 'FREE' || (userApiConfig?.hasGroqKey && userApiConfig?.hasGoogleGenAiKey)) 
                      ? (selectedProvider === 'groq-google' ? '#10B981' : '#E2E8F0')
                      : '#64748B',
                    fontWeight: 600,
                    fontSize: '0.8rem'
                  }}>
                    Groq & Google
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* Right side: Status Indicators and Dropdown Arrow */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Status Indicators */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {userApiConfig?.hasOpenAiKey && (
                <Box sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  background: 'rgba(99, 102, 241, 0.2)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <Typography variant="caption" sx={{ color: '#6366F1', fontWeight: 600, fontSize: '0.7rem' }}>
                    OpenAI
                  </Typography>
                </Box>
              )}
              {userApiConfig?.hasGroqKey && (
                <Box sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 600, fontSize: '0.7rem' }}>
                    Groq
                  </Typography>
                </Box>
              )}
              {userApiConfig?.hasGoogleGenAiKey && (
                <Box sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <Typography variant="caption" sx={{ color: '#22C55E', fontWeight: 600, fontSize: '0.7rem' }}>
                    Google Gen AI
                  </Typography>
                </Box>
              )}
            </Box>
            
            {/* Dropdown Arrow */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'rgba(148, 163, 184, 0.1)',
              transition: 'transform 0.3s ease, background-color 0.2s ease',
              transform: showApiConfig ? 'rotate(180deg)' : 'rotate(0deg)',
              '&:hover': {
                backgroundColor: 'rgba(148, 163, 184, 0.2)'
              }
            }}>
              <KeyboardArrowDownIcon sx={{ 
                color: '#94A3B8', 
                fontSize: 20 
              }} />
            </Box>
          </Box>
        </Box>
        
        {/* Collapsible Content */}
        <Collapse in={showApiConfig}>
          <Box sx={{ px: 3, pb: 3 }}>
            {/* AI Provider Selection Bubbles */}
            <Box sx={{ 
              mb: 4, 
              mt: 2
            }}>
              {/* Provider Bubbles */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                {/* OpenAI Bubble */}
                <Box
                  onClick={() => {
                    if (userInfo?.accountTier !== 'FREE' || userApiConfig?.hasOpenAiKey) {
                      onProviderChange('openai');
                    }
                  }}
                  sx={{
                    px: 3,
                    py: 2,
                    borderRadius: 3,
                    cursor: (userInfo?.accountTier !== 'FREE' || userApiConfig?.hasOpenAiKey) ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease',
                    border: '2px solid',
                    minWidth: '120px',
                    textAlign: 'center',
                    opacity: (userInfo?.accountTier !== 'FREE' || userApiConfig?.hasOpenAiKey) ? 1 : 0.5,
                    ...(userInfo?.accountTier !== 'FREE' || userApiConfig?.hasOpenAiKey)
                      ? {
                          borderColor: selectedProvider === 'openai' ? '#6366F1' : 'rgba(99, 102, 241, 0.3)',
                          background: selectedProvider === 'openai' 
                            ? 'rgba(99, 102, 241, 0.15)' 
                            : 'rgba(99, 102, 241, 0.05)',
                          '&:hover': {
                            borderColor: '#6366F1',
                            background: 'rgba(99, 102, 241, 0.1)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                          }
                        }
                      : {
                          borderColor: 'rgba(100, 116, 139, 0.3)',
                          background: 'rgba(100, 116, 139, 0.05)',
                        }
                  }}
                >
                  <Typography sx={{
                    color: (userInfo?.accountTier !== 'FREE' || userApiConfig?.hasOpenAiKey) 
                      ? (selectedProvider === 'openai' ? '#6366F1' : '#E2E8F0')
                      : '#64748B',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}>
                    Chat-GPT
                  </Typography>
                </Box>
              
                {/* Groq & Google Bubble */}
                <Box
                  onClick={() => {
                    if (userInfo?.accountTier !== 'FREE' || (userApiConfig?.hasGroqKey && userApiConfig?.hasGoogleGenAiKey)) {
                      onProviderChange('groq-google');
                    }
                  }}
                  sx={{
                    px: 3,
                    py: 2,
                    borderRadius: 3,
                    cursor: (userInfo?.accountTier !== 'FREE' || (userApiConfig?.hasGroqKey && userApiConfig?.hasGoogleGenAiKey)) ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease',
                    border: '2px solid',
                    minWidth: '120px',
                    textAlign: 'center',
                    opacity: (userInfo?.accountTier !== 'FREE' || (userApiConfig?.hasGroqKey && userApiConfig?.hasGoogleGenAiKey)) ? 1 : 0.5,
                    ...(userInfo?.accountTier !== 'FREE' || (userApiConfig?.hasGroqKey && userApiConfig?.hasGoogleGenAiKey))
                      ? {
                          borderColor: selectedProvider === 'groq-google' ? '#10B981' : 'rgba(16, 185, 129, 0.3)',
                          background: selectedProvider === 'groq-google' 
                            ? 'rgba(16, 185, 129, 0.15)' 
                            : 'rgba(16, 185, 129, 0.05)',
                          '&:hover': {
                            borderColor: '#10B981',
                            background: 'rgba(16, 185, 129, 0.1)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                          }
                        }
                      : {
                          borderColor: 'rgba(100, 116, 139, 0.3)',
                          background: 'rgba(100, 116, 139, 0.05)',
                        }
                  }}
                >
                  <Typography sx={{
                    color: (userInfo?.accountTier !== 'FREE' || (userApiConfig?.hasGroqKey && userApiConfig?.hasGoogleGenAiKey)) 
                      ? (selectedProvider === 'groq-google' ? '#10B981' : '#E2E8F0')
                      : '#64748B',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}>
                    Groq & Google
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* OpenAI API Key Input */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 500 }}>
                  OpenAI API Key
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  fullWidth
                  label="OpenAI API Key"
                  type={showOpenAiKey ? 'text' : 'password'}
                  value={openAiKey || userApiConfig?.openAiKey || ''}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  placeholder={userApiConfig?.hasOpenAiKey ? "Update OpenAI API key..." : "sk-..."}
                  size="small"
                  disabled={loadingStates.openAiKey}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowOpenAiKey(!showOpenAiKey)}
                          edge="end"
                          size="small"
                          disabled={loadingStates.openAiKey}
                          sx={{ color: '#94A3B8' }}
                        >
                          {showOpenAiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(15, 23, 42, 0.3)',
                      borderRadius: 1,
                      transition: 'all 0.3s ease',
                      '& fieldset': {
                        borderColor: userApiConfig?.hasOpenAiKey ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                        transition: 'border-color 0.3s ease',
                      },
                      '&:hover fieldset': {
                        borderColor: userApiConfig?.hasOpenAiKey ? '#22C55E' : '#EF4444',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: userApiConfig?.hasOpenAiKey ? '#22C55E' : '#EF4444',
                      },
                      '&.Mui-disabled': {
                        backgroundColor: 'rgba(15, 23, 42, 0.1)',
                        opacity: 0.7,
                      }
                    },
                    '& .MuiInputLabel-root': {
                      color: '#94A3B8',
                      transition: 'color 0.3s ease',
                      '&.Mui-focused': {
                        color: userApiConfig?.hasOpenAiKey ? '#22C55E' : '#EF4444',
                      },
                    },
                    '& .MuiOutlinedInput-input': {
                      color: '#F8FAFC',
                      transition: 'color 0.3s ease',
                    },
                  }}
                />
                {/* Action Button with Loading State */}
                <Zoom in={true} style={{ transitionDelay: '100ms' }}>
                  <Box>
                    {openAiKey.trim() !== '' ? (
                      // Show Save Button when editing
                      <Button
                        variant="outlined"
                        color="success"
                        onClick={() => handleSaveIndividualKey('openAiKey', openAiKey.trim())}
                        disabled={loadingStates.openAiKey}
                        sx={{
                          borderColor: '#22C55E',
                          color: '#22C55E',
                          height: '40px',
                          minWidth: '40px',
                          width: '40px',
                          padding: 0,
                          margin: 0,
                          borderRadius: '4px',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            borderColor: '#16A34A',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            transform: 'scale(1.05)',
                          },
                          '&:disabled': {
                            borderColor: '#22C55E',
                            color: '#22C55E',
                          }
                        }}
                      >
                        {loadingStates.openAiKey ? (
                          <CircularProgress size={20} sx={{ color: '#22C55E' }} />
                        ) : (
                          <CheckIcon fontSize="small" />
                        )}
                      </Button>
                    ) : userApiConfig?.hasOpenAiKey ? (
                      // Show Delete Button when key exists
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleDeleteIndividualKey('openAiKey')}
                        disabled={loadingStates.openAiKey}
                        sx={{
                          borderColor: '#EF4444',
                          color: '#EF4444',
                          height: '40px',
                          minWidth: '40px',
                          width: '40px',
                          padding: 0,
                          margin: 0,
                          borderRadius: '4px',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            borderColor: '#DC2626',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            transform: 'scale(1.05)',
                          },
                          '&:disabled': {
                            borderColor: '#EF4444',
                            color: '#EF4444',
                          }
                        }}
                      >
                        {loadingStates.openAiKey ? (
                          <CircularProgress size={20} sx={{ color: '#EF4444' }} />
                        ) : (
                          <DeleteIcon fontSize="small" />
                        )}
                      </Button>
                    ) : (
                      // Show Disabled Save Button when no key and not editing
                      <Button
                        variant="outlined"
                        color="success"
                        disabled={true}
                        sx={{
                          borderColor: '#64748B',
                          color: '#64748B',
                          height: '40px',
                          minWidth: '40px',
                          width: '40px',
                          padding: 0,
                          margin: 0,
                          borderRadius: '4px',
                          '&:disabled': {
                            borderColor: '#64748B',
                            color: '#64748B'
                          }
                        }}
                      >
                        <CheckIcon fontSize="small" />
                      </Button>
                    )}
                  </Box>
                </Zoom>
              </Box>
            </Box>

            {/* Groq API Key Input */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 500 }}>
                  Groq API Key
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  fullWidth
                  label="Groq API Key"
                  type={showGroqKey ? 'text' : 'password'}
                  value={groqKey || userApiConfig?.groqKey || ''}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder={userApiConfig?.hasGroqKey ? "Update Groq API key..." : "gsk_..."}
                  size="small"
                  disabled={loadingStates.groqKey}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowGroqKey(!showGroqKey)}
                          edge="end"
                          size="small"
                          disabled={loadingStates.groqKey}
                          sx={{ color: '#94A3B8' }}
                        >
                          {showGroqKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(15, 23, 42, 0.3)',
                      borderRadius: 1,
                      transition: 'all 0.3s ease',
                      '& fieldset': {
                        borderColor: userApiConfig?.hasGroqKey ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                        transition: 'border-color 0.3s ease',
                      },
                      '&:hover fieldset': {
                        borderColor: userApiConfig?.hasGroqKey ? '#22C55E' : '#EF4444',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: userApiConfig?.hasGroqKey ? '#22C55E' : '#EF4444',
                      },
                      '&.Mui-disabled': {
                        backgroundColor: 'rgba(15, 23, 42, 0.1)',
                        opacity: 0.7,
                      }
                    },
                    '& .MuiInputLabel-root': {
                      color: '#94A3B8',
                      transition: 'color 0.3s ease',
                      '&.Mui-focused': {
                        color: userApiConfig?.hasGroqKey ? '#22C55E' : '#EF4444',
                      },
                    },
                    '& .MuiOutlinedInput-input': {
                      color: '#F8FAFC',
                      transition: 'color 0.3s ease',
                    },
                  }}
                />
                {/* Action Button with Loading State */}
                <Zoom in={true} style={{ transitionDelay: '200ms' }}>
                  <Box>
                    {groqKey.trim() !== '' ? (
                      // Show Save Button when editing
                      <Button
                        variant="outlined"
                        color="success"
                        onClick={() => handleSaveIndividualKey('groqKey', groqKey.trim())}
                        disabled={loadingStates.groqKey}
                        sx={{
                          borderColor: '#22C55E',
                          color: '#22C55E',
                          height: '40px',
                          minWidth: '40px',
                          width: '40px',
                          padding: 0,
                          margin: 0,
                          borderRadius: '4px',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            borderColor: '#16A34A',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            transform: 'scale(1.05)',
                          },
                          '&:disabled': {
                            borderColor: '#22C55E',
                            color: '#22C55E',
                          }
                        }}
                      >
                        {loadingStates.groqKey ? (
                          <CircularProgress size={20} sx={{ color: '#22C55E' }} />
                        ) : (
                          <CheckIcon fontSize="small" />
                        )}
                      </Button>
                    ) : userApiConfig?.hasGroqKey ? (
                      // Show Delete Button when key exists
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleDeleteIndividualKey('groqKey')}
                        disabled={loadingStates.groqKey}
                        sx={{
                          borderColor: '#EF4444',
                          color: '#EF4444',
                          height: '40px',
                          minWidth: '40px',
                          width: '40px',
                          padding: 0,
                          margin: 0,
                          borderRadius: '4px',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            borderColor: '#DC2626',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            transform: 'scale(1.05)',
                          },
                          '&:disabled': {
                            borderColor: '#EF4444',
                            color: '#EF4444',
                          }
                        }}
                      >
                        {loadingStates.groqKey ? (
                          <CircularProgress size={20} sx={{ color: '#EF4444' }} />
                        ) : (
                          <DeleteIcon fontSize="small" />
                        )}
                      </Button>
                    ) : (
                      // Show Disabled Save Button when no key and not editing
                      <Button
                        variant="outlined"
                        color="success"
                        disabled={true}
                        sx={{
                          borderColor: '#64748B',
                          color: '#64748B',
                          height: '40px',
                          minWidth: '40px',
                          width: '40px',
                          padding: 0,
                          margin: 0,
                          borderRadius: '4px',
                          '&:disabled': {
                            borderColor: '#64748B',
                            color: '#64748B'
                          }
                        }}
                      >
                        <CheckIcon fontSize="small" />
                      </Button>
                    )}
                  </Box>
                </Zoom>
              </Box>
            </Box>

            {/* Google Gen AI API Key Input */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 500 }}>
                  Google Gen AI API Key
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  fullWidth
                  label="Google Gen AI API Key"
                  type={showGoogleGenAiKey ? 'text' : 'password'}
                  value={googleGenAiKey || userApiConfig?.googleGenAiKey || ''}
                  onChange={(e) => setGoogleGenAiKey(e.target.value)}
                  placeholder={userApiConfig?.hasGoogleGenAiKey ? "Update Google Gen AI API key..." : "AIza..."}
                  size="small"
                  disabled={loadingStates.googleGenAiKey}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowGoogleGenAiKey(!showGoogleGenAiKey)}
                          edge="end"
                          size="small"
                          disabled={loadingStates.googleGenAiKey}
                          sx={{ color: '#94A3B8' }}
                        >
                          {showGoogleGenAiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(15, 23, 42, 0.3)',
                      borderRadius: 1,
                      transition: 'all 0.3s ease',
                      '& fieldset': {
                        borderColor: userApiConfig?.hasGoogleGenAiKey ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                        transition: 'border-color 0.3s ease',
                      },
                      '&:hover fieldset': {
                        borderColor: userApiConfig?.hasGoogleGenAiKey ? '#22C55E' : '#EF4444',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: userApiConfig?.hasGoogleGenAiKey ? '#22C55E' : '#EF4444',
                      },
                      '&.Mui-disabled': {
                        backgroundColor: 'rgba(15, 23, 42, 0.1)',
                        opacity: 0.7,
                      }
                    },
                    '& .MuiInputLabel-root': {
                      color: '#94A3B8',
                      transition: 'color 0.3s ease',
                      '&.Mui-focused': {
                        color: userApiConfig?.hasGoogleGenAiKey ? '#22C55E' : '#EF4444',
                      },
                    },
                    '& .MuiOutlinedInput-input': {
                      color: '#F8FAFC',
                      transition: 'color 0.3s ease',
                    },
                  }}
                />
                {/* Action Button with Loading State */}
                <Zoom in={true} style={{ transitionDelay: '300ms' }}>
                  <Box>
                    {googleGenAiKey.trim() !== '' ? (
                      // Show Save Button when editing
                      <Button
                        variant="outlined"
                        color="success"
                        onClick={() => handleSaveIndividualKey('googleGenAiKey', googleGenAiKey.trim())}
                        disabled={loadingStates.googleGenAiKey}
                        sx={{
                          borderColor: '#22C55E',
                          color: '#22C55E',
                          height: '40px',
                          minWidth: '40px',
                          width: '40px',
                          padding: 0,
                          margin: 0,
                          borderRadius: '4px',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            borderColor: '#16A34A',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            transform: 'scale(1.05)',
                          },
                          '&:disabled': {
                            borderColor: '#22C55E',
                            color: '#22C55E',
                          }
                        }}
                      >
                        {loadingStates.googleGenAiKey ? (
                          <CircularProgress size={20} sx={{ color: '#22C55E' }} />
                        ) : (
                          <CheckIcon fontSize="small" />
                        )}
                      </Button>
                    ) : userApiConfig?.hasGoogleGenAiKey ? (
                      // Show Delete Button when key exists
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleDeleteIndividualKey('googleGenAiKey')}
                        disabled={loadingStates.googleGenAiKey}
                        sx={{
                          borderColor: '#EF4444',
                          color: '#EF4444',
                          height: '40px',
                          minWidth: '40px',
                          width: '40px',
                          padding: 0,
                          margin: 0,
                          borderRadius: '4px',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            borderColor: '#DC2626',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            transform: 'scale(1.05)',
                          },
                          '&:disabled': {
                            borderColor: '#EF4444',
                            color: '#EF4444',
                          }
                        }}
                      >
                        {loadingStates.googleGenAiKey ? (
                          <CircularProgress size={20} sx={{ color: '#EF4444' }} />
                        ) : (
                          <DeleteIcon fontSize="small" />
                        )}
                      </Button>
                    ) : (
                      // Show Disabled Save Button when no key and not editing
                      <Button
                        variant="outlined"
                        color="success"
                        disabled={true}
                        sx={{
                          borderColor: '#64748B',
                          color: '#64748B',
                          height: '40px',
                          minWidth: '40px',
                          width: '40px',
                          padding: 0,
                          margin: 0,
                          borderRadius: '4px',
                          '&:disabled': {
                            borderColor: '#64748B',
                            color: '#64748B'
                          }
                        }}
                      >
                        <CheckIcon fontSize="small" />
                      </Button>
                    )}
                  </Box>
                </Zoom>
              </Box>
            </Box>
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
};

export default ApiKeysConfiguration;
