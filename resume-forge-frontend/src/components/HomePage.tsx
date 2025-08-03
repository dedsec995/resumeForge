import { 
  Box, 
  Container, 
  Typography, 
  AppBar, 
  Toolbar, 
  Tab,
  Tabs,
  Paper
} from '@mui/material';
import { 
  WorkOutline as ResumeIcon,
  Person as ProfileIcon,
  Add as CreateIcon
} from '@mui/icons-material';
import { useState } from 'react';
import ProfileSection from './ProfileSection';
import CreateResumeSection from './CreateResumeSection';

const HomePage = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const navigationTabs = [
    { label: 'Profile', icon: <ProfileIcon /> },
    { label: 'Create Resume', icon: <CreateIcon /> }
  ];

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const renderCurrentContent = () => {
    switch (currentTab) {
      case 0:
        return <ProfileSection />;
      case 1:
        return <CreateResumeSection />;
      default:
        return <ProfileSection />;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Main Navigation Bar */}
      <AppBar 
        position="sticky" 
        elevation={0} 
        sx={{ 
          bgcolor: '#2A3441',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(20px)'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', py: 1, alignItems: 'center' }}>
          {/* Site Logo and Name */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ResumeIcon sx={{ 
              mr: 1.2, 
              fontSize: 20, 
              color: '#6366F1',
              filter: 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.4))'
            }} />
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 600, 
                color: '#F8FAFC',
                fontSize: '1.1rem',
                letterSpacing: '-0.02em'
              }}
            >
              Resume Forge
            </Typography>
          </Box>

          {/* Navigation Items */}
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              variant="standard"
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                '& .MuiTabs-flexContainer': {
                  gap: 0.5,
                  alignItems: 'center'
                },
                '& .MuiTab-root': { 
                  color: '#94A3B8',
                  minHeight: 36,
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  textTransform: 'none',
                  px: 2.5,
                  py: 1,
                  minWidth: 'auto',
                  transition: 'all 0.2s ease-in-out',
                  borderRadius: '6px',
                  position: 'relative',
                  zIndex: 1,
                  '&:hover': {
                    color: '#E2E8F0',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    transform: 'translateY(-1px)'
                  },
                  '&.Mui-selected': {
                    color: '#FFFFFF !important',
                    fontWeight: 600,
                    backgroundColor: '#6366F1 !important',
                    boxShadow: '0 1px 4px rgba(99, 102, 241, 0.3)',
                    '& .MuiSvgIcon-root': {
                      color: '#FFFFFF !important'
                    }
                  }
                },
                '& .MuiTabs-indicator': {
                  display: 'none'
                }
              }}
            >
              {navigationTabs.map((tab, index) => (
                <Tab 
                  key={index} 
                  label={tab.label} 
                  icon={tab.icon}
                  iconPosition="start"
                  sx={{ 
                    '& .MuiTab-iconWrapper': { 
                      mr: 0.8,
                      '& .MuiSvgIcon-root': {
                        fontSize: '1rem'
                      }
                    }
                  }}
                />
              ))}
            </Tabs>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Current Tab Content */}
      {renderCurrentContent()}
    </Box>
  );
};

export default HomePage;