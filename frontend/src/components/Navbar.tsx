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
  MenuItem,
  Fade,
  Grow,
  Slide
} from '@mui/material';
import { 
  WorkOutline as ResumeIcon,
  Person as ProfileIcon,
  Add as CreateIcon,
  Home as HomeIcon,
  AccountCircle,
  Logout as LogoutIcon,
  Info as AboutIcon,
  Login as LoginIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const authenticatedNavigationItems = [
    { label: 'Home', path: '/', icon: <HomeIcon /> },
    { label: 'Profile', path: '/profile', icon: <ProfileIcon /> },
    { label: 'Create Resume', path: '/create-resume', icon: <CreateIcon /> },
    { label: 'About Us', path: '/about', icon: <AboutIcon /> }
  ];

  const publicNavigationItems = [
    { label: 'Home', path: '/', icon: <HomeIcon /> },
    { label: 'About Us', path: '/about', icon: <AboutIcon /> }
  ];

  const navigationItems = currentUser ? authenticatedNavigationItems : publicNavigationItems;

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

  return (
    <Slide direction="down" in timeout={800}>
      <AppBar 
        position="sticky" 
        elevation={0} 
        sx={{ 
          bgcolor: '#2A3441',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease-in-out'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', py: 1, alignItems: 'center' }}>
          {/* Site Logo and Name */}
          <Grow in timeout={1000}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'transform 0.3s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.02)'
                }
              }}
              onClick={() => navigate('/')}
            >
              <ResumeIcon sx={{ 
                mr: 1, 
                fontSize: 18, 
                color: '#6366F1',
                filter: 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.4))',
                animation: 'pulse 2s infinite'
              }} />
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#F8FAFC',
                  fontSize: '1rem',
                  letterSpacing: '-0.02em',
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Resume Forge
              </Typography>
            </Box>
          </Grow>

          {/* Navigation Items and User Menu */}
          <Fade in timeout={1200}>
            <Stack direction="row" spacing={2} alignItems="center">
              {/* Navigation Items */}
              <Stack direction="row" spacing={1}>
                {navigationItems.map((item, index) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Grow in timeout={1400 + index * 100} key={item.path}>
                      <Button
                        startIcon={item.icon}
                        onClick={() => navigate(item.path)}
                        sx={{
                          color: isActive ? '#FFFFFF' : '#94A3B8',
                          backgroundColor: isActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                          minHeight: 32,
                          fontSize: '0.8rem',
                          fontWeight: isActive ? 600 : 500,
                          textTransform: 'none',
                          px: 2,
                          py: 0.75,
                          borderRadius: '6px',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                          '&:hover': {
                            color: '#E2E8F0',
                            backgroundColor: isActive ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.1)',
                            transform: 'translateY(-1px)',
                            boxShadow: isActive ? '0 3px 10px rgba(99, 102, 241, 0.3)' : '0 2px 6px rgba(99, 102, 241, 0.2)'
                          },
                          '& .MuiSvgIcon-root': {
                            fontSize: '0.9rem',
                            color: isActive ? '#FFFFFF' : 'inherit',
                            transition: 'transform 0.2s ease-in-out'
                          },
                          '&:hover .MuiSvgIcon-root': {
                            transform: 'scale(1.1)'
                          }
                        }}
                      >
                        {item.label}
                      </Button>
                    </Grow>
                  );
                })}
              </Stack>

              {/* Auth Buttons - Only show when not authenticated */}
              {!currentUser && (
                <Grow in timeout={1600}>
                                      <Button
                      variant="outlined"
                      size="small"
                      startIcon={<LoginIcon />}
                      onClick={() => navigate('/auth')}
                      sx={{
                        color: '#6366F1',
                        borderColor: '#6366F1',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        textTransform: 'none',
                        px: 1.5,
                        py: 0.4,
                        borderRadius: '5px',
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          borderColor: '#8B5CF6',
                          transform: 'translateY(-1px)'
                        }
                      }}
                    >
                      Login
                    </Button>
                </Grow>
              )}

              {/* User Menu - Only show when authenticated */}
              {currentUser && (
                <Grow in timeout={1600}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={currentUser?.email || 'User'}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        color: '#E2E8F0',
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          backgroundColor: 'rgba(99, 102, 241, 0.2)',
                          transform: 'scale(1.05)'
                        }
                      }}
                    />
                    <IconButton
                      onClick={handleUserMenuOpen}
                      size="small"
                      sx={{ 
                        color: '#94A3B8',
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': { 
                          color: '#E2E8F0',
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          transform: 'scale(1.1)'
                        }
                      }}
                    >
                      <AccountCircle sx={{ fontSize: 20 }} />
                    </IconButton>
                    
                    <Menu
                      anchorEl={anchorEl}
                      open={Boolean(anchorEl)}
                      onClose={handleUserMenuClose}
                      TransitionComponent={Fade}
                      sx={{ 
                        '& .MuiPaper-root': { 
                          backgroundColor: 'rgba(42, 52, 65, 0.95)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          backdropFilter: 'blur(20px)',
                          borderRadius: 2,
                          mt: 1
                        } 
                      }}
                    >
                      <MenuItem 
                        onClick={handleLogout}
                        sx={{ 
                          color: '#E2E8F0',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': { 
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            transform: 'translateX(4px)'
                          }
                        }}
                      >
                        <LogoutIcon sx={{ mr: 1, fontSize: '1rem' }} />
                        Logout
                      </MenuItem>
                    </Menu>
                  </Box>
                </Grow>
              )}
            </Stack>
          </Fade>
        </Toolbar>
      </AppBar>
    </Slide>
  );
};

export default Navbar;