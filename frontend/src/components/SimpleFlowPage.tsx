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

// Node types
type NodeType = 'ai' | 'decision' | 'phantom';

// Base node interface
interface BaseNode {
  id: string;
  label: string;
  description: string;
  type: NodeType;
  color: string;
}

// Regular flow node
interface FlowNode extends BaseNode {
  type: 'ai' | 'decision';
  position: { x: number; y: number };
}

// Phantom node for arrow bending
interface PhantomNode extends BaseNode {
  type: 'phantom';
  position: { x: number; alignWith: string };
}

// Flow connection interface
interface FlowConnection {
  from: string;
  to: string;
  label: string;
  isPhantom?: boolean;
}



// Simplified flow nodes - just 4 components
const flowNodes: FlowNode[] = [
  {
    id: 'extract_info', 
    label: 'Extract Info',
    description: 'Extract company, position, and location from job description',
    type: 'ai',
    color: '#F59E0B',
    position: { x: 50, y: 2 }
  },
  {
    id: 'decide_extract',
    label: 'Decision Point',
    description: 'Check if summary editing is enabled',
    type: 'decision',
    color: '#8B5CF6',
    position: { x: 50, y: 8 }
  },
  {
    id: 'edit_summary',
    label: 'Edit Summary',
    description: 'Tailor professional summary to match job requirements',
    type: 'ai',
    color: '#EC4899',
    position: { x: 30, y: 14 }
  },
  {
    id: 'edit_technical_skills',
    label: 'Edit Technical Skills', 
    description: 'Optimize technical skills section for relevance',
    type: 'ai',
    color: '#06B6D4',
    position: { x: 50, y: 14 }
  }
];

// Phantom nodes for arrow bending (invisible waypoints)
const phantomNodes: PhantomNode[] = [
  {
    id: 'phantom_right_top',
    label: 'Phantom 1',
    description: 'Top right waypoint - aligned with Extract Info',
    type: 'phantom',
    color: '#FF6B6B',
    position: { x: 65, alignWith: 'extract_info' }
  },
  {
    id: 'phantom_right_bottom', 
    label: 'Phantom 2',
    description: 'Bottom right waypoint - aligned with Edit Technical Skills',
    type: 'phantom',
    color: '#4ECDC4',
    position: { x: 65, alignWith: 'edit_technical_skills' }
  }
];

// Simple flow connections
const flowConnections: FlowConnection[] = [
  { from: 'extract_info', to: 'decide_extract', label: '' },
  { from: 'decide_extract', to: 'edit_summary', label: 'edit_summary enabled' },
  { from: 'decide_extract', to: 'edit_technical_skills', label: 'edit_summary disabled' },
  { from: 'edit_summary', to: 'edit_technical_skills', label: '' },
  // Loop back using phantom nodes - 3 separate arrows that look like one "]" shape
  { from: 'edit_technical_skills', to: 'phantom_right_bottom', label: '', isPhantom: true },
  { from: 'phantom_right_bottom', to: 'phantom_right_top', label: '', isPhantom: true },
  { from: 'phantom_right_top', to: 'extract_info', label: 'loop back', isPhantom: true }
];

