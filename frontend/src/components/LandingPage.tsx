import { 
  Box, 
  Container, 
  Typography, 
  Button,
  Stack,
  Paper,
  Fade,
  Grow,
  Slide
} from '@mui/material';
import { 
  WorkOutline as ResumeIcon,
  ArrowForward as ArrowIcon,
  Psychology as AIIcon,
  FlashOn as LightningIcon,
  Description as DocumentIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [animateFeatures, setAnimateFeatures] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimateFeatures(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      py: 4
    }}>
      <Container maxWidth="xl">
        {/* Hero Section - Same for both logged in and logged out */}
        <Fade in timeout={800}>
          <Box sx={{ 
            textAlign: 'center',
            mb: 8
          }}>
            {/* App Logo and Name */}
            <Grow in timeout={1000}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mb: 4,
                cursor: 'pointer',
                transition: 'transform 0.3s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.02)'
                }
              }}>
                <ResumeIcon sx={{ 
                  fontSize: { xs: 48, md: 56 }, 
                  color: '#6366F1',
                  filter: 'drop-shadow(0 0 12px rgba(99, 102, 241, 0.5))',
                  mr: 2,
                  animation: 'pulse 2s infinite'
                }} />
                <Typography 
                  variant="h1" 
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
                    filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.3))'
                  }}
                >
                  Resume Forge
                </Typography>
              </Box>
            </Grow>

            {/* Tagline */}
            <Slide direction="up" in timeout={1200}>
              <Typography 
                variant="h5" 
                component="h2" 
                sx={{ 
                  color: '#E2E8F0',
                  mb: 6,
                  maxWidth: '800px',
                  mx: 'auto',
                  lineHeight: 1.4,
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                  opacity: 0.9,
                  fontWeight: 400
                }}
              >
                AI-powered resume tailoring that helps you land your dream job
              </Typography>
            </Slide>

            {/* Action Buttons - Different for logged in vs logged out */}
            <Slide direction="up" in timeout={1400}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 3,
                justifyContent: 'center',
                alignItems: 'center',
                mb: 8
              }}>
                {currentUser ? (
                  <>
                    <Button
                      variant="contained"
                      size="large"
                      endIcon={<ArrowIcon />}
                      onClick={() => navigate('/create-resume')}
                      sx={{
                        px: 4,
                        py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                        boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
                        borderRadius: 2,
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)',
                          boxShadow: '0 8px 25px rgba(99, 102, 241, 0.5)',
                          transform: 'translateY(-2px)'
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
                      Get Started
                    </Button>
                    
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={() => navigate('/profile')}
                      sx={{
                        px: 4,
                        py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        borderColor: '#6366F1',
                        color: '#6366F1',
                        borderWidth: 2,
                        borderRadius: 2,
                        '&:hover': {
                          borderColor: '#8B5CF6',
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 20px rgba(99, 102, 241, 0.3)'
                        },
                        transition: 'all 0.3s ease-in-out'
                      }}
                    >
                      Manage Profile
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="contained"
                      size="large"
                      endIcon={<ArrowIcon />}
                      onClick={() => navigate('/auth')}
                      sx={{
                        px: 4,
                        py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                        boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
                        borderRadius: 2,
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)',
                          boxShadow: '0 8px 25px rgba(99, 102, 241, 0.5)',
                          transform: 'translateY(-2px)'
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
                      Get Started
                    </Button>
                    
                    <Button
                      variant="outlined"
                      size="large"
                      onClick={() => navigate('/auth')}
                      sx={{
                        px: 4,
                        py: 1.5,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        borderColor: '#6366F1',
                        color: '#6366F1',
                        borderWidth: 2,
                        borderRadius: 2,
                        '&:hover': {
                          borderColor: '#8B5CF6',
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 20px rgba(99, 102, 241, 0.3)'
                        },
                        transition: 'all 0.3s ease-in-out'
                      }}
                    >
                      Sign Up
                    </Button>
                  </>
                )}
              </Box>
            </Slide>
          </Box>
        </Fade>

        {/* Feature Cards - Always at the bottom */}
        <Grow in={animateFeatures} timeout={1800}>
          <Box>
            <Typography 
              variant="h4" 
              component="h3" 
              sx={{ 
                textAlign: 'center', 
                mb: 6, 
                fontWeight: 700,
                color: '#F8FAFC',
                fontSize: { xs: '1.75rem', md: '2rem' },
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.3))'
              }}
            >
              Why Choose Resume Forge?
            </Typography>
            
            <Stack 
              direction={{ xs: 'column', md: 'row' }} 
              spacing={3}
              sx={{ 
                width: '100%', 
                maxWidth: '1200px',
                mx: 'auto'
              }}
            >
                              <Paper 
                  elevation={8}
                  sx={{ 
                    p: 4, 
                    textAlign: 'center',
                    flex: 1,
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 3,
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 15px 35px rgba(99, 102, 241, 0.3)',
                      borderColor: 'rgba(99, 102, 241, 0.4)'
                    },
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'linear-gradient(90deg, #6366F1, #8B5CF6, #EC4899)',
                      transform: 'scaleX(0)',
                      transition: 'transform 0.3s ease-in-out'
                    },
                    '&:hover::before': {
                      transform: 'scaleX(1)'
                    }
                  }}
                >
                  <AIIcon sx={{ 
                    fontSize: 60, 
                    color: '#6366F1', 
                    mb: 3,
                    filter: 'drop-shadow(0 0 12px rgba(99, 102, 241, 0.5))',
                    transition: 'transform 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'scale(1.1) rotate(5deg)'
                    }
                  }} />
                  <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#F8FAFC' }}>
                    AI-Powered
                  </Typography>
                  <Typography variant="body1" color="#E2E8F0" sx={{ lineHeight: 1.6, fontSize: '1rem' }}>
                    Smart algorithms analyze job descriptions and optimize your resume for maximum impact
                  </Typography>
                </Paper>

                              <Paper 
                  elevation={8}
                  sx={{ 
                    p: 4, 
                    textAlign: 'center',
                    flex: 1,
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 3,
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 15px 35px rgba(99, 102, 241, 0.3)',
                      borderColor: 'rgba(99, 102, 241, 0.4)'
                    },
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'linear-gradient(90deg, #6366F1, #8B5CF6, #EC4899)',
                      transform: 'scaleX(0)',
                      transition: 'transform 0.3s ease-in-out'
                    },
                    '&:hover::before': {
                      transform: 'scaleX(1)'
                    }
                  }}
                >
                  <LightningIcon sx={{ 
                    fontSize: 60, 
                    color: '#6366F1', 
                    mb: 3,
                    filter: 'drop-shadow(0 0 12px rgba(99, 102, 241, 0.5))',
                    transition: 'transform 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'scale(1.1) rotate(5deg)'
                    }
                  }} />
                  <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#F8FAFC' }}>
                    Lightning Fast
                  </Typography>
                  <Typography variant="body1" color="#E2E8F0" sx={{ lineHeight: 1.6, fontSize: '1rem' }}>
                    Generate tailored resumes in minutes, not hours. Perfect for applying to multiple positions
                  </Typography>
                </Paper>

                              <Paper 
                  elevation={8}
                  sx={{ 
                    p: 4, 
                    textAlign: 'center',
                    flex: 1,
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 3,
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 15px 35px rgba(99, 102, 241, 0.3)',
                      borderColor: 'rgba(99, 102, 241, 0.4)'
                    },
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'linear-gradient(90deg, #6366F1, #8B5CF6, #EC4899)',
                      transform: 'scaleX(0)',
                      transition: 'transform 0.3s ease-in-out'
                    },
                    '&:hover::before': {
                      transform: 'scaleX(1)'
                    }
                  }}
                >
                  <DocumentIcon sx={{ 
                    fontSize: 60, 
                    color: '#6366F1', 
                    mb: 3,
                    filter: 'drop-shadow(0 0 12px rgba(99, 102, 241, 0.5))',
                    transition: 'transform 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'scale(1.1) rotate(5deg)'
                    }
                  }} />
                  <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#F8FAFC' }}>
                    Professional
                  </Typography>
                  <Typography variant="body1" color="#E2E8F0" sx={{ lineHeight: 1.6, fontSize: '1rem' }}>
                    Export to PDF with beautiful LaTeX formatting that stands out to recruiters
                  </Typography>
                </Paper>
            </Stack>
          </Box>
        </Grow>
      </Container>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }
      `}</style>
    </Box>
  );
};

export default LandingPage;