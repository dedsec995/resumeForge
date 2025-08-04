import { 
  Box, 
  Container, 
  Typography, 
  Button,
  Stack,
  Paper
} from '@mui/material';
import { 
  WorkOutline as ResumeIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthPage from './AuthPage';

const LandingPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Show auth page if user is not logged in
  if (!currentUser) {
    return <AuthPage />;
  }

  // Show main landing page for authenticated users
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Box sx={{ 
        textAlign: 'center',
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {/* App Logo and Name */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          mb: 4
        }}>
          <ResumeIcon sx={{ 
            fontSize: 60, 
            color: '#6366F1',
            filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.4))',
            mr: 2
          }} />
          <Typography 
            variant="h2" 
            component="h1" 
            sx={{ 
              fontWeight: 700, 
              color: 'primary.main',
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              letterSpacing: '-0.02em'
            }}
          >
            Resume Forge
          </Typography>
        </Box>

        {/* Tagline */}
        <Typography 
          variant="h5" 
          component="h2" 
          sx={{ 
            color: 'text.secondary',
            mb: 6,
            maxWidth: '600px',
            lineHeight: 1.4,
            fontSize: { xs: '1.25rem', md: '1.5rem' }
          }}
        >
          AI-powered resume tailoring that helps you land your dream job
        </Typography>

        {/* Action Buttons */}
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={3}
          sx={{ mb: 8 }}
        >
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
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)',
                boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)',
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.2s ease-in-out'
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
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                borderColor: 'primary.dark',
                backgroundColor: 'rgba(99, 102, 241, 0.04)',
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            Manage Profile
          </Button>
        </Stack>

        {/* Feature Cards */}
        <Stack 
          direction={{ xs: 'column', md: 'row' }} 
          spacing={3}
          sx={{ width: '100%', maxWidth: '800px' }}
        >
          <Paper 
            elevation={2}
            sx={{ 
              p: 3, 
              textAlign: 'center',
              flex: 1,
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: 'primary.main' }}>
              🎯 AI-Powered
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Smart algorithms analyze job descriptions and optimize your resume for maximum impact
            </Typography>
          </Paper>

          <Paper 
            elevation={2}
            sx={{ 
              p: 3, 
              textAlign: 'center',
              flex: 1,
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: 'primary.main' }}>
              ⚡ Lightning Fast
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Generate tailored resumes in minutes, not hours. Perfect for applying to multiple positions
            </Typography>
          </Paper>

          <Paper 
            elevation={2}
            sx={{ 
              p: 3, 
              textAlign: 'center',
              flex: 1,
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: 'primary.main' }}>
              📄 Professional
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Export to PDF with beautiful LaTeX formatting that stands out to recruiters
            </Typography>
          </Paper>
        </Stack>
      </Box>
    </Container>
  );
};

export default LandingPage;