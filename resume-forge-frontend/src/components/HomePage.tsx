import { 
  Box, 
  Container, 
  Typography, 
  AppBar, 
  Toolbar, 
  Card, 
  CardContent,
  Button,
  Grid,
  Chip,
  Stack,
  Paper,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  WorkOutline as ResumeIcon,
  AutoAwesome as AIIcon,
  Speed as FastIcon,
  GetApp as DownloadIcon,
  Preview as PreviewIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
import axios from 'axios';

const HomePage = () => {
  const [resumeData, setResumeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGetStarted = () => {
    toast.success('Coming soon! Resume tailoring will be available shortly.');
  };

  const handleLearnMore = () => {
    toast('Explore our AI-powered resume optimization features.', {
      icon: 'ℹ️',
    });
  };

  const handleLoadResume = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8002/parseResume');
      if (response.data.success) {
        setResumeData(response.data.resumeData);
        toast.success('Resume loaded successfully!');
      } else {
        toast.error('Failed to load resume');
      }
    } catch (error) {
      console.error('Error loading resume:', error);
      toast.error('Failed to connect to API. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* App Bar */}
      <AppBar position="sticky" elevation={0}>
        <Toolbar>
          <ResumeIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Resume Forge
          </Typography>
          <Button color="inherit" sx={{ fontWeight: 600 }}>
            Login
          </Button>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ pt: 8, pb: 6 }}>
        <Box textAlign="center" mb={6}>
          <Typography
            variant="h1"
            component="h1"
            gutterBottom
            sx={{
              background: 'linear-gradient(45deg, #6366f1 30%, #06b6d4 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 3
            }}
          >
            Resume Forge
          </Typography>
          <Typography
            variant="h4"
            color="text.secondary"
            paragraph
            sx={{ mb: 4, maxWidth: 800, mx: 'auto' }}
          >
            AI-Powered Resume Tailoring for Every Job Application
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            paragraph
            sx={{ mb: 6, maxWidth: 600, mx: 'auto', fontWeight: 400 }}
          >
            Transform your generic resume into a perfectly tailored application that matches 
            any job description using advanced AI technology.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              startIcon={<AIIcon />}
              onClick={handleGetStarted}
              sx={{ px: 4, py: 1.5 }}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={handleLearnMore}
              sx={{ px: 4, py: 1.5 }}
            >
              Learn More
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PreviewIcon />}
              onClick={handleLoadResume}
              disabled={loading}
              sx={{ px: 4, py: 1.5 }}
            >
              {loading ? 'Loading...' : 'Load Resume'}
            </Button>
          </Stack>
        </Box>

        {/* Resume Data Display Section */}
        {resumeData && (
          <Box sx={{ mt: 8, mb: 4 }}>
            <Typography variant="h4" gutterBottom textAlign="center" sx={{ mb: 4 }}>
              Resume Data Preview
            </Typography>
            <Paper sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              
              {/* Personal Information */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" fontWeight={600}>Personal Information</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box component="pre" sx={{ fontSize: '0.875rem', color: 'text.secondary', overflow: 'auto' }}>
                    {JSON.stringify(resumeData.personalInfo, null, 2)}
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Technical Skills */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" fontWeight={600}>Technical Skills ({Object.keys(resumeData.technicalSkills || {}).length} categories)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box component="pre" sx={{ fontSize: '0.875rem', color: 'text.secondary', overflow: 'auto' }}>
                    {JSON.stringify(resumeData.technicalSkills, null, 2)}
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Work Experience */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" fontWeight={600}>Work Experience ({resumeData.workExperience?.length || 0} entries)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box component="pre" sx={{ fontSize: '0.875rem', color: 'text.secondary', overflow: 'auto' }}>
                    {JSON.stringify(resumeData.workExperience, null, 2)}
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Projects */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" fontWeight={600}>Projects ({resumeData.projects?.length || 0} entries)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box component="pre" sx={{ fontSize: '0.875rem', color: 'text.secondary', overflow: 'auto' }}>
                    {JSON.stringify(resumeData.projects, null, 2)}
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Education */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" fontWeight={600}>Education ({resumeData.education?.length || 0} entries)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box component="pre" sx={{ fontSize: '0.875rem', color: 'text.secondary', overflow: 'auto' }}>
                    {JSON.stringify(resumeData.education, null, 2)}
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Certifications */}
              {resumeData.certifications && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" fontWeight={600}>Certifications</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body1" color="text.secondary">
                      {resumeData.certifications}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Raw Content Toggle */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" fontWeight={600}>Raw LaTeX Content</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box 
                    component="pre" 
                    sx={{ 
                      fontSize: '0.75rem', 
                      color: 'text.secondary', 
                      overflow: 'auto',
                      maxHeight: '300px',
                      bgcolor: 'grey.900',
                      p: 2,
                      borderRadius: 1
                    }}
                  >
                    {resumeData.rawContent}
                  </Box>
                </AccordionDetails>
              </Accordion>

            </Paper>
          </Box>
        )}

        {/* Feature Cards */}
        <Grid container spacing={4} sx={{ mt: 8 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <AIIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom fontWeight={600}>
                  AI-Powered
                </Typography>
                <Typography color="text.secondary">
                  Advanced AI algorithms analyze job descriptions and optimize your resume 
                  for maximum impact and ATS compatibility.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <FastIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom fontWeight={600}>
                  Lightning Fast
                </Typography>
                <Typography color="text.secondary">
                  Get your tailored resume in minutes, not hours. Our streamlined process 
                  delivers professional results quickly.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <DownloadIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom fontWeight={600}>
                  Ready to Use
                </Typography>
                <Typography color="text.secondary">
                  Download your professionally formatted PDF resume immediately. 
                  Print-ready and perfectly formatted.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Features Section */}
        <Box sx={{ mt: 12, textAlign: 'center' }}>
          <Typography variant="h3" gutterBottom sx={{ mb: 6 }}>
            Why Choose Resume Forge?
          </Typography>
          
          <Grid container spacing={3} justifyContent="center">
            <Grid item>
              <Chip 
                label="Smart Keyword Optimization" 
                variant="outlined" 
                sx={{ p: 2, fontSize: '0.9rem' }}
              />
            </Grid>
            <Grid item>
              <Chip 
                label="ATS-Friendly Format" 
                variant="outlined" 
                sx={{ p: 2, fontSize: '0.9rem' }}
              />
            </Grid>
            <Grid item>
              <Chip 
                label="Industry-Specific Tailoring" 
                variant="outlined" 
                sx={{ p: 2, fontSize: '0.9rem' }}
              />
            </Grid>
            <Grid item>
              <Chip 
                label="Achievement-Focused Content" 
                variant="outlined" 
                sx={{ p: 2, fontSize: '0.9rem' }}
              />
            </Grid>
            <Grid item>
              <Chip 
                label="Professional LaTeX Templates" 
                variant="outlined" 
                sx={{ p: 2, fontSize: '0.9rem' }}
              />
            </Grid>
            <Grid item>
              <Chip 
                label="Quality Scoring System" 
                variant="outlined" 
                sx={{ p: 2, fontSize: '0.9rem' }}
              />
            </Grid>
          </Grid>
        </Box>
      </Container>

      {/* Footer */}
      <Box 
        component="footer" 
        sx={{ 
          mt: 'auto', 
          py: 4, 
          px: 2, 
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              © 2024 Resume Forge. Crafted with ❤️ for job seekers worldwide.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;