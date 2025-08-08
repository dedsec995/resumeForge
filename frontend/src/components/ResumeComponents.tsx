import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Box,
  CircularProgress,
  Paper,
  TextField,
  Button,
  Fade
} from '@mui/material';
import {
  Delete as DeleteIcon,
  AccessTime as TimeIcon,
  Description as DescriptionIcon,
  Add as AddIcon,
  ArrowForward as ArrowIcon,
  Psychology as AIIcon,
  Star as StarIcon
} from '@mui/icons-material';

// ============================================================================
// ResumeSessionCard Component
// ============================================================================

interface ResumeSession {
  sessionId: string;
  timestamp: string;
  status: string;
  preview: string;
  companyName?: string;
  position?: string;
}

interface ResumeSessionCardProps {
  session: ResumeSession;
  index: number;
  onViewSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  formatDate: (timestamp: string) => string;
}

export const ResumeSessionCard: React.FC<ResumeSessionCardProps> = ({
  session,
  index,
  onViewSession,
  onDeleteSession,
  formatDate
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          color: '#22C55E',
          borderColor: 'rgba(34, 197, 94, 0.3)'
        };
      case 'processing':
        return {
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          color: '#6366F1',
          borderColor: 'rgba(99, 102, 241, 0.3)'
        };
      case 'queued':
        return {
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          color: '#F59E0B',
          borderColor: 'rgba(245, 158, 11, 0.3)'
        };
      case 'failed':
        return {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: '#EF4444',
          borderColor: 'rgba(239, 68, 68, 0.3)'
        };
      default:
        return {
          backgroundColor: 'rgba(148, 163, 184, 0.1)',
          color: '#94A3B8',
          borderColor: 'rgba(148, 163, 184, 0.3)'
        };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'processing':
        return 'Processing...';
      case 'queued':
        return 'Queued...';
      case 'failed':
        return 'Failed';
      case 'completed':
        return 'Completed';
      case 'created':
        return 'Created';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <CircularProgress size={16} />;
      case 'queued':
        return <TimeIcon sx={{ fontSize: 16 }} />;
      case 'failed':
        return <DeleteIcon sx={{ fontSize: 16 }} />;
      default:
        return undefined;
    }
  };

  const statusStyles = getStatusColor(session.status);

  return (
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
        onClick={() => onViewSession(session.sessionId)}
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
                  onDeleteSession(session.sessionId);
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
              label={getStatusLabel(session.status)}
              size="small" 
              icon={getStatusIcon(session.status)}
              sx={{ 
                textTransform: 'capitalize',
                backgroundColor: statusStyles.backgroundColor,
                color: statusStyles.color,
                border: '1px solid',
                borderColor: statusStyles.borderColor
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
  );
};

// ============================================================================
// NewResumeForm Component
// ============================================================================

interface NewResumeFormProps {
  jobDescription: string;
  onJobDescriptionChange: (value: string) => void;
  onSubmit: () => void;
  onClose?: () => void;
  submitting: boolean;
  isFirstTimeUser: boolean;
}

export const NewResumeForm: React.FC<NewResumeFormProps> = ({
  jobDescription,
  onJobDescriptionChange,
  onSubmit,
  onClose,
  submitting,
  isFirstTimeUser
}) => {
  return (
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
          {!isFirstTimeUser && onClose && (
            <IconButton
              onClick={onClose}
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
          onChange={(e) => onJobDescriptionChange(e.target.value)}
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
            onClick={onSubmit}
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
  );
};

// ============================================================================
// FirstTimeUserWelcome Component
// ============================================================================

export const FirstTimeUserWelcome: React.FC = () => {
  return (
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
  );
};
