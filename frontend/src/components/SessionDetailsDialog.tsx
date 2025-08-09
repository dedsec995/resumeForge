import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Box,
  Typography,
  Paper,
  Grid,
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
  TextField,
  Divider,
  Stack
} from '@mui/material';
import {
  Description as DescriptionIcon,
  DataObject as DataObjectIcon,
  Code as CodeIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

interface WorkflowResult {
  score: number;
  company_name: string;
  position: string;
  location: string;
  feedback: string;
  downsides: string;
  iteration_count: number;
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
  workflowResult?: WorkflowResult;
  tailoredResume?: Record<string, unknown>;
  score?: number;
  companyName?: string;
  position?: string;
  completedAt?: string;
  latexFilePath?: string;
  pdfFilePath?: string;
  latexContent?: string;
}

interface SessionDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  selectedSession: SessionData | null;
  dialogLoading: boolean;
  activeTab: number;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  onStartWorkflow: (sessionId: string) => void;
  onDownloadPDF: (sessionId: string) => void;
  onRegenerateLatex: (sessionId: string) => void;
  onDownloadLatexFile: (sessionId: string) => void;
  onCopyToClipboard: (content: string, type: string) => void;
  workflowLoading: string | null;
  downloadPDFLoading: string | null;
  downloadLatexLoading: string | null;
  regenerateLatexLoading: string | null;
  formatDate: (timestamp: string) => string;
  editableJson: string;
  onEditableJsonChange: (value: string) => void;
  onSaveJson: () => void;
  saveJsonLoading: boolean;
  structuredData: any;
  onStructuredDataChange: (data: any) => void;
}

