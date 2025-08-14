import { 
  Box, 
  Container, 
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  Stack,
  Chip,
  Fade,
  Grow,
  Slide,
  Paper
} from '@mui/material';
import { 
  GitHub as GitHubIcon,
  LinkedIn as LinkedInIcon,
  YouTube as YouTubeIcon,
  Email as EmailIcon,
  Code as CodeIcon,
  WorkOutline as ResumeIcon,
  Group as GroupIcon,
  Rocket as RocketIcon,
  Language as WebsiteIcon
} from '@mui/icons-material';

const AboutUsSection = () => {
  const developers = [
    {
      name: "Amit Luhar",
      role: "Full Stack Developer & AI Specialist",
      avatar: "https://media.licdn.com/dms/image/v2/D4E35AQH-leCLVJxFPw/profile-framedphoto-shrink_200_200/B4EZiaRuRJHgAg-/0/1754934994274?e=1755792000&v=beta&t=JR5Yz4pMAPawMGKQy3MPeP243gG0cVCumpP-2b9kEzM",
      bio: "Computer Science graduate with a passion for Machine Learning, AI, and Automation. Fascinated by micro-controllers and transformer's ability to map language in latent space. Firm believer in the rise of Skynet.",
      skills: ["Python", "React", "Node.js", "TensorFlow", "AWS", "Machine Learning", "AI"],
      github: "https://github.com/dedsec995",
      linkedin: "https://www.linkedin.com/in/amit-luhar/",
      website: "https://amitluhar.com/",
      email: "amitluhar49@gmail.com"
    },
    {
      name: "Utsav Chaudhary",
      role: "Frontend Developer & Content Creator",
      avatar: "https://yt3.googleusercontent.com/ytc/AIdro_l3n-1vpu1cTeDkAfINff0TgzedVxRQf25JSS8ebcVYEk4=s120-c-k-c0x00ffffff-no-rj",
      bio: "Creative developer and content creator focused on building innovative web applications and sharing knowledge through YouTube. Passionate about modern frontend technologies and user experience design.",
      skills: ["React", "TypeScript", "JavaScript", "Node.js", "YouTube", "Content Creation"],
      github: "https://github.com/uttU28/",
      linkedin: "https://www.linkedin.com/in/utsavmaan28/",
      website: "https://thatinsaneguy28.netlify.app/",
      youtube: "https://www.youtube.com/@ThatInsaneGuy",
      email: "utsavmaan28@gmail.com"
    }
  ];



  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
      py: 4
    }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Fade in timeout={800}>
          <Box sx={{ mb: 8 }}>
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
                      About Resume Forge
                    </Typography>
                  </Box>

                  <Slide direction="up" in timeout={1200}>
                    <Typography 
                      variant="h5" 
                      component="h2" 
                      sx={{ 
                        color: '#E2E8F0',
                        lineHeight: 1.4,
                        fontSize: { xs: '1.1rem', md: '1.3rem' },
                        opacity: 0.9,
                        fontWeight: 400,
                        pl: { xs: 0, md: 7 }, // Align with the title text (icon width + margin)
                        mb: 2
                      }}
                    >
                      Revolutionizing resume creation with AI-powered optimization and professional LaTeX templates
                    </Typography>
                  </Slide>

                  <Slide direction="up" in timeout={1400}>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: '#94A3B8',
                        fontSize: '1.1rem',
                        lineHeight: 1.6,
                        pl: { xs: 0, md: 7 } // Align with the title text
                      }}
                    >
                      Resume Forge is built by a passionate team of developers who understand the challenges of job hunting. 
                      We combine cutting-edge AI technology with elegant design to help you create resumes that stand out 
                      and get you noticed by top employers.
                    </Typography>
                  </Slide>
                </Box>


              </Box>
            </Grow>
          </Box>
        </Fade>



        {/* Team Section */}
        <Slide direction="up" in timeout={2200}>
          <Box sx={{ mb: 8 }}>
            <Typography 
              variant="h3" 
              component="h2" 
              sx={{ 
                textAlign: 'center', 
                mb: 6, 
                fontWeight: 700,
                color: '#F8FAFC',
                fontSize: { xs: '2rem', md: '2.5rem' },
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.3))'
              }}
            >
              Meet Our Team
            </Typography>
            <Grid container spacing={4}>
              {developers.map((developer, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Grow in timeout={2400 + index * 300}>
                    <Card sx={{ 
                      height: '100%',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: 3,
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 15px 35px rgba(99, 102, 241, 0.3)',
                        borderColor: 'rgba(99, 102, 241, 0.4)'
                      },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(90deg, #6366F1, #8B5CF6, #EC4899)',
                        transform: 'scaleX(0)',
                        transition: 'transform 0.3s ease-in-out'
                      },
                      '&:hover::before': {
                        transform: 'scaleX(1)'
                      }
                    }}>
                      <CardContent sx={{ p: 4 }}>
                        <Box sx={{ textAlign: 'center', mb: 3 }}>
                          <Avatar 
                            src={developer.avatar}
                            sx={{ 
                              width: 120, 
                              height: 120, 
                              mx: 'auto', 
                              mb: 2,
                              border: '3px solid rgba(99, 102, 241, 0.3)',
                              transition: 'all 0.3s ease-in-out',
                              '&:hover': {
                                transform: 'scale(1.05)',
                                borderColor: 'rgba(99, 102, 241, 0.6)'
                              }
                            }}
                          />
                          <Typography 
                            variant="h5" 
                            sx={{ 
                              fontWeight: 600,
                              color: '#F8FAFC',
                              mb: 1
                            }}
                          >
                            {developer.name}
                          </Typography>
                          <Typography 
                            variant="subtitle1" 
                            sx={{ 
                              fontWeight: 500, 
                              mb: 2,
                              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                              backgroundClip: 'text',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent'
                            }}
                          >
                            {developer.role}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#94A3B8',
                              mb: 3,
                              lineHeight: 1.6,
                              fontSize: '0.95rem'
                            }}
                          >
                            {developer.bio}
                          </Typography>
                        </Box>

                        {/* Skills */}
                        <Box sx={{ mb: 3 }}>
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              fontWeight: 600, 
                              mb: 2,
                              color: '#F8FAFC',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            <CodeIcon sx={{ fontSize: 18, color: '#6366F1' }} />
                            Skills & Technologies
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {developer.skills.map((skill, skillIndex) => (
                              <Chip 
                                key={skillIndex}
                                label={skill} 
                                size="small" 
                                sx={{ 
                                  background: 'rgba(99, 102, 241, 0.1)',
                                  color: '#6366F1',
                                  border: '1px solid rgba(99, 102, 241, 0.2)',
                                  fontWeight: 500,
                                  transition: 'all 0.3s ease-in-out',
                                  '&:hover': {
                                    background: 'rgba(99, 102, 241, 0.2)',
                                    transform: 'scale(1.05)'
                                  }
                                }}
                              />
                            ))}
                          </Stack>
                        </Box>

                        {/* Contact Links */}
                        <Box>
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              fontWeight: 600, 
                              mb: 2,
                              color: '#F8FAFC',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            <GroupIcon sx={{ fontSize: 18, color: '#6366F1' }} />
                            Get in Touch
                          </Typography>
                          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<GitHubIcon />}
                              href={developer.github}
                              target="_blank"
                              sx={{ 
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                                color: '#6366F1',
                                fontWeight: 500,
                                transition: 'all 0.3s ease-in-out',
                                '&:hover': {
                                  borderColor: '#6366F1',
                                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                  transform: 'translateY(-2px)'
                                }
                              }}
                            >
                              GitHub
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<LinkedInIcon />}
                              href={developer.linkedin}
                              target="_blank"
                              sx={{ 
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                                color: '#6366F1',
                                fontWeight: 500,
                                transition: 'all 0.3s ease-in-out',
                                '&:hover': {
                                  borderColor: '#6366F1',
                                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                  transform: 'translateY(-2px)'
                                }
                              }}
                            >
                              LinkedIn
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<WebsiteIcon />}
                              href={developer.website}
                              target="_blank"
                              sx={{ 
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                                color: '#6366F1',
                                fontWeight: 500,
                                transition: 'all 0.3s ease-in-out',
                                '&:hover': {
                                  borderColor: '#6366F1',
                                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                  transform: 'translateY(-2px)'
                                }
                              }}
                            >
                              Portfolio
                            </Button>
                            {developer.youtube && (
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<YouTubeIcon />}
                                href={developer.youtube}
                                target="_blank"
                                sx={{ 
                                  borderColor: 'rgba(99, 102, 241, 0.3)',
                                  color: '#6366F1',
                                  fontWeight: 500,
                                  transition: 'all 0.3s ease-in-out',
                                  '&:hover': {
                                    borderColor: '#6366F1',
                                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                    transform: 'translateY(-2px)'
                                  }
                                }}
                              >
                                YouTube
                              </Button>
                            )}
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<EmailIcon />}
                              href={`mailto:${developer.email}`}
                              sx={{ 
                                borderColor: 'rgba(99, 102, 241, 0.3)',
                                color: '#6366F1',
                                fontWeight: 500,
                                transition: 'all 0.3s ease-in-out',
                                '&:hover': {
                                  borderColor: '#6366F1',
                                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                  transform: 'translateY(-2px)'
                                }
                              }}
                            >
                              Email
                            </Button>
                          </Stack>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grow>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Slide>

        {/* Mission Statement */}
        <Slide direction="up" in timeout={2800}>
          <Paper 
            elevation={8}
            sx={{ 
              textAlign: 'center', 
              p: 6, 
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
                background: 'linear-gradient(90deg, #6366F1, #8B5CF6, #EC4899)',
                animation: 'shimmer 3s infinite'
              }
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              mb: 3
            }}>
              <RocketIcon sx={{ 
                fontSize: 40, 
                color: '#6366F1',
                mr: 2,
                filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.4))'
              }} />
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700,
                  color: '#F8FAFC',
                  background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.3))'
                }}
              >
                Our Mission
              </Typography>
            </Box>
            <Typography 
              variant="body1" 
              sx={{ 
                maxWidth: '800px', 
                mx: 'auto',
                color: '#E2E8F0',
                fontSize: '1.1rem',
                lineHeight: 1.6,
                fontWeight: 400
              }}
            >
              To democratize professional resume creation by providing AI-powered tools that help job seekers 
              create compelling, ATS-optimized resumes that showcase their true potential and accelerate their career growth.
            </Typography>
          </Paper>
        </Slide>
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

export default AboutUsSection; 