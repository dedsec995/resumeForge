import { 
  Box, 
  Container, 
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Fade,
  Grow,
  Slide,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import { 
  Add as AddIcon,
  Delete as DeleteIcon,
  AccessTime as TimeIcon,
  Description as DescriptionIcon,
  Code as CodeIcon,
  DataObject as DataObjectIcon,
  WorkOutline as ResumeIcon,
  ArrowForward as ArrowIcon,
  Psychology as AIIcon,
  Star as StarIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { toast } from 'react-hot-toast';

interface ResumeSession {
  sessionId: string;
  timestamp: string;
  status: string;
  preview: string;
  companyName?: string;
  position?: string;
}

interface SessionData {
  sessionId: string;
  jobDescription: string;
  timestamp: string;
  status: string;
  metadata: {
    created: string;
    lastUpdated: string;
    wordCount: number;
    characterCount: number;
  };
  workflowResult?: {
    score: number;
    company_name: string;
    position: string;
    location: string;
    feedback: string;
    downsides: string;
    iteration_count: number;
  };
  tailoredResume?: Record<string, unknown>;
  score?: number;
  companyName?: string;
  position?: string;
  completedAt?: string;
  latexFilePath?: string;
  pdfFilePath?: string;
  latexContent?: string; // Added for raw LaTeX content
}

const CreateResumeSection = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [sessions, setSessions] = useState<ResumeSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [downloadPDFLoading, setDownloadPDFLoading] = useState(false);
  const [downloadLatexLoading, setDownloadLatexLoading] = useState(false);
  const [regenerateLatexLoading, setRegenerateLatexLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showNewResumeForm, setShowNewResumeForm] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [globalCounter, setGlobalCounter] = useState(0);
  const [individualCounter, setIndividualCounter] = useState(0);

  // Load existing sessions on component mount
  useEffect(() => {
    loadSessions();
    loadGlobalCounter();
    loadIndividualCounter();
  }, []);

  const loadGlobalCounter = async () => {
    try {
      const response = await apiClient.get('/globalCounter');
      if (response.data.success) {
        setGlobalCounter(response.data.totalJobDescriptions);
      }
    } catch (error) {
      console.error('Error loading global counter:', error);
    }
  };

  const loadIndividualCounter = async () => {
    try {
      const response = await apiClient.get('/individualCounter');
      if (response.data.success) {
        setIndividualCounter(response.data.individualJobDescriptions);
      }
    } catch (error) {
      console.error('Error loading individual counter:', error);
    }
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/getResumeSessions');
      if (response.data.success) {
        const sessionsData = response.data.sessions;
        setSessions(sessionsData);
        
        // Check if this is a first-time user
        if (sessionsData.length === 0) {
          setIsFirstTimeUser(true);
          setShowNewResumeForm(true);
        } else {
          setIsFirstTimeUser(false);
          setShowNewResumeForm(false);
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load resume sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!jobDescription.trim()) {
      toast.error('Please enter a job description');
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiClient.post('/createResumeSession', {
        jobDescription: jobDescription.trim()
      });

      if (response.data.success) {
        const sessionId = response.data.sessionId;
        toast.success('Resume session created! Starting automatic processing...');
        setJobDescription('');
        
        // Automatically start the workflow
        try {
          setWorkflowLoading(true);
          
          // Start the workflow
          const workflowResponse = await apiClient.post('/fullWorkflow', {
            sessionId: sessionId
          });

          if (workflowResponse.data.success) {
            toast.success('Processing started! Creating your tailored resume...');
            
            // Start polling for status updates
            const pollInterval = setInterval(async () => {
              try {
                const statusResponse = await apiClient.get(`/sessionStatus/${sessionId}`);
                const status = statusResponse.data.status;
                
                console.log('Workflow status:', status, statusResponse.data);
                
                if (status === 'completed') {
                  clearInterval(pollInterval);
                  setWorkflowLoading(false);
                  toast.success(`Resume processing completed! Final score: ${statusResponse.data.currentScore}/100`);
                  
                          // Refresh the sessions list to show updated status
        loadSessions();
        loadGlobalCounter(); // Refresh the global counter
        loadIndividualCounter(); // Refresh the individual counter
        
        // Hide the form after successful submission for returning users
        if (!isFirstTimeUser) {
          setShowNewResumeForm(false);
        }
        
        // If the modal is open for this session, refresh the session data
        if (selectedSession && selectedSession.sessionId === sessionId) {
          try {
            const sessionResponse = await apiClient.get(`/getResumeSession/${sessionId}`);
            if (sessionResponse.data.success && sessionResponse.data.sessionData) {
              setSelectedSession(sessionResponse.data.sessionData);
            }
          } catch (refreshError) {
            console.error('Error refreshing session data:', refreshError);
          }
        }
                  
                } else if (status === 'failed') {
                  clearInterval(pollInterval);
                  setWorkflowLoading(false);
                  toast.error(`Processing failed: ${statusResponse.data.error || 'Unknown error'}`);
                  
                  // Refresh the sessions list
                  loadSessions();
                  loadGlobalCounter(); // Refresh the global counter
                  loadIndividualCounter(); // Refresh the individual counter
                  
                } else if (status === 'processing') {
                  // Still processing, continue polling
                  console.log('Still processing...');
                }
                
              } catch (pollError) {
                console.error('Error polling status:', pollError);
                clearInterval(pollInterval);
                setWorkflowLoading(false);
                toast.error('Error checking processing status');
              }
            }, 3000); // Poll every 3 seconds
            
            // Set a timeout to stop polling after 10 minutes
            setTimeout(() => {
              clearInterval(pollInterval);
              setWorkflowLoading(false);
              toast.error('Processing timeout. Please check the session manually.');
              loadSessions();
              loadGlobalCounter(); // Refresh the global counter
              loadIndividualCounter(); // Refresh the individual counter
            }, 600000); // 10 minutes
            
          } else {
            setWorkflowLoading(false);
            toast.error('Failed to start processing');
          }
        } catch (workflowError) {
          console.error('Error starting workflow:', workflowError);
          setWorkflowLoading(false);
          toast.error('Failed to start automatic processing. You can start it manually.');
        }
        
        loadSessions(); // Refresh the sessions list and update form visibility
        loadGlobalCounter(); // Refresh the global counter
        loadIndividualCounter(); // Refresh the individual counter
      } else {
        toast.error('Failed to create resume session');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create resume session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewSession = async (sessionId: string) => {
    try {
      setDialogLoading(true);
      setDialogOpen(true);
      const response = await apiClient.get(`/getResumeSession/${sessionId}`);
      if (response.data.success && response.data.sessionData) {
        setSelectedSession(response.data.sessionData);
        
        // If the session is still processing, start auto-refresh
        if (response.data.sessionData.status === 'processing') {
          const refreshInterval = setInterval(async () => {
            try {
              const refreshResponse = await apiClient.get(`/getResumeSession/${sessionId}`);
              if (refreshResponse.data.success && refreshResponse.data.sessionData) {
                const newStatus = refreshResponse.data.sessionData.status;
                setSelectedSession(refreshResponse.data.sessionData);
                
                // Stop refreshing if completed or failed
                if (newStatus === 'completed' || newStatus === 'failed') {
                  clearInterval(refreshInterval);
                  loadSessions(); // Refresh the sessions list
                }
              }
            } catch (refreshError) {
              console.error('Error auto-refreshing session:', refreshError);
            }
          }, 3000); // Refresh every 3 seconds
          
          // Clean up interval when modal closes
          const cleanup = () => {
            clearInterval(refreshInterval);
          };
          
          // Store cleanup function to call when modal closes
          (window as { sessionRefreshCleanup?: () => void }).sessionRefreshCleanup = cleanup;
        }
      } else {
        toast.error('Failed to load session details');
        setDialogOpen(false);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      toast.error('Failed to load session details');
      setDialogOpen(false);
    } finally {
      setDialogLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this resume session?')) {
      return;
    }

    try {
              const response = await apiClient.delete(`/deleteResumeSession/${sessionId}`);
      if (response.data.success) {
        toast.success('Session deleted successfully');
        loadSessions(); // Refresh the sessions list
        // Note: We don't decrement the global counter when deleting sessions
        // as the global counter represents total job descriptions processed, not current sessions
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  const handleStartWorkflow = async () => {
    if (!selectedSession) {
      toast.error('No session selected');
      return;
    }

    try {
      setWorkflowLoading(true);
      
      // Start the workflow
      const response = await apiClient.post('/fullWorkflow', {
        sessionId: selectedSession.sessionId
      });

      if (response.data.success) {
        toast.success('Workflow started! Processing your resume...');
        
        // Start polling for status updates
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await apiClient.get(`/sessionStatus/${selectedSession.sessionId}`);
            const status = statusResponse.data.status;
            
            console.log('Workflow status:', status, statusResponse.data);
            
            if (status === 'completed') {
              clearInterval(pollInterval);
              setWorkflowLoading(false);
              toast.success(`Workflow completed! Final score: ${statusResponse.data.currentScore}/100`);
              
              // Refresh the session data to show updated results
              await handleViewSession(selectedSession.sessionId);
              
            } else if (status === 'failed') {
              clearInterval(pollInterval);
              setWorkflowLoading(false);
              toast.error(`Workflow failed: ${statusResponse.data.error || 'Unknown error'}`);
              
              // Refresh the session data to show error status
              await handleViewSession(selectedSession.sessionId);
              
            } else if (status === 'processing') {
              // Still processing, keep polling
              console.log('Workflow still processing...');
            }
            
          } catch (pollError) {
            console.error('Error polling status:', pollError);
            // Don't stop polling on poll errors, might be temporary
          }
        }, 3000); // Poll every 3 seconds
        
        // Safety timeout to stop polling after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          if (workflowLoading) {
            setWorkflowLoading(false);
            toast('Workflow is taking longer than expected. Please check the session later.', { 
              icon: '⚠️',
              duration: 5000 
            });
          }
        }, 300000); // 5 minutes
        
      } else {
        setWorkflowLoading(false);
        toast.error('Failed to start workflow');
      }
    } catch (error) {
      console.error('Error starting workflow:', error);
      setWorkflowLoading(false);
      toast.error('Failed to start resume workflow');
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedSession) {
      toast.error('No session selected');
      return;
    }

    try {
      setDownloadPDFLoading(true);
      
      // First, ensure LaTeX file exists
      let latexResponse;
      try {
        latexResponse = await apiClient.post(`/generateLatex/${selectedSession.sessionId}`);
        if (latexResponse.data.success) {
          toast.success('LaTeX file generated successfully!');
          await handleViewSession(selectedSession.sessionId);
        } else {
          throw new Error('Failed to generate LaTeX file');
        }
      } catch (latexError) {
        console.error('Error generating LaTeX file:', latexError);
        toast.error('Failed to generate LaTeX file');
        return;
      }

      // Then try to download the PDF
      try {
        const pdfResponse = await apiClient.get(`/downloadPDF/${selectedSession.sessionId}`, {
          responseType: 'blob'
        });

        // Generate filename based on person name, company and position
        const generateFilename = () => {
          const personName = (selectedSession.tailoredResume as { personalInfo?: { name?: string } })?.personalInfo?.name || '';
          const companyName = selectedSession.companyName || '';
          const position = selectedSession.position || '';
          
          if (personName || companyName || position) {
            const cleanPerson = personName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
            const cleanCompany = companyName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
            const cleanPosition = position.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
            const parts = [cleanPerson, cleanCompany, cleanPosition].filter(part => part);
            return `${parts.join('_')}.pdf`;
          }
          return `resume_${selectedSession.sessionId}.pdf`;
        };

        const url = window.URL.createObjectURL(new Blob([pdfResponse.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', generateFilename());
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        toast.success('PDF downloaded successfully!');
        await handleViewSession(selectedSession.sessionId);
      } catch (pdfError) {
        console.error('Error downloading PDF:', pdfError);
        toast.error('Failed to download PDF. Please try again.');
      }
    } catch (error) {
      console.error('Error in PDF download process:', error);
      toast.error('Failed to process PDF download');
    } finally {
      setDownloadPDFLoading(false);
    }
  };



  const handleDownloadLatexFile = async () => {
    if (!selectedSession?.latexFilePath) {
      toast.error('No LaTeX file available for download');
      return;
    }

    try {
      setDownloadLatexLoading(true);
              const response = await apiClient.get(`/downloadLatex/${selectedSession.sessionId}`, {
        responseType: 'blob'
      });

      // Generate filename based on person name, company and position
      const generateFilename = () => {
        const personName = (selectedSession.tailoredResume as { personalInfo?: { name?: string } })?.personalInfo?.name || '';
        const companyName = selectedSession.companyName || '';
        const position = selectedSession.position || '';
        
        if (personName || companyName || position) {
          const cleanPerson = personName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
          const cleanCompany = companyName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
          const cleanPosition = position.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
          const parts = [cleanPerson, cleanCompany, cleanPosition].filter(part => part);
          return `${parts.join('_')}.tex`;
        }
        return `resume_${selectedSession.sessionId}.tex`;
      };

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', generateFilename());
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('LaTeX file downloaded successfully!');
    } catch (error) {
      console.error('Error downloading LaTeX:', error);
      toast.error('Failed to download LaTeX file');
    } finally {
      setDownloadLatexLoading(false);
    }
  };

  const handleRegenerateLatex = async () => {
    if (!selectedSession?.sessionId) return;
    
    setRegenerateLatexLoading(true);
    try {
      // Call the generateLaTeX endpoint to regenerate LaTeX using latest data
      const response = await apiClient.post(`/generateLatex/${selectedSession.sessionId}`);
      
      if (response.data.success) {
        // Refresh the session data to get the updated LaTeX content
        const sessionResponse = await apiClient.get(`/getResumeSession/${selectedSession.sessionId}`);
        if (sessionResponse.data.success && sessionResponse.data.sessionData) {
          setSelectedSession(sessionResponse.data.sessionData);
        }
        
        toast.success('LaTeX regenerated successfully!');
      } else {
        toast.error('Failed to regenerate LaTeX');
      }
    } catch (error) {
      console.error('Error regenerating LaTeX:', error);
      toast.error('Failed to regenerate LaTeX');
    } finally {
      setRegenerateLatexLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleToggleNewResumeForm = () => {
    setShowNewResumeForm(!showNewResumeForm);
  };

  const handleCopyToClipboard = async (content: string, type: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(`${type} copied to clipboard!`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
      py: 4
    }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Fade in timeout={800}>
          <Box sx={{ mb: 6 }}>
            <Grow in timeout={1000}>
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
                    <ResumeIcon sx={{ 
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
                      Create Resume
                    </Typography>
                  </Box>

                  <Slide direction="up" in timeout={1200}>
                    <Box sx={{ pl: { xs: 0, md: 7 } }}> {/* Align with the title text (icon width + margin) */}
                      <Typography
                        variant="h5"
                        component="h2"
                        sx={{
                          color: '#E2E8F0',
                          lineHeight: 1.4,
                          fontSize: { xs: '1.1rem', md: '1.3rem' },
                          opacity: 0.9,
                          fontWeight: 400,
                          mb: 1
                        }}
                      >
                        Paste a job description to automatically create and process your tailored resume
                      </Typography>

                      {/* Counter Badges */}
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {/* Global Counter Badge */}
                        <Box sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 1,
                          px: 2,
                          py: 0.5,
                          borderRadius: 2,
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          backdropFilter: 'blur(10px)'
                        }}>
                          <Box sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#22C55E',
                            animation: 'pulse 2s infinite'
                          }} />
                          <Typography
                            variant="body2"
                            sx={{
                              color: '#22C55E',
                              fontWeight: 600,
                              fontSize: '0.875rem'
                            }}
                          >
                            {globalCounter.toLocaleString()} Global
                          </Typography>
                        </Box>

                        {/* Individual Counter Badge */}
                        <Box sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 1,
                          px: 2,
                          py: 0.5,
                          borderRadius: 2,
                          background: 'rgba(99, 102, 241, 0.1)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          backdropFilter: 'blur(10px)'
                        }}>
                          <Box sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#6366F1',
                            animation: 'pulse 2s infinite'
                          }} />
                          <Typography
                            variant="body2"
                            sx={{
                              color: '#6366F1',
                              fontWeight: 600,
                              fontSize: '0.875rem'
                            }}
                          >
                            {individualCounter.toLocaleString()} Yours
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Slide>
                </Box>

                {/* Right side - Create New Resume button (only when form is hidden and user has sessions) */}
                {!showNewResumeForm && !isFirstTimeUser && (
                  <Fade in timeout={600}>
                    <Box sx={{ flexShrink: 0 }}>
                      <Button
                        variant="outlined"
                        size="large"
                        onClick={handleToggleNewResumeForm}
                        startIcon={<AddIcon />}
                        sx={{ 
                          px: 4,
                          py: 2,
                          fontSize: '1rem',
                          fontWeight: 600,
                          border: '2px solid rgba(99, 102, 241, 0.4)',
                          color: '#6366F1',
                          borderRadius: 3,
                          background: 'rgba(99, 102, 241, 0.05)',
                          backdropFilter: 'blur(10px)',
                          whiteSpace: 'nowrap',
                          '&:hover': {
                            borderColor: '#6366F1',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)'
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
                            background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.2), transparent)',
                            transition: 'left 0.5s',
                          },
                          '&:hover::before': {
                            left: '100%',
                          }
                        }}
                      >
                        Create New Resume
                      </Button>
                    </Box>
                  </Fade>
                )}
              </Box>
            </Grow>
          </Box>
        </Fade>

        {/* Global Processing Indicator */}
        {workflowLoading && (
          <Fade in timeout={800}>
            <Alert 
              severity="info" 
              sx={{ 
                mb: 4,
                background: 'rgba(30, 41, 59, 0.8)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  color: '#6366F1'
                }
              }}
              icon={<CircularProgress size={20} sx={{ color: '#6366F1' }} />}
            >
              <Typography variant="body2" sx={{ color: '#F8FAFC' }}>
                <strong>Processing Resume...</strong> We're analyzing the job description, tailoring your resume, and generating LaTeX files. This may take a few minutes.
              </Typography>
            </Alert>
          </Fade>
        )}

        {/* Interactive New Resume Section */}
        <Slide direction="up" in timeout={1400}>
          <Box sx={{ mb: 4 }}>
            {/* First Time User Welcome */}
            {isFirstTimeUser && (
              <Fade in timeout={800}>
                <Paper 
                  elevation={8}
                  sx={{ 
                    p: 4, 
                    mb: 4,
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                    border: '2px solid rgba(99, 102, 241, 0.3)',
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
                      height: '4px',
                      background: 'linear-gradient(90deg, #6366F1, #8B5CF6, #EC4899, #6366F1)'
                    }
                  }}
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <StarIcon sx={{ 
                      fontSize: 60, 
                      color: '#6366F1', 
                      mb: 2,
                      filter: 'drop-shadow(0 0 12px rgba(99, 102, 241, 0.5))',
                      animation: 'pulse 2s infinite'
                    }} />
                    <Typography variant="h4" sx={{ 
                      fontWeight: 700, 
                      color: '#F8FAFC',
                      mb: 2,
                      background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      Welcome to Resume Forge! 🎉
                    </Typography>
                    <Typography variant="h6" sx={{ 
                      color: '#E2E8F0',
                      mb: 3,
                      opacity: 0.9,
                      lineHeight: 1.5
                    }}>
                      Ready to create your first AI-powered tailored resume? 
                      <br />
                      Just paste a job description below and watch the magic happen!
                    </Typography>
                  </Box>
                </Paper>
              </Fade>
            )}

            {/* New Resume Form - Hidden by default if user has sessions */}
            {showNewResumeForm && (
              <Fade in timeout={600}>
                <Paper 
                  elevation={8}
                  sx={{ 
                    p: 4, 
                    mb: 4,
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
                      background: 'linear-gradient(90deg, #6366F1, #8B5CF6, #EC4899)'
                    }
                  }}
                >
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    mb: 3,
                    pb: 2,
                    borderBottom: '1px solid rgba(99, 102, 241, 0.1)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AIIcon sx={{ color: '#6366F1', fontSize: 24, mr: 1 }} />
                      <Typography variant="h5" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                        New Resume (Auto-Process)
                      </Typography>
                    </Box>
                    {!isFirstTimeUser && (
                      <IconButton
                        onClick={handleToggleNewResumeForm}
                        sx={{ 
                          color: '#94A3B8',
                          '&:hover': {
                            color: '#6366F1',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            transform: 'scale(1.1)'
                          },
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>

                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Job Description"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here..."
                    sx={{ 
                      mb: 3,
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
                    helperText={`${jobDescription.length} characters, ${jobDescription.split(' ').filter(word => word.length > 0).length} words`}
                  />

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleSubmit}
                      disabled={submitting || !jobDescription.trim()}
                      startIcon={submitting ? <CircularProgress size={20} /> : <AddIcon />}
                      endIcon={!submitting ? <ArrowIcon /> : null}
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
                      {submitting ? 'Creating Session...' : 'Create & Process Resume'}
                    </Button>
                  </Box>
                </Paper>
              </Fade>
            )}

            
          </Box>
        </Slide>

        {/* Sessions List */}
        <Slide direction="up" in timeout={1600}>
          <Box>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mb: 4,
              pb: 2,
              borderBottom: '1px solid rgba(99, 102, 241, 0.1)'
            }}>
              <DescriptionIcon sx={{ color: '#6366F1', fontSize: 24, mr: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                Resume Sessions ({sessions.length})
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress 
                  size={60} 
                  sx={{ 
                    color: '#6366F1',
                    filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.4))'
                  }} 
                />
              </Box>
            ) : sessions.length === 0 ? (
              <Paper 
                elevation={4}
                sx={{ 
                  p: 4,
                  textAlign: 'center',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: 3
                }}
              >
                <StarIcon sx={{ fontSize: 60, color: '#6366F1', mb: 2, opacity: 0.7 }} />
                <Typography variant="h6" sx={{ color: '#F8FAFC', mb: 1 }}>
                  {isFirstTimeUser ? 'No resume sessions yet' : 'All sessions cleared'}
                </Typography>
                <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                  {isFirstTimeUser ? 'Create your first session above to get started!' : 'Click the button above to create a new resume!'}
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {sessions.map((session, index) => (
                  <Grid item xs={12} md={6} lg={4} key={session.sessionId}>
                    <Fade in={true} timeout={300 + index * 100}>
                      <Card 
                        elevation={4}
                        sx={{ 
                          height: '100%', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          cursor: 'pointer',
                          background: 'rgba(30, 41, 59, 0.8)',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          backdropFilter: 'blur(20px)',
                          borderRadius: 3,
                          transition: 'all 0.3s ease-in-out',
                          '&:hover': {
                            borderColor: 'rgba(99, 102, 241, 0.4)',
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)'
                          }
                        }}
                        onClick={() => handleViewSession(session.sessionId)}
                      >
                        <CardContent sx={{ flexGrow: 1, p: 3, pb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                              <DescriptionIcon sx={{ mr: 1, color: '#6366F1', flexShrink: 0 }} />
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography 
                                  variant="h6" 
                                  component="div" 
                                  sx={{ 
                                    fontWeight: 600, 
                                    mb: 0.5,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: '#F8FAFC'
                                  }}
                                >
                                  {session.status === 'completed' && session.companyName ? session.companyName : 'Resume Session'}
                                </Typography>
                                {session.status === 'completed' && session.position ? (
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      color: '#94A3B8', 
                                      fontSize: '0.85rem',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {session.position}
                                  </Typography>
                                ) : (
                                  <Typography variant="body2" sx={{ color: '#94A3B8', fontSize: '0.85rem' }}>
                                    Click to edit
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                            <Box sx={{ flexShrink: 0 }}>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSession(session.sessionId);
                                }}
                                sx={{ 
                                  p: 0.5,
                                  color: '#EF4444',
                                  '&:hover': {
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    transform: 'scale(1.1)'
                                  },
                                  transition: 'all 0.2s ease-in-out'
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                          
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                mb: 0, 
                                lineHeight: 1.4,
                                p: 1.5,
                                borderRadius: 2,
                                backgroundColor: 'rgba(15, 23, 42, 0.3)',
                                color: '#E2E8F0',
                                fontSize: '0.85rem'
                              }}
                            >
                              {session.preview}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 0.5 }}>
                            <Chip 
                              label={session.status === 'processing' ? 'Processing...' : session.status} 
                              size="small" 
                              color={session.status === 'completed' ? 'success' : 
                                     session.status === 'processing' ? 'primary' : 
                                     session.status === 'failed' ? 'error' : 'default'}
                              icon={session.status === 'processing' ? <CircularProgress size={16} /> : undefined}
                              sx={{ 
                                textTransform: 'capitalize',
                                backgroundColor: session.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' :
                                               session.status === 'processing' ? 'rgba(99, 102, 241, 0.1)' :
                                               session.status === 'failed' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                                color: session.status === 'completed' ? '#22C55E' :
                                       session.status === 'processing' ? '#6366F1' :
                                       session.status === 'failed' ? '#EF4444' : '#94A3B8',
                                border: '1px solid',
                                borderColor: session.status === 'completed' ? 'rgba(34, 197, 94, 0.3)' :
                                            session.status === 'processing' ? 'rgba(99, 102, 241, 0.3)' :
                                            session.status === 'failed' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(148, 163, 184, 0.3)'
                              }}
                            />
                            <Typography variant="caption" sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              fontSize: '0.75rem',
                              color: '#64748B'
                            }}>
                              <TimeIcon sx={{ mr: 0.5, fontSize: 12 }} />
                              {formatDate(session.timestamp)}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Slide>

        {/* Session Details Dialog */}
        <Dialog 
          open={dialogOpen} 
          onClose={() => {
            setDialogOpen(false);
            setSelectedSession(null);
            // Clean up any refresh intervals
            const windowWithCleanup = window as { sessionRefreshCleanup?: () => void };
            if (windowWithCleanup.sessionRefreshCleanup) {
              windowWithCleanup.sessionRefreshCleanup();
              windowWithCleanup.sessionRefreshCleanup = undefined;
            }
          }}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              maxHeight: '90vh',
              minHeight: '600px',
              background: 'rgba(30, 41, 59, 0.95)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              backdropFilter: 'blur(20px)',
              borderRadius: 3
            }
          }}
          TransitionProps={{
            timeout: 300
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            color: '#F8FAFC',
            borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
            pb: 2
          }}>
            Resume Session Details
            {selectedSession && (
              <Chip 
                label={selectedSession.status === 'completed' && selectedSession.workflowResult 
                  ? `${selectedSession.workflowResult.score}/100` 
                  : selectedSession.status} 
                size="small" 
                color={selectedSession.status === 'completed' ? 'success' : 
                       selectedSession.status === 'processing' ? 'primary' : 
                       selectedSession.status === 'failed' ? 'error' : 'default'}
                sx={{ 
                  textTransform: 'capitalize',
                  backgroundColor: selectedSession.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' :
                                   selectedSession.status === 'processing' ? 'rgba(99, 102, 241, 0.1)' :
                                   selectedSession.status === 'failed' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                  color: selectedSession.status === 'completed' ? '#22C55E' :
                         selectedSession.status === 'processing' ? '#6366F1' :
                         selectedSession.status === 'failed' ? '#EF4444' : '#94A3B8',
                  border: '1px solid',
                  borderColor: selectedSession.status === 'completed' ? 'rgba(34, 197, 94, 0.3)' :
                              selectedSession.status === 'processing' ? 'rgba(99, 102, 241, 0.3)' :
                              selectedSession.status === 'failed' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(148, 163, 184, 0.3)'
                }}
              />
            )}
          </DialogTitle>
          <DialogContent sx={{ height: 'calc(90vh - 200px)', p: 3, overflow: 'hidden' }}>
            {dialogLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                <CircularProgress 
                  size={60} 
                  sx={{ 
                    color: '#6366F1',
                    filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.4))'
                  }} 
                />
              </Box>
            ) : selectedSession ? (
              <Box>
                {/* Session Info */}
                <Paper 
                  elevation={4}
                  sx={{ 
                    p: 3, 
                    mb: 3, 
                    background: 'rgba(15, 23, 42, 0.4)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: 2,
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Box>
                        {selectedSession.status === 'completed' && selectedSession.workflowResult ? (
                          <>
                            <Typography variant="h5" sx={{ 
                              fontWeight: 700, 
                              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                              backgroundClip: 'text',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              mb: 0.5
                            }}>
                              {selectedSession.workflowResult.company_name}
                            </Typography>
                            <Typography variant="h6" sx={{ 
                              fontWeight: 500, 
                              color: '#94A3B8',
                              opacity: 0.9
                            }}>
                              {selectedSession.workflowResult.position}
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="h6" sx={{ 
                            fontWeight: 600, 
                            color: '#6366F1',
                            opacity: 0.8
                          }}>
                            Session Created
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" sx={{ 
                          fontFamily: 'monospace', 
                          color: '#64748B',
                          opacity: 0.7,
                          fontSize: '0.75rem'
                        }}>
                          {selectedSession.sessionId}
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          color: '#94A3B8',
                          opacity: 0.8,
                          mt: 0.5
                        }}>
                          {formatDate(selectedSession.timestamp)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'rgba(99, 102, 241, 0.2)', mb: 2 }}>
                  <Tabs 
                    value={activeTab} 
                    onChange={handleTabChange}
                    sx={{
                      minHeight: '48px',
                      '& .MuiTab-root': {
                        color: '#94A3B8',
                        minHeight: '48px',
                        padding: '8px 16px',
                        fontSize: '0.875rem',
                        textTransform: 'none',
                        fontWeight: 500,
                        transition: 'all 0.3s ease-in-out',
                        '&.Mui-selected': {
                          color: '#6366F1',
                          fontWeight: 600
                        },
                        '&:hover': {
                          color: '#E2E8F0',
                          backgroundColor: 'rgba(99, 102, 241, 0.1)'
                        }
                      },
                      '& .MuiTabs-indicator': {
                        backgroundColor: '#6366F1',
                        height: '3px',
                        borderRadius: '2px 2px 0 0'
                      }
                    }}
                  >
                    <Tab 
                      icon={<DescriptionIcon sx={{ fontSize: '1.1rem', mr: 0.5 }} />} 
                      label="Job Description" 
                      iconPosition="start"
                    />
                    {selectedSession.tailoredResume && (
                      <Tab 
                        icon={<DataObjectIcon sx={{ fontSize: '1.1rem', mr: 0.5 }} />} 
                        label="JSON Output" 
                        iconPosition="start"
                      />
                    )}
                    {selectedSession.latexFilePath && (
                      <Tab 
                        icon={<CodeIcon sx={{ fontSize: '1.1rem', mr: 0.5 }} />} 
                        label="Generated LaTeX" 
                        iconPosition="start"
                      />
                    )}
                    {selectedSession.status === 'completed' && selectedSession.workflowResult && (
                      <Tab 
                        icon={<DescriptionIcon sx={{ fontSize: '1.1rem', mr: 0.5 }} />} 
                        label="Feedback" 
                        iconPosition="start"
                      />
                    )}
                  </Tabs>
                </Box>

                {/* Tab Content */}
                <Box sx={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                  {/* Job Description Tab */}
                  {activeTab === 0 && (
                    <Paper 
                      elevation={4}
                      sx={{ 
                        p: 2, 
                        background: 'rgba(15, 23, 42, 0.4)',
                        height: '100%',
                        overflow: 'auto',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: 2,
                        backdropFilter: 'blur(5px)',
                        position: 'relative',
                        '&::-webkit-scrollbar': {
                          width: '8px'
                        },
                        '&::-webkit-scrollbar-track': {
                          background: 'rgba(15, 23, 42, 0.3)',
                          borderRadius: '4px'
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: 'rgba(99, 102, 241, 0.3)',
                          borderRadius: '4px',
                          '&:hover': {
                            background: 'rgba(99, 102, 241, 0.5)'
                          }
                        }
                      }}
                    >
                      <IconButton
                        onClick={() => handleCopyToClipboard(
                          selectedSession.jobDescription || 'No job description available',
                          'Job Description'
                        )}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          color: '#6366F1',
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          '&:hover': {
                            backgroundColor: 'rgba(99, 102, 241, 0.2)',
                            transform: 'scale(1.05)'
                          },
                          transition: 'all 0.2s ease-in-out'
                        }}
                        size="small"
                      >
                        <CopyIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          whiteSpace: 'pre-wrap', 
                          lineHeight: 1.5,
                          color: '#E2E8F0',
                          fontSize: '0.9rem',
                          fontWeight: 400,
                          pr: 4
                        }}
                      >
                        {selectedSession.jobDescription && selectedSession.jobDescription.trim() 
                          ? selectedSession.jobDescription 
                          : 'No job description available'}
                      </Typography>
                    </Paper>
                  )}

                  {/* JSON Output Tab */}
                  {activeTab === 1 && selectedSession.tailoredResume && (
                    <Paper 
                      elevation={4}
                      sx={{ 
                        p: 2, 
                        background: 'rgba(15, 23, 42, 0.4)',
                        height: '100%',
                        overflow: 'auto',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: 2,
                        backdropFilter: 'blur(5px)',
                        position: 'relative',
                        '&::-webkit-scrollbar': {
                          width: '8px'
                        },
                        '&::-webkit-scrollbar-track': {
                          background: 'rgba(15, 23, 42, 0.3)',
                          borderRadius: '4px'
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: 'rgba(99, 102, 241, 0.3)',
                          borderRadius: '4px',
                          '&:hover': {
                            background: 'rgba(99, 102, 241, 0.5)'
                          }
                        }
                      }}
                    >
                      <IconButton
                        onClick={() => handleCopyToClipboard(
                          JSON.stringify(selectedSession.tailoredResume, null, 2),
                          'JSON Output'
                        )}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          color: '#6366F1',
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          '&:hover': {
                            backgroundColor: 'rgba(99, 102, 241, 0.2)',
                            transform: 'scale(1.05)'
                          },
                          transition: 'all 0.2s ease-in-out'
                        }}
                        size="small"
                      >
                        <CopyIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                      <pre 
                        style={{ 
                          margin: 0, 
                          fontSize: '11px', 
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                          lineHeight: 1.3,
                          color: '#E2E8F0',
                          fontWeight: 400,
                          paddingRight: '32px'
                        }}
                      >
                        {JSON.stringify(selectedSession.tailoredResume, null, 2)}
                      </pre>
                    </Paper>
                  )}

                  {/* Generated LaTeX Tab */}
                  {activeTab === 2 && selectedSession.latexFilePath && (
                    <Paper 
                      elevation={4}
                      sx={{ 
                        p: 2, 
                        background: 'rgba(15, 23, 42, 0.4)',
                        height: '100%',
                        overflow: 'auto',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: 2,
                        backdropFilter: 'blur(5px)',
                        position: 'relative',
                        '&::-webkit-scrollbar': {
                          width: '8px'
                        },
                        '&::-webkit-scrollbar-track': {
                          background: 'rgba(15, 23, 42, 0.3)',
                          borderRadius: '4px'
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: 'rgba(99, 102, 241, 0.3)',
                          borderRadius: '4px',
                          '&:hover': {
                            background: 'rgba(99, 102, 241, 0.5)'
                          }
                        }
                      }}
                    >
                      <IconButton
                        onClick={() => handleCopyToClipboard(
                          selectedSession.latexContent || 'Loading LaTeX content...',
                          'Generated LaTeX'
                        )}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          color: '#6366F1',
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          '&:hover': {
                            backgroundColor: 'rgba(99, 102, 241, 0.2)',
                            transform: 'scale(1.05)'
                          },
                          transition: 'all 0.2s ease-in-out'
                        }}
                        size="small"
                      >
                        <CopyIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                      <pre 
                        style={{ 
                          margin: 0, 
                          fontSize: '11px', 
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                          lineHeight: 1.3,
                          color: '#E2E8F0',
                          fontWeight: 400,
                          paddingRight: '32px'
                        }}
                      >
                        {selectedSession.latexContent || 'Loading LaTeX content...'}
                      </pre>
                    </Paper>
                  )}

                  {/* Feedback Tab */}
                  {activeTab === 3 && selectedSession.status === 'completed' && selectedSession.workflowResult && (
                    <Paper 
                      elevation={4}
                      sx={{ 
                        p: 2, 
                        background: 'rgba(15, 23, 42, 0.4)',
                        height: '100%',
                        overflow: 'auto',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: 2,
                        backdropFilter: 'blur(5px)',
                        position: 'relative',
                        '&::-webkit-scrollbar': {
                          width: '8px'
                        },
                        '&::-webkit-scrollbar-track': {
                          background: 'rgba(15, 23, 42, 0.3)',
                          borderRadius: '4px'
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: 'rgba(99, 102, 241, 0.3)',
                          borderRadius: '4px',
                          '&:hover': {
                            background: 'rgba(99, 102, 241, 0.5)'
                          }
                        }
                      }}
                    >
                      <IconButton
                        onClick={() => {
                          const feedbackContent = `💡 Feedback\n\n${selectedSession.workflowResult.feedback}${selectedSession.workflowResult.downsides ? `\n\n🔧 Areas for Improvement\n\n${selectedSession.workflowResult.downsides}` : ''}`;
                          handleCopyToClipboard(feedbackContent, 'Feedback');
                        }}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          color: '#6366F1',
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          '&:hover': {
                            backgroundColor: 'rgba(99, 102, 241, 0.2)',
                            transform: 'scale(1.05)'
                          },
                          transition: 'all 0.2s ease-in-out'
                        }}
                        size="small"
                      >
                        <CopyIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                      <Box sx={{ pr: 4 }}>
                        <Typography variant="h6" sx={{ 
                          fontWeight: 600,
                          color: '#6366F1',
                          mb: 1.5,
                          fontSize: '1rem'
                        }}>
                          💡 Feedback
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          whiteSpace: 'pre-wrap', 
                          lineHeight: 1.5,
                          color: '#E2E8F0',
                          fontSize: '0.9rem',
                          mb: 2
                        }}>
                          {selectedSession.workflowResult.feedback}
                        </Typography>
                        
                        {selectedSession.workflowResult.downsides && (
                          <>
                            <Typography variant="h6" sx={{ 
                              fontWeight: 600,
                              color: '#F59E0B',
                              mb: 1.5,
                              fontSize: '1rem'
                            }}>
                              🔧 Areas for Improvement
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              whiteSpace: 'pre-wrap', 
                              lineHeight: 1.5,
                              color: '#E2E8F0',
                              fontSize: '0.9rem'
                            }}>
                              {selectedSession.workflowResult.downsides}
                            </Typography>
                          </>
                        )}
                      </Box>
                    </Paper>
                  )}
                </Box>
                
              </Box>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                  No session data available
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 2, borderTop: '1px solid rgba(99, 102, 241, 0.2)' }}>
            {!selectedSession?.latexFilePath ? (
              <Button 
                variant="contained" 
                onClick={selectedSession?.status === 'completed' ? handleDownloadPDF : handleStartWorkflow}
                disabled={workflowLoading || downloadPDFLoading}
                startIcon={(workflowLoading || downloadPDFLoading) ? <CircularProgress size={16} /> : null}
                sx={{ 
                  mr: 'auto',
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)',
                    boxShadow: '0 6px 20px rgba(99, 102, 241, 0.6)',
                    transform: 'translateY(-1px)'
                  },
                  '&:disabled': {
                    background: 'rgba(99, 102, 241, 0.3)',
                    transform: 'none'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {workflowLoading ? 'Processing Resume (1-2 min)...' : 
                 downloadPDFLoading ? 'Generating...' : 
                 selectedSession?.status === 'completed' ? 'Generate LaTeX' : 'Start Resume Workflow'}
              </Button>
            ) : (
              <Button 
                variant="contained" 
                onClick={handleDownloadPDF}
                disabled={downloadPDFLoading || downloadLatexLoading}
                startIcon={downloadPDFLoading ? <CircularProgress size={16} /> : null}
                sx={{ 
                  mr: 'auto',
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                  boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                    boxShadow: '0 6px 20px rgba(34, 197, 94, 0.6)',
                    transform: 'translateY(-1px)'
                  },
                  '&:disabled': {
                    background: 'rgba(34, 197, 94, 0.3)',
                    transform: 'none'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {downloadPDFLoading ? 'Generating & Downloading...' : 'Download PDF'}
              </Button>
            )}
            
            {selectedSession?.latexFilePath && (
              <>
                <Button 
                  variant="outlined" 
                  onClick={handleRegenerateLatex}
                  disabled={downloadPDFLoading || downloadLatexLoading || regenerateLatexLoading}
                  startIcon={regenerateLatexLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
                  sx={{ 
                    px: 3,
                    py: 1.5,
                    borderRadius: 2,
                    border: '1px solid rgba(99, 102, 241, 0.5)',
                    color: '#6366F1',
                    '&:hover': {
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      borderColor: '#6366F1',
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  {regenerateLatexLoading ? 'Regenerating...' : 'Regenerate LaTeX'}
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={handleDownloadLatexFile}
                  disabled={downloadPDFLoading || downloadLatexLoading || regenerateLatexLoading}
                  startIcon={downloadLatexLoading ? <CircularProgress size={16} /> : null}
                  sx={{ 
                    px: 3,
                    py: 1.5,
                    borderRadius: 2,
                    border: '1px solid rgba(245, 158, 11, 0.5)',
                    color: '#F59E0B',
                    '&:hover': {
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      borderColor: '#F59E0B',
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  {downloadLatexLoading ? 'Downloading...' : 'Download LaTeX'}
                </Button>
              </>
            )}
            
            <Button 
              onClick={() => setDialogOpen(false)}
              sx={{ 
                px: 3,
                py: 1.5,
                borderRadius: 2,
                border: '1px solid rgba(148, 163, 184, 0.3)',
                color: '#94A3B8',
                '&:hover': {
                  backgroundColor: 'rgba(148, 163, 184, 0.1)',
                  borderColor: 'rgba(148, 163, 184, 0.5)',
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </Box>
  );
};

export default CreateResumeSection;