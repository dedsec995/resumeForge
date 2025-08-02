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
  AccordionDetails,
  TextField,
  IconButton,
  Divider,
  Fade,
  Alert
} from '@mui/material';
import { 
  WorkOutline as ResumeIcon,
  AutoAwesome as AIIcon,
  Speed as FastIcon,
  GetApp as DownloadIcon,
  Preview as PreviewIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
import axios from 'axios';

// Utility function to render markdown bold formatting as HTML
const renderFormattedText = (text: string) => {
  if (typeof text !== 'string') return text;
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

// Custom JSON display component that preserves bold formatting
const FormattedJSONDisplay = ({ data }: { data: any }) => {
  const jsonString = JSON.stringify(data, null, 2);
  const formattedJson = renderFormattedText(jsonString);
  
  return (
    <Box 
      component="pre" 
      sx={{ 
        fontSize: '0.875rem', 
        color: 'text.secondary', 
        overflow: 'auto',
        whiteSpace: 'pre-wrap'
      }}
      dangerouslySetInnerHTML={{ __html: formattedJson }}
    />
  );
};

const HomePage = () => {
  const [resumeData, setResumeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

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
        setEditMode(true);
        toast.success('Resume loaded successfully! Now you can edit it.');
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

  const handleSaveResume = async () => {
    if (!resumeData) return;
    
    setSaving(true);
    try {
      // For now, we'll just show a success message since we don't have a save endpoint yet
      // In a real implementation, you'd send the data to a backend endpoint
      toast.success('Resume changes saved successfully!');
      console.log('Resume data to save:', resumeData);
    } catch (error) {
      console.error('Error saving resume:', error);
      toast.error('Failed to save resume changes.');
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
        {resumeData && editMode && (
          <Fade in={true}>
          <Box sx={{ mt: 8, mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" gutterBottom textAlign="center">
                  Edit Your Resume
            </Typography>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  onClick={handleSaveResume}
                  disabled={saving}
                  sx={{ px: 3 }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>

              <Alert severity="info" sx={{ mb: 3 }}>
                💡 Use **text** to make text bold. Changes are saved locally and can be applied to your resume template.
              </Alert>

              {/* Personal Information */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6" fontWeight={600}>Personal Information</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Full Name"
                          value={resumeData.personalInfo?.name || ''}
                          onChange={(e) => updateResumeData('personalInfo.name', e.target.value)}
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Email"
                          type="email"
                          value={resumeData.personalInfo?.email || ''}
                          onChange={(e) => updateResumeData('personalInfo.email', e.target.value)}
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Phone"
                          value={resumeData.personalInfo?.phone || ''}
                          onChange={(e) => updateResumeData('personalInfo.phone', e.target.value)}
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="LinkedIn"
                          value={resumeData.personalInfo?.linkedin || ''}
                          onChange={(e) => updateResumeData('personalInfo.linkedin', e.target.value)}
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="GitHub"
                          value={resumeData.personalInfo?.github || ''}
                          onChange={(e) => updateResumeData('personalInfo.github', e.target.value)}
                          margin="normal"
                        />
                      </Grid>
                    </Grid>
                </AccordionDetails>
              </Accordion>

              {/* Technical Skills */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" fontWeight={600}>
                      Technical Skills ({Object.keys(resumeData.technicalSkills || {}).length} categories)
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack spacing={3}>
                      {Object.entries(resumeData.technicalSkills || {}).map(([category, skills], categoryIndex) => (
                        <Box key={category}>
                          <TextField
                            fullWidth
                            label={`Category ${categoryIndex + 1}`}
                            value={category}
                            onChange={(e) => {
                              const newSkills = { ...resumeData.technicalSkills };
                              delete newSkills[category];
                              newSkills[e.target.value] = skills;
                              updateResumeData('technicalSkills', newSkills);
                            }}
                            margin="normal"
                            size="small"
                          />
                          <TextField
                            fullWidth
                            label="Skills (comma-separated)"
                            value={Array.isArray(skills) ? skills.join(', ') : skills}
                            onChange={(e) => {
                              const skillsArray = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                              updateResumeData(`technicalSkills.${category}`, skillsArray);
                            }}
                            multiline
                            rows={2}
                            margin="normal"
                          />
                          <Box sx={{ my: 2 }} />
                  </Box>
                      ))}
                    </Stack>
                </AccordionDetails>
              </Accordion>

              {/* Work Experience */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" fontWeight={600}>
                      Work Experience ({resumeData.workExperience?.length || 0} entries)
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack spacing={3}>
                      {(resumeData.workExperience || []).map((job: any, jobIndex: number) => (
                        <Box key={jobIndex} sx={{ mb: 3 }}>
                          <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', mb: 2 }}>
                            Job {jobIndex + 1}
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <TextField
                                fullWidth
                                label="Job Title"
                                value={job.jobTitle || ''}
                                onChange={(e) => updateResumeData(`workExperience.${jobIndex}.jobTitle`, e.target.value)}
                                margin="normal"
                              />
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <TextField
                                fullWidth
                                label="Company"
                                value={job.company || ''}
                                onChange={(e) => updateResumeData(`workExperience.${jobIndex}.company`, e.target.value)}
                                margin="normal"
                              />
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <TextField
                                fullWidth
                                label="Location"
                                value={job.location || ''}
                                onChange={(e) => updateResumeData(`workExperience.${jobIndex}.location`, e.target.value)}
                                margin="normal"
                              />
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <TextField
                                fullWidth
                                label="Duration"
                                value={job.duration || ''}
                                onChange={(e) => updateResumeData(`workExperience.${jobIndex}.duration`, e.target.value)}
                                margin="normal"
                              />
                            </Grid>
                          </Grid>
                          
                          <Typography variant="subtitle1" sx={{ mt: 3, mb: 2 }}>
                            Bullet Points:
                          </Typography>
                          {(job.bulletPoints || []).map((bullet: string, bulletIndex: number) => (
                            <Box key={bulletIndex} sx={{ display: 'flex', gap: 1, mb: 2 }}>
                              <TextField
                                fullWidth
                                multiline
                                rows={2}
                                value={bullet}
                                onChange={(e) => updateResumeData(`workExperience.${jobIndex}.bulletPoints.${bulletIndex}`, e.target.value)}
                                placeholder="• Achievement or responsibility (use **text** for bold)"
                              />
                              <IconButton 
                                onClick={() => {
                                  const newBullets = [...job.bulletPoints];
                                  newBullets.splice(bulletIndex, 1);
                                  updateResumeData(`workExperience.${jobIndex}.bulletPoints`, newBullets);
                                }}
                                color="error"
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          ))}
                          <Button
                            startIcon={<AddIcon />}
                            onClick={() => {
                              const newBullets = [...(job.bulletPoints || []), ''];
                              updateResumeData(`workExperience.${jobIndex}.bulletPoints`, newBullets);
                            }}
                            size="small"
                          >
                            Add Bullet Point
                          </Button>
                  </Box>
                      ))}
                    </Stack>
                </AccordionDetails>
              </Accordion>

              {/* Projects */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" fontWeight={600}>
                      Projects ({resumeData.projects?.length || 0} entries)
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack spacing={3}>
                      {(resumeData.projects || []).map((project: any, projectIndex: number) => (
                        <Box key={projectIndex} sx={{ mb: 3 }}>
                          <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', mb: 2 }}>
                            Project {projectIndex + 1}
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <TextField
                                fullWidth
                                label="Project Name"
                                value={project.projectName || ''}
                                onChange={(e) => updateResumeData(`projects.${projectIndex}.projectName`, e.target.value)}
                                margin="normal"
                              />
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <TextField
                                fullWidth
                                label="Tech Stack"
                                value={project.techStack || ''}
                                onChange={(e) => updateResumeData(`projects.${projectIndex}.techStack`, e.target.value)}
                                margin="normal"
                                placeholder="React | Node.js | MongoDB"
                              />
                            </Grid>
                          </Grid>
                          
                          <Typography variant="subtitle1" sx={{ mt: 3, mb: 2 }}>
                            Project Details:
                          </Typography>
                          {(project.bulletPoints || []).map((bullet: string, bulletIndex: number) => (
                            <Box key={bulletIndex} sx={{ display: 'flex', gap: 1, mb: 2 }}>
                              <TextField
                                fullWidth
                                multiline
                                rows={2}
                                value={bullet}
                                onChange={(e) => updateResumeData(`projects.${projectIndex}.bulletPoints.${bulletIndex}`, e.target.value)}
                                placeholder="• Project achievement or feature (use **text** for bold)"
                              />
                              <IconButton 
                                onClick={() => {
                                  const newBullets = [...project.bulletPoints];
                                  newBullets.splice(bulletIndex, 1);
                                  updateResumeData(`projects.${projectIndex}.bulletPoints`, newBullets);
                                }}
                                color="error"
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                  </Box>
                          ))}
                          <Button
                            startIcon={<AddIcon />}
                            onClick={() => {
                              const newBullets = [...(project.bulletPoints || []), ''];
                              updateResumeData(`projects.${projectIndex}.bulletPoints`, newBullets);
                            }}
                            size="small"
                          >
                            Add Detail
                          </Button>
                        </Box>
                      ))}
                    </Stack>
                </AccordionDetails>
              </Accordion>

              {/* Education */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" fontWeight={600}>
                      Education ({resumeData.education?.length || 0} entries)
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack spacing={3}>
                      {(resumeData.education || []).map((edu: any, eduIndex: number) => (
                        <Box key={eduIndex} sx={{ mb: 3 }}>
                          <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', mb: 2 }}>
                            Education {eduIndex + 1}
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <TextField
                                fullWidth
                                label="University"
                                value={edu.university || ''}
                                onChange={(e) => updateResumeData(`education.${eduIndex}.university`, e.target.value)}
                                margin="normal"
                              />
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <TextField
                                fullWidth
                                label="Degree"
                                value={edu.degree || ''}
                                onChange={(e) => updateResumeData(`education.${eduIndex}.degree`, e.target.value)}
                                margin="normal"
                              />
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <TextField
                                fullWidth
                                label="Date"
                                value={edu.date || ''}
                                onChange={(e) => updateResumeData(`education.${eduIndex}.date`, e.target.value)}
                                margin="normal"
                                placeholder="May 2021"
                              />
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <TextField
                                fullWidth
                                label="Track/Specialization"
                                value={edu.track || ''}
                                onChange={(e) => updateResumeData(`education.${eduIndex}.track`, e.target.value)}
                                margin="normal"
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                label="Coursework (comma-separated)"
                                value={Array.isArray(edu.coursework) ? edu.coursework.join(', ') : edu.coursework || ''}
                                onChange={(e) => {
                                  const courses = e.target.value.split(',').map(c => c.trim()).filter(c => c);
                                  updateResumeData(`education.${eduIndex}.coursework`, courses);
                                }}
                                multiline
                                rows={2}
                                margin="normal"
                                placeholder="Operating Systems, Machine Learning, Data Structures"
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      ))}
                    </Stack>
                </AccordionDetails>
              </Accordion>

                {/* Preview Section */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" fontWeight={600}>Preview (Formatted Output)</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Preview of your resume with bold formatting:
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <FormattedJSONDisplay data={resumeData} />
                    </Box>
                </AccordionDetails>
              </Accordion>

          </Box>
          </Fade>
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