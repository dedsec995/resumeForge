import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box,
  Button,
  Stack,
  Chip,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import { 
  WorkOutline as ResumeIcon,
  Person as ProfileIcon,
  Add as CreateIcon,
  Home as HomeIcon,
  AccountCircle,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const navigationItems = [
    { label: 'Home', path: '/', icon: <HomeIcon /> },
    { label: 'Profile', path: '/profile', icon: <ProfileIcon /> },
    { label: 'Create Resume', path: '/create-resume', icon: <CreateIcon /> },
    { label: 'About Us', path: '/about', icon: <ProfileIcon /> }
  ];

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      handleUserMenuClose();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Don't show navbar if user is not authenticated
  if (!currentUser) {
    return null;
  }

  return (
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
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/')}
        >
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

        {/* Navigation Items and User Menu */}
        <Stack direction="row" spacing={2} alignItems="center">
          {/* Navigation Items */}
          <Stack direction="row" spacing={1}>
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  startIcon={item.icon}
                  onClick={() => navigate(item.path)}
                  sx={{
                    color: isActive ? '#FFFFFF' : '#94A3B8',
                    backgroundColor: isActive ? '#6366F1' : 'transparent',
                    minHeight: 36,
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 600 : 500,
                    textTransform: 'none',
                    px: 2.5,
                    py: 1,
                    borderRadius: '6px',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      color: '#E2E8F0',
                      backgroundColor: isActive ? '#5B5BD6' : 'rgba(99, 102, 241, 0.1)',
                      transform: 'translateY(-1px)'
                    },
                    ...(isActive && {
                      boxShadow: '0 1px 4px rgba(99, 102, 241, 0.3)',
                    }),
                    '& .MuiSvgIcon-root': {
                      fontSize: '1rem',
                      color: isActive ? '#FFFFFF' : 'inherit'
                    }
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Stack>

          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={currentUser?.email || 'User'}
              size="small"
              sx={{
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                color: '#E2E8F0',
                fontSize: '0.75rem'
              }}
            />
            <IconButton
              onClick={handleUserMenuOpen}
              sx={{ 
                color: '#94A3B8',
                '&:hover': { 
                  color: '#E2E8F0',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)'
                }
              }}
            >
              <AccountCircle />
            </IconButton>
            
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleUserMenuClose}
              sx={{ '& .MuiPaper-root': { backgroundColor: '#2A3441', border: '1px solid rgba(255, 255, 255, 0.12)' } }}
            >
              <MenuItem 
                onClick={handleLogout}
                sx={{ 
                  color: '#E2E8F0',
                  '&:hover': { backgroundColor: 'rgba(99, 102, 241, 0.1)' }
                }}
              >
                <LogoutIcon sx={{ mr: 1, fontSize: '1rem' }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;