const SimpleFlowPage: React.FC = () => {
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

  const getConnectionStatus = (connectionFrom: string, connectionTo: string) => {
    // Phantom connections animate when we reach the last step
    const isPhantomConnection = connectionFrom.includes('phantom') || connectionTo.includes('phantom') ||
      (connectionFrom === 'edit_technical_skills' && connectionTo === 'phantom_right_bottom') ||
      (connectionFrom === 'phantom_right_bottom' && connectionTo === 'phantom_right_top') ||
      (connectionFrom === 'phantom_right_top' && connectionTo === 'extract_info');
    
    if (isPhantomConnection) {
      // All phantom connections animate together when we reach the last real node
      if (currentStep >= flowNodes.length - 1) return 'active';
      return 'pending';
    }
    
    // Regular connections animate based on source node completion
    const fromIndex = flowNodes.findIndex(n => n.id === connectionFrom);
    if (fromIndex === -1) return 'pending';
    if (currentStep > fromIndex) return 'completed';
    if (currentStep === fromIndex + 1) return 'active';
    return 'pending';
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'ai': return <AIIcon />;
      case 'decision': return <ProcessIcon />;
      case 'process': return <DataIcon />;
      default: return <DataIcon />;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ 
      py: 3,
      '& @keyframes pulse': {
        '0%': { transform: 'translateX(-50%) scale(1)', opacity: 1 },
        '50%': { transform: 'translateX(-50%) scale(1.2)', opacity: 0.7 },
        '100%': { transform: 'translateX(-50%) scale(1)', opacity: 1 }
      }
    }}>
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
            Simple Flow
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
          Simplified flow showing decision point branching
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



      {/* Simple Flow Diagram */}
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
           minHeight: '600px',
           width: '100%',
           display: 'flex',
           flexDirection: 'column',
           alignItems: 'center',
           justifyContent: 'flex-start',
           paddingTop: '40px'
         }}>
          {/* Flow Nodes */}
          {[...flowNodes, ...phantomNodes].map((node, index) => {
            // Only animate real flow nodes (first 4), phantoms stay hidden
            const nodeIndex = index < flowNodes.length ? index : -1;
            const status = node.type === 'phantom' ? 'completed' : getNodeStatus(nodeIndex);
            const isActive = status === 'active';
            const isCompleted = status === 'completed';
            const isPending = status === 'pending';
            
            const getShapeStyle = (nodeType: NodeType) => {
              switch (nodeType) {
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
                case 'phantom':
                  return {
                    borderRadius: '8px',
                    width: '120px',
                    height: '40px',
                    border: '2px dashed',
                    opacity: 0, // Hide phantom nodes
                    pointerEvents: 'none' // Disable interactions
                  };
                case 'ai':
                default:
                  return {
                    borderRadius: '8px',
                    width: '180px',
                    height: '60px'
                  };
              }
            };

            // Simple positioning like FlowPage.tsx
            const isPhantom = node.type === 'phantom';
            const leftPosition = isPhantom 
              ? `${(node as PhantomNode).position.x}%`
              : node.id === 'edit_summary' ? '30%' : '50%';
            const topPosition = isPhantom 
              ? `${flowNodes.findIndex(n => n.id === (node as PhantomNode).position.alignWith) * 120 + 40}px`
              : `${nodeIndex * 120 + 40}px`;

            return (
              <Fade in timeout={500 + index * 100} key={node.id}>
                <Box>
                  {/* Main Shape */}
                  <Box
                    onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                    sx={{
                      position: 'absolute',
                      left: leftPosition,
                      top: topPosition,
                      transform: node.type === 'decision' ? 'translateX(-50%) rotate(45deg)' : 'translateX(-50%)',
                      ...getShapeStyle(node.type),
                      transformOrigin: 'center center',
                      background: isPending
                        ? 'rgba(15, 23, 42, 0.4)'
                        : isActive 
                          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(245, 158, 11, 0.2) 100%)'
                          : 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 0.2) 100%)',
                      border: `3px solid ${
                        isPending ? '#64748B' :
                        isActive ? '#F59E0B' : 
                        '#10B981'
                      }`,
                      cursor: 'pointer',
                      transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isPending 
                        ? 'none'
                        : isActive 
                          ? `0 0 25px ${node.color}60, 0 0 50px ${node.color}30`
                          : `0 0 15px rgba(16, 185, 129, 0.4)`,
                      animation: isActive ? 'pulse 2s ease-in-out infinite' : 'none',
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

                  {/* Status Chip - Hide for phantom nodes */}
                  {node.type !== 'phantom' && (
                  <Chip
                    size="small"
                    label={
                        isPending ? 'Waiting' :
                      isActive ? 'Processing' : 
                        'Completed'
                    }
                    sx={{
                      position: 'absolute',
                      left: leftPosition,
                      top: `${nodeIndex * 120 + 15}px`,
                      transform: 'translateX(-50%)',
                      backgroundColor: `${
                          isPending ? '#64748B' :
                        isActive ? '#F59E0B' : 
                          '#10B981'
                      }20`,
                        color: isPending ? '#64748B' :
                             isActive ? '#F59E0B' : 
                               '#10B981',
                      fontSize: '0.5rem',
                      height: '18px',
                        zIndex: 10,
                        animation: isActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
                        transition: 'all 0.4s ease-in-out'
                    }}
                  />
                  )}
                </Box>
              </Fade>
            );
          })}

          {/* Node Information Card */}
          {selectedNode && (
            <Fade in timeout={300}>
              <Paper 
                elevation={6}
                sx={{ 
                  position: 'sticky',
                  top: '100px',
                  right: '20px',
                  width: '280px',
                  height: 'fit-content',
                  maxHeight: 'calc(100vh - 220px)',
                  p: 2.5,
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: 2,
                  backdropFilter: 'blur(10px)',
                  zIndex: 30,
                  alignSelf: 'flex-end',
                  marginLeft: 'auto',
                  marginRight: '20px',
                  display: { xs: 'none', md: 'block' }
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
            {/* Define all markers at the top level */}
            <defs>
              <marker
                id="loop-arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#64748B"
                />
              </marker>
            </defs>
            
            {flowConnections.map((connection, index) => {
              const fromNode = [...flowNodes, ...phantomNodes].find(n => n.id === connection.from);
              const toNode = [...flowNodes, ...phantomNodes].find(n => n.id === connection.to);
              
              if (!fromNode || !toNode) return null;
              
              // Get connection animation status
              const connectionStatus = getConnectionStatus(connection.from, connection.to);
              const isConnectionActive = connectionStatus === 'active';
              const isConnectionCompleted = connectionStatus === 'completed';
              const isConnectionPending = connectionStatus === 'pending';
              
              // Special handling for phantom connections (loop back using 3 separate arrows)
              if (connection.isPhantom) {
                // Calculate positions for phantom and regular nodes
                const getNodePosition = (node: typeof flowNodes[0] | typeof phantomNodes[0], isStart: boolean) => {
                  if (node.type === 'phantom') {
                    const alignedIndex = flowNodes.findIndex(n => n.id === node.position.alignWith);
                    return { x: node.position.x, y: alignedIndex * 120 + 70 };
                  } else {
                    // Regular node edge positioning
                    const nodeIndex = flowNodes.findIndex(n => n.id === node.id);
                    const baseY = nodeIndex * 120 + 70;
                    const xPos = node.id === 'edit_summary' ? 30 : 50;
                    
                    // Connect to edges of real nodes
                    if (node.id === 'edit_technical_skills' && isStart) {
                      return { x: xPos + 6, y: baseY }; // Right edge of tech skills
                    } else if (node.id === 'extract_info' && !isStart) {
                      return { x: xPos + 6, y: baseY }; // Right edge of extract info
                    }
                    return { x: xPos, y: baseY }; // Center fallback for other nodes
                  }
                };
                
                const start = getNodePosition(fromNode, true);
                const end = getNodePosition(toNode, false);
                
                return (
                  <g key={`${connection.from}-${connection.to}-${index}`}>
                    <line
                      x1={`${start.x}%`}
                      y1={start.y}
                      x2={`${end.x}%`}
                      y2={end.y}
                      stroke={isConnectionCompleted ? '#10B981' : 
                             isConnectionActive ? '#F59E0B' : '#64748B'}
                      strokeWidth={isConnectionActive ? "3" : "2"}
                      strokeDasharray={isConnectionActive ? "0" : "5,5"}
                      markerEnd={toNode.type !== 'phantom' ? "url(#loop-arrowhead)" : "none"}
                      opacity={isConnectionPending ? 0.3 : 
                              isConnectionActive ? 1 : 0.7}
                      style={{
                        filter: isConnectionActive ? 'drop-shadow(0 0 4px currentColor)' : 'none',
                        transition: 'all 0.6s ease-in-out'
                      }}
                    />
                    
                    {/* Animated flow particle for active connections */}
                    {isConnectionActive && (
                      <circle
                        r="3"
                        fill="#F59E0B"
                        opacity={0.8}
                        style={{
                          filter: 'drop-shadow(0 0 6px #F59E0B)'
                        }}
                      >
                        <animateMotion
                          dur="2s"
                          repeatCount="indefinite"
                          path={`M ${start.x}% ${start.y} L ${end.x}% ${end.y}`}
                        />
                      </circle>
                    )}
                    
                    {/* Show label only on the last phantom connection */}
                    {connection.label && (
                      <text
                        x={`${(start.x + end.x) / 2}%`}
                        y={(start.y + end.y) / 2}
                        fill={isConnectionActive ? '#F59E0B' : '#94A3B8'}
                        fontSize="10"
                        textAnchor="middle"
                        dy="-5"
                        style={{
                          transition: 'all 0.4s ease-in-out',
                          fontWeight: isConnectionActive ? 'bold' : 'normal'
                        }}
                      >
                        {connection.label}
                      </text>
                    )}
                  </g>
                );
              }
              
              // Calculate edge points for regular connections
              const getShapeEdgePoint = (node: FlowNode, nodeIndex: number, isStart: boolean, targetNode?: FlowNode) => {
                const baseY = nodeIndex * 120 + 40;
                const xPos = node.id === 'edit_summary' ? 30 : 50;
                
                if (node.type === 'decision') {
                  if (isStart && node.id === 'decide_extract' && targetNode) {
                    if (targetNode.id === 'edit_summary') {
                      return { x: xPos - 5, y: baseY + 50 }; // Closer to left edge of diamond
                    } else if (targetNode.id === 'edit_technical_skills') {
                      return { x: xPos, y: baseY + 120 }; // Bottom point of diamond
                    }
                  }
                  return { x: xPos, y: isStart ? baseY + 100 : baseY - 20 };
                } else {
                  // Special case for Edit Technical Skills -> Edit Summary connection
                  if (isStart && node.id === 'edit_technical_skills' && targetNode?.id === 'edit_summary') {
                    return { x: xPos - 6, y: baseY + 30 }; // Closer to left edge of technical skills box
                  }
                  
                  // Special case for Edit Summary receiving connection from Technical Skills
                  if (!isStart && node.id === 'edit_summary' && targetNode?.id === 'edit_technical_skills') {
                    return { x: xPos, y: baseY + 60 }; // Bottom of edit summary
                  }
                  
                  return { x: xPos, y: isStart ? baseY + 60 : baseY };
                }
              };
              
              // Only process regular connections (not phantom)
              if (fromNode.type === 'phantom' || toNode.type === 'phantom') {
                return null;
              }
              
              const fromIndex = flowNodes.findIndex(n => n.id === connection.from);
              const toIndex = flowNodes.findIndex(n => n.id === connection.to);
              const start = getShapeEdgePoint(fromNode as FlowNode, fromIndex, true, toNode as FlowNode);
              const end = getShapeEdgePoint(toNode as FlowNode, toIndex, false, fromNode as FlowNode);
              
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
                          fill="#64748B"
                      />
                    </marker>
                  </defs>
                  
                  <line
                    x1={`${start.x}%`}
                    y1={start.y}
                    x2={`${end.x}%`}
                    y2={end.y}
                    stroke={isConnectionCompleted ? '#10B981' : 
                           isConnectionActive ? '#F59E0B' : '#64748B'}
                    strokeWidth={isConnectionActive ? "3" : "2"}
                    strokeDasharray={isConnectionActive ? "0" : "5,5"}
                    markerEnd={`url(#arrowhead-${index})`}
                    opacity={isConnectionPending ? 0.3 : 
                            isConnectionActive ? 1 : 0.7}
                    style={{
                      filter: isConnectionActive ? 'drop-shadow(0 0 4px currentColor)' : 'none',
                      transition: 'all 0.6s ease-in-out'
                    }}
                  />
                  
                  {/* Animated flow particle for active connections */}
                  {isConnectionActive && (
                    <circle
                      r="3"
                      fill="#F59E0B"
                      opacity={0.8}
                      style={{
                        filter: 'drop-shadow(0 0 6px #F59E0B)'
                      }}
                    >
                      <animateMotion
                        dur="2s"
                        repeatCount="indefinite"
                        path={`M ${start.x}% ${start.y} L ${end.x}% ${end.y}`}
                      />
                    </circle>
                  )}
                  
                  {connection.label && (
                    <text
                      x={`${(start.x + end.x) / 2}%`}
                      y={(start.y + end.y) / 2}
                      fill={isConnectionActive ? '#F59E0B' : '#94A3B8'}
                      fontSize="10"
                      textAnchor="middle"
                      dy="-5"
                      style={{
                        transition: 'all 0.4s ease-in-out',
                        fontWeight: isConnectionActive ? 'bold' : 'normal'
                      }}
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

export default SimpleFlowPage;

