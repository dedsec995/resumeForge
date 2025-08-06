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
  Zoom
} from '@mui/material';
import { 
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  NavigateBefore as BackIcon,
  NavigateNext as NextIcon,
  KeyboardArrowUp as UpIcon,
  KeyboardArrowDown as DownIcon
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

  const sections = [
    'Personal Info',
    'Certifications', 
    'Technical Skills',
    'Work Experience',
    'Projects',
    'Education'
  ];

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

  const renderCurrentSection = () => {
    if (!resumeData) return null;

    switch (currentSection) {
      case 0: // Personal Info
        return (
          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Full Name"
                  value={resumeData.personalInfo?.name || ''}
                  onChange={(e) => updateResumeData('personalInfo.name', e.target.value)}
                  sx={{ mb: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Email"
                  type="email"
                  value={resumeData.personalInfo?.email || ''}
                  onChange={(e) => updateResumeData('personalInfo.email', e.target.value)}
                  sx={{ mb: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Phone"
                  value={resumeData.personalInfo?.phone || ''}
                  onChange={(e) => updateResumeData('personalInfo.phone', e.target.value)}
                  sx={{ mb: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="LinkedIn"
                  value={resumeData.personalInfo?.linkedin || ''}
                  onChange={(e) => updateResumeData('personalInfo.linkedin', e.target.value)}
                  sx={{ mb: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="GitHub"
                  value={resumeData.personalInfo?.github || ''}
                  onChange={(e) => updateResumeData('personalInfo.github', e.target.value)}
                  sx={{ mb: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Personal Website"
                  value={resumeData.personalInfo?.website || ''}
                  onChange={(e) => updateResumeData('personalInfo.website', e.target.value)}
                  placeholder="https://yourwebsite.com"
                  sx={{ mb: 1 }}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1: // Certifications
        return (
          <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
              {(resumeData.certifications || []).map((cert: any, certIndex: number) => (
                <Paper key={certIndex} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>Certification {certIndex + 1}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {(resumeData.certifications || []).length > 1 && (
                        <>
                          <IconButton
                            onClick={() => moveItemUp('certifications', certIndex)}
                            disabled={certIndex === 0}
                            size="small"
                            title="Move Up"
                          >
                            <UpIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => moveItemDown('certifications', certIndex, (resumeData.certifications || []).length)}
                            disabled={certIndex === (resumeData.certifications || []).length - 1}
                            size="small"
                            title="Move Down"
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
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Certification Name/Text"
                        value={cert.text || ''}
                        onChange={(e) => updateResumeData(`certifications.${certIndex}.text`, e.target.value)}
                        placeholder="TensorFlow Developer Specialization - DeepLearning.AI"
                        sx={{ mb: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Certification URL (Optional)"
                        value={cert.url || ''}
                        onChange={(e) => updateResumeData(`certifications.${certIndex}.url`, e.target.value)}
                        placeholder="https://www.coursera.org/account/accomplishments/..."
                        helperText="Leave empty if no link is available"
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
                size="small"
              >
                Add Certification
              </Button>
            </Stack>
          </Box>
        );

      case 2: // Technical Skills
        return (
          <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
              {(resumeData.technicalSkillsCategories || []).map((skillCategory: any, categoryIndex: number) => (
                <Paper key={categoryIndex} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>Category {categoryIndex + 1}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {(resumeData.technicalSkillsCategories || []).length > 1 && (
                        <>
                          <IconButton
                            onClick={() => moveItemUp('technicalSkillsCategories', categoryIndex)}
                            disabled={categoryIndex === 0}
                            size="small"
                            title="Move Up"
                          >
                            <UpIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => moveItemDown('technicalSkillsCategories', categoryIndex, (resumeData.technicalSkillsCategories || []).length)}
                            disabled={categoryIndex === (resumeData.technicalSkillsCategories || []).length - 1}
                            size="small"
                            title="Move Down"
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
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Category Name"
                        value={skillCategory.categoryName || ''}
                        onChange={(e) => updateResumeData(`technicalSkillsCategories.${categoryIndex}.categoryName`, e.target.value)}
                        sx={{ mb: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={8}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Skills (comma-separated)"
                        value={skillCategory.skills || ''}
                        onChange={(e) => updateResumeData(`technicalSkillsCategories.${categoryIndex}.skills`, e.target.value)}
                        placeholder="React, Node.js, Python, AWS, MongoDB"
                        sx={{ mb: 1 }}
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
                size="small"
              >
                Add Category
              </Button>
            </Stack>
          </Box>
        );

      case 3: // Work Experience
        return (
          <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
              {(resumeData.workExperience || []).map((job: any, jobIndex: number) => (
                <Paper key={jobIndex} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>Job {jobIndex + 1}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {(resumeData.workExperience || []).length > 1 && (
                        <>
                          <IconButton
                            onClick={() => moveItemUp('workExperience', jobIndex)}
                            disabled={jobIndex === 0}
                            size="small"
                            title="Move Up"
                          >
                            <UpIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => moveItemDown('workExperience', jobIndex, (resumeData.workExperience || []).length)}
                            disabled={jobIndex === (resumeData.workExperience || []).length - 1}
                            size="small"
                            title="Move Down"
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
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Job Title"
                        value={job.jobTitle || ''}
                        onChange={(e) => updateResumeData(`workExperience.${jobIndex}.jobTitle`, e.target.value)}
                        sx={{ mb: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Company"
                        value={job.company || ''}
                        onChange={(e) => updateResumeData(`workExperience.${jobIndex}.company`, e.target.value)}
                        sx={{ mb: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Location"
                        value={job.location || ''}
                        onChange={(e) => updateResumeData(`workExperience.${jobIndex}.location`, e.target.value)}
                        sx={{ mb: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Duration"
                        value={job.duration || ''}
                        onChange={(e) => updateResumeData(`workExperience.${jobIndex}.duration`, e.target.value)}
                        sx={{ mb: 1 }}
                      />
                    </Grid>
                  </Grid>
                  
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 1, mb: 1 }}>
                    Achievements & Responsibilities:
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
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
                    size="small"
                    sx={{ 
                      mb: 1,
                      '& .MuiInputBase-input': {
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        lineHeight: 1.5
                      }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    💡 Tip: Press Enter to automatically add bullet points. Use **text** to make text bold in the final resume.
                  </Typography>
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
                size="small"
              >
                Add Work Experience
              </Button>
            </Stack>
          </Box>
        );

      case 4: // Projects
        return (
          <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
              {(resumeData.projects || []).map((project: any, projectIndex: number) => (
                <Paper key={projectIndex} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>Project {projectIndex + 1}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {(resumeData.projects || []).length > 1 && (
                        <>
                          <IconButton
                            onClick={() => moveItemUp('projects', projectIndex)}
                            disabled={projectIndex === 0}
                            size="small"
                            title="Move Up"
                          >
                            <UpIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => moveItemDown('projects', projectIndex, (resumeData.projects || []).length)}
                            disabled={projectIndex === (resumeData.projects || []).length - 1}
                            size="small"
                            title="Move Down"
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
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Project Name"
                        value={project.projectName || ''}
                        onChange={(e) => updateResumeData(`projects.${projectIndex}.projectName`, e.target.value)}
                        sx={{ mb: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Tech Stack (comma-separated)"
                        value={project.techStack || ''}
                        onChange={(e) => updateResumeData(`projects.${projectIndex}.techStack`, e.target.value)}
                        placeholder="React, Node.js, MongoDB"
                        helperText="Comma-separated (will be converted to | format in PDF)"
                        sx={{ mb: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={8}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Project Link (Optional)"
                        value={project.projectLink || ''}
                        onChange={(e) => updateResumeData(`projects.${projectIndex}.projectLink`, e.target.value)}
                        placeholder="https://github.com/username/project"
                        helperText="Leave empty to use a generic link placeholder"
                        sx={{ mb: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Link Text (Optional)"
                        value={project.linkText || ''}
                        onChange={(e) => updateResumeData(`projects.${projectIndex}.linkText`, e.target.value)}
                        placeholder="GitHub, Live Demo, etc."
                        helperText="Default: 'Link'"
                        sx={{ mb: 1 }}
                      />
                    </Grid>
                  </Grid>
                  
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 1, mb: 1 }}>
                    Project Details:
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
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
                    size="small"
                    sx={{ 
                      mb: 1,
                      '& .MuiInputBase-input': {
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        lineHeight: 1.5
                      }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    💡 Tip: Press Enter to automatically add bullet points. Use **text** to make text bold in the final resume.
                  </Typography>
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
                size="small"
              >
                Add Project
              </Button>
            </Stack>
          </Box>
        );

      case 5: // Education
        return (
          <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
              {(resumeData.education || []).map((edu: any, eduIndex: number) => (
                <Paper key={eduIndex} sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>Education {eduIndex + 1}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {(resumeData.education || []).length > 1 && (
                        <>
                          <IconButton
                            onClick={() => moveItemUp('education', eduIndex)}
                            disabled={eduIndex === 0}
                            size="small"
                            title="Move Up"
                          >
                            <UpIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => moveItemDown('education', eduIndex, (resumeData.education || []).length)}
                            disabled={eduIndex === (resumeData.education || []).length - 1}
                            size="small"
                            title="Move Down"
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
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="University"
                        value={edu.university || ''}
                        onChange={(e) => updateResumeData(`education.${eduIndex}.university`, e.target.value)}
                        sx={{ mb: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Degree"
                        value={edu.degree || ''}
                        onChange={(e) => updateResumeData(`education.${eduIndex}.degree`, e.target.value)}
                        sx={{ mb: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Date"
                        value={edu.date || ''}
                        onChange={(e) => updateResumeData(`education.${eduIndex}.date`, e.target.value)}
                        placeholder="May 2021"
                        sx={{ mb: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Track/Specialization"
                        value={edu.track || ''}
                        onChange={(e) => updateResumeData(`education.${eduIndex}.track`, e.target.value)}
                        sx={{ mb: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Coursework (comma-separated)"
                        value={edu.coursework || ''}
                        onChange={(e) => updateResumeData(`education.${eduIndex}.coursework`, e.target.value)}
                        multiline
                        rows={2}
                        placeholder="Operating Systems, Machine Learning, Data Structures"
                        sx={{ mb: 1 }}
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
                size="small"
              >
                Add Education
              </Button>
            </Stack>
          </Box>
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
    <Container maxWidth="lg" sx={{ py: 2 }}>
      {loading ? (
        // Loading Screen
        <Box textAlign="center" sx={{ py: 8 }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h5" gutterBottom>
            Loading Resume Data...
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please wait while we fetch your resume information.
          </Typography>
        </Box>
      ) : !resumeData ? (
        // Error State
        <Box textAlign="center" sx={{ py: 8 }}>
          <Typography variant="h5" gutterBottom color="error">
            Failed to Load Resume
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            There was an issue loading your resume data. Please make sure the backend is running.
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
            sx={{ px: 4, py: 1.5 }}
          >
            Retry
          </Button>
        </Box>
      ) : (
        // Resume Editor Dashboard
        <Box>
          {/* Section Tabs */}
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={currentSection}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ 
                '& .MuiTab-root': { 
                  minWidth: 0,
                  opacity: 0.6,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  '&.Mui-selected': {
                    opacity: 1,
                    fontWeight: 600
                  }
                }
              }}
            >
              {sections.map((section, index) => (
                <Tab key={index} label={section} />
              ))}
            </Tabs>
          </Paper>

          {/* Current Section Content */}
          <Paper sx={{ mb: 3, minHeight: 400 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h5" fontWeight={600}>
                {sections[currentSection]}
              </Typography>
            </Box>
            {renderCurrentSection()}
          </Paper>

          {/* Navigation */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<BackIcon />}
              onClick={handlePrevSection}
              disabled={currentSection === 0}
            >
              Previous
            </Button>
            
            <Typography variant="body2" color="text.secondary">
              {currentSection + 1} of {sections.length}
            </Typography>
            
            <Button
              variant="outlined"
              endIcon={<NextIcon />}
              onClick={handleNextSection}
              disabled={currentSection === sections.length - 1}
            >
              Next
            </Button>
          </Box>

          {/* Floating Save Button - Only show when there are unsaved changes */}
          <Zoom in={hasUnsavedChanges}>
            <Fab
              color="primary"
              size="large"
              onClick={handleSaveResume}
              disabled={saving}
              sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: 1000,
                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
                '&:hover': {
                  boxShadow: '0 12px 40px rgba(99, 102, 241, 0.4)',
                  transform: 'translateY(-2px)'
                },
                transition: 'all 0.3s ease-in-out'
              }}
            >
              {saving ? <CircularProgress size={28} color="inherit" /> : <SaveIcon />}
            </Fab>
          </Zoom>
        </Box>
      )}
    </Container>
  );
};

export default ProfileSection;