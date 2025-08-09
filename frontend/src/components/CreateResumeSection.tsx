import { 
  Box, 
  Container, 
  Typography,
  Paper,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Fade,
  Grow,
  Slide,
  TextField,
  InputAdornment,
  IconButton,
  Collapse
} from '@mui/material';
import { 
  Add as AddIcon,
  WorkOutline as ResumeIcon,
  Description as DescriptionIcon,
  Star as StarIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Key as KeyIcon
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { toast } from 'react-hot-toast';

// Import reusable components
import { ResumeSessionCard, NewResumeForm, FirstTimeUserWelcome } from './ResumeComponents';
import SessionDetailsDialog from './SessionDetailsDialog';

interface ResumeSession {
  sessionId: string;
  timestamp: string;
  status: string;
  preview: string;
  companyName?: string;
  position?: string;
  tailoredResume?: Record<string, unknown>;
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
  const [workflowLoading, setWorkflowLoading] = useState<string | null>(null);
  const [downloadPDFLoading, setDownloadPDFLoading] = useState<string | null>(null);
  const [downloadLatexLoading, setDownloadLatexLoading] = useState<string | null>(null);
  const [regenerateLatexLoading, setRegenerateLatexLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showNewResumeForm, setShowNewResumeForm] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [globalCounter, setGlobalCounter] = useState(0);
  const [individualCounter, setIndividualCounter] = useState(0);
  const [userApiConfig, setUserApiConfig] = useState<{ hasApiKey?: boolean; timestamp?: string; lastUpdated?: string } | null>(null);
  const [userInfo, setUserInfo] = useState<{ accountTier?: string; email?: string; displayName?: string } | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingApiConfig, setSavingApiConfig] = useState(false);


  // Load existing sessions on component mount
  useEffect(() => {
    loadSessions();
    loadGlobalCounter();
    loadIndividualCounter();
    loadUserApiConfig();
    loadUserInfo();
  }, []);

  // Real-time status updates for active sessions
  useEffect(() => {
    const activeSessions = sessions.filter(session => 
      session.status === 'processing' || session.status === 'queued'
    );

    if (activeSessions.length === 0) return;

    const interval = setInterval(async () => {
      try {
        // Update each active session individually for better performance
        for (const session of activeSessions) {
          await updateSessionStatus(session.sessionId);
        }
        
        // Only update selected session if dialog is open and session is active
        if (dialogOpen && selectedSession && (selectedSession.status === 'processing' || selectedSession.status === 'queued')) {
          try {
            const response = await apiClient.get(`/getResumeSession/${selectedSession.sessionId}`);
            if (response.data.success && response.data.sessionData) {
              setSelectedSession(response.data.sessionData);
            }
          } catch (error) {
            console.error('Error updating selected session:', error);
          }
        }
      } catch (error) {
        console.error('Error updating session status:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [sessions, selectedSession, dialogOpen]);

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

  // Update individual session status in real-time
  const updateSessionStatus = async (sessionId: string) => {
    try {
      const response = await apiClient.get(`/sessionStatus/${sessionId}`);
      // The sessionStatus endpoint returns status directly, not wrapped in success field
      const newStatus = response.data.status;
      
      console.log(`Updating session ${sessionId} status to: ${newStatus}`, response.data);
      
      // Only update if status actually changed
      setSessions(prevSessions => {
        const session = prevSessions.find(s => s.sessionId === sessionId);
        if (session && session.status !== newStatus) {
          console.log(`Session ${sessionId} status changed from ${session.status} to ${newStatus}`);
          return prevSessions.map(s => 
            s.sessionId === sessionId 
              ? { ...s, status: newStatus }
              : s
          );
        }
        return prevSessions;
      });
      
      // Also update selected session if it's the same session and status changed
      if (selectedSession && selectedSession.sessionId === sessionId && selectedSession.status !== newStatus) {
        console.log(`Selected session ${sessionId} status changed from ${selectedSession.status} to ${newStatus}`);
        setSelectedSession(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error('Error updating session status:', error);
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
          setWorkflowLoading(sessionId);
          
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
                // The sessionStatus endpoint returns status directly, not wrapped in success field
                const status = statusResponse.data.status;
                
                console.log('Workflow status:', status, statusResponse.data);
                
                // Update the sessions list immediately
                setSessions(prevSessions => 
                  prevSessions.map(session => 
                    session.sessionId === sessionId 
                      ? { ...session, status: status }
                      : session
                  )
                );
                
                // Also update selected session if it's the same session
                if (selectedSession && selectedSession.sessionId === sessionId) {
                  setSelectedSession(prev => prev ? { ...prev, status: status } : null);
                }
                
                if (status === 'completed') {
                  clearInterval(pollInterval);
                  setWorkflowLoading(null);
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
                  setWorkflowLoading(null);
                  toast.error(`Processing failed: ${statusResponse.data.error || 'Unknown error'}`);
                  
                  // Refresh the sessions list
                  loadSessions();
                  loadGlobalCounter(); // Refresh the global counter
                  loadIndividualCounter(); // Refresh the individual counter
                  
                } else if (status === 'processing' || status === 'queued') {
                  // Still processing or queued, continue polling
                  console.log('Still processing or queued...');
                }
                
              } catch (pollError) {
                console.error('Error polling status:', pollError);
                clearInterval(pollInterval);
                setWorkflowLoading(null);
                toast.error('Error checking processing status');
              }
            }, 3000); // Poll every 3 seconds
            
            // Set a timeout to stop polling after 10 minutes
            setTimeout(() => {
              clearInterval(pollInterval);
              setWorkflowLoading(null);
              toast.error('Processing timeout. Please check the session manually.');
              loadSessions();
              loadGlobalCounter(); // Refresh the global counter
              loadIndividualCounter(); // Refresh the individual counter
            }, 600000); // 10 minutes
            
          } else {
            setWorkflowLoading(null);
            toast.error('Failed to start processing');
          }
        } catch (workflowError) {
          console.error('Error starting workflow:', workflowError);
          setWorkflowLoading(null);
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
      // Open dialog immediately for better UX
      setDialogOpen(true);
      setDialogLoading(true);
      
      // Load session data in the background
      const loadSessionData = async () => {
        try {
          // First get the current session status
          const statusResponse = await apiClient.get(`/sessionStatus/${sessionId}`);
          // The sessionStatus endpoint returns status directly, not wrapped in success field
          const currentStatus = statusResponse.data.status || 'unknown';
          
          console.log(`Loading session ${sessionId} with status: ${currentStatus}`, statusResponse.data);
          
          // Then get the full session data
          const response = await apiClient.get(`/getResumeSession/${sessionId}`);
          if (response.data.success && response.data.sessionData) {
            // Ensure the session data has the current status
            const sessionData = {
              ...response.data.sessionData,
              status: currentStatus
            };
            console.log(`Setting selected session with status: ${currentStatus}`, sessionData);
            setSelectedSession(sessionData);
            
            // If the session is still processing or queued, start auto-refresh
            if (currentStatus === 'processing' || currentStatus === 'queued') {
              const refreshInterval = setInterval(async () => {
                try {
                  const refreshResponse = await apiClient.get(`/getResumeSession/${sessionId}`);
                  if (refreshResponse.data.success && refreshResponse.data.sessionData) {
                    const newStatus = refreshResponse.data.sessionData.status;
                    console.log(`Auto-refresh: session ${sessionId} status is now: ${newStatus}`);
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
            console.error('Failed to load session data:', response);
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
      
      // Load data in background
      loadSessionData();
      
    } catch (error) {
      console.error('Error opening session dialog:', error);
      toast.error('Failed to open session details');
      setDialogOpen(false);
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

  const handleStartWorkflow = async (sessionId: string) => {
    if (!sessionId) {
      toast.error('No session selected');
      return;
    }

    // Check if user has API key for FREE tier
    if (!checkApiKeyRequirement()) {
      return;
    }

    try {
      setWorkflowLoading(sessionId); // Set loading for specific session
      
      // Start the workflow
      const response = await apiClient.post('/fullWorkflow', {
        sessionId: sessionId
      });

      if (response.data.success) {
        toast.success('Workflow queued! Your resume will be processed in order...');
        
        // Start polling for status updates
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await apiClient.get(`/sessionStatus/${sessionId}`);
            // The sessionStatus endpoint returns status directly, not wrapped in success field
            const status = statusResponse.data.status;
            
            console.log('Workflow status:', status, statusResponse.data);
            
            // Update the sessions list immediately
            setSessions(prevSessions => 
              prevSessions.map(session => 
                session.sessionId === sessionId 
                  ? { ...session, status: status }
                  : session
              )
            );
            
            // Also update selected session if it's the same session
            if (selectedSession && selectedSession.sessionId === sessionId) {
              setSelectedSession(prev => prev ? { ...prev, status: status } : null);
            }
            
            if (status === 'completed') {
              clearInterval(pollInterval);
              setWorkflowLoading(null); // Clear loading for this session
              toast.success(`Workflow completed! Final score: ${statusResponse.data.currentScore}/100`);
              
              // Refresh the session data to show updated results
              await handleViewSession(sessionId);
              
            } else if (status === 'failed') {
              clearInterval(pollInterval);
              setWorkflowLoading(null); // Clear loading for this session
              
              // Handle different error types
              if (statusResponse.data.errorType === 'API_KEY_ERROR') {
                // Check if user has API key configured to provide appropriate message
                if (userApiConfig?.hasApiKey) {
                  toast.error(
                    'Invalid API Key: Your OpenAI API key appears to be incorrect or expired. Please update it below.',
                    { 
                      duration: 8000,
                      icon: '❌'
                    }
                  );
                } else {
                  toast.error(
                    'API Key Required: Please add your OpenAI API key below to continue.',
                    { 
                      duration: 8000,
                      icon: '🔑'
                    }
                  );
                }
              } else if (statusResponse.data.errorType === 'MODEL_ERROR') {
                toast.error(
                  'Model Error: There was an issue with the AI model. Please try again later.',
                  { 
                    duration: 5000,
                    icon: '🤖'
                  }
                );
              } else {
                toast.error(`Workflow failed: ${statusResponse.data.error || 'Unknown error'}`);
              }
              
              // Refresh the session data to show error status
              await handleViewSession(sessionId);
              
            } else if (status === 'processing' || status === 'queued') {
              // Still processing or queued, keep polling
              console.log('Workflow still processing or queued...');
            }
            
          } catch (pollError) {
            console.error('Error polling status:', pollError);
            // Don't stop polling on poll errors, might be temporary
          }
        }, 3000); // Poll every 3 seconds
        
        setTimeout(() => {
          clearInterval(pollInterval);
          if (workflowLoading === sessionId) {
            setWorkflowLoading(null); // Clear loading for this session
            toast('Workflow is taking longer than expected. Please check the session later.', { 
              icon: '⚠️',
              duration: 5000 
            });
          }
        }, 300000); // 5 minutes
        
      } else {
        setWorkflowLoading(null); // Clear loading for this session
        toast.error('Failed to start workflow');
      }
    } catch (error) {
      console.error('Error starting workflow:', error);
      setWorkflowLoading(null); // Clear loading for this session
      
      // Check if it's an API key error from the response
      const errorResponse = error as { response?: { data?: { detail?: string } } };
      if (errorResponse.response?.data?.detail?.includes('API_KEY_ERROR')) {
        // Check if user has API key configured to provide appropriate message
        if (userApiConfig?.hasApiKey) {
          toast.error(
            'Invalid API Key: Your OpenAI API key appears to be incorrect or expired. Please update it below.',
            { 
              duration: 8000,
              icon: '❌'
            }
          );
        } else {
          toast.error(
            'API Key Required: Please add your OpenAI API key below to continue.',
            { 
              duration: 8000,
              icon: '🔑'
            }
          );
        }
      } else if (errorResponse.response?.data?.detail?.includes('MODEL_ERROR')) {
        toast.error(
          'Model Error: There was an issue with the AI model. Please try again later.',
          { 
            duration: 5000,
            icon: '🤖'
          }
        );
      } else {
        toast.error('Failed to start resume workflow');
      }
    }
  };

  const handleDownloadPDF = async (sessionId: string) => {
    if (!sessionId) {
      toast.error('No session selected');
      return;
    }

    try {
      setDownloadPDFLoading(sessionId);
      
      // First, ensure LaTeX file exists
      let latexResponse;
      try {
        latexResponse = await apiClient.post(`/generateLatex/${sessionId}`);
        if (latexResponse.data.success) {
          toast.success('LaTeX file generated successfully!');
          await handleViewSession(sessionId);
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
        const pdfResponse = await apiClient.get(`/downloadPDF/${sessionId}`, {
          responseType: 'blob'
        });

        // Get session data for filename generation
        const sessionData = sessions.find(s => s.sessionId === sessionId);
        
        // Generate filename based on person name, company and position
        const generateFilename = () => {
          const personName = (sessionData?.tailoredResume as { personalInfo?: { name?: string } })?.personalInfo?.name || '';
          const companyName = sessionData?.companyName || '';
          const position = sessionData?.position || '';
          
          if (personName || companyName || position) {
            const cleanPerson = personName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
            const cleanCompany = companyName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
            const cleanPosition = position.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
            const parts = [cleanPerson, cleanCompany, cleanPosition].filter(part => part);
            return `${parts.join('_')}.pdf`;
          }
          return `resume_${sessionId}.pdf`;
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
        await handleViewSession(sessionId);
      } catch (pdfError) {
        console.error('Error downloading PDF:', pdfError);
        toast.error('Failed to download PDF. Please try again.');
      }
    } catch (error) {
      console.error('Error in PDF download process:', error);
      toast.error('Failed to process PDF download');
    } finally {
      setDownloadPDFLoading(null);
    }
  };



  const handleDownloadLatexFile = async (sessionId: string) => {
    if (!sessionId) {
      toast.error('No session selected');
      return;
    }

    try {
      setDownloadLatexLoading(sessionId);
      const response = await apiClient.get(`/downloadLatex/${sessionId}`, {
        responseType: 'blob'
      });

      // Get session data for filename generation
      const sessionData = sessions.find(s => s.sessionId === sessionId);

      // Generate filename based on person name, company and position
      const generateFilename = () => {
        const personName = (sessionData?.tailoredResume as { personalInfo?: { name?: string } })?.personalInfo?.name || '';
        const companyName = sessionData?.companyName || '';
        const position = sessionData?.position || '';
        
        if (personName || companyName || position) {
          const cleanPerson = personName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
          const cleanCompany = companyName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
          const cleanPosition = position.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
          const parts = [cleanPerson, cleanCompany, cleanPosition].filter(part => part);
          return `${parts.join('_')}.tex`;
        }
        return `resume_${sessionId}.tex`;
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
      setDownloadLatexLoading(null);
    }
  };

  const handleRegenerateLatex = async (sessionId: string) => {
    if (!sessionId) return;
    
    setRegenerateLatexLoading(sessionId);
    try {
      // Call the generateLaTeX endpoint to regenerate LaTeX using latest data
      const response = await apiClient.post(`/generateLatex/${sessionId}`);
      
      if (response.data.success) {
        // Refresh the session data to get the updated LaTeX content
        const sessionResponse = await apiClient.get(`/getResumeSession/${sessionId}`);
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
      setRegenerateLatexLoading(null);
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

  const loadUserApiConfig = async () => {
    try {
      const response = await apiClient.get('/apiConfig');
      if (response.data.success) {
        setUserApiConfig(response.data.apiData);
      }
    } catch (error) {
      console.error('Error loading API config:', error);
    }
  };

  const loadUserInfo = async () => {
    try {
      const response = await apiClient.get('/user/info');
      if (response.data.success) {
        setUserInfo({
          accountTier: response.data.accountTier,
          email: response.data.email,
          displayName: response.data.displayName
        });
      }
    } catch (error) {
      console.error('Error loading user info:', error);
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
        await loadUserApiConfig();
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
        setUserApiConfig(null);
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

  const checkApiKeyRequirement = () => {
    // Debug: Log user tier information
    console.log('Debug - User tier:', userInfo?.accountTier, 'Has API key:', userApiConfig?.hasApiKey);
    
    // Only check API key requirement for FREE tier users
    if (userInfo?.accountTier === 'FREE') {
      if (!userApiConfig?.hasApiKey) {
        toast.error(
          'API Key Required: Please add your OpenAI API key below to continue.',
          { 
            duration: 8000,
            icon: '🔑'
          }
        );
        return false;
      }
    }
    // Admin users (ADMI tier) don't need API key - they use environment variables
    return true;
  };

  const handleCloseDialog = () => {
    // Store the current session status before closing
    const currentSessionStatus = selectedSession?.status;
    
    setDialogOpen(false);
    setSelectedSession(null);
    
    // Clean up any refresh intervals
    const windowWithCleanup = window as { sessionRefreshCleanup?: () => void };
    if (windowWithCleanup.sessionRefreshCleanup) {
      windowWithCleanup.sessionRefreshCleanup();
      windowWithCleanup.sessionRefreshCleanup = undefined;
    }
    
    // Only refresh sessions if the session was active (processing/queued) when dialog closed
    // This prevents unnecessary refreshes for completed/failed sessions
    if (currentSessionStatus === 'processing' || currentSessionStatus === 'queued') {
      setTimeout(() => {
        loadSessions();
      }, 500);
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

            {/* API Key Configuration - Full width, outside the flex container */}
            {userInfo?.accountTier === 'FREE' && (
              <Slide direction="up" in timeout={1400}>
                <Box sx={{ mt: 4 }}>
                  <Collapse in={!userApiConfig?.hasApiKey} timeout={500}>
                    <Paper
                      elevation={2}
                      sx={{
                        p: 3,
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 2,
                        backdropFilter: 'blur(10px)',
                        width: '100%',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <KeyIcon sx={{ color: '#EF4444', fontSize: 20 }} />
                          <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
                            OpenAI API Key Required
                          </Typography>
                        </Box>
                        
                        {/* User Tier Badge */}
                        <Box sx={{
                          px: 2,
                          py: 0.5,
                          borderRadius: 2,
                          background: userInfo?.accountTier === 'FREE' 
                            ? 'rgba(239, 68, 68, 0.2)' 
                            : 'rgba(34, 197, 94, 0.2)',
                          border: userInfo?.accountTier === 'FREE' 
                            ? '1px solid rgba(239, 68, 68, 0.4)' 
                            : '1px solid rgba(34, 197, 94, 0.4)',
                          backdropFilter: 'blur(10px)'
                        }}>
                          <Typography variant="caption" sx={{ 
                            color: userInfo?.accountTier === 'FREE' ? '#EF4444' : '#22C55E',
                            fontWeight: 600,
                            fontSize: '0.75rem'
                          }}>
                            {userInfo?.accountTier || 'FREE'} USER
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Typography variant="body2" sx={{ color: '#E2E8F0', mb: 3, opacity: 0.9 }}>
                        Enter your OpenAI API key to enable AI-powered resume tailoring. Your key will be stored securely and encrypted.
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                        <TextField
                          fullWidth
                          label="OpenAI API Key"
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="sk-..."
                          size="small"
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowApiKey(!showApiKey)}
                                  edge="end"
                                  size="small"
                                  sx={{ color: '#94A3B8' }}
                                >
                                  {showApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(15, 23, 42, 0.3)',
                              borderRadius: 1,
                              '& fieldset': {
                                borderColor: 'rgba(239, 68, 68, 0.3)',
                              },
                              '&:hover fieldset': {
                                borderColor: '#EF4444',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#EF4444',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: '#94A3B8',
                              '&.Mui-focused': {
                                color: '#EF4444',
                              },
                            },
                            '& .MuiOutlinedInput-input': {
                              color: '#F8FAFC',
                            },
                          }}
                        />
                        
                        <Button
                          variant="contained"
                          onClick={handleSaveApiConfig}
                          disabled={savingApiConfig || !apiKey.trim()}
                          startIcon={<SaveIcon />}
                          size="small"
                          sx={{
                            background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)'
                            },
                            '&:disabled': {
                              background: 'rgba(239, 68, 68, 0.3)',
                              color: 'rgba(248, 250, 252, 0.5)'
                            },
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {savingApiConfig ? 'Saving...' : 'Save Key'}
                        </Button>
                      </Box>
                    </Paper>
                  </Collapse>
                  
                  {/* API Key Configured Status */}
                  <Collapse in={!!userApiConfig?.hasApiKey} timeout={500}>
                    <Paper
                      elevation={2}
                      sx={{
                        p: 2,
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: 2,
                        backdropFilter: 'blur(10px)',
                        width: '100%',
                      }}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        width: '100%',
                        gap: 2
                      }}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 2,
                          flex: 1,
                          minWidth: 0
                        }}>
                          <KeyIcon sx={{ color: '#22C55E', fontSize: 20, flexShrink: 0 }} />
                          <Typography variant="body2" sx={{ 
                            color: '#22C55E', 
                            fontWeight: 600,
                            flexShrink: 0
                          }}>
                            API Key Configured
                          </Typography>
                          <Typography variant="caption" sx={{ 
                            color: '#94A3B8',
                            ml: 1,
                            opacity: 0.8
                          }}>
                            • Last updated: {userApiConfig?.timestamp ? new Date(userApiConfig.timestamp).toLocaleString() : 'Unknown'}
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
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                            '&:hover': {
                              borderColor: '#DC2626',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)'
                            }
                          }}
                        >
                          {savingApiConfig ? 'Deleting...' : 'Remove'}
                        </Button>
                      </Box>
                    </Paper>
                  </Collapse>
                </Box>
              </Slide>
            )}
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
            {isFirstTimeUser && <FirstTimeUserWelcome />}

            {/* New Resume Form - Hidden by default if user has sessions */}
            {showNewResumeForm && (
              <NewResumeForm
                jobDescription={jobDescription}
                onJobDescriptionChange={setJobDescription}
                onSubmit={handleSubmit}
                onClose={!isFirstTimeUser ? handleToggleNewResumeForm : undefined}
                submitting={submitting}
                isFirstTimeUser={isFirstTimeUser}
              />
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
                    <ResumeSessionCard
                      session={session}
                      index={index}
                      onViewSession={handleViewSession}
                      onDeleteSession={handleDeleteSession}
                      formatDate={formatDate}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Slide>

                {/* Session Details Dialog */}
        <SessionDetailsDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          selectedSession={selectedSession}
          dialogLoading={dialogLoading}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onStartWorkflow={handleStartWorkflow}
          onDownloadPDF={handleDownloadPDF}
          onRegenerateLatex={handleRegenerateLatex}
          onDownloadLatexFile={handleDownloadLatexFile}
          onCopyToClipboard={handleCopyToClipboard}
          workflowLoading={workflowLoading}
          downloadPDFLoading={downloadPDFLoading}
          downloadLatexLoading={downloadLatexLoading}
          regenerateLatexLoading={regenerateLatexLoading}
          formatDate={formatDate}
        />
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