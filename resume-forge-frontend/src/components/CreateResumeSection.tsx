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
  DataObject as DataObjectIcon
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
  const [activeTab, setActiveTab] = useState(0);

  // Load existing sessions on component mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
              const response = await apiClient.get('/getResumeSessions');
      if (response.data.success) {
        setSessions(response.data.sessions);
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
        
        loadSessions(); // Refresh the sessions list
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

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
          Create Resume
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Paste a job description to automatically create and process your tailored resume
        </Typography>
      </Box>

      {/* Global Processing Indicator */}
      {workflowLoading && (
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          icon={<CircularProgress size={20} />}
        >
          <Typography variant="body2">
            <strong>Processing Resume...</strong> We're analyzing the job description, tailoring your resume, and generating LaTeX files. This may take a few minutes.
          </Typography>
        </Alert>
      )}

      {/* Job Description Input Form */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AddIcon sx={{ mr: 1 }} />
          New Resume (Auto-Process)
        </Typography>

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Job Description"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description here..."
          sx={{ mb: 2 }}
          helperText={`${jobDescription.length} characters, ${jobDescription.split(' ').filter(word => word.length > 0).length} words`}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={submitting || workflowLoading || !jobDescription.trim()}
            startIcon={submitting || workflowLoading ? <CircularProgress size={20} /> : <AddIcon />}
            sx={{ px: 4 }}
          >
            {submitting ? 'Creating Session...' : workflowLoading ? 'Processing Resume...' : 'Create & Process Resume'}
          </Button>
        </Box>
      </Paper>

      {/* Sessions List */}
      <Box>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <DescriptionIcon sx={{ mr: 1 }} />
          Resume Sessions ({sessions.length})
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : sessions.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            No resume sessions created yet. Create your first session above!
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {sessions.map((session, index) => (
              <Grid item xs={12} md={6} lg={4} key={session.sessionId}>
                 <Fade in={true} timeout={300 + index * 100}>
                   <Card 
                     sx={{ 
                       height: '100%', 
                       display: 'flex', 
                       flexDirection: 'column', 
                       cursor: 'pointer',
                       '&:hover': {
                         bgcolor: 'rgba(255, 255, 255, 0.02)',
                         transform: 'translateY(-1px)',
                         boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                       },
                       transition: 'all 0.2s ease-in-out'
                     }}
                     onClick={() => handleViewSession(session.sessionId)}
                   >
                     <CardContent sx={{ flexGrow: 1, p: 2, pb: 1 }}>
                       <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                         <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                           <DescriptionIcon sx={{ mr: 1, color: 'primary.main', flexShrink: 0 }} />
                           <Box sx={{ flex: 1, minWidth: 0 }}>
                             <Typography 
                               variant="h6" 
                               component="div" 
                               sx={{ 
                                 fontWeight: 600, 
                                 mb: 0.5,
                                 overflow: 'hidden',
                                 textOverflow: 'ellipsis',
                                 whiteSpace: 'nowrap'
                               }}
                             >
                               {session.status === 'completed' && session.companyName ? session.companyName : 'Resume Session'}
                             </Typography>
                             {session.status === 'completed' && session.position ? (
                               <Typography 
                                 variant="body2" 
                                 sx={{ 
                                   color: 'text.secondary', 
                                   fontSize: '0.85rem',
                                   overflow: 'hidden',
                                   textOverflow: 'ellipsis',
                                   whiteSpace: 'nowrap'
                                 }}
                               >
                                 {session.position}
                               </Typography>
                             ) : (
                               <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
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
                               '&:hover': {
                                 bgcolor: 'rgba(244, 67, 54, 0.1)'
                               }
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
                             p: 1,
                             borderRadius: 1,
                             transition: 'background-color 0.2s'
                           }}
                         >
                           {session.preview}
                         </Typography>
                       </Box>
                       
                       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, mb: 0.5 }}>
                         <Chip 
                           label={session.status === 'processing' ? 'Processing...' : session.status} 
                           size="small" 
                           color={session.status === 'completed' ? 'success' : 
                                  session.status === 'processing' ? 'primary' : 
                                  session.status === 'failed' ? 'error' : 'default'}
                           icon={session.status === 'processing' ? <CircularProgress size={16} /> : undefined}
                           sx={{ textTransform: 'capitalize' }}
                         />
                         <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}>
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
             minHeight: '600px'
           }
         }}
         TransitionProps={{
           timeout: 300
         }}
       >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              sx={{ textTransform: 'capitalize' }}
            />
          )}
        </DialogTitle>
                 <DialogContent sx={{ minHeight: '500px', maxHeight: '70vh' }}>
           {dialogLoading ? (
             <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
               <CircularProgress />
             </Box>
           ) : selectedSession ? (
            <Box>
              {/* Session Info */}
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  mb: 2, 
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 2,
                  backdropFilter: 'blur(10px)'
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      {selectedSession.status === 'completed' && selectedSession.workflowResult ? (
                        <>
                          <Typography variant="h5" sx={{ 
                            fontWeight: 700, 
                            background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 0.5
                          }}>
                            {selectedSession.workflowResult.company_name}
                          </Typography>
                          <Typography variant="h6" sx={{ 
                            fontWeight: 500, 
                            color: 'text.secondary',
                            opacity: 0.9
                          }}>
                            {selectedSession.workflowResult.position}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="h6" sx={{ 
                          fontWeight: 600, 
                          color: 'primary.main',
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
                        color: 'text.secondary',
                        opacity: 0.7,
                        fontSize: '0.75rem'
                      }}>
                        {selectedSession.sessionId}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: 'text.secondary',
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
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
                <Tabs 
                  value={activeTab} 
                  onChange={handleTabChange}
                  sx={{
                    minHeight: '40px',
                    '& .MuiTab-root': {
                      color: 'text.secondary',
                      minHeight: '40px',
                      padding: '6px 12px',
                      fontSize: '0.875rem',
                      textTransform: 'none',
                      fontWeight: 500,
                      '&.Mui-selected': {
                        color: 'primary.main',
                        fontWeight: 600
                      }
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: 'primary.main',
                      height: '2px'
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
              <Box sx={{ minHeight: '350px' }}>
                {/* Job Description Tab */}
                {activeTab === 0 && (
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 1.5, 
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                      minHeight: 350,
                      maxHeight: 450, 
                      overflow: 'auto',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 2,
                      backdropFilter: 'blur(5px)',
                      '&::-webkit-scrollbar': {
                        width: '8px'
                      },
                      '&::-webkit-scrollbar-track': {
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px'
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        '&:hover': {
                          background: 'rgba(255, 255, 255, 0.3)'
                        }
                      }
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        whiteSpace: 'pre-wrap', 
                        lineHeight: 1.5,
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: '0.9rem',
                        fontWeight: 400
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
                    variant="outlined" 
                    sx={{ 
                      p: 1.5, 
                      background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.08) 0%, rgba(33, 150, 243, 0.03) 100%)',
                      minHeight: 350,
                      maxHeight: 450, 
                      overflow: 'auto',
                      border: '1px solid rgba(33, 150, 243, 0.25)',
                      borderRadius: 2,
                      backdropFilter: 'blur(5px)',
                      '&::-webkit-scrollbar': {
                        width: '8px'
                      },
                      '&::-webkit-scrollbar-track': {
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px'
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        '&:hover': {
                          background: 'rgba(255, 255, 255, 0.3)'
                        }
                      }
                    }}
                  >
                    <pre 
                      style={{ 
                        margin: 0, 
                        fontSize: '11px', 
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                        lineHeight: 1.3,
                        color: 'rgba(255, 255, 255, 0.85)',
                        fontWeight: 400
                      }}
                    >
                      {JSON.stringify(selectedSession.tailoredResume, null, 2)}
                    </pre>
                  </Paper>
                )}

                {/* Generated LaTeX Tab */}
                {activeTab === 2 && selectedSession.latexFilePath && (
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 1.5, 
                      background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(76, 175, 80, 0.03) 100%)',
                      minHeight: 350,
                      maxHeight: 450, 
                      overflow: 'auto',
                      border: '1px solid rgba(76, 175, 80, 0.25)',
                      borderRadius: 2,
                      backdropFilter: 'blur(5px)',
                      '&::-webkit-scrollbar': {
                        width: '8px'
                      },
                      '&::-webkit-scrollbar-track': {
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px'
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        '&:hover': {
                          background: 'rgba(255, 255, 255, 0.3)'
                        }
                      }
                    }}
                  >
                    <pre 
                      style={{ 
                        margin: 0, 
                        fontSize: '11px', 
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                        lineHeight: 1.3,
                        color: 'rgba(255, 255, 255, 0.85)',
                        fontWeight: 400
                      }}
                    >
                      {selectedSession.latexContent || 'Loading LaTeX content...'}
                    </pre>
                  </Paper>
                )}

                {/* Feedback Tab */}
                {activeTab === 3 && selectedSession.status === 'completed' && selectedSession.workflowResult && (
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 1.5, 
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.03) 100%)',
                      minHeight: 350,
                      maxHeight: 450, 
                      overflow: 'auto',
                      border: '1px solid rgba(102, 126, 234, 0.25)',
                      borderRadius: 2,
                      backdropFilter: 'blur(5px)',
                      '&::-webkit-scrollbar': {
                        width: '8px'
                      },
                      '&::-webkit-scrollbar-track': {
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px'
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        '&:hover': {
                          background: 'rgba(255, 255, 255, 0.3)'
                        }
                      }
                    }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ 
                        fontWeight: 600,
                        color: 'primary.main',
                        mb: 1.5,
                        fontSize: '1rem'
                      }}>
                        💡 Feedback
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        whiteSpace: 'pre-wrap', 
                        lineHeight: 1.5,
                        color: 'rgba(255, 255, 255, 0.9)',
                        fontSize: '0.9rem',
                        mb: 2
                      }}>
                        {selectedSession.workflowResult.feedback}
                      </Typography>
                      
                      {selectedSession.workflowResult.downsides && (
                        <>
                          <Typography variant="h6" sx={{ 
                            fontWeight: 600,
                            color: 'warning.main',
                            mb: 1.5,
                            fontSize: '1rem'
                          }}>
                            🔧 Areas for Improvement
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            whiteSpace: 'pre-wrap', 
                            lineHeight: 1.5,
                            color: 'rgba(255, 255, 255, 0.9)',
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
              <Typography variant="body1" color="text.secondary">
                No session data available
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1.5 }}>
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
                background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5a6fd8 0%, #6a4190 100%)',
                  boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
                  transform: 'translateY(-1px)'
                },
                '&:disabled': {
                  background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                  opacity: 0.6
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
                background: 'linear-gradient(45deg, #4caf50 0%, #45a049 100%)',
                boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #45a049 0%, #3d8b40 100%)',
                  boxShadow: '0 6px 20px rgba(76, 175, 80, 0.6)',
                  transform: 'translateY(-1px)'
                },
                '&:disabled': {
                  background: 'linear-gradient(45deg, #4caf50 0%, #45a049 100%)',
                  opacity: 0.6
                },
                transition: 'all 0.3s ease'
              }}
            >
              {downloadPDFLoading ? 'Generating & Downloading...' : 'Download PDF'}
            </Button>
          )}
          
          {selectedSession?.latexFilePath && (
            <Button 
              variant="outlined" 
              onClick={handleDownloadLatexFile}
              disabled={downloadPDFLoading || downloadLatexLoading}
              startIcon={downloadLatexLoading ? <CircularProgress size={16} /> : null}
              sx={{ 
                px: 3,
                py: 1.5,
                borderRadius: 2,
                border: '1px solid rgba(255, 152, 0, 0.5)',
                color: '#ff9800',
                '&:hover': {
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                  borderColor: '#ff9800'
                },
                transition: 'all 0.3s ease'
              }}
            >
              {downloadLatexLoading ? 'Downloading...' : 'Download LaTeX'}
            </Button>
          )}
          
          <Button 
            onClick={() => setDialogOpen(false)}
            sx={{ 
              px: 3,
              py: 1.5,
              borderRadius: 2,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.3)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CreateResumeSection;