const SessionDetailsDialog: React.FC<SessionDetailsDialogProps> = ({
  open,
  onClose,
  selectedSession,
  dialogLoading,
  activeTab,
  onTabChange,
  onStartWorkflow,
  onDownloadPDF,
  onRegenerateLatex,
  onDownloadLatexFile,
  onCopyToClipboard,
  workflowLoading,
  downloadPDFLoading,
  downloadLatexLoading,
  regenerateLatexLoading,
  formatDate,
  editableJson,
  onEditableJsonChange,
  onSaveJson,
  saveJsonLoading,
  structuredData,
      onStructuredDataChange
  }) => {
    // Function to detect if there are changes
    const hasChanges = React.useMemo(() => {
      if (!structuredData || !selectedSession?.tailoredResume) return false;
      
      try {
        // Deep comparison of the structured data with original
        return JSON.stringify(structuredData) !== JSON.stringify(selectedSession.tailoredResume);
      } catch (error) {
        console.error('Error comparing data:', error);
        return false;
      }
    }, [structuredData, selectedSession?.tailoredResume]);

    if (!selectedSession) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
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
         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
           <Typography variant="h5" sx={{ 
             fontWeight: 700, 
             background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
             backgroundClip: 'text',
             WebkitBackgroundClip: 'text',
             WebkitTextFillColor: 'transparent',
             display: 'inline'
           }}>
             {selectedSession.workflowResult?.company_name || 'Company Name'}
           </Typography>
           <Typography variant="h5" sx={{ 
             color: '#94A3B8', 
             fontWeight: 500,
             display: 'inline'
           }}>
             :
           </Typography>
           <Typography variant="h6" sx={{ 
             color: '#94A3B8', 
             fontWeight: 500,
             display: 'inline'
           }}>
             {selectedSession.workflowResult?.position || 'Position'}
                      </Typography>
         </Box>
           <Typography variant="body2" sx={{ 
            color: '#94A3B8',
            opacity: 0.8,
             fontSize: '0.75rem'
           }}>
             {formatDate(selectedSession.timestamp)}
           </Typography>
           <Typography variant="body2" sx={{ 
    fontFamily: 'monospace', 
    color: '#64748B',
    opacity: 0.7,
    fontSize: '0.75rem'
  }}>
    {selectedSession.sessionId}
  </Typography>
          <Chip 
          label={
            selectedSession.status === 'completed' && selectedSession.workflowResult?.score 
              ? `${selectedSession.workflowResult.score}/10` 
              : selectedSession.status === 'processing' ? 'Processing...' :
                selectedSession.status === 'queued' ? 'Queued...' :
                selectedSession.status
          } 
          size="small" 
          color={
            selectedSession.status === 'completed' ? 'success' : 
            selectedSession.status === 'processing' ? 'primary' : 
            selectedSession.status === 'queued' ? 'warning' :
            selectedSession.status === 'failed' ? 'error' : 'default'
          }
          sx={{ 
            textTransform: 'capitalize',
            backgroundColor: 
              selectedSession.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' :
              selectedSession.status === 'processing' ? 'rgba(99, 102, 241, 0.1)' :
              selectedSession.status === 'queued' ? 'rgba(245, 158, 11, 0.1)' :
              selectedSession.status === 'failed' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(148, 163, 184, 0.1)',
              color: 
              selectedSession.status === 'completed' ? '#22C55E' :
              selectedSession.status === 'processing' ? '#6366F1' :
              selectedSession.status === 'queued' ? '#F59E0B' :
              selectedSession.status === 'failed' ? '#EF4444' : '#94A3B8',
              border: '1px solid',
              borderColor: selectedSession.status === 'completed' ? 'rgba(34, 197, 94, 0.3)' :
                        selectedSession.status === 'processing' ? 'rgba(99, 102, 241, 0.3)' :
                        selectedSession.status === 'queued' ? 'rgba(245, 158, 11, 0.3)' :
                        selectedSession.status === 'failed' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(148, 163, 184, 0.3)'
          }}
        />
      </DialogTitle>
      
      <DialogContent sx={{ 
        height: 'calc(90vh - 200px)', 
        p: 3, 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
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
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'rgba(99, 102, 241, 0.2)', mb: 2, flexShrink: 0 }}>
              <Tabs 
                value={activeTab} 
                onChange={onTabChange}
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
                {selectedSession.tailoredResume && (
                  <Tab 
                    icon={<DataObjectIcon sx={{ fontSize: '1.1rem', mr: 0.5 }} />} 
                    label="Edit JSON" 
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
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Job Description Tab */}
              {activeTab === 0 && (
                <Paper 
                  elevation={4}
                  sx={{ 
                    p: 2, 
                    background: 'rgba(15, 23, 42, 0.4)',
                    flex: 1,
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
                    onClick={() => onCopyToClipboard(
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
                    flex: 1,
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
                    onClick={() => onCopyToClipboard(
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

              {/* Edit JSON Tab */}
              {activeTab === 2 && selectedSession.tailoredResume && (
                <Box sx={{ 
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}>
                  <Box sx={{ 
                    flex: 1, 
                    overflow: 'auto',
                    maxHeight: 'calc(100vh - 300px)',
                    minHeight: '400px',
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
                  }}>
                    <Stack spacing={4}>

                      {/* Technical Skills Section */}
                      {structuredData?.technicalSkillsCategories && (
                        <Box>
                          <Typography variant="h5" sx={{ 
                            color: '#6366F1', 
                            fontWeight: 700, 
                            mb: 3,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            🛠️ Technical Skills
                          </Typography>
                          <Paper sx={{ 
                            p: 3, 
                            background: 'rgba(15, 23, 42, 0.4)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: 2
                          }}>
                            <Stack spacing={2}>
                              {structuredData.technicalSkillsCategories.map((category: any, index: number) => (
                                <Box key={index}>
                                  <TextField
                                    fullWidth
                                    label="Category Name"
                                    value={category.categoryName || ''}
                                    onChange={(e) => {
                                      const newCategories = [...structuredData.technicalSkillsCategories];
                                      newCategories[index] = { ...newCategories[index], categoryName: e.target.value };
                                      onStructuredDataChange({
                                        ...structuredData,
                                        technicalSkillsCategories: newCategories
                                      });
                                    }}
                                    sx={{
                                      mb: 1,
                                      '& .MuiInputLabel-root': { color: 'rgba(226, 232, 240, 0.7)' },
                                      '& .MuiInputBase-root': { 
                                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                        color: '#E2E8F0',
                                        '& fieldset': { borderColor: 'rgba(99, 102, 241, 0.3)' }
                                      }
                                    }}
                                  />
                                  <TextField
                                    fullWidth
                                    multiline
                                    rows={2}
                                    label="Skills (comma separated)"
                                    value={category.skills || ''}
                                    onChange={(e) => {
                                      const newCategories = [...structuredData.technicalSkillsCategories];
                                      newCategories[index] = { ...newCategories[index], skills: e.target.value };
                                      onStructuredDataChange({
                                        ...structuredData,
                                        technicalSkillsCategories: newCategories
                                      });
                                    }}
                                    sx={{
                                      '& .MuiInputLabel-root': { color: 'rgba(226, 232, 240, 0.7)' },
                                      '& .MuiInputBase-root': { 
                                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                                        color: '#E2E8F0',
                                        '& fieldset': { borderColor: 'rgba(99, 102, 241, 0.3)' }
                                      }
                                    }}
                                  />
                                </Box>
                              ))}
                            </Stack>
                          </Paper>
                        </Box>
                      )}

                      {/* Work Experience Section */}
                      {(structuredData?.workExperience && (
                        Array.isArray(structuredData.workExperience) ? structuredData.workExperience.length > 0 :
                        (structuredData.workExperience.workExperience && Array.isArray(structuredData.workExperience.workExperience) && structuredData.workExperience.workExperience.length > 0)
                      )) && (
                        <Box>
                          <Typography variant="h5" sx={{ 
                            color: '#6366F1', 
                            fontWeight: 700, 
                            mb: 3,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            💼 Work Experience
                          </Typography>
                          <Paper sx={{ 
                            p: 3, 
                            background: 'rgba(15, 23, 42, 0.4)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: 2
                          }}>
                            <Stack spacing={3}>
                              {(Array.isArray(structuredData.workExperience) ? structuredData.workExperience : structuredData.workExperience.workExperience || []).map((exp: any, index: number) => (
                                <Paper key={index} sx={{ 
                                  p: 2, 
                                  background: 'rgba(15, 23, 42, 0.6)',
                                  border: '1px solid rgba(99, 102, 241, 0.1)'
                                }}>
                                  <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                      <TextField
                                        fullWidth
                                        label="Job Title"
                                        value={exp.jobTitle || exp.position || ''}
                                        onChange={(e) => {
                                          const workExpArray = Array.isArray(structuredData.workExperience) ? structuredData.workExperience : structuredData.workExperience.workExperience || [];
                                          const newExp = [...workExpArray];
                                          newExp[index] = { ...newExp[index], jobTitle: e.target.value, position: e.target.value };
                                          onStructuredDataChange({
                                            ...structuredData,
                                            workExperience: Array.isArray(structuredData.workExperience) ? newExp : { workExperience: newExp }
                                          });
                                        }}
                                        sx={{
                                          '& .MuiInputLabel-root': { color: 'rgba(226, 232, 240, 0.7)' },
                                          '& .MuiInputBase-root': { 
                                            backgroundColor: 'rgba(15, 23, 42, 0.8)',
                                            color: '#E2E8F0',
                                            '& fieldset': { borderColor: 'rgba(99, 102, 241, 0.3)' }
                                          }
                                        }}
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <TextField
                                        fullWidth
                                        label="Company"
                                        value={exp.company || exp.companyName || ''}
                                        onChange={(e) => {
                                          const workExpArray = Array.isArray(structuredData.workExperience) ? structuredData.workExperience : structuredData.workExperience.workExperience || [];
                                          const newExp = [...workExpArray];
                                          newExp[index] = { ...newExp[index], company: e.target.value, companyName: e.target.value };
                                          onStructuredDataChange({
                                            ...structuredData,
                                            workExperience: Array.isArray(structuredData.workExperience) ? newExp : { workExperience: newExp }
                                          });
                                        }}
                                        sx={{
                                          '& .MuiInputLabel-root': { color: 'rgba(226, 232, 240, 0.7)' },
                                          '& .MuiInputBase-root': { 
                                            backgroundColor: 'rgba(15, 23, 42, 0.8)',
                                            color: '#E2E8F0',
                                            '& fieldset': { borderColor: 'rgba(99, 102, 241, 0.3)' }
                                          }
                                        }}
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <TextField
                                        fullWidth
                                        label="Duration"
                                        value={exp.duration || exp.dates || ''}
                                        onChange={(e) => {
                                          const newExp = [...structuredData.workExperience];
                                          newExp[index] = { ...newExp[index], duration: e.target.value, dates: e.target.value };
                                          onStructuredDataChange({
                                            ...structuredData,
                                            workExperience: newExp
                                          });
                                        }}
                                        sx={{
                                          '& .MuiInputLabel-root': { color: 'rgba(226, 232, 240, 0.7)' },
                                          '& .MuiInputBase-root': { 
                                            backgroundColor: 'rgba(15, 23, 42, 0.8)',
                                            color: '#E2E8F0',
                                            '& fieldset': { borderColor: 'rgba(99, 102, 241, 0.3)' }
                                          }
                                        }}
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <TextField
                                        fullWidth
                                        label="Location"
                                        value={exp.location || ''}
                                        onChange={(e) => {
                                          const newExp = [...structuredData.workExperience];
                                          newExp[index] = { ...newExp[index], location: e.target.value };
                                          onStructuredDataChange({
                                            ...structuredData,
                                            workExperience: newExp
                                          });
                                        }}
                                        sx={{
                                          '& .MuiInputLabel-root': { color: 'rgba(226, 232, 240, 0.7)' },
                                          '& .MuiInputBase-root': { 
                                            backgroundColor: 'rgba(15, 23, 42, 0.8)',
                                            color: '#E2E8F0',
                                            '& fieldset': { borderColor: 'rgba(99, 102, 241, 0.3)' }
                                          }
                                        }}
                                      />
                                    </Grid>
                                    <Grid item xs={12}>
                                      <TextField
                                        fullWidth
                                        multiline
                                        minRows={3}
                                        maxRows={20}
                                        label="Bullet Points (one per line)"
                                        placeholder="Developed and maintained web applications&#10;Collaborated with cross-functional teams&#10;Implemented new features and bug fixes"
                                        value={
                                          Array.isArray(exp.bulletPoints) ? exp.bulletPoints.join('\n') : 
                                          Array.isArray(exp.bullets) ? exp.bullets.join('\n') : 
                                          Array.isArray(exp.description) ? exp.description.join('\n') : 
                                          typeof exp.bulletPoints === 'string' ? exp.bulletPoints :
                                          typeof exp.bullets === 'string' ? exp.bullets :
                                          typeof exp.description === 'string' ? exp.description :
                                          exp.summary || ''
                                        }
                                        onChange={(e) => {
                                          const workExpArray = Array.isArray(structuredData.workExperience) ? structuredData.workExperience : structuredData.workExperience.workExperience || [];
                                          const newExp = [...workExpArray];
                                          const lines = e.target.value.split('\n').map(d => d.trim()).filter(d => d);
                                          newExp[index] = { 
                                            ...newExp[index], 
                                            bulletPoints: lines,
                                            bullets: lines,
                                            description: lines
                                          };
                                          onStructuredDataChange({
                                            ...structuredData,
                                            workExperience: Array.isArray(structuredData.workExperience) ? newExp : { workExperience: newExp }
                                          });
                                        }}
                                        sx={{
                                          '& .MuiInputLabel-root': { color: 'rgba(226, 232, 240, 0.7)' },
                                          '& .MuiInputBase-root': { 
                                            backgroundColor: 'rgba(15, 23, 42, 0.8)',
                                            color: '#E2E8F0',
                                            '& fieldset': { borderColor: 'rgba(99, 102, 241, 0.3)' }
                                          }
                                        }}
                                      />
                                    </Grid>
                                  </Grid>
                                </Paper>
                              ))}
                            </Stack>
                          </Paper>
                        </Box>
                      )}

                      {/* Projects Section */}
                      {(structuredData?.projects && (
                        Array.isArray(structuredData.projects) ? structuredData.projects.length > 0 :
                        (structuredData.projects.projects && Array.isArray(structuredData.projects.projects) && structuredData.projects.projects.length > 0)
                      )) && (
                        <Box>
                          <Typography variant="h5" sx={{ 
                            color: '#6366F1', 
                            fontWeight: 700, 
                            mb: 3,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}>
                            🚀 Projects
                          </Typography>
                          <Paper sx={{ 
                            p: 3, 
                            background: 'rgba(15, 23, 42, 0.4)',
                            border: '1px solid rgba(99, 102, 241, 0.2)',
                            borderRadius: 2
                          }}>
                            <Stack spacing={3}>
                              {(Array.isArray(structuredData.projects) ? structuredData.projects : structuredData.projects.projects || []).map((project: any, index: number) => (
                                <Paper key={index} sx={{ 
                                  p: 2, 
                                  background: 'rgba(15, 23, 42, 0.6)',
                                  border: '1px solid rgba(99, 102, 241, 0.1)'
                                }}>
                                  <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                      <TextField
                                        fullWidth
                                        label="Project Name"
                                        value={project.projectName || project.name || project.title || ''}
                                        onChange={(e) => {
                                          const newProjects = [...structuredData.projects];
                                          newProjects[index] = { 
                                            ...newProjects[index], 
                                            name: e.target.value,
                                            title: e.target.value,
                                            projectName: e.target.value 
                                          };
                                          onStructuredDataChange({
                                            ...structuredData,
                                            projects: newProjects
                                          });
                                        }}
                                        sx={{
                                          '& .MuiInputLabel-root': { color: 'rgba(226, 232, 240, 0.7)' },
                                          '& .MuiInputBase-root': { 
                                            backgroundColor: 'rgba(15, 23, 42, 0.8)',
                                            color: '#E2E8F0',
                                            '& fieldset': { borderColor: 'rgba(99, 102, 241, 0.3)' }
                                          }
                                        }}
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <TextField
                                        fullWidth
                                        label="Link/URL"
                                        value={project.projectLink || project.link || project.url || ''}
                                        onChange={(e) => {
                                          const newProjects = [...structuredData.projects];
                                          newProjects[index] = { 
                                            ...newProjects[index], 
                                            link: e.target.value,
                                            url: e.target.value,
                                            projectLink: e.target.value 
                                          };
                                          onStructuredDataChange({
                                            ...structuredData,
                                            projects: newProjects
                                          });
                                        }}
                                        sx={{
                                          '& .MuiInputLabel-root': { color: 'rgba(226, 232, 240, 0.7)' },
                                          '& .MuiInputBase-root': { 
                                            backgroundColor: 'rgba(15, 23, 42, 0.8)',
                                            color: '#E2E8F0',
                                            '& fieldset': { borderColor: 'rgba(99, 102, 241, 0.3)' }
                                          }
                                        }}
                                      />
                                    </Grid>
                                    <Grid item xs={12}>
                                      <TextField
                                        fullWidth
                                        label="Technologies (comma separated)"
                                        value={Array.isArray(project.techStack) ? project.techStack.join(', ') : 
                                               Array.isArray(project.technologies) ? project.technologies.join(', ') :
                                               project.techStack || project.technologies || ''}
                                        onChange={(e) => {
                                          const techArray = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                                          const newProjects = [...structuredData.projects];
                                          newProjects[index] = { 
                                            ...newProjects[index], 
                                            techStack: e.target.value,
                                            technologies: techArray 
                                          };
                                          onStructuredDataChange({
                                            ...structuredData,
                                            projects: newProjects
                                          });
                                        }}
                                        sx={{
                                          '& .MuiInputLabel-root': { color: 'rgba(226, 232, 240, 0.7)' },
                                          '& .MuiInputBase-root': { 
                                            backgroundColor: 'rgba(15, 23, 42, 0.8)',
                                            color: '#E2E8F0',
                                            '& fieldset': { borderColor: 'rgba(99, 102, 241, 0.3)' }
                                          }
                                        }}
                                      />
                                    </Grid>
                                    <Grid item xs={12}>
                                                                              <TextField
                                        fullWidth
                                        multiline
                                        minRows={3}
                                        maxRows={20}
                                        label="Bullet Points (one per line)"
                                        placeholder="Built a full-stack application&#10;Implemented responsive design&#10;Integrated third-party APIs"
                                        value={
                                          typeof project.bulletPoints === 'string' ? project.bulletPoints :
                                          Array.isArray(project.bulletPoints) ? project.bulletPoints.join('\n') : 
                                          typeof project.bullets === 'string' ? project.bullets :
                                          Array.isArray(project.bullets) ? project.bullets.join('\n') : 
                                          typeof project.description === 'string' ? project.description :
                                          Array.isArray(project.description) ? project.description.join('\n') :
                                          project.summary || ''
                                        }
                                        onChange={(e) => {
                                          const projectsArray = Array.isArray(structuredData.projects) ? structuredData.projects : structuredData.projects.projects || [];
                                          const lines = e.target.value.split('\n').map(d => d.trim()).filter(d => d);
                                          const newProjects = [...projectsArray];
                                          newProjects[index] = { 
                                            ...newProjects[index], 
                                            bulletPoints: e.target.value,
                                            bullets: lines,
                                            description: lines
                                          };
                                          onStructuredDataChange({
                                            ...structuredData,
                                            projects: Array.isArray(structuredData.projects) ? newProjects : { projects: newProjects }
                                          });
                                        }}
                                        sx={{
                                          '& .MuiInputLabel-root': { color: 'rgba(226, 232, 240, 0.7)' },
                                          '& .MuiInputBase-root': { 
                                            backgroundColor: 'rgba(15, 23, 42, 0.8)',
                                            color: '#E2E8F0',
                                            '& fieldset': { borderColor: 'rgba(99, 102, 241, 0.3)' }
                                          }
                                        }}
                                      />
                                    </Grid>
                                  </Grid>
                                </Paper>
                              ))}
                            </Stack>
                          </Paper>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                  
                </Box>
              )}

              {/* Generated LaTeX Tab */}
              {activeTab === 3 && selectedSession.latexFilePath && (
                <Paper 
                  elevation={4}
                  sx={{ 
                    p: 2, 
                    background: 'rgba(15, 23, 42, 0.4)',
                    flex: 1,
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
                    onClick={() => onCopyToClipboard(
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
              {activeTab === 4 && selectedSession.status === 'completed' && selectedSession.workflowResult && (
                <Paper 
                  elevation={4}
                  sx={{ 
                    p: 2, 
                    background: 'rgba(15, 23, 42, 0.4)',
                    flex: 1,
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
                      const feedbackContent = `💡 Feedback\n\n${selectedSession.workflowResult?.feedback || ''}${selectedSession.workflowResult?.downsides ? `\n\n🔧 Areas for Improvement\n\n${selectedSession.workflowResult.downsides}` : ''}`;
                      onCopyToClipboard(feedbackContent, 'Feedback');
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
                      {selectedSession.workflowResult?.feedback || 'No feedback available'}
                    </Typography>
                    
                    {selectedSession.workflowResult?.downsides && (
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
                          {selectedSession.workflowResult?.downsides}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Paper>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 2, borderTop: '1px solid rgba(99, 102, 241, 0.2)' }}>
        {!selectedSession?.latexFilePath ? (
          <Button 
            variant="contained" 
            onClick={() => {
              if (selectedSession?.status === 'completed') {
                onDownloadPDF(selectedSession.sessionId);
              } else if (selectedSession?.status === 'failed' || selectedSession?.status === 'created') {
                onStartWorkflow(selectedSession.sessionId);
              }
              // For 'queued' and 'processing' states, do nothing (button should be disabled)
            }}
            disabled={
              workflowLoading === selectedSession?.sessionId || 
              downloadPDFLoading === selectedSession?.sessionId ||
              selectedSession?.status === 'queued' ||
              selectedSession?.status === 'processing'
            }
            startIcon={
              (workflowLoading === selectedSession?.sessionId || downloadPDFLoading === selectedSession?.sessionId) ? 
              <CircularProgress size={16} /> : 
              (selectedSession?.status === 'queued' || selectedSession?.status === 'processing') ? 
              <CircularProgress size={16} /> : null
            }
            sx={{ 
              mr: 'auto',
              px: 4,
              py: 1.5,
              borderRadius: 2,
              background: 
                selectedSession?.status === 'queued' ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' :
                selectedSession?.status === 'processing' ? 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' :
                selectedSession?.status === 'completed' ? 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' :
                selectedSession?.status === 'failed' ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' :
                'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
              '&:hover': {
                background: 
                  selectedSession?.status === 'queued' ? 'linear-gradient(135deg, #D97706 0%, #B45309 100%)' :
                  selectedSession?.status === 'processing' ? 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)' :
                  selectedSession?.status === 'completed' ? 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)' :
                  selectedSession?.status === 'failed' ? 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)' :
                  'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)',
                boxShadow: '0 6px 20px rgba(99, 102, 241, 0.6)',
                transform: 'translateY(-1px)'
              },
              '&:disabled': {
                background: 
                  selectedSession?.status === 'queued' ? 'rgba(245, 158, 11, 0.3)' :
                  selectedSession?.status === 'processing' ? 'rgba(99, 102, 241, 0.3)' :
                  selectedSession?.status === 'completed' ? 'rgba(34, 197, 94, 0.3)' :
                  selectedSession?.status === 'failed' ? 'rgba(239, 68, 68, 0.3)' :
                  'rgba(99, 102, 241, 0.3)',
                transform: 'none'
              },
              transition: 'all 0.3s ease'
            }}
          >
            {workflowLoading === selectedSession?.sessionId ? 'Processing Resume (1-2 min)...' : 
             downloadPDFLoading === selectedSession?.sessionId ? 'Generating...' : 
             selectedSession?.status === 'completed' ? 'Generate LaTeX' :
             selectedSession?.status === 'queued' ? 'Queued...' :
             selectedSession?.status === 'processing' ? 'Processing...' :
             selectedSession?.status === 'failed' ? 'Retry Workflow' :
             'Start Resume Workflow'}
          </Button>
        ) : (
          <Button 
            variant="contained" 
            onClick={() => onDownloadPDF(selectedSession.sessionId)}
            disabled={downloadPDFLoading === selectedSession?.sessionId || downloadLatexLoading === selectedSession?.sessionId}
            startIcon={downloadPDFLoading === selectedSession?.sessionId ? <CircularProgress size={16} /> : null}
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
            {downloadPDFLoading === selectedSession?.sessionId ? 'Generating & Downloading...' : 'Download PDF'}
          </Button>
        )}
        
        {/* Save Changes Button - Only visible on Edit JSON tab */}
        {activeTab === 2 && (
          <Button
            variant="contained"
            onClick={onSaveJson}
            disabled={saveJsonLoading || !structuredData || !hasChanges}
            startIcon={saveJsonLoading ? <CircularProgress size={16} /> : null}
            sx={{
              px: 3,
              py: 1.5,
              borderRadius: 2,
              background: 'linear-gradient(45deg, #10B981 0%, #059669 100%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #059669 0%, #047857 100%)',
                transform: 'translateY(-1px)'
              },
              '&:disabled': {
                background: 'rgba(16, 185, 129, 0.3)',
              },
              transition: 'all 0.3s ease'
            }}
          >
            {saveJsonLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
        
        {selectedSession?.latexFilePath && (
          <>
            <Button 
              variant="outlined" 
              onClick={() => onRegenerateLatex(selectedSession.sessionId)}
              disabled={downloadPDFLoading === selectedSession?.sessionId || downloadLatexLoading === selectedSession?.sessionId || regenerateLatexLoading === selectedSession?.sessionId}
              startIcon={regenerateLatexLoading === selectedSession?.sessionId ? <CircularProgress size={16} /> : <RefreshIcon />}
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
              {regenerateLatexLoading === selectedSession?.sessionId ? 'Regenerating...' : 'Regenerate LaTeX'}
            </Button>
            <Button 
              variant="outlined" 
              onClick={() => onDownloadLatexFile(selectedSession.sessionId)}
              disabled={downloadPDFLoading === selectedSession?.sessionId || downloadLatexLoading === selectedSession?.sessionId || regenerateLatexLoading === selectedSession?.sessionId}
              startIcon={downloadLatexLoading === selectedSession?.sessionId ? <CircularProgress size={16} /> : null}
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
              {downloadLatexLoading === selectedSession?.sessionId ? 'Downloading...' : 'Download LaTeX'}
            </Button>
          </>
        )}
        
        <Button 
          onClick={onClose}
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
  );
};

export default SessionDetailsDialog;
