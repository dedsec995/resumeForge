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
  IconButton
} from '@mui/material';
import { 
  Add as AddIcon,
  Delete as DeleteIcon,
  AccessTime as TimeIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface ResumeSession {
  sessionId: string;
  timestamp: string;
  status: string;
  preview: string;
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

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
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
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
                    <CardContent sx={{ flexGrow: 1, p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} />
                          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                            Resume Session
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label={session.status} 
                            size="small" 
                            color={session.status === 'created' ? 'success' : 'default'}
                            sx={{ textTransform: 'capitalize' }}
                          />
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(session.sessionId);
                            }}
                            sx={{ p: 0.5 }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                        <TimeIcon sx={{ mr: 0.5, fontSize: 16 }} />
                        {formatDate(session.timestamp)}
                      </Typography>
                      
                                             <Box 
                         onClick={() => handleViewSession(session.sessionId)}
                         sx={{ 
                           cursor: 'pointer',
                           '&:hover': {
                             bgcolor: 'rgba(255, 255, 255, 0.05)',
                             borderRadius: 1
                           },
                           transition: 'all 0.2s ease-in-out'
                         }}
                       >
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
        <DialogTitle>
          Resume Session Details
        </DialogTitle>
                 <DialogContent sx={{ minHeight: '400px' }}>
           {dialogLoading ? (
             <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
               <CircularProgress />
             </Box>
           ) : selectedSession ? (
            <Box>
              {/* Session Info */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Created
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {formatDate(selectedSession.timestamp)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Status
                    </Typography>
                    <Chip 
                      label={selectedSession.status} 
                      size="small" 
                      color={selectedSession.status === 'created' ? 'success' : 'default'}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Session ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                      {selectedSession.sessionId}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Statistics
                    </Typography>
                    <Typography variant="body2">
                      {selectedSession.metadata.wordCount} words, {selectedSession.metadata.characterCount} characters
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Job Description */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <DescriptionIcon sx={{ mr: 1, fontSize: 20 }} />
                  Job Description
                </Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'rgba(255, 255, 255, 0.1)', 
                    minHeight: 100,
                    maxHeight: 180, 
                    overflow: 'auto',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      whiteSpace: 'pre-wrap', 
                      lineHeight: 1.5,
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '0.875rem'
                    }}
                  >
                    {selectedSession.jobDescription && selectedSession.jobDescription.trim() 
                      ? selectedSession.jobDescription 
                      : 'No job description available'}
                  </Typography>
                </Paper>
              </Box>

              {/* Raw JSON Data */}
              <Box>
                <Typography variant="h6" gutterBottom>
                  Raw Session Data
                </Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'background.default', 
                    maxHeight: 300, 
                    overflow: 'auto',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <pre 
                    style={{ 
                      margin: 0, 
                      fontSize: '11px', 
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                      lineHeight: 1.4,
                      color: 'inherit'
                    }}
                  >
                    {JSON.stringify(selectedSession, null, 2)}
                  </pre>
                </Paper>
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
        <DialogActions>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleStartWorkflow}
            disabled={workflowLoading}
            startIcon={workflowLoading ? <CircularProgress size={16} /> : null}
            sx={{ mr: 'auto' }}
          >
            {workflowLoading ? 'Processing...' : 'Start Resume Workflow'}
          </Button>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CreateResumeSection;