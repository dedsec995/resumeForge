import { 
  Box, 
  Container, 
  Typography,
  Button,
  Grid,
  Stack,
  CircularProgress,
  TextField,
  IconButton,
  Tab,
  Tabs,
  Paper,
  Fab,
  Zoom,
  Fade,
  Grow,
  Slide,
  Chip,
  Divider,
  Alert
} from '@mui/material';
import { 
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  NavigateBefore as BackIcon,
  NavigateNext as NextIcon,
  KeyboardArrowUp as UpIcon,
  KeyboardArrowDown as DownIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Code as CodeIcon,
  Star as StarIcon,
  Psychology as SkillsIcon,
  CheckCircle as CheckIcon,
  Api as ApiIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';

const ProfileSection = () => {
  const [resumeData, setResumeData] = useState<any>(null);
  const [originalResumeData, setOriginalResumeData] = useState<any>(null); // Track original data
  const [loading, setLoading] = useState(true); // Start with loading true
  const [saving, setSaving] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false); // Track if we've already loaded
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // Track changes
  const [apiConfig, setApiConfig] = useState<any>(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingApiConfig, setSavingApiConfig] = useState(false);

  const sections = [
    'Personal Info',
    'Certifications', 
    'Technical Skills',
    'Work Experience',
    'Projects',
    'Education',
    'API Config'
  ];

  const getSectionIcon = (section: string, isSelected: boolean = false) => {
    const iconSx = {
      fontSize: 20,
      transition: 'all 0.3s ease',
      color: isSelected ? '#6366F1' : '#94A3B8',
      transform: isSelected ? 'scale(1.1)' : 'scale(1)'
    };

    switch (section) {
      case 'Personal Info':
        return <PersonIcon sx={iconSx} />;
      case 'Certifications':
        return <CheckIcon sx={iconSx} />;
      case 'Technical Skills':
        return <SkillsIcon sx={iconSx} />;
      case 'Work Experience':
        return <WorkIcon sx={iconSx} />;
      case 'Projects':
        return <CodeIcon sx={iconSx} />;
      case 'Education':
        return <SchoolIcon sx={iconSx} />;
      case 'API Config':
        return <ApiIcon sx={iconSx} />;
      default:
        return <StarIcon sx={iconSx} />;
    }
  };

  // Auto-load resume data when component mounts
  useEffect(() => {
    // Prevent duplicate requests in StrictMode
    if (hasLoaded) return;
    
    let isMounted = true; // Flag to prevent state updates if component unmounts
    
          const loadResumeData = async () => {
        try {
          const response = await apiClient.get('/parseResume');
          if (isMounted && response.data.success) {
            setResumeData(response.data.resumeData);
            setOriginalResumeData(JSON.parse(JSON.stringify(response.data.resumeData))); // Deep copy
            setHasLoaded(true);
            setHasUnsavedChanges(false); // Reset changes flag
            
            // Check if this is a new profile (all fields empty)
            const isNewProfile = !response.data.resumeData.personalInfo?.name && 
                                 response.data.resumeData.workExperience?.length === 0 &&
                                 response.data.resumeData.projects?.length === 0;
            
            if (isNewProfile) {
              toast.success('Welcome! Please fill in your profile information.');
            }
          } else if (isMounted) {
            toast.error('Failed to load resume');
          }
        } catch (error) {
          console.error('Error loading resume:', error);
          if (isMounted) {
            toast.error('Failed to connect to API. Make sure the backend is running.');
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };

    loadResumeData();

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, [hasLoaded]);

  // Effect to track changes by comparing current data with original
  useEffect(() => {
    if (!originalResumeData || !resumeData) return;
    
    const hasChanges = JSON.stringify(resumeData) !== JSON.stringify(originalResumeData);
    setHasUnsavedChanges(hasChanges);
  }, [resumeData, originalResumeData]);



  const handleNextSection = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const handlePrevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentSection(newValue);
  };

  const handleSaveResume = async () => {
    if (!resumeData) return;
    
    setSaving(true);
    try {
      const response = await apiClient.post('/updateResume', {
        resumeData: resumeData
      });
      
      if (response.data.success) {
        // Update original data after successful save
        setOriginalResumeData(JSON.parse(JSON.stringify(resumeData)));
        setHasUnsavedChanges(false);
        toast.success('Resume changes saved to LaTeX file successfully!');
      } else {
        toast.error('Failed to save resume changes.');
      }
    } catch (error) {
      console.error('Error saving resume:', error);
      toast.error('Failed to save resume changes. Make sure the backend is running.');
    } finally {
      setSaving(false);
    }
  };

  const updateResumeData = (path: string, value: any) => {
    setResumeData((prev: any) => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const moveItemUp = (arrayPath: string, index: number) => {
    if (index === 0) return; // Can't move first item up
    
    setResumeData((prev: any) => {
      const newData = { ...prev };
      const keys = arrayPath.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length; i++) {
        if (i === keys.length - 1) {
          const array = [...current[keys[i]]];
          [array[index], array[index - 1]] = [array[index - 1], array[index]];
          current[keys[i]] = array;
        } else {
          current = current[keys[i]];
        }
      }
      
      return newData;
    });
  };

  const moveItemDown = (arrayPath: string, index: number, arrayLength: number) => {
    if (index === arrayLength - 1) return; // Can't move last item down
    
    setResumeData((prev: any) => {
      const newData = { ...prev };
      const keys = arrayPath.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length; i++) {
        if (i === keys.length - 1) {
          const array = [...current[keys[i]]];
          [array[index], array[index + 1]] = [array[index + 1], array[index]];
          current[keys[i]] = array;
        } else {
          current = current[keys[i]];
        }
      }
      
      return newData;
    });
  };

  // API Config functions
  const loadApiConfig = async () => {
    try {
      const response = await apiClient.get('/apiConfig');
      if (response.data.success) {
        setApiConfig(response.data.apiData);
      }
    } catch (error) {
      console.error('Error loading API config:', error);
    }
  };

  const handleSaveApiConfig = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setSavingApiConfig(true);
    try {
      const response = await apiClient.post('/apiConfig', {
        apiKey: apiKey.trim()
      });
      
      if (response.data.success) {
        setApiKey('');
        setShowApiKey(false);
        await loadApiConfig();
        toast.success('API key saved securely!');
      } else {
        toast.error('Failed to save API key.');
      }
    } catch (error) {
      console.error('Error saving API config:', error);
      toast.error('Failed to save API key. Make sure the backend is running.');
    } finally {
      setSavingApiConfig(false);
    }
  };

  const handleDeleteApiKey = async () => {
    setSavingApiConfig(true);
    try {
      const response = await apiClient.post('/apiConfig', {
        apiKey: '' // Empty key to delete
      });
      
      if (response.data.success) {
        setApiConfig(null);
        toast.success('API key deleted successfully!');
      } else {
        toast.error('Failed to delete API key.');
      }
    } catch (error) {
      console.error('Error deleting API config:', error);
      toast.error('Failed to delete API key.');
    } finally {
      setSavingApiConfig(false);
    }
  };

  // Load API config when API Config tab is selected
  useEffect(() => {
    if (currentSection === sections.length - 1 && !apiConfig) {
      loadApiConfig();
    }
  }, [currentSection, apiConfig]);

  const renderCurrentSection = () => {
    if (!resumeData) return null;

    switch (currentSection) {
      case 0: // Personal Info
        return (
          <Grow in timeout={300}>
            <Box>
              <Typography variant="h6" sx={{ mb: 3, color: '#E2E8F0', fontWeight: 600 }}>
                Basic Information
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    value={resumeData.personalInfo?.name || ''}
                    onChange={(e) => updateResumeData('personalInfo.name', e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(15, 23, 42, 0.3)',
                        borderRadius: 2,
                        '& fieldset': {
                          borderColor: 'rgba(99, 102, 241, 0.3)',
                        },
                        '&:hover fieldset': {
                          borderColor: '#6366F1',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#6366F1',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: '#94A3B8',
                        '&.Mui-focused': {
                          color: '#6366F1',
                        },
                      },
                      '& .MuiInputBase-input': {
                        color: '#F8FAFC',
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={resumeData.personalInfo?.email || ''}
                    onChange={(e) => updateResumeData('personalInfo.email', e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(15, 23, 42, 0.3)',
                        borderRadius: 2,
                        '& fieldset': {
                          borderColor: 'rgba(99, 102, 241, 0.3)',
                        },
                        '&:hover fieldset': {
                          borderColor: '#6366F1',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#6366F1',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: '#94A3B8',
                        '&.Mui-focused': {
                          color: '#6366F1',
                        },
                      },
                      '& .MuiInputBase-input': {
                        color: '#F8FAFC',
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={resumeData.personalInfo?.phone || ''}
                    onChange={(e) => updateResumeData('personalInfo.phone', e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(15, 23, 42, 0.3)',
                        borderRadius: 2,
                        '& fieldset': {
                          borderColor: 'rgba(99, 102, 241, 0.3)',
                        },
                        '&:hover fieldset': {
                          borderColor: '#6366F1',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#6366F1',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: '#94A3B8',
                        '&.Mui-focused': {
                          color: '#6366F1',
                        },
                      },
                      '& .MuiInputBase-input': {
                        color: '#F8FAFC',
                      },
                    }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 4, borderColor: 'rgba(99, 102, 241, 0.2)' }} />

              <Typography variant="h6" sx={{ mb: 3, color: '#E2E8F0', fontWeight: 600 }}>
                Professional Links
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="LinkedIn"
                    value={resumeData.personalInfo?.linkedin || ''}
                    onChange={(e) => updateResumeData('personalInfo.linkedin', e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(15, 23, 42, 0.3)',
                        borderRadius: 2,
                        '& fieldset': {
                          borderColor: 'rgba(99, 102, 241, 0.3)',
                        },
                        '&:hover fieldset': {
                          borderColor: '#6366F1',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#6366F1',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: '#94A3B8',
                        '&.Mui-focused': {
                          color: '#6366F1',
                        },
                      },
                      '& .MuiInputBase-input': {
                        color: '#F8FAFC',
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="GitHub"
                    value={resumeData.personalInfo?.github || ''}
                    onChange={(e) => updateResumeData('personalInfo.github', e.target.value)}
                    placeholder="https://github.com/yourusername"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(15, 23, 42, 0.3)',
                        borderRadius: 2,
                        '& fieldset': {
                          borderColor: 'rgba(99, 102, 241, 0.3)',
                        },
                        '&:hover fieldset': {
                          borderColor: '#6366F1',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#6366F1',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: '#94A3B8',
                        '&.Mui-focused': {
                          color: '#6366F1',
                        },
                      },
                      '& .MuiInputBase-input': {
                        color: '#F8FAFC',
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Personal Website"
                    value={resumeData.personalInfo?.website || ''}
                    onChange={(e) => updateResumeData('personalInfo.website', e.target.value)}
                    placeholder="https://yourwebsite.com"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(15, 23, 42, 0.3)',
                        borderRadius: 2,
                        '& fieldset': {
                          borderColor: 'rgba(99, 102, 241, 0.3)',
                        },
                        '&:hover fieldset': {
                          borderColor: '#6366F1',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#6366F1',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: '#94A3B8',
                        '&.Mui-focused': {
                          color: '#6366F1',
                        },
                      },
                      '& .MuiInputBase-input': {
                        color: '#F8FAFC',
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          </Grow>
        );

      case 1: // Certifications
        return (
          <Grow in timeout={800}>
            <Box>
              <Typography variant="h6" sx={{ color: '#F8FAFC', mb: 3, fontWeight: 600 }}>
                Professional Certifications
              </Typography>
              <Stack spacing={3}>
                {(resumeData.certifications || []).map((cert: any, certIndex: number) => (
                  <Paper 
                    key={certIndex} 
                    elevation={4}
                    sx={{ 
                      p: 3,
                      background: 'rgba(15, 23, 42, 0.4)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      borderRadius: 2,
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        borderColor: 'rgba(99, 102, 241, 0.4)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(99, 102, 241, 0.15)'
                      }
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mb: 2,
                      pb: 2,
                      borderBottom: '1px solid rgba(99, 102, 241, 0.1)'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckIcon sx={{ color: '#6366F1', fontSize: 20 }} />
                        <Typography variant="h6" fontWeight={600} sx={{ color: '#F8FAFC' }}>
                          Certification {certIndex + 1}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {(resumeData.certifications || []).length > 1 && (
                          <>
                            <IconButton
                              onClick={() => moveItemUp('certifications', certIndex)}
                              disabled={certIndex === 0}
                              size="small"
                              title="Move Up"
                              sx={{
                                color: '#94A3B8',
                                '&:hover': { color: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.1)' },
                                '&:disabled': { color: 'rgba(148, 163, 184, 0.3)' }
                              }}
                            >
                              <UpIcon />
                            </IconButton>
                            <IconButton
                              onClick={() => moveItemDown('certifications', certIndex, (resumeData.certifications || []).length)}
                              disabled={certIndex === (resumeData.certifications || []).length - 1}
                              size="small"
                              title="Move Down"
                              sx={{
                                color: '#94A3B8',
                                '&:hover': { color: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.1)' },
                                '&:disabled': { color: 'rgba(148, 163, 184, 0.3)' }
                              }}
                            >
                              <DownIcon />
                            </IconButton>
                          </>
                        )}
                        <IconButton
                          onClick={() => {
                            const newCertifications = [...(resumeData.certifications || [])];
                            newCertifications.splice(certIndex, 1);
                            updateResumeData('certifications', newCertifications);
                          }}
                          color="error"
                          size="small"
                          title="Delete"
                          sx={{
                            '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.1)' }
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Certification Name/Text"
                          value={cert.text || ''}
                          onChange={(e) => updateResumeData(`certifications.${certIndex}.text`, e.target.value)}
                          placeholder="TensorFlow Developer Specialization - DeepLearning.AI"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Certification URL (Optional)"
                          value={cert.url || ''}
                          onChange={(e) => updateResumeData(`certifications.${certIndex}.url`, e.target.value)}
                          placeholder="https://www.coursera.org/account/accomplishments/..."
                          helperText="Leave empty if no link is available"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                            },
                            '& .MuiFormHelperText-root': {
                              color: '#64748B',
                            },
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newCertifications = [...(resumeData.certifications || []), {
                      text: '',
                      url: ''
                    }];
                    updateResumeData('certifications', newCertifications);
                  }}
                  sx={{
                    borderColor: '#6366F1',
                    color: '#6366F1',
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#8B5CF6',
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.3s ease-in-out'
                  }}
                >
                  Add Certification
                </Button>
              </Stack>
            </Box>
          </Grow>
        );

      case 2: // Technical Skills
        return (
          <Grow in timeout={800}>
            <Box>
              <Typography variant="h6" sx={{ color: '#F8FAFC', mb: 3, fontWeight: 600 }}>
                Technical Skills & Expertise
              </Typography>
              <Stack spacing={3}>
                {(resumeData.technicalSkillsCategories || []).map((skillCategory: any, categoryIndex: number) => (
                  <Paper 
                    key={categoryIndex} 
                    elevation={4}
                    sx={{ 
                      p: 3,
                      background: 'rgba(15, 23, 42, 0.4)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      borderRadius: 2,
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        borderColor: 'rgba(99, 102, 241, 0.4)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(99, 102, 241, 0.15)'
                      }
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mb: 2,
                      pb: 2,
                      borderBottom: '1px solid rgba(99, 102, 241, 0.1)'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CodeIcon sx={{ color: '#6366F1', fontSize: 20 }} />
                        <Typography variant="h6" fontWeight={600} sx={{ color: '#F8FAFC' }}>
                          Category {categoryIndex + 1}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {(resumeData.technicalSkillsCategories || []).length > 1 && (
                          <>
                            <IconButton
                              onClick={() => moveItemUp('technicalSkillsCategories', categoryIndex)}
                              disabled={categoryIndex === 0}
                              size="small"
                              title="Move Up"
                              sx={{
                                color: '#94A3B8',
                                '&:hover': { color: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.1)' },
                                '&:disabled': { color: 'rgba(148, 163, 184, 0.3)' }
                              }}
                            >
                              <UpIcon />
                            </IconButton>
                            <IconButton
                              onClick={() => moveItemDown('technicalSkillsCategories', categoryIndex, (resumeData.technicalSkillsCategories || []).length)}
                              disabled={categoryIndex === (resumeData.technicalSkillsCategories || []).length - 1}
                              size="small"
                              title="Move Down"
                              sx={{
                                color: '#94A3B8',
                                '&:hover': { color: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.1)' },
                                '&:disabled': { color: 'rgba(148, 163, 184, 0.3)' }
                              }}
                            >
                              <DownIcon />
                            </IconButton>
                          </>
                        )}
                        <IconButton
                          onClick={() => {
                            const newCategories = [...(resumeData.technicalSkillsCategories || [])];
                            newCategories.splice(categoryIndex, 1);
                            updateResumeData('technicalSkillsCategories', newCategories);
                          }}
                          color="error"
                          size="small"
                          title="Delete"
                          sx={{
                            '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.1)' }
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Category Name"
                          value={skillCategory.categoryName || ''}
                          onChange={(e) => updateResumeData(`technicalSkillsCategories.${categoryIndex}.categoryName`, e.target.value)}
                          placeholder="Programming Languages"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={8}>
                        <TextField
                          fullWidth
                          label="Skills (comma-separated)"
                          value={skillCategory.skills || ''}
                          onChange={(e) => updateResumeData(`technicalSkillsCategories.${categoryIndex}.skills`, e.target.value)}
                          placeholder="React, Node.js, Python, AWS, MongoDB"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                            },
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newCategories = [...(resumeData.technicalSkillsCategories || []), {
                      categoryName: '',
                      skills: ''
                    }];
                    updateResumeData('technicalSkillsCategories', newCategories);
                  }}
                  sx={{
                    borderColor: '#6366F1',
                    color: '#6366F1',
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#8B5CF6',
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.3s ease-in-out'
                  }}
                >
                  Add Category
                </Button>
              </Stack>
            </Box>
          </Grow>
        );

      case 3: // Work Experience
        return (
          <Grow in timeout={800}>
            <Box>
              <Typography variant="h6" sx={{ color: '#F8FAFC', mb: 2, fontWeight: 600 }}>
                Professional Experience
              </Typography>
              <Stack spacing={2}>
                {(resumeData.workExperience || []).map((job: any, jobIndex: number) => (
                  <Paper 
                    key={jobIndex} 
                    elevation={4}
                    sx={{ 
                      p: 2,
                      background: 'rgba(15, 23, 42, 0.4)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      borderRadius: 2,
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        borderColor: 'rgba(99, 102, 241, 0.4)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(99, 102, 241, 0.15)'
                      }
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mb: 1.5,
                      pb: 1.5,
                      borderBottom: '1px solid rgba(99, 102, 241, 0.1)'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WorkIcon sx={{ color: '#6366F1', fontSize: 18 }} />
                        <Typography variant="h6" fontWeight={600} sx={{ color: '#F8FAFC', fontSize: '1.1rem' }}>
                          Job {jobIndex + 1}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {(resumeData.workExperience || []).length > 1 && (
                          <>
                            <IconButton
                              onClick={() => moveItemUp('workExperience', jobIndex)}
                              disabled={jobIndex === 0}
                              size="small"
                              title="Move Up"
                              sx={{
                                color: '#94A3B8',
                                '&:hover': { color: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.1)' },
                                '&:disabled': { color: 'rgba(148, 163, 184, 0.3)' }
                              }}
                            >
                              <UpIcon />
                            </IconButton>
                            <IconButton
                              onClick={() => moveItemDown('workExperience', jobIndex, (resumeData.workExperience || []).length)}
                              disabled={jobIndex === (resumeData.workExperience || []).length - 1}
                              size="small"
                              title="Move Down"
                              sx={{
                                color: '#94A3B8',
                                '&:hover': { color: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.1)' },
                                '&:disabled': { color: 'rgba(148, 163, 184, 0.3)' }
                              }}
                            >
                              <DownIcon />
                            </IconButton>
                          </>
                        )}
                        <IconButton
                          onClick={() => {
                            const newWorkExperience = [...(resumeData.workExperience || [])];
                            newWorkExperience.splice(jobIndex, 1);
                            updateResumeData('workExperience', newWorkExperience);
                          }}
                          color="error"
                          size="small"
                          title="Delete"
                          sx={{
                            '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.1)' }
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Job Title"
                          value={job.jobTitle || ''}
                          onChange={(e) => updateResumeData(`workExperience.${jobIndex}.jobTitle`, e.target.value)}
                          placeholder="Senior Software Engineer"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Company"
                          value={job.company || ''}
                          onChange={(e) => updateResumeData(`workExperience.${jobIndex}.company`, e.target.value)}
                          placeholder="Google Inc."
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Location"
                          value={job.location || ''}
                          onChange={(e) => updateResumeData(`workExperience.${jobIndex}.location`, e.target.value)}
                          placeholder="San Francisco, CA"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Duration"
                          value={job.duration || ''}
                          onChange={(e) => updateResumeData(`workExperience.${jobIndex}.duration`, e.target.value)}
                          placeholder="Jan 2022 - Present"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                            },
                          }}
                        />
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 2, mb: 1.5 }}>
                      <Typography variant="h6" fontWeight={600} sx={{ color: '#F8FAFC', mb: 1.5 }}>
                        Achievements & Responsibilities:
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        maxRows={15}
                        value={(() => {
                          const bulletPoints = Array.isArray(job.bulletPoints) ? job.bulletPoints.join('\n') : (job.bulletPoints || '');
                          // Add bullet points to display if they don't already exist
                          return bulletPoints.split('\n').map((line: string) => {
                            const trimmed = line.trim();
                            return trimmed && !trimmed.startsWith('•') ? `• ${trimmed}` : trimmed;
                          }).join('\n');
                        })()}
                        onChange={(e) => {
                          const text = e.target.value;
                          // Remove bullet points when storing
                          const cleanText = text
                            .split('\n')
                            .map(line => line.replace(/^•\s*/, '').trim())
                            .filter(line => line.length > 0)
                            .join('\n');
                          updateResumeData(`workExperience.${jobIndex}.bulletPoints`, cleanText);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const textarea = e.target as HTMLTextAreaElement;
                            const cursorPos = textarea.selectionStart;
                            const value = textarea.value;
                            
                            // Split text at cursor position
                            const beforeCursor = value.substring(0, cursorPos);
                            const afterCursor = value.substring(cursorPos);
                            
                            // Add bullet point at cursor position
                            const newText = beforeCursor + '\n• ' + afterCursor;
                            
                            // Update textarea value directly
                            textarea.value = newText;
                            
                            // Set cursor position after the bullet
                            const newCursorPos = cursorPos + 3;
                            setTimeout(() => {
                              textarea.setSelectionRange(newCursorPos, newCursorPos);
                            }, 0);
                            
                            // Prevent default behavior
                            e.preventDefault();
                          }
                        }}
                        placeholder="Type your achievements here. Press Enter for new bullet points.&#10;Example:&#10;• Improved system performance by 40%&#10;• Led a team of 5 developers&#10;• Use **text** for bold formatting"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'rgba(15, 23, 42, 0.3)',
                            borderRadius: 2,
                            '& fieldset': {
                              borderColor: 'rgba(99, 102, 241, 0.3)',
                            },
                            '&:hover fieldset': {
                              borderColor: '#6366F1',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#6366F1',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            color: '#94A3B8',
                            '&.Mui-focused': {
                              color: '#6366F1',
                            },
                          },
                          '& .MuiInputBase-input': {
                            color: '#F8FAFC',
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            lineHeight: 1.6
                          },
                        }}
                      />
                      <Typography variant="caption" sx={{ 
                        display: 'block', 
                        mt: 0.5, 
                        color: '#64748B',
                        fontStyle: 'italic'
                      }}>
                        💡 Tip: Press Enter to automatically add bullet points. Use **text** to make text bold in the final resume.
                      </Typography>
                    </Box>
                  </Paper>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newWorkExperience = [...(resumeData.workExperience || []), {
                      jobTitle: '',
                      company: '',
                      location: '',
                      duration: '',
                      bulletPoints: ['']
                    }];
                    updateResumeData('workExperience', newWorkExperience);
                  }}
                  sx={{
                    borderColor: '#6366F1',
                    color: '#6366F1',
                    py: 1,
                    borderRadius: 2,
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#8B5CF6',
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.3s ease-in-out'
                  }}
                >
                  Add Work Experience
                </Button>
              </Stack>
            </Box>
          </Grow>
        );

      case 4: // Projects
        return (
          <Grow in timeout={800}>
            <Box>
              <Typography variant="h6" sx={{ color: '#F8FAFC', mb: 2, fontWeight: 600 }}>
                Portfolio Projects
              </Typography>
              <Stack spacing={2}>
                {(resumeData.projects || []).map((project: any, projectIndex: number) => (
                  <Paper 
                    key={projectIndex} 
                    elevation={4}
                    sx={{ 
                      p: 2,
                      background: 'rgba(15, 23, 42, 0.4)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      borderRadius: 2,
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        borderColor: 'rgba(99, 102, 241, 0.4)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(99, 102, 241, 0.15)'
                      }
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mb: 1.5,
                      pb: 1.5,
                      borderBottom: '1px solid rgba(99, 102, 241, 0.1)'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StarIcon sx={{ color: '#6366F1', fontSize: 18 }} />
                        <Typography variant="h6" fontWeight={600} sx={{ color: '#F8FAFC', fontSize: '1.1rem' }}>
                          Project {projectIndex + 1}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {(resumeData.projects || []).length > 1 && (
                          <>
                            <IconButton
                              onClick={() => moveItemUp('projects', projectIndex)}
                              disabled={projectIndex === 0}
                              size="small"
                              title="Move Up"
                              sx={{
                                color: '#94A3B8',
                                '&:hover': { color: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.1)' },
                                '&:disabled': { color: 'rgba(148, 163, 184, 0.3)' }
                              }}
                            >
                              <UpIcon />
                            </IconButton>
                            <IconButton
                              onClick={() => moveItemDown('projects', projectIndex, (resumeData.projects || []).length)}
                              disabled={projectIndex === (resumeData.projects || []).length - 1}
                              size="small"
                              title="Move Down"
                              sx={{
                                color: '#94A3B8',
                                '&:hover': { color: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.1)' },
                                '&:disabled': { color: 'rgba(148, 163, 184, 0.3)' }
                              }}
                            >
                              <DownIcon />
                            </IconButton>
                          </>
                        )}
                        <IconButton
                          onClick={() => {
                            const newProjects = [...(resumeData.projects || [])];
                            newProjects.splice(projectIndex, 1);
                            updateResumeData('projects', newProjects);
                          }}
                          color="error"
                          size="small"
                          title="Delete"
                          sx={{
                            '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.1)' }
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Project Name"
                          value={project.projectName || ''}
                          onChange={(e) => updateResumeData(`projects.${projectIndex}.projectName`, e.target.value)}
                          placeholder="E-Commerce Platform"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Tech Stack (comma-separated)"
                          value={project.techStack || ''}
                          onChange={(e) => updateResumeData(`projects.${projectIndex}.techStack`, e.target.value)}
                          placeholder="React, Node.js, MongoDB"
                          helperText="Comma-separated (will be converted to | format in PDF)"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                            },
                            '& .MuiFormHelperText-root': {
                              color: '#64748B',
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={8}>
                        <TextField
                          fullWidth
                          label="Project Link (Optional)"
                          value={project.projectLink || ''}
                          onChange={(e) => updateResumeData(`projects.${projectIndex}.projectLink`, e.target.value)}
                          placeholder="https://github.com/username/project"
                          helperText="Leave empty to use a generic link placeholder"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                            },
                            '& .MuiFormHelperText-root': {
                              color: '#64748B',
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Link Text (Optional)"
                          value={project.linkText || ''}
                          onChange={(e) => updateResumeData(`projects.${projectIndex}.linkText`, e.target.value)}
                          placeholder="GitHub, Live Demo, etc."
                          helperText="Default: 'Link'"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                            },
                            '& .MuiFormHelperText-root': {
                              color: '#64748B',
                            },
                          }}
                        />
                      </Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 2, mb: 1.5 }}>
                      <Typography variant="h6" fontWeight={600} sx={{ color: '#F8FAFC', mb: 1.5 }}>
                        Project Details:
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        maxRows={15}
                        value={(() => {
                          const bulletPoints = Array.isArray(project.bulletPoints) ? project.bulletPoints.join('\n') : (project.bulletPoints || '');
                          // Add bullet points to display if they don't already exist
                          return bulletPoints.split('\n').map((line: string) => {
                            const trimmed = line.trim();
                            return trimmed && !trimmed.startsWith('•') ? `• ${trimmed}` : trimmed;
                          }).join('\n');
                        })()}
                        onChange={(e) => {
                          const text = e.target.value;
                          // Remove bullet points when storing
                          const cleanText = text
                            .split('\n')
                            .map(line => line.replace(/^•\s*/, '').trim())
                            .filter(line => line.length > 0)
                            .join('\n');
                          updateResumeData(`projects.${projectIndex}.bulletPoints`, cleanText);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const textarea = e.target as HTMLTextAreaElement;
                            const cursorPos = textarea.selectionStart;
                            const value = textarea.value;
                            
                            // Split text at cursor position
                            const beforeCursor = value.substring(0, cursorPos);
                            const afterCursor = value.substring(cursorPos);
                            
                            // Add bullet point at cursor position
                            const newText = beforeCursor + '\n• ' + afterCursor;
                            
                            // Update textarea value directly
                            textarea.value = newText;
                            
                            // Set cursor position after the bullet
                            const newCursorPos = cursorPos + 3;
                            setTimeout(() => {
                              textarea.setSelectionRange(newCursorPos, newCursorPos);
                            }, 0);
                            
                            // Prevent default behavior
                            e.preventDefault();
                          }
                        }}
                        placeholder="Type your project details here. Press Enter for new bullet points.&#10;Example:&#10;• Built a real-time chat application&#10;• Implemented user authentication&#10;• Use **text** for bold formatting"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'rgba(15, 23, 42, 0.3)',
                            borderRadius: 2,
                            '& fieldset': {
                              borderColor: 'rgba(99, 102, 241, 0.3)',
                            },
                            '&:hover fieldset': {
                              borderColor: '#6366F1',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#6366F1',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            color: '#94A3B8',
                            '&.Mui-focused': {
                              color: '#6366F1',
                            },
                          },
                          '& .MuiInputBase-input': {
                            color: '#F8FAFC',
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            lineHeight: 1.6
                          },
                        }}
                      />
                      <Typography variant="caption" sx={{ 
                        display: 'block', 
                        mt: 0.5, 
                        color: '#64748B',
                        fontStyle: 'italic'
                      }}>
                        💡 Tip: Press Enter to automatically add bullet points. Use **text** to make text bold in the final resume.
                      </Typography>
                    </Box>
                  </Paper>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newProjects = [...(resumeData.projects || []), {
                      projectName: '',
                      techStack: '',
                      projectLink: '',
                      linkText: '',
                      bulletPoints: ['']
                    }];
                    updateResumeData('projects', newProjects);
                  }}
                  sx={{
                    borderColor: '#6366F1',
                    color: '#6366F1',
                    py: 1,
                    borderRadius: 2,
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#8B5CF6',
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.3s ease-in-out'
                  }}
                >
                  Add Project
                </Button>
              </Stack>
            </Box>
          </Grow>
        );

      case 5: // Education
        return (
          <Grow in timeout={800}>
            <Box>
              <Typography variant="h6" sx={{ color: '#F8FAFC', mb: 2, fontWeight: 600 }}>
                Academic Background
              </Typography>
              <Stack spacing={2}>
                {(resumeData.education || []).map((edu: any, eduIndex: number) => (
                  <Paper 
                    key={eduIndex} 
                    elevation={4}
                    sx={{ 
                      p: 2,
                      background: 'rgba(15, 23, 42, 0.4)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      borderRadius: 2,
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        borderColor: 'rgba(99, 102, 241, 0.4)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(99, 102, 241, 0.15)'
                      }
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mb: 1.5,
                      pb: 1.5,
                      borderBottom: '1px solid rgba(99, 102, 241, 0.1)'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SchoolIcon sx={{ color: '#6366F1', fontSize: 18 }} />
                        <Typography variant="h6" fontWeight={600} sx={{ color: '#F8FAFC', fontSize: '1.1rem' }}>
                          Education {eduIndex + 1}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {(resumeData.education || []).length > 1 && (
                          <>
                            <IconButton
                              onClick={() => moveItemUp('education', eduIndex)}
                              disabled={eduIndex === 0}
                              size="small"
                              title="Move Up"
                              sx={{
                                color: '#94A3B8',
                                '&:hover': { color: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.1)' },
                                '&:disabled': { color: 'rgba(148, 163, 184, 0.3)' }
                              }}
                            >
                              <UpIcon />
                            </IconButton>
                            <IconButton
                              onClick={() => moveItemDown('education', eduIndex, (resumeData.education || []).length)}
                              disabled={eduIndex === (resumeData.education || []).length - 1}
                              size="small"
                              title="Move Down"
                              sx={{
                                color: '#94A3B8',
                                '&:hover': { color: '#6366F1', backgroundColor: 'rgba(99, 102, 241, 0.1)' },
                                '&:disabled': { color: 'rgba(148, 163, 184, 0.3)' }
                              }}
                            >
                              <DownIcon />
                            </IconButton>
                          </>
                        )}
                        <IconButton
                          onClick={() => {
                            const newEducation = [...(resumeData.education || [])];
                            newEducation.splice(eduIndex, 1);
                            updateResumeData('education', newEducation);
                          }}
                          color="error"
                          size="small"
                          title="Delete"
                          sx={{
                            '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.1)' }
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="University"
                          value={edu.university || ''}
                          onChange={(e) => updateResumeData(`education.${eduIndex}.university`, e.target.value)}
                          placeholder="Stanford University"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Degree"
                          value={edu.degree || ''}
                          onChange={(e) => updateResumeData(`education.${eduIndex}.degree`, e.target.value)}
                          placeholder="Bachelor of Science in Computer Science"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Date"
                          value={edu.date || ''}
                          onChange={(e) => updateResumeData(`education.${eduIndex}.date`, e.target.value)}
                          placeholder="May 2021"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Track/Specialization"
                          value={edu.track || ''}
                          onChange={(e) => updateResumeData(`education.${eduIndex}.track`, e.target.value)}
                          placeholder="Software Engineering"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Coursework (comma-separated)"
                          value={edu.coursework || ''}
                          onChange={(e) => updateResumeData(`education.${eduIndex}.coursework`, e.target.value)}
                          multiline
                          rows={2}
                          placeholder="Operating Systems, Machine Learning, Data Structures"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              borderRadius: 2,
                              '& fieldset': {
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#6366F1',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#6366F1',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              '&.Mui-focused': {
                                color: '#6366F1',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: '#F8FAFC',
                            },
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newEducation = [...(resumeData.education || []), {
                      university: '',
                      degree: '',
                      date: '',
                      track: '',
                      coursework: ''
                    }];
                    updateResumeData('education', newEducation);
                  }}
                  sx={{
                    borderColor: '#6366F1',
                    color: '#6366F1',
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#8B5CF6',
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.3s ease-in-out'
                  }}
                >
                  Add Education
                </Button>
              </Stack>
            </Box>
          </Grow>
        );

      case 6: // API Config
        return (
          <Grow in timeout={800}>
            <Paper 
              elevation={4}
              sx={{ 
                p: 3,
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: 2,
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  borderColor: 'rgba(99, 102, 241, 0.4)',
                  boxShadow: '0 8px 25px rgba(99, 102, 241, 0.15)'
                }
              }}
            >
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <ApiIcon sx={{ color: '#6366F1', fontSize: 20 }} />
                    <Typography variant="h6" fontWeight={600} sx={{ color: '#F8FAFC' }}>
                      OpenAI API Key
                    </Typography>
                  </Box>
                  
                  {apiConfig?.hasApiKey ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Alert severity="success" sx={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', py: 0.5 }}>
                          <Typography variant="body2" sx={{ color: '#22C55E' }}>
                            API key is configured and saved securely
                          </Typography>
                        </Alert>
                        
                        <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                          Last Updated: {apiConfig.timestamp ? new Date(apiConfig.timestamp).toLocaleString() : 'Unknown'}
                        </Typography>
                      </Box>
                      
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleDeleteApiKey}
                        disabled={savingApiConfig}
                        startIcon={<DeleteIcon />}
                        size="small"
                        sx={{
                          borderColor: '#EF4444',
                          color: '#EF4444',
                          '&:hover': {
                            borderColor: '#DC2626',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)'
                          }
                        }}
                      >
                        {savingApiConfig ? 'Deleting...' : 'Delete API Key'}
                      </Button>
                    </Box>
                  ) : (
                    <Box>
                      <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3 }}>
                        Enter your OpenAI API key to enable AI-powered resume tailoring features. 
                        Your key will be stored securely and encrypted.
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ position: 'relative', flex: 1 }}>
                          <TextField
                            fullWidth
                            label="OpenAI API Key"
                            type={showApiKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: 'rgba(15, 23, 42, 0.3)',
                                borderRadius: 2,
                                '& fieldset': {
                                  borderColor: 'rgba(99, 102, 241, 0.3)',
                                },
                                '&:hover fieldset': {
                                  borderColor: '#6366F1',
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: '#6366F1',
                                },
                              },
                              '& .MuiInputLabel-root': {
                                color: '#94A3B8',
                                '&.Mui-focused': {
                                  color: '#6366F1',
                                },
                              },
                              '& .MuiInputBase-input': {
                                color: '#F8FAFC',
                              },
                            }}
                          />
                          <IconButton
                            onClick={() => setShowApiKey(!showApiKey)}
                            sx={{
                              position: 'absolute',
                              right: 8,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: '#94A3B8',
                              '&:hover': { color: '#6366F1' }
                            }}
                          >
                            {showApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </Box>
                        
                        <Button
                          variant="contained"
                          onClick={handleSaveApiConfig}
                          disabled={savingApiConfig || !apiKey.trim()}
                          startIcon={<SaveIcon />}
                          size="small"
                          sx={{
                            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)'
                            },
                            '&:disabled': {
                              background: 'rgba(99, 102, 241, 0.3)',
                              color: 'rgba(248, 250, 252, 0.5)'
                            }
                          }}
                        >
                          {savingApiConfig ? 'Saving...' : 'Save Securely'}
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Paper>
          </Grow>
        );

      default:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" color="text.secondary" textAlign="center">
              Section under construction...
            </Typography>
          </Box>
        );
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
      py: 4
    }}>
      <Container maxWidth="xl">
        {loading ? (
          // Loading Screen
          <Fade in timeout={800}>
            <Box textAlign="center" sx={{ py: 12 }}>
              <CircularProgress 
                size={80} 
                sx={{ 
                  mb: 4,
                  color: '#6366F1',
                  filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.4))'
                }} 
              />
              <Typography variant="h4" gutterBottom sx={{ color: '#F8FAFC', fontWeight: 600 }}>
                Loading Resume Data...
              </Typography>
              <Typography variant="body1" sx={{ color: '#94A3B8', fontSize: '1.1rem' }}>
                Please wait while we fetch your resume information.
              </Typography>
            </Box>
          </Fade>
        ) : !resumeData ? (
          // Error State
          <Fade in timeout={800}>
            <Box textAlign="center" sx={{ py: 12 }}>
              <Typography variant="h4" gutterBottom color="error" sx={{ fontWeight: 600 }}>
                Failed to Load Resume
              </Typography>
              <Typography variant="body1" sx={{ color: '#94A3B8', mb: 4, fontSize: '1.1rem' }}>
                There was an issue loading your resume data. Please make sure the backend is running.
              </Typography>
              <Button
                variant="contained"
                onClick={() => window.location.reload()}
                sx={{ 
                  px: 4, 
                  py: 1.5,
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)'
                  }
                }}
              >
                Retry
              </Button>
            </Box>
          </Fade>
        ) : (
          // Resume Editor Dashboard
          <Fade in timeout={800}>
            <Box>
              {/* Header */}
              <Grow in timeout={1000}>
                <Box sx={{ mb: 6 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    justifyContent: 'space-between',
                    mb: 4,
                    flexWrap: { xs: 'wrap', md: 'nowrap' },
                    gap: 3
                  }}>
                    {/* Left side - Title and subtitle */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        mb: 2,
                        cursor: 'pointer',
                        transition: 'transform 0.3s ease-in-out',
                        '&:hover': {
                          transform: 'scale(1.02)'
                        }
                      }}>
                        <PersonIcon sx={{ 
                          fontSize: { xs: 48, md: 56 }, 
                          color: '#6366F1',
                          filter: 'drop-shadow(0 0 12px rgba(99, 102, 241, 0.5))',
                          mr: 2,
                          animation: 'pulse 2s infinite',
                          flexShrink: 0
                        }} />
                        <Typography 
                          variant="h2" 
                          component="h1" 
                          sx={{ 
                            fontWeight: 700, 
                            color: '#F8FAFC',
                            fontSize: { xs: '2.5rem', md: '3rem', lg: '3.5rem' },
                            letterSpacing: '-0.02em',
                            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.3))',
                            lineHeight: 1.1
                          }}
                        >
                          Profile Manager
                        </Typography>
                      </Box>

                      <Slide direction="up" in timeout={1200}>
                        <Typography 
                          variant="h5" 
                          component="h2" 
                          sx={{ 
                            color: '#E2E8F0',
                            lineHeight: 1.4,
                            fontSize: { xs: '1.1rem', md: '1.3rem' },
                            opacity: 0.9,
                            fontWeight: 400,
                            pl: { xs: 0, md: 7 } // Align with the title text (icon width + margin)
                          }}
                        >
                          Build your professional resume with precision and style
                        </Typography>
                      </Slide>
                    </Box>

                    {/* Right side - Save button */}
                    {currentSection !== sections.length - 1 && (
                    <Fade in timeout={600}>
                      <Box sx={{ flexShrink: 0 }}>
                        <Button
                          variant="contained"
                          size="large"
                          onClick={handleSaveResume}
                          disabled={saving || !hasUnsavedChanges}
                          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                          sx={{ 
                            px: 4,
                            py: 2,
                            fontSize: '1rem',
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                            boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
                            borderRadius: 3,
                            whiteSpace: 'nowrap',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)',
                              boxShadow: '0 8px 25px rgba(99, 102, 241, 0.5)',
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
                          {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </Box>
                    </Fade>
                    )}
                  </Box>
                </Box>
              </Grow>

              {/* Section Tabs */}
              <Slide direction="up" in timeout={1200}>
                <Paper 
                  elevation={8}
                  sx={{ 
                    mb: 4,
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 3,
                    overflow: 'hidden'
                  }}
                >
                  <Tabs
                    value={currentSection}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{ 
                      '& .MuiTab-root': { 
                        minHeight: 72,
                        fontSize: '0.95rem',
                        fontWeight: 500,
                        color: '#94A3B8',
                        textTransform: 'none',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        borderBottom: '3px solid transparent',
                        borderRadius: '8px 8px 0 0',
                        margin: '0 4px',
                        '&:hover': {
                          color: '#6366F1',
                          backgroundColor: 'rgba(99, 102, 241, 0.12)',
                          transform: 'translateY(-3px)',
                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                        },
                        '&.Mui-selected': {
                          color: '#6366F1',
                          fontWeight: 700,
                          backgroundColor: 'rgba(99, 102, 241, 0.08)',
                          borderBottom: '3px solid #6366F1',
                          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.15)',
                          backdropFilter: 'blur(10px)'
                        }
                      },
                      '& .MuiTabs-indicator': {
                        backgroundColor: '#6366F1',
                        height: 4,
                        borderRadius: '2px 2px 0 0',
                        boxShadow: '0 2px 4px rgba(99, 102, 241, 0.4)'
                      },
                      '& .MuiTabs-flexContainer': {
                        gap: 2,
                        padding: '0 8px'
                      }
                    }}
                  >
                    {sections.map((section, index) => (
                      <Tab 
                        key={index} 
                        label={section}
                        icon={getSectionIcon(section, currentSection === index)}
                        iconPosition="start"
                      />
                    ))}
                  </Tabs>
                </Paper>
              </Slide>

              {/* Current Section Content */}
              <Slide direction="up" in timeout={1400}>
                <Paper 
                  elevation={8}
                  sx={{ 
                    mb: 4,
                    minHeight: 500,
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 3,
                    overflow: 'hidden'
                  }}
                >
                  <Box sx={{ 
                    px: 4, 
                    py: 3, 
                    borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                    background: 'rgba(99, 102, 241, 0.05)'
                  }}>
                    <Typography variant="h5" fontWeight={600} sx={{ color: '#F8FAFC' }}>
                      {sections[currentSection]}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 4 }}>
                    {renderCurrentSection()}
                  </Box>
                </Paper>
              </Slide>

              {/* Navigation */}
              <Slide direction="up" in timeout={1600}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mb: 4,
                  p: 3,
                  background: 'rgba(30, 41, 59, 0.6)',
                  borderRadius: 3,
                  border: '1px solid rgba(99, 102, 241, 0.1)'
                }}>
                  <Button
                    variant="outlined"
                    startIcon={<BackIcon />}
                    onClick={handlePrevSection}
                    disabled={currentSection === 0}
                    sx={{
                      borderColor: '#6366F1',
                      color: '#6366F1',
                      '&:hover': {
                        borderColor: '#8B5CF6',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)'
                      },
                      '&:disabled': {
                        borderColor: 'rgba(99, 102, 241, 0.3)',
                        color: 'rgba(99, 102, 241, 0.3)'
                      }
                    }}
                  >
                    Previous
                  </Button>
                  
                  <Chip
                    label={`${currentSection + 1} of ${sections.length}`}
                    sx={{
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      color: '#6366F1',
                      fontWeight: 600,
                      border: '1px solid rgba(99, 102, 241, 0.3)'
                    }}
                  />
                  
                  <Button
                    variant="outlined"
                    endIcon={<NextIcon />}
                    onClick={handleNextSection}
                    disabled={currentSection === sections.length - 1}
                    sx={{
                      borderColor: '#6366F1',
                      color: '#6366F1',
                      '&:hover': {
                        borderColor: '#8B5CF6',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)'
                      },
                      '&:disabled': {
                        borderColor: 'rgba(99, 102, 241, 0.3)',
                        color: 'rgba(99, 102, 241, 0.3)'
                      }
                    }}
                  >
                    Next
                  </Button>
                </Box>
              </Slide>

              {/* Floating Save Button - Only show when there are unsaved changes */}
              <Zoom in={hasUnsavedChanges}>
                <Fab
                  color="primary"
                  size="large"
                  onClick={handleSaveResume}
                  disabled={saving}
                  sx={{
                    position: 'fixed',
                    bottom: 32,
                    right: 32,
                    zIndex: 1000,
                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)',
                      boxShadow: '0 12px 40px rgba(99, 102, 241, 0.5)',
                      transform: 'translateY(-3px)'
                    },
                    '&:disabled': {
                      background: 'rgba(99, 102, 241, 0.3)',
                      transform: 'none'
                    },
                    transition: 'all 0.3s ease-in-out'
                  }}
                >
                  {saving ? <CircularProgress size={28} color="inherit" /> : <SaveIcon />}
                </Fab>
              </Zoom>

              {/* Unsaved Changes Alert */}
              {hasUnsavedChanges && (
                <Alert 
                  severity="info" 
                  sx={{ 
                    position: 'fixed',
                    top: 32,
                    right: 32,
                    zIndex: 1000,
                    background: 'rgba(30, 41, 59, 0.9)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    backdropFilter: 'blur(10px)',
                    color: '#E2E8F0'
                  }}
                >
                  You have unsaved changes. Click the save button to update your resume.
                </Alert>
              )}
            </Box>
          </Fade>
        )}
      </Container>
    </Box>
  );
};

export default ProfileSection;