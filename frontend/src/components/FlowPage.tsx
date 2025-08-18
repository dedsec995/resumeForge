import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  IconButton,
  Chip,
  Fade
} from '@mui/material';
import {
  AccountTree as FlowIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Refresh as RestartIcon,
  SkipNext as NextIcon,
  SkipPrevious as PrevIcon,
  DataObject as DataIcon,
  Psychology as AIIcon,
  Speed as ProcessIcon
} from '@mui/icons-material';

// Flow nodes based on actual agent.py StateGraph - properly centered
const flowNodes = [
  {
    id: 'get_initial_data',
    label: 'Get Initial Data',
    description: 'Load and prepare resume data for processing',
    type: 'process',
    color: '#10B981',
    position: { x: 50, y: 2 }
  },
  {
    id: 'extract_info', 
    label: 'Extract Info',
    description: 'Extract company, position, and location from job description',
    type: 'ai',
    color: '#F59E0B',
    position: { x: 50, y: 8 }
  },
  {
    id: 'decide_extract',
    label: 'Decision Point',
    description: 'Check if summary editing is enabled',
    type: 'decision',
    color: '#8B5CF6',
    position: { x: 50, y: 14 }
  },
  {
    id: 'edit_summary',
    label: 'Edit Summary',
    description: 'Tailor professional summary to match job requirements',
    type: 'ai',
    color: '#EC4899',
    position: { x: 30, y: 20 } // Slightly offset for branching visual
  },
  {
    id: 'edit_technical_skills',
    label: 'Edit Technical Skills', 
    description: 'Optimize technical skills section for relevance',
    type: 'ai',
    color: '#06B6D4',
    position: { x: 50, y: 26 }
  },
  {
    id: 'edit_experience',
    label: 'Edit Experience',
    description: 'Enhance work experience descriptions and achievements',
    type: 'ai',
    color: '#84CC16',
    position: { x: 50, y: 32 }
  },
  {
    id: 'edit_projects',
    label: 'Edit Projects',
    description: 'Refine project descriptions to highlight relevant skills',
    type: 'ai', 
    color: '#F97316',
    position: { x: 50, y: 38 }
  },
  {
    id: 'judge_resume_quality',
    label: 'Judge Quality',
    description: 'Evaluate resume quality and provide feedback',
    type: 'judge',
    color: '#EF4444',
    position: { x: 50, y: 44 }
  },
  {
    id: 'decide_quality',
    label: 'Quality Decision',
    description: 'Check if score meets threshold or max iterations reached',
    type: 'decision',
    color: '#8B5CF6',
    position: { x: 50, y: 50 }
  },
  {
    id: 'keywords_editor',
    label: 'Keywords Editor',
    description: 'Extract and embed relevant keywords for ATS optimization',
    type: 'ai',
    color: '#3B82F6',
    position: { x: 50, y: 56 }
  },
  {
    id: 'end',
    label: 'END',
    description: 'Final tailored resume ready for submission',
    type: 'end',
    color: '#10B981',
    position: { x: 50, y: 62 }
  }
];

// Flow connections based on actual agent.py workflow
const flowConnections = [
  { from: 'get_initial_data', to: 'extract_info', label: '' },
  { from: 'extract_info', to: 'decide_extract', label: '' },
  { from: 'decide_extract', to: 'edit_summary', label: 'edit_summary enabled' },
  { from: 'decide_extract', to: 'edit_technical_skills', label: 'edit_summary disabled' },
  { from: 'edit_summary', to: 'edit_technical_skills', label: '' },
  { from: 'edit_technical_skills', to: 'edit_experience', label: '' },
  { from: 'edit_experience', to: 'edit_projects', label: '' },
  { from: 'edit_projects', to: 'judge_resume_quality', label: '' },
  { from: 'judge_resume_quality', to: 'decide_quality', label: '' },
  { from: 'decide_quality', to: 'edit_summary', label: 'score < threshold & iterations < 3' },
  { from: 'decide_quality', to: 'edit_technical_skills', label: 'score < threshold & no summary' },
  { from: 'decide_quality', to: 'keywords_editor', label: 'score >= threshold or max iterations' },
  { from: 'keywords_editor', to: 'end', label: '' }
];

const FlowPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Auto-play animation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && currentStep < flowNodes.length - 1) {
      interval = setInterval(() => {
        setCurrentStep(prev => prev + 1);
      }, 2000);
    } else if (currentStep >= flowNodes.length - 1) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentStep]);

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const handleNext = () => {
    if (currentStep < flowNodes.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const getNodeStatus = (index: number) => {
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'active';
    return 'pending';
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'ai': return <AIIcon />;
      case 'decision': return <ProcessIcon />;
      case 'judge': return <ProcessIcon />;
      case 'process': return <DataIcon />;
      case 'end': return <DataIcon />;
      default: return <DataIcon />;
    }
  };
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header Section */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
          <FlowIcon sx={{ fontSize: '2.5rem', color: '#6366F1' }} />
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 700,
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Agentic Flow
          </Typography>
        </Box>
        <Typography 
          variant="h6" 
          sx={{ 
            color: '#94A3B8', 
            fontWeight: 400,
            maxWidth: '600px',
            mx: 'auto'
          }}
        >
          Interactive visualization of how our AI processes and tailors your resume
        </Typography>
      </Box>

      {/* Control Panel */}
      <Paper 
        elevation={3}
        sx={{ 
          p: 2, 
          mb: 3,
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2
        }}
      >
        <IconButton 
          onClick={handlePrev} 
          disabled={currentStep === 0}
          sx={{ color: '#6366F1' }}
        >
          <PrevIcon />
        </IconButton>
        
        <IconButton 
          onClick={handlePlay}
          sx={{ 
            color: '#6366F1',
            backgroundColor: isPlaying ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
            '&:hover': { backgroundColor: 'rgba(99, 102, 241, 0.2)' }
          }}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </IconButton>
        
        <IconButton 
          onClick={handleNext} 
          disabled={currentStep === flowNodes.length - 1}
          sx={{ color: '#6366F1' }}
        >
          <NextIcon />
        </IconButton>
        
        <IconButton 
          onClick={handleRestart}
          sx={{ color: '#6366F1' }}
        >
          <RestartIcon />
        </IconButton>

        <Box sx={{ mx: 2 }}>
          <Chip 
            label={`Step ${currentStep + 1} of ${flowNodes.length}`}
            sx={{ 
              backgroundColor: 'rgba(99, 102, 241, 0.2)',
              color: '#E2E8F0'
            }}
          />
        </Box>

        <Typography variant="body2" sx={{ color: '#94A3B8' }}>
          {flowNodes[currentStep]?.label || 'Start'}
        </Typography>
      </Paper>

      {/* Interactive Flow Diagram */}
      <Paper 
        elevation={4}
        sx={{ 
          p: 3, 
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: 3,
          backdropFilter: 'blur(10px)',
          position: 'relative',
          overflow: 'visible'
        }}
      >
         <Box sx={{ 
           position: 'relative', 
           minHeight: `${flowNodes.length * 120 + 200 + 50}px`, // Add extra height for bottom spacing
           width: '100%',
           display: 'flex',
           flexDirection: 'column',
           alignItems: 'center',
           justifyContent: 'flex-start',
           paddingTop: '40px'
         }}>
          {/* Flow Nodes */}
          {flowNodes.map((node, index) => {
            const status = getNodeStatus(index);
            const isActive = status === 'active';
            const isCompleted = status === 'completed';
            
            const getShapeStyle = (nodeType: string) => {
              switch (nodeType) {
                case 'process':
                case 'end':
                  return {
                    borderRadius: '25px', // Oval shape
                    width: '180px',
                    height: '60px'
                  };
                case 'decision':
                  return {
                    borderRadius: '4px',
                    width: '100px',
                    height: '100px',
                    transform: 'translateX(-50%) rotate(45deg)',
                    '& .content': {
                      transform: 'rotate(-45deg)',
                      width: '80px',
                      height: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      gap: '2px'
                    }
                  };
                case 'ai':
                case 'judge':
                default:
                  return {
                    borderRadius: '8px', // Rectangle
                    width: '180px',
                    height: '60px'
                  };
              }
            };

            return (
              <Fade in timeout={500 + index * 100} key={node.id}>
                <Box>
                  {/* Main Shape */}
                  <Box
                    onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                    sx={{
                      position: 'absolute',
                      left: node.id === 'edit_summary' ? '30%' : '50%',
                      top: `${index * 120 + 40 + (index > 8 ? 50 : 0)}px`, // Add extra spacing after Quality Decision
                      transform: node.type === 'decision' ? 'translateX(-50%) rotate(45deg)' : 'translateX(-50%)',
                      ...getShapeStyle(node.type),
                      transformOrigin: 'center center',
                      background: isActive 
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.2) 100%)'
                        : isCompleted 
                          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 0.2) 100%)'
                          : 'rgba(15, 23, 42, 0.8)',
                      border: `3px solid ${
                        isCompleted ? '#10B981' : 
                        isActive ? '#F59E0B' : 
                        '#64748B'
                      }`,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease-in-out',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isActive ? `0 0 20px ${node.color}40` : 'none',
                      '&:hover': {
                        transform: node.type === 'decision' ? 'translateX(-50%) rotate(45deg) scale(1.02)' : 'translateX(-50%) scale(1.02)',
                        boxShadow: `0 4px 15px ${node.color}40`
                      }
                    }}
                  >
                    <Box 
                      className="content"
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: node.type === 'decision' ? 0.5 : 1,
                        textAlign: 'center',
                        flexDirection: node.type === 'decision' ? 'column' : 'row'
                      }}
                    >
                      <Box sx={{ color: node.color }}>
                        {getNodeIcon(node.type)}
                      </Box>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          color: '#E2E8F0',
                          fontWeight: 600,
                          fontSize: node.type === 'decision' ? '0.7rem' : '0.8rem',
                          lineHeight: 1.2
                        }}
                      >
                        {node.label}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Status Chip - Centered above node */}
                  <Chip
                    size="small"
                    label={
                      isCompleted ? 'Completed' : 
                      isActive ? 'Processing' : 
                      'Pending'
                    }
                    sx={{
                      position: 'absolute',
                      left: node.id === 'edit_summary' ? '30%' : '50%',
                      top: `${index * 120 + 15 + (index > 8 ? 50 : 0)}px`, // Add extra spacing after Quality Decision
                      transform: 'translateX(-50%)',
                      backgroundColor: `${
                        isCompleted ? '#10B981' : 
                        isActive ? '#F59E0B' : 
                        '#64748B'
                      }20`,
                      color: isCompleted ? '#10B981' : 
                             isActive ? '#F59E0B' : 
                             '#64748B',
                      fontSize: '0.5rem',
                      height: '18px',
                      zIndex: 10
                    }}
                  />
                </Box>
              </Fade>
            );
          })}

          {/* Node Information Card - Sticky Top Right */}
          {selectedNode && (
            <Fade in timeout={300}>
              <Paper 
                elevation={6}
                sx={{ 
                  position: 'sticky',
                  top: '100px', // Add more space to clear the navbar
                  right: '20px',
                  width: '280px',
                  height: 'fit-content',
                  maxHeight: 'calc(100vh - 220px)', // Account for navbar + padding
                  p: 2.5,
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: 2,
                  backdropFilter: 'blur(10px)',
                  zIndex: 30,
                  alignSelf: 'flex-end',
                  marginLeft: 'auto',
                  marginRight: '20px',
                  display: { xs: 'none', md: 'block' } // Hide on mobile, show on desktop
                }}
              >
                {(() => {
                  const node = flowNodes.find(n => n.id === selectedNode);
                  if (!node) return null;
                  
                  return (
                    <Box>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          color: '#E2E8F0',
                          fontWeight: 600,
                          mb: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1
                        }}
                      >
                        <Box sx={{ color: node.color }}>{getNodeIcon(node.type)}</Box>
                        {node.label}
                      </Typography>
                      
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#94A3B8',
                          lineHeight: 1.5,
                          fontSize: '0.85rem'
                        }}
                      >
                        {node.description}
                      </Typography>
                    </Box>
                  );
                })()}
              </Paper>
            </Fade>
          )}

          {/* Connection Lines */}
          <svg 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%',
              pointerEvents: 'none',
              zIndex: 0
            }}
          >
            {flowConnections.map((connection, index) => {
              const fromNode = flowNodes.find(n => n.id === connection.from);
              const toNode = flowNodes.find(n => n.id === connection.to);
              
              if (!fromNode || !toNode) return null;
              
              const fromIndex = flowNodes.findIndex(n => n.id === connection.from);
              const toIndex = flowNodes.findIndex(n => n.id === connection.to);
              const isActive = fromIndex < currentStep;
              
              // Calculate edge points for shape connections
              const getShapeEdgePoint = (node: typeof flowNodes[0], nodeIndex: number, isStart: boolean, targetNode?: typeof flowNodes[0]) => {
                const baseY = nodeIndex * 120 + 40 + (nodeIndex > 8 ? 50 : 0); // Same as positioning logic with extra spacing
                const xPos = node.id === 'edit_summary' ? 30 : 50; // Handle branched node
                
                if (node.type === 'decision') {
                  // Special handling for Quality Decision diamond feedback loops
                  if (isStart && node.id === 'decide_quality' && targetNode) {
                    if (targetNode.id === 'edit_summary') {
                      // Left edge of diamond for edit_summary feedback
                      return {
                        x: xPos - 7, // Left edge of diamond (50% - ~7% for diamond width)
                        y: baseY + 50 // Middle left point
                      };
                    } else if (targetNode.id === 'edit_technical_skills') {
                      // Right edge of diamond for edit_technical_skills feedback  
                      return {
                        x: xPos + 7, // Right edge of diamond (50% + ~7% for diamond width)
                        y: baseY + 50 // Middle right point
                      };
                    }
                  }
                  
                  // Special handling for Decision Point (decide_extract) arrows
                  if (isStart && node.id === 'decide_extract' && targetNode) {
                    if (targetNode.id === 'edit_summary') {
                      // Left edge of diamond for edit_summary
                      return {
                        x: xPos - 7, // Left edge of diamond
                        y: baseY + 50 // Middle left point
                      };
                    } else if (targetNode.id === 'edit_technical_skills') {
                      // Bottom point of diamond for edit_technical_skills
                      return {
                        x: xPos, // Center bottom
                        y: baseY + 100 // Bottom point
                      };
                    }
                  }
                  
                  // Default diamond points (top/bottom)
                  return {
                    x: xPos,
                    y: isStart ? baseY + 100 : baseY // Bottom point for start, top point for end
                  };
                } else {
                  // Rectangle/oval shapes
                  // Special case for nodes receiving arrows from diamonds
                  if (!isStart && targetNode && (targetNode.id === 'decide_quality' || targetNode.id === 'decide_extract')) {
                    if (node.id === 'edit_summary') {
                      return {
                        x: xPos,
                        y: targetNode.id === 'decide_quality' ? baseY + 60 : baseY // Bottom for feedback, top for normal
                      };
                    } else if (node.id === 'edit_technical_skills') {
                      return {
                        x: targetNode.id === 'decide_quality' ? xPos + 5 : xPos, // Slightly right for feedback curve
                        y: baseY // Top edge for both
                      };
                    }
                  }
                  
                  return {
                    x: xPos,
                    y: isStart ? baseY + 60 : baseY // Bottom edge for start, top edge for end
                  };
                }
              };
              
              const start = getShapeEdgePoint(fromNode, fromIndex, true, toNode);
              const end = getShapeEdgePoint(toNode, toIndex, false, fromNode);
              
              const x1 = start.x;
              const y1 = start.y;
              const x2 = end.x;
              const y2 = end.y;
              
              // Check if this is a feedback loop that needs curved path
              const isFeedbackLoop = connection.from === 'decide_quality' && 
                (connection.to === 'edit_summary' || connection.to === 'edit_technical_skills');
              
              return (
                <g key={`${connection.from}-${connection.to}-${index}`}>
                  <defs>
                    <marker
                      id={`arrowhead-${index}`}
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 10 3.5, 0 7"
                        fill={isActive ? '#10B981' : '#64748B'}
                      />
                    </marker>
                  </defs>
                  
                  {isFeedbackLoop ? (
                    // Curved path for Quality Decision feedback loops
                    <path
                      d={connection.to === 'edit_summary' 
                        ? `M${x1}%,${y1} 
                           C${x1 - 20}%,${y1 + 100} 
                           ${x2 - 20}%,${y2 - 100} 
                           ${x2}%,${y2}`
                        : `M${x1}%,${y1} 
                           C${x1 + 20}%,${y1 + 50} 
                           ${x2 + 10}%,${y2 - 50} 
                           ${x2}%,${y2}`}
                      fill="none"
                      stroke={isActive ? '#10B981' : '#64748B'}
                      strokeWidth="2"
                      strokeDasharray={isActive ? '0' : '5,5'}
                      markerEnd={`url(#arrowhead-${index})`}
                      opacity={isActive ? 1 : 0.5}
                    />
                  ) : (
                    // Straight line for normal connections
                    <line
                      x1={`${x1}%`}
                      y1={y1}
                      x2={`${x2}%`}
                      y2={y2}
                      stroke={isActive ? '#10B981' : '#64748B'}
                      strokeWidth="2"
                      strokeDasharray={isActive ? '0' : '5,5'}
                      markerEnd={`url(#arrowhead-${index})`}
                      opacity={isActive ? 1 : 0.5}
                    />
                  )}
                  
                  {connection.label && (
                    <text
                      x={isFeedbackLoop 
                        ? connection.to === 'edit_summary' 
                          ? `${x1 - 15}%` 
                          : `${x1 + 15}%`
                        : `${(x1 + x2) / 2}%`}
                      y={isFeedbackLoop 
                        ? (y1 + y2) / 2 + 20
                        : (y1 + y2) / 2}
                      fill="#94A3B8"
                      fontSize="10"
                      textAnchor="middle"
                      dy="-5"
                    >
                      {connection.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </Box>
      </Paper>
    </Container>
  );
};

export default FlowPage;
