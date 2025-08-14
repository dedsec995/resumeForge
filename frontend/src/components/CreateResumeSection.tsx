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
  Fab,
  Zoom,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import { 
  Add as AddIcon,
  WorkOutline as ResumeIcon,
  Description as DescriptionIcon,
  Star as StarIcon,
  Search as SearchIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Key as KeyIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Psychology as AIIcon,
} from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/apiClient';
import { toast } from 'react-hot-toast';

// Import reusable components
import { ResumeSessionCard, NewResumeForm, FirstTimeUserWelcome } from './ResumeComponents';
import SessionDetailsDialog from './SessionDetailsDialog';
import ApiKeysConfiguration from './ApiKeysConfiguration';

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
  const [showNewResumeDialog, setShowNewResumeDialog] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [globalCounter, setGlobalCounter] = useState(0);
  const [individualCounter, setIndividualCounter] = useState(0);
  
  // Pagination state
  const [displayedSessions, setDisplayedSessions] = useState<ResumeSession[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreSessions, setHasMoreSessions] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalSessionsCount, setTotalSessionsCount] = useState(0);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ResumeSession[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const sessionsPerPage = 10;

  const [saveJsonLoading, setSaveJsonLoading] = useState(false);
  const [structuredData, setStructuredData] = useState<Record<string, unknown> | null>(null);
  const [userInfo, setUserInfo] = useState<{ accountTier?: string; email?: string; displayName?: string } | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'groq-google'>('openai');

  // Helper functions for provider management
  const saveSelectedProvider = async (provider: 'openai' | 'groq-google') => {
    try {
      const response = await apiClient.post('/apiConfig', {
        selectedProvider: provider
      });
      if (response.data.success) {
        console.log(`Selected provider saved: ${provider}`);
      }
    } catch (error) {
      console.error('Error saving selected provider:', error);
    }
  };

  const handleProviderChange = useCallback((provider: 'openai' | 'groq-google') => {
    setSelectedProvider(provider);
    saveSelectedProvider(provider);
  }, []);

  // Update individual session status in real-time
  const updateSessionStatus = useCallback(async (sessionId: string) => {
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
  }, [selectedSession]);

  // Load existing sessions on component mount
  useEffect(() => {
    loadSessions();
    loadGlobalCounter();
    loadIndividualCounter();
    loadUserInfo();
    loadApiConfig();
  }, []);

  // Set default provider for non-FREE users if no provider is saved
  useEffect(() => {
    if (userInfo?.accountTier && userInfo.accountTier !== 'FREE') {
      // Only set to groq-google if it's the default openai (meaning no saved preference)
      if (selectedProvider === 'openai') {
        handleProviderChange('groq-google');
      }
    }
  }, [userInfo?.accountTier, selectedProvider, handleProviderChange]);

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
  }, [sessions, selectedSession, dialogOpen, updateSessionStatus]);

  // Simple provider selection - no auto-override
  // User manually selects what they want, no complex logic

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
      // Use the new paginated endpoint to get all sessions
      const response = await apiClient.get('/getPaginatedResumeSessions?page=1&pageSize=1000');
      if (response.data.success) {
        const sessionsData = response.data.sessions;
        setSessions(sessionsData);
        
        setDisplayedSessions(sessionsData.slice(0, sessionsPerPage));
        setCurrentPage(1);
        setHasMoreSessions((response.data.totalSessions || sessionsData.length) > sessionsPerPage);
        setTotalSessionsCount(response.data.totalSessions);
        
        console.log('Pagination Debug:', {
          totalSessions: response.data.totalSessions,
          sessionsPerPage,
          hasMoreSessions: sessionsData.length > sessionsPerPage,
          displayedSessions: sessionsData.slice(0, sessionsPerPage).length
        });
        
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
      toast.error('Failed to load resume sessions', { icon: <ErrorIcon /> });
    } finally {
      setLoading(false);
    }
  };

  const loadMoreSessions = () => {
    if (loadingMore || !hasMoreSessions) return;
    
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    const startIndex = (nextPage - 1) * sessionsPerPage;
    const endIndex = startIndex + sessionsPerPage;
    
    const newSessions = sessions.slice(startIndex, endIndex);
    setDisplayedSessions(prev => [...prev, ...newSessions]);
    setCurrentPage(nextPage);
    setHasMoreSessions(endIndex < (totalSessionsCount || sessions.length));
    setLoadingMore(false);
  };

  const handleSubmit = async () => {
    if (!jobDescription.trim()) {
      toast.error('Please enter a job description', { icon: <ErrorIcon /> });
      return;
    }

    try {
      setSubmitting(true);

      const response = await apiClient.post('/createResumeSession', {
        jobDescription: jobDescription.trim()
      });

      if (response.data.success) {
        const sessionId = response.data.sessionId;
        toast.success('Resume session created! Starting automatic processing...', { icon: <SuccessIcon /> });
        setJobDescription('');
        
        // Automatically start the workflow
        try {
          setWorkflowLoading(sessionId);
          
          // Start the workflow

          const workflowResponse = await apiClient.post('/fullWorkflow', {
            sessionId: sessionId
          });

          if (workflowResponse.data.success) {
            toast.success('Processing started! Creating your tailored resume...', { icon: <SuccessIcon /> });
            
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
                  toast.success(`Resume processing completed! Final score: ${statusResponse.data.currentScore}/100`, { icon: <SuccessIcon /> });
                  
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
                  toast.error(`Processing failed: ${statusResponse.data.error || 'Unknown error'}`, { icon: <ErrorIcon /> });
                  
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
                toast.error('Error checking processing status', { icon: <ErrorIcon /> });
              }
            }, 3000); // Poll every 3 seconds
            
            // Set a timeout to stop polling after 10 minutes
            setTimeout(() => {
              clearInterval(pollInterval);
              setWorkflowLoading(null);
              toast.error('Processing timeout. Please check the session manually.', { icon: <WarningIcon /> });
              loadSessions();
              loadGlobalCounter(); // Refresh the global counter
              loadIndividualCounter(); // Refresh the individual counter
            }, 600000); // 10 minutes
            
          } else {
            setWorkflowLoading(null);
            toast.error('Failed to start processing', { icon: <ErrorIcon /> });
          }
        } catch (workflowError) {
          console.error('Error starting workflow:', workflowError);
          setWorkflowLoading(null);
          
          // Handle specific workflow errors with provider context
          const errorResponse = workflowError as { response?: { data?: { detail?: string } } };
          if (errorResponse.response?.data?.detail?.includes('API_KEY_ERROR')) {
            const getApiKeyErrorMessage = () => {
              if (selectedProvider === 'openai') {
                return 'OpenAI API key required. Please add your OpenAI API key below.';
              } else if (selectedProvider === 'groq-google') {
                return 'Groq and Google API keys required. Please add both keys below.';
              }
              return 'API keys required. Please add your API keys below.';
            };
            
            toast.error(getApiKeyErrorMessage(), { duration: 6000, icon: <KeyIcon /> });
          } else if (errorResponse.response?.data?.detail?.includes('INVALID_API_KEY')) {
            const getInvalidKeyMessage = () => {
              if (selectedProvider === 'openai') {
                return 'Invalid OpenAI API key. Please check your key.';
              } else if (selectedProvider === 'groq-google') {
                return 'Invalid Groq or Google API key. Please verify both keys.';
              }
              return 'Invalid API key. Please check your keys.';
            };
            
            toast.error(getInvalidKeyMessage(), { duration: 6000, icon: <KeyIcon /> });
          } else if (errorResponse.response?.data?.detail?.includes('MODEL_ERROR')) {
            toast.error('AI model unavailable. Please try again later.', { 
              duration: 5000, 
              icon: <WarningIcon />
            });
          } else {
            toast.error('Failed to start processing. You can retry manually.', { icon: <ErrorIcon /> });
          }
        }
        
        loadSessions(); // Refresh the sessions list and update form visibility
        loadGlobalCounter(); // Refresh the global counter
        loadIndividualCounter(); // Refresh the individual counter
      } else {
        toast.error('Failed to create resume session', { icon: <ErrorIcon /> });
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create resume session', { icon: <ErrorIcon /> });
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
          
          // Then get the full session data
          const response = await apiClient.get(`/getResumeSession/${sessionId}`);
          if (response.data.success && response.data.sessionData) {
            // Ensure the session data has the current status
            const sessionData = {
              ...response.data.sessionData,
              status: currentStatus
            };
            setSelectedSession(sessionData);
            
            // Initialize editable JSON with the session's tailored resume data
            if (sessionData.tailoredResume) {
              console.log('Setting structured data:', sessionData.tailoredResume);
              console.log('Projects in tailoredResume:', sessionData.tailoredResume.projects);
              setStructuredData(sessionData.tailoredResume);
            }
            
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
            toast.error('Failed to load session details', { icon: <ErrorIcon /> });
            setDialogOpen(false);
          }
        } catch (error) {
          console.error('Error fetching session:', error);
          toast.error('Failed to load session details', { icon: <ErrorIcon /> });
          setDialogOpen(false);
        } finally {
          setDialogLoading(false);
        }
      };
      
      // Load data in background
      loadSessionData();
      
    } catch (error) {
      console.error('Error opening session dialog:', error);
      toast.error('Failed to open session details', { icon: <ErrorIcon /> });
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
        toast.success('Session deleted successfully', { icon: <SuccessIcon /> });
        loadSessions(); // Refresh the sessions list
        // Note: We don't decrement the global counter when deleting sessions
        // as the global counter represents total job descriptions processed, not current sessions
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session', { icon: <ErrorIcon /> });
    }
  };

  const handleStartWorkflow = async (sessionId: string) => {
    if (!sessionId) {
      toast.error('No session selected', { icon: <ErrorIcon /> });
      return;
    }

    try {
      setWorkflowLoading(sessionId); // Set loading for specific session
      
      // Start the workflow

      const response = await apiClient.post('/fullWorkflow', {
        sessionId: sessionId
      });

      if (response.data.success) {
        toast.success('Workflow queued! Your resume will be processed in order...', { icon: <SuccessIcon /> });
        
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
              toast.success(`Workflow completed! Final score: ${statusResponse.data.currentScore}/100`, { icon: <SuccessIcon /> });
              
              // Refresh the session data to show updated results
              await handleViewSession(sessionId);
              
            } else if (status === 'failed') {
              clearInterval(pollInterval);
              setWorkflowLoading(null); // Clear loading for this session
              
              // Handle different error types with provider-specific messages
              if (statusResponse.data.errorType === 'API_KEY_ERROR') {
                const getApiKeyErrorMessage = () => {
                  if (selectedProvider === 'openai') {
                    return 'OpenAI API key required. Please add your OpenAI API key below.';
                  } else if (selectedProvider === 'groq-google') {
                    return 'Groq and Google API keys required. Please add both keys below.';
                  }
                  return 'API keys required. Please add your API keys below.';
                };
                
                toast.error(getApiKeyErrorMessage(), { duration: 6000, icon: <KeyIcon /> });
              } else if (statusResponse.data.errorType === 'INVALID_API_KEY') {
                const getInvalidKeyMessage = () => {
                  if (selectedProvider === 'openai') {
                    return 'Invalid OpenAI API key. Please check your key.';
                  } else if (selectedProvider === 'groq-google') {
                    return 'Invalid Groq or Google API key. Please verify both keys.';
                  }
                  return 'Invalid API key. Please check your keys.';
                };
                
                toast.error(getInvalidKeyMessage(), { duration: 6000, icon: <KeyIcon /> });
              } else if (statusResponse.data.errorType === 'MODEL_ERROR') {
                toast.error(
                  'AI model unavailable. Please try again later.',
                  { 
                    duration: 5000,
                    icon: <WarningIcon />
                  }
                );
              } else {
                toast.error(`Processing failed: ${statusResponse.data.error || 'Unknown error'}`, { icon: <ErrorIcon /> });
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
              icon: <WarningIcon />,
              duration: 5000 
            });
          }
        }, 300000); // 5 minutes
        
      } else {
        setWorkflowLoading(null); // Clear loading for this session
        toast.error('Failed to start workflow', { icon: <ErrorIcon /> });
      }
    } catch (error) {
      console.error('Error starting workflow:', error);
      setWorkflowLoading(null); // Clear loading for this session
      
      // Check if it's an API key error from the response
      const errorResponse = error as { response?: { data?: { detail?: string } } };
      if (errorResponse.response?.data?.detail?.includes('API_KEY_ERROR')) {
        const getApiKeyErrorMessage = () => {
          if (selectedProvider === 'openai') {
            return 'OpenAI API key required. Please add your OpenAI API key below.';
          } else if (selectedProvider === 'groq-google') {
            return 'Groq and Google API keys required. Please add both keys below.';
          }
          return 'API keys required. Please add your API keys below.';
        };
        
        toast.error(getApiKeyErrorMessage(), { duration: 6000, icon: <KeyIcon /> });
      } else if (errorResponse.response?.data?.detail?.includes('INVALID_API_KEY')) {
        const getInvalidKeyMessage = () => {
          if (selectedProvider === 'openai') {
            return 'Invalid OpenAI API key. Please check your key.';
          } else if (selectedProvider === 'groq-google') {
            return 'Invalid Groq or Google API key. Please verify both keys.';
          }
          return 'Invalid API key. Please check your keys.';
        };
        
        toast.error(getInvalidKeyMessage(), { duration: 6000, icon: <KeyIcon /> });
      } else if (errorResponse.response?.data?.detail?.includes('MODEL_ERROR')) {
        toast.error(
          'AI model unavailable. Please try again later.',
          { 
            duration: 5000,
            icon: <WarningIcon />
          }
        );
      } else {
        toast.error('Failed to start workflow. Please try again.', { icon: <ErrorIcon /> });
      }
    }
  };

  const handleDownloadPDF = async (sessionId: string) => {
    if (!sessionId) {
      toast.error('No session selected', { icon: <ErrorIcon /> });
      return;
    }

    try {
      setDownloadPDFLoading(sessionId);
      
      // First, ensure LaTeX file exists
      let latexResponse;
      try {
        latexResponse = await apiClient.post(`/generateLatex/${sessionId}`);
        if (latexResponse.data.success) {
          toast.success('LaTeX file generated successfully!', { icon: <SuccessIcon /> });
          await handleViewSession(sessionId);
        } else {
          throw new Error('Failed to generate LaTeX file');
        }
      } catch (latexError) {
        console.error('Error generating LaTeX file:', latexError);
        toast.error('Failed to generate LaTeX file', { icon: <ErrorIcon /> });
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
        
        toast.success('PDF downloaded successfully!', { icon: <DownloadIcon /> });
        await handleViewSession(sessionId);
      } catch (pdfError) {
        console.error('Error downloading PDF:', pdfError);
        toast.error('Failed to download PDF. Please try again.', { icon: <ErrorIcon /> });
      }
    } catch (error) {
      console.error('Error in PDF download process:', error);
              toast.error('Failed to process PDF download', { icon: <ErrorIcon /> });
    } finally {
      setDownloadPDFLoading(null);
    }
  };



  const handleDownloadLatexFile = async (sessionId: string) => {
    if (!sessionId) {
      toast.error('No session selected', { icon: <ErrorIcon /> });
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
      
              toast.success('LaTeX file downloaded successfully!', { icon: <DownloadIcon /> });
    } catch (error) {
      console.error('Error downloading LaTeX:', error);
      toast.error('Failed to download LaTeX file', { icon: <ErrorIcon /> });
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
        
        toast.success('LaTeX regenerated successfully!', { icon: <RefreshIcon /> });
      } else {
        toast.error('Failed to regenerate LaTeX', { icon: <ErrorIcon /> });
      }
    } catch (error) {
      console.error('Error regenerating LaTeX:', error);
              toast.error('Failed to regenerate LaTeX', { icon: <ErrorIcon /> });
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

  const handleOpenNewResumeDialog = () => {
    setShowNewResumeDialog(true);
  };

  const handleCloseNewResumeDialog = () => {
    setShowNewResumeDialog(false);
  };

  const handleCopyToClipboard = async (content: string, type: string) => {
    try {
      await navigator.clipboard.writeText(content);
              toast.success(`${type} copied to clipboard!`, { icon: <CopyIcon /> });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard', { icon: <ErrorIcon /> });
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

  const loadApiConfig = async () => {
    try {
      const response = await apiClient.get('/apiConfig');
      if (response.data.success && response.data.apiData) {
        const savedProvider = response.data.apiData.selectedProvider;
        if (savedProvider && (savedProvider === 'openai' || savedProvider === 'groq-google')) {
          setSelectedProvider(savedProvider);
        }
      }
    } catch (error) {
      console.error('Error loading API config:', error);
    }
  };







  const handleSaveJson = async () => {
    if (!selectedSession || !structuredData) {
              toast.error('No data to save', { icon: <ErrorIcon /> });
      return;
    }

    try {
      setSaveJsonLoading(true);

      // Update the session with the new structured data
      const response = await apiClient.post(`/updateSessionJson/${selectedSession.sessionId}`, {
        tailoredResume: structuredData
      });

      if (response.data.success) {
        toast.success('Resume data updated successfully!', { icon: <SaveIcon /> });
        
        // Update the selectedSession with the new data to ensure hasChanges is immediately correct
        if (selectedSession) {
          setSelectedSession({
            ...selectedSession,
            tailoredResume: structuredData
          });
        }
        
        // Refresh the session data to show updated content
        await handleViewSession(selectedSession.sessionId);
        
        // Stay on the current tab (Edit JSON tab) instead of switching
        // setActiveTab(1); // Removed automatic tab switching
      } else {
        toast.error('Failed to update resume data', { icon: <ErrorIcon /> });
      }
    } catch (error) {
      console.error('Error saving resume data:', error);
              toast.error('Failed to save resume data', { icon: <ErrorIcon /> });
    } finally {
      setSaveJsonLoading(false);
    }
  };

  const handleCloseDialog = () => {
    // Store the current session status before closing
    const currentSessionStatus = selectedSession?.status;
    
    setDialogOpen(false);
    setSelectedSession(null);
    
    setStructuredData(null); // Clear structured data when closing
    
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

  // Search functions
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    console.log('🔍 Starting search with query:', searchQuery);
    setIsSearching(true);
    
    try {
      const searchUrl = `/searchResumeSessions?query=${encodeURIComponent(searchQuery.trim())}`;
      console.log('🔍 Making API call to:', searchUrl);
      
      const response = await apiClient.get(searchUrl);
      console.log('🔍 Search response received:', response.data);
      
      if (response.data.success) {
        console.log('🔍 Search successful, found sessions:', response.data.sessions);
        setSearchResults(response.data.sessions);
        setDisplayedSessions(response.data.sessions);
        setTotalSessionsCount(response.data.totalSessions);
        toast.success(response.data.message, { icon: <SuccessIcon /> });
      } else {
        console.log('🔍 Search failed with response:', response.data);
        toast.error('Search failed', { icon: <ErrorIcon /> });
      }
    } catch (error) {
      console.error('🔍 Search error:', error);
      toast.error('Search failed', { icon: <ErrorIcon /> });
    } finally {
      setIsSearching(false);
      console.log('🔍 Search completed');
    }
  };

  const handleClearSearch = () => {
    console.log('🔍 Clearing search, resetting to all sessions');
    setSearchQuery('');
    setSearchResults([]);
    setDisplayedSessions(sessions);
    setTotalSessionsCount(sessions.length);
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

                        {/* User Tier Badge */}
                        <Box sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 1,
                          px: 2,
                          py: 0.5,
                          borderRadius: 2,
                          background: userInfo?.accountTier === 'FREE' 
                            ? 'rgba(34, 197, 94, 0.1)' 
                            : 'rgba(239, 68, 68, 0.1)',
                          border: userInfo?.accountTier === 'FREE' 
                            ? '1px solid rgba(34, 197, 94, 0.3)' 
                            : '1px solid rgba(239, 68, 68, 0.3)',
                          backdropFilter: 'blur(10px)'
                        }}>
                          <Box sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: userInfo?.accountTier === 'FREE' ? '#22C55E' : '#EF4444',
                            animation: 'pulse 2s infinite'
                          }} />
                          <Typography
                            variant="body2"
                            sx={{
                              color: userInfo?.accountTier === 'FREE' ? '#22C55E' : '#EF4444',
                              fontWeight: 600,
                              fontSize: '0.875rem'
                            }}
                          >
                            {userInfo?.accountTier || 'FREE'} USER
                          </Typography>
                        </Box>

                        {/* Provider Selection for ADMIN Users */}
                        {userInfo?.accountTier !== 'FREE' && (
                          <Box sx={{ display: 'flex', gap: 2, ml: 2 }}>
                            {/* Chat-GPT Bubble */}
                            <Box
                              onClick={() => handleProviderChange('openai')}
                              sx={{
                                px: 2,
                                py: 1,
                                borderRadius: 2.5,
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                border: '2px solid',
                                borderColor: selectedProvider === 'openai' ? '#6366F1' : 'rgba(99, 102, 241, 0.3)',
                                background: selectedProvider === 'openai' 
                                  ? 'rgba(99, 102, 241, 0.15)' 
                                  : 'rgba(99, 102, 241, 0.05)',
                                '&:hover': {
                                  borderColor: '#6366F1',
                                  background: 'rgba(99, 102, 241, 0.1)',
                                  transform: 'scale(1.05)',
                                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                                }
                              }}
                            >
                              <Typography sx={{
                                color: selectedProvider === 'openai' ? '#6366F1' : '#E2E8F0',
                                fontWeight: 600,
                                fontSize: '0.8rem'
                              }}>
                                Chat-GPT
                              </Typography>
                            </Box>

                            {/* Groq & Google Bubble */}
                            <Box
                              onClick={() => handleProviderChange('groq-google')}
                              sx={{
                                px: 2,
                                py: 1,
                                borderRadius: 2.5,
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                border: '2px solid',
                                borderColor: selectedProvider === 'groq-google' ? '#10B981' : 'rgba(16, 185, 129, 0.3)',
                                background: selectedProvider === 'groq-google' 
                                  ? 'rgba(16, 185, 129, 0.15)' 
                                  : 'rgba(16, 185, 129, 0.05)',
                                '&:hover': {
                                  borderColor: '#10B981',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  transform: 'scale(1.05)',
                                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                                }
                              }}
                            >
                              <Typography sx={{
                                color: selectedProvider === 'groq-google' ? '#10B981' : '#E2E8F0',
                                fontWeight: 600,
                                fontSize: '0.8rem'
                              }}>
                                Groq & Google
                              </Typography>
                            </Box>
                          </Box>
                        )}

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
                        onClick={handleOpenNewResumeDialog}
                        startIcon={<AddIcon />}
                        sx={{ 
                          px: 4,
                          py: 2,
                          fontSize: '1rem',
                          fontWeight: 600,
                          borderRadius: 3,
                          whiteSpace: 'nowrap',
                          backgroundColor: 'primary.main',
                          color: 'primary.contrastText',
                          '&:hover': {
                            backgroundColor: 'primary.dark',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)'
                          },
                          transition: 'all 0.3s ease-in-out',
                        }}
                      >
                        Create New Resume
                      </Button>
                    </Box>
                  </Fade>
                )}
              </Box>
            </Grow>



            {/* AI Provider & API Keys Configuration Component */}
            <ApiKeysConfiguration 
              userInfo={userInfo} 
              selectedProvider={selectedProvider}
              onProviderChange={handleProviderChange}
            />
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
              justifyContent: 'space-between',
              mb: 4,
              pb: 2,
              borderBottom: '1px solid rgba(99, 102, 241, 0.1)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <DescriptionIcon sx={{ color: '#6366F1', fontSize: 24, mr: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                  Resume Sessions ({totalSessionsCount || sessions.length})
                  {displayedSessions.length < (totalSessionsCount || sessions.length) && (
                    <Typography 
                      component="span" 
                      variant="h6" 
                      sx={{ 
                        color: '#94A3B8', 
                        fontWeight: 400, 
                        ml: 1,
                        opacity: 0.8
                      }}
                    >
                      (Showing {displayedSessions.length} of {totalSessionsCount || sessions.length})
                    </Typography>
                  )}
                </Typography>
              </Box>
              
              {/* Search Bar */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                  size="small"
                  placeholder={searchResults.length > 0 ? "Search active - type to refine..." : "Search company or position..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  sx={{
                    minWidth: 250,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: searchResults.length > 0 ? 'rgba(99, 102, 241, 0.1)' : 'rgba(15, 23, 42, 0.3)',
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: searchResults.length > 0 ? 'rgba(99, 102, 241, 0.6)' : 'rgba(99, 102, 241, 0.2)',
                      },
                      '&:hover fieldset': {
                        borderColor: searchResults.length > 0 ? 'rgba(99, 102, 241, 0.8)' : 'rgba(99, 102, 241, 0.4)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#6366F1',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: '#94A3B8',
                    },
                    '& .MuiOutlinedInput-input': {
                      color: '#F8FAFC',
                      '&::placeholder': {
                        color: searchResults.length > 0 ? '#6366F1' : '#64748B',
                        opacity: 1,
                      },
                    },
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isSearching}
                  startIcon={isSearching ? <CircularProgress size={16} /> : <SearchIcon />}
                  sx={{
                    px: 3,
                    py: 1,
                    backgroundColor: '#6366F1',
                    borderRadius: 2,
                    '&:hover': {
                      backgroundColor: '#4F46E5',
                      transform: 'translateY(-1px)',
                    },
                    '&:disabled': {
                      backgroundColor: 'rgba(99, 102, 241, 0.3)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
                {(searchQuery || searchResults.length > 0) && (
                  <Button
                    variant="outlined"
                    onClick={handleClearSearch}
                    size="small"
                    sx={{
                      px: 2,
                      py: 1,
                      borderColor: 'rgba(148, 163, 184, 0.3)',
                      color: '#94A3B8',
                      borderRadius: 2,
                      '&:hover': {
                        borderColor: '#94A3B8',
                        backgroundColor: 'rgba(148, 163, 184, 0.1)',
                      },
                    }}
                  >
                    Clear
                  </Button>
                )}
              </Box>
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
             ) : displayedSessions.length === 0 ? (
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
               <>
                 <Grid container spacing={3}>
                   {displayedSessions.map((session, index) => (
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
                 
                 {/* Load More Button */}
                 {hasMoreSessions && displayedSessions.length < (totalSessionsCount || sessions.length) && (
                   <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                     <Button
                       variant="outlined"
                       onClick={loadMoreSessions}
                       disabled={loadingMore}
                       startIcon={loadingMore ? <CircularProgress size={16} /> : null}
                       sx={{
                         px: 4,
                         py: 1.5,
                         fontSize: '1rem',
                         fontWeight: 600,
                         border: '2px solid rgba(99, 102, 241, 0.4)',
                         color: '#6366F1',
                         borderRadius: 3,
                         background: 'rgba(99, 102, 241, 0.05)',
                         backdropFilter: 'blur(10px)',
                         '&:hover': {
                           borderColor: '#6366F1',
                           backgroundColor: 'rgba(99, 102, 241, 0.1)',
                           transform: 'translateY(-2px)',
                           boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)'
                         },
                         transition: 'all 0.3s ease-in-out',
                         '&:disabled': {
                           borderColor: 'rgba(99, 102, 241, 0.2)',
                           color: 'rgba(99, 102, 241, 0.5)',
                           transform: 'none',
                           boxShadow: 'none'
                         }
                       }}
                     >
                                               {loadingMore ? 'Loading...' : `Load More (${(totalSessionsCount || sessions.length) - displayedSessions.length} remaining)`}
                     </Button>
                   </Box>
                 )}
               </>
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
          
          onSaveJson={handleSaveJson}
          saveJsonLoading={saveJsonLoading}
          structuredData={structuredData}
          onStructuredDataChange={setStructuredData}
          selectedProvider={selectedProvider}
        />

        {/* New Resume Dialog */}
        <Dialog
          open={showNewResumeDialog}
          onClose={handleCloseNewResumeDialog}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              background: 'rgba(30, 41, 59, 0.95)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              backdropFilter: 'blur(20px)',
              borderRadius: 3,
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
            }
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            pb: 2,
            borderBottom: '1px solid rgba(99, 102, 241, 0.1)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AIIcon sx={{ color: '#6366F1', fontSize: 24, mr: 1 }} />
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
                New Resume (Auto-Process)
              </Typography>
            </Box>
            
            {/* Current Provider Bubble */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                px: 2,
                py: 1,
                borderRadius: 2.5,
                border: '2px solid',
                borderColor: selectedProvider === 'openai' ? '#6366F1' : '#10B981',
                background: selectedProvider === 'openai' 
                  ? 'rgba(99, 102, 241, 0.15)' 
                  : 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Typography sx={{
                  color: selectedProvider === 'openai' ? '#6366F1' : '#10B981',
                  fontWeight: 600,
                  fontSize: '0.8rem'
                }}>
                  {selectedProvider === 'openai' ? 'Chat-GPT' : 'Groq & Google'}
                </Typography>
              </Box>
              
              <IconButton
                onClick={handleCloseNewResumeDialog}
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
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          
          <DialogContent sx={{ pt: 3, pb: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={8}
              label="Job Description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              sx={{ 
                my: 2,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(15, 23, 42, 0.3)',
                  borderRadius: 2,
                  minHeight: '200px',
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
                '& .MuiOutlinedInput-input': {
                  color: '#F8FAFC',
                  padding: '16px',
                  '&::placeholder': {
                    color: '#64748B',
                    opacity: 1,
                  },
                },
              }}
            />
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              mb: 2
            }}>
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                {jobDescription.length} characters, {jobDescription.split(/\s+/).filter(word => word.length > 0).length} words
              </Typography>
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
            <Button
              onClick={handleCloseNewResumeDialog}
              sx={{
                px: 3,
                py: 1.5,
                color: '#94A3B8',
                borderColor: 'rgba(148, 163, 184, 0.3)',
                '&:hover': {
                  borderColor: '#94A3B8',
                  backgroundColor: 'rgba(148, 163, 184, 0.1)',
                }
              }}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleSubmit();
                handleCloseNewResumeDialog();
              }}
              disabled={!jobDescription.trim() || submitting}
              variant="contained"
              startIcon={submitting ? <CircularProgress size={16} /> : <AddIcon />}
              sx={{
                px: 4,
                py: 1.5,
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5B21B6, #7C3AED)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 8px 25px rgba(99, 102, 241, 0.4)'
                },
                transition: 'all 0.3s ease-in-out',
              }}
            >
              {submitting ? 'Creating...' : 'Create & Process Resume'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>

      {/* Floating Action Button for Create New Resume */}
      <Zoom in={true} style={{ transitionDelay: '200ms' }}>
        <Fab
          color="primary"
          aria-label="Create New Resume"
          onClick={handleOpenNewResumeDialog}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            '&:hover': {
              transform: 'scale(1.1)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
            },
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 1000,
          }}
        >
          <AddIcon sx={{ fontSize: 28, color: '#FFFFFF' }} />
        </Fab>
      </Zoom>

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