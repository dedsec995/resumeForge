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
import axios from 'axios';
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
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Load existing sessions on component mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8002/getResumeSessions');
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
      const response = await axios.post('http://localhost:8002/createResumeSession', {
        jobDescription: jobDescription.trim()
      });

      if (response.data.success) {
        toast.success('Resume session created successfully!');
        setJobDescription('');
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
      const response = await axios.get(`http://localhost:8002/getResumeSession/${sessionId}`);
      if (response.data.success && response.data.sessionData) {
        setSelectedSession(response.data.sessionData);
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
      const response = await axios.delete(`http://localhost:8002/deleteResumeSession/${sessionId}`);
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
      const response = await axios.post('http://localhost:8002/fullWorkflow', {
        sessionId: selectedSession.sessionId
      });

      if (response.data.success) {
        toast.success(`Workflow completed! Final score: ${response.data.finalScore}`);
        console.log('Workflow response:', response.data);
        // Refresh the session data to get updated status
        await handleViewSession(selectedSession.sessionId);
      } else {
        toast.error('Workflow failed to complete');
      }
    } catch (error) {
      console.error('Error starting workflow:', error);
      toast.error('Failed to start resume workflow');
    } finally {
      setWorkflowLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedSession) {
      toast.error('No session selected');
      return;
    }

    try {
      setDownloadLoading(true);
      const response = await axios.post(`http://localhost:8002/generateLatex/${selectedSession.sessionId}`);

      if (response.data.success) {
        toast.success('LaTeX file generated successfully!');
        await handleViewSession(selectedSession.sessionId);
      } else {
        toast.error('Failed to generate LaTeX file');
      }
    } catch (error) {
      console.error('Error generating LaTeX file:', error);
      toast.error('Failed to generate LaTeX file');
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleDownloadPDFFile = async () => {
    if (!selectedSession?.latexFilePath) {
      toast.error('No LaTeX file available for download');
      return;
    }

    try {
      setDownloadLoading(true);
      const response = await axios.get(`http://localhost:8002/downloadPDF/${selectedSession.sessionId}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `resume_${selectedSession.sessionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully!');
      await handleViewSession(selectedSession.sessionId);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleDownloadLatexFile = async () => {
    if (!selectedSession?.latexFilePath) {
      toast.error('No LaTeX file available for download');
      return;
    }

    try {
      setDownloadLoading(true);
      const response = await axios.get(`http://localhost:8002/downloadLatex/${selectedSession.sessionId}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `resume_${selectedSession.sessionId}.tex`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('LaTeX file downloaded successfully!');
    } catch (error) {
      console.error('Error downloading LaTeX:', error);
      toast.error('Failed to download LaTeX file');
    } finally {
      setDownloadLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
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
          Paste a job description to create a tailored resume session
        </Typography>
      </Box>

      {/* Job Description Input Form */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AddIcon sx={{ mr: 1 }} />
          New Resume Session
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
            disabled={submitting || !jobDescription.trim()}
            startIcon={submitting ? <CircularProgress size={20} /> : <AddIcon />}
            sx={{ px: 4 }}
          >
            {submitting ? 'Creating...' : 'Create Resume Session'}
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
                         <Box sx={{ display: 'flex', alignItems: 'center' }}>
                           <DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} />
                           <Box>
                             <Typography variant="h6" component="div" sx={{ fontWeight: 600, mb: 0.5 }}>
                               {session.status === 'completed' && session.companyName ? session.companyName : 'Resume Session'}
                             </Typography>
                             {session.status === 'completed' && session.position ? (
                               <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                                 {session.position}
                               </Typography>
                             ) : (
                               <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                                 Click to edit
                               </Typography>
                             )}
                           </Box>
                         </Box>
                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                           <Chip 
                             label={session.status} 
                             size="small" 
                             color={session.status === 'completed' ? 'success' : 'default'}
                             sx={{ textTransform: 'capitalize' }}
                           />
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
                       
                       <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, mb: 0.5 }}>
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
         }}
         maxWidth="md"
         fullWidth
         TransitionProps={{
           timeout: 300
         }}
       >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Resume Session Details</Typography>
          {selectedSession && (
            <Chip 
              label={selectedSession.status === 'completed' && selectedSession.workflowResult 
                ? `${selectedSession.workflowResult.score}/100` 
                : selectedSession.status} 
              size="small" 
              color={selectedSession.status === 'completed' ? 'success' : 'default'}
              sx={{ textTransform: 'capitalize' }}
            />
          )}
        </DialogTitle>
                 <DialogContent sx={{ minHeight: '400px' }}>
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
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs 
                  value={activeTab} 
                  onChange={handleTabChange}
                  sx={{
                    '& .MuiTab-root': {
                      color: 'text.secondary',
                      '&.Mui-selected': {
                        color: 'primary.main'
                      }
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: 'primary.main'
                    }
                  }}
                >
                  <Tab 
                    icon={<DescriptionIcon />} 
                    label="Job Description" 
                    iconPosition="start"
                  />
                  {selectedSession.tailoredResume && (
                    <Tab 
                      icon={<DataObjectIcon />} 
                      label="JSON Output" 
                      iconPosition="start"
                    />
                  )}
                  {selectedSession.latexFilePath && (
                    <Tab 
                      icon={<CodeIcon />} 
                      label="Generated LaTeX" 
                      iconPosition="start"
                    />
                  )}
                  {selectedSession.status === 'completed' && selectedSession.workflowResult && (
                    <Tab 
                      icon={<DescriptionIcon />} 
                      label="Feedback" 
                      iconPosition="start"
                    />
                  )}
                </Tabs>
              </Box>

              {/* Tab Content */}
              <Box sx={{ minHeight: '250px' }}>
                {/* Job Description Tab */}
                {activeTab === 0 && (
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 1.5, 
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                      minHeight: 250,
                      maxHeight: 350, 
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
                      minHeight: 250,
                      maxHeight: 350, 
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
                      minHeight: 250,
                      maxHeight: 350, 
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
                      minHeight: 250,
                      maxHeight: 350, 
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
              disabled={workflowLoading || downloadLoading}
              startIcon={(workflowLoading || downloadLoading) ? <CircularProgress size={16} /> : null}
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
              {workflowLoading ? 'Processing...' : 
               downloadLoading ? 'Generating...' : 
               selectedSession?.status === 'completed' ? 'Generate LaTeX' : 'Start Resume Workflow'}
            </Button>
          ) : (
            <Button 
              variant="contained" 
              onClick={handleDownloadPDFFile}
              disabled={downloadLoading}
              startIcon={downloadLoading ? <CircularProgress size={16} /> : null}
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
              {downloadLoading ? 'Downloading...' : 'Download PDF'}
            </Button>
          )}
          
          {selectedSession?.latexFilePath && (
            <Button 
              variant="outlined" 
              onClick={handleDownloadLatexFile}
              disabled={downloadLoading}
              startIcon={downloadLoading ? <CircularProgress size={16} /> : null}
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
              {downloadLoading ? 'Downloading...' : 'Download LaTeX'}
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