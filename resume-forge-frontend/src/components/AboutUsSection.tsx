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
  Divider
} from '@mui/material';
import { 
  GitHub as GitHubIcon,
  LinkedIn as LinkedInIcon,
  YouTube as YouTubeIcon,
  Email as EmailIcon,
  Code as CodeIcon,
  Psychology as PsychologyIcon,
  Storage as StorageIcon,
  Brush as BrushIcon
} from '@mui/icons-material';

const AboutUsSection = () => {
  const developers = [
    {
      name: "Alex Chen",
      role: "Full Stack Developer & AI Specialist",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      bio: "Passionate about building intelligent applications that solve real-world problems. Specializes in machine learning, web development, and cloud architecture.",
      skills: ["React", "Node.js", "Python", "TensorFlow", "AWS", "Docker"],
      github: "https://github.com/alexchen-dev",
      linkedin: "https://linkedin.com/in/alexchen-dev",
      youtube: "https://youtube.com/@alexchen-dev",
      email: "alex.chen@resumeforge.com"
    },
    {
      name: "Sarah Rodriguez",
      role: "Frontend Developer & UX Designer",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      bio: "Creative developer focused on crafting beautiful, intuitive user experiences. Expert in modern frontend technologies and design systems.",
      skills: ["React", "TypeScript", "Figma", "CSS3", "Next.js", "Tailwind"],
      github: "https://github.com/sarahrodriguez",
      linkedin: "https://linkedin.com/in/sarahrodriguez",
      youtube: "https://youtube.com/@sarahrodriguez",
      email: "sarah.rodriguez@resumeforge.com"
    }
  ];

  const features = [
    {
      icon: <PsychologyIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: "AI-Powered Resume Optimization",
      description: "Advanced machine learning algorithms analyze job descriptions and tailor your resume for maximum impact."
    },
    {
      icon: <CodeIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: "Real-Time LaTeX Generation",
      description: "Professional LaTeX templates with instant PDF generation for polished, ATS-friendly resumes."
    },
    {
      icon: <StorageIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: "Smart Content Management",
      description: "Intelligent content organization with version control and seamless editing capabilities."
    },
    {
      icon: <BrushIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: "Beautiful Design Templates",
      description: "Modern, responsive templates that look great on any device and pass ATS screening."
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ 
          fontWeight: 700, 
          background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 2
        }}>
          About Resume Forge
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}>
          Revolutionizing resume creation with AI-powered optimization and professional LaTeX templates
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto' }}>
          Resume Forge is built by a passionate team of developers who understand the challenges of job hunting. 
          We combine cutting-edge AI technology with elegant design to help you create resumes that stand out 
          and get you noticed by top employers.
        </Typography>
      </Box>

      {/* Features */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 4, fontWeight: 600 }}>
          What Makes Us Different
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ 
                height: '100%', 
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
                }
              }}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Box sx={{ mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Divider sx={{ my: 6, opacity: 0.3 }} />

      {/* Team Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 4, fontWeight: 600 }}>
          Meet Our Team
        </Typography>
        <Grid container spacing={4}>
          {developers.map((developer, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card sx={{ 
                height: '100%',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
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
                        border: '3px solid rgba(102, 126, 234, 0.3)'
                      }}
                    />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                      {developer.name}
                    </Typography>
                    <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 500, mb: 2 }}>
                      {developer.role}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      {developer.bio}
                    </Typography>
                  </Box>

                  {/* Skills */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                      Skills & Technologies
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {developer.skills.map((skill, skillIndex) => (
                        <Chip 
                          key={skillIndex}
                          label={skill} 
                          size="small" 
                          sx={{ 
                            background: 'rgba(102, 126, 234, 0.1)',
                            color: 'primary.main',
                            border: '1px solid rgba(102, 126, 234, 0.2)'
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>

                  {/* Contact Links */}
                  <Box>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                      Get in Touch
                    </Typography>
                    <Stack direction="row" spacing={2} justifyContent="center">
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<GitHubIcon />}
                        href={developer.github}
                        target="_blank"
                        sx={{ 
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          color: 'text.primary',
                          '&:hover': {
                            borderColor: 'primary.main',
                            backgroundColor: 'rgba(102, 126, 234, 0.1)'
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
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          color: 'text.primary',
                          '&:hover': {
                            borderColor: 'primary.main',
                            backgroundColor: 'rgba(102, 126, 234, 0.1)'
                          }
                        }}
                      >
                        LinkedIn
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<YouTubeIcon />}
                        href={developer.youtube}
                        target="_blank"
                        sx={{ 
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          color: 'text.primary',
                          '&:hover': {
                            borderColor: 'primary.main',
                            backgroundColor: 'rgba(102, 126, 234, 0.1)'
                          }
                        }}
                      >
                        YouTube
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<EmailIcon />}
                        href={`mailto:${developer.email}`}
                        sx={{ 
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          color: 'text.primary',
                          '&:hover': {
                            borderColor: 'primary.main',
                            backgroundColor: 'rgba(102, 126, 234, 0.1)'
                          }
                        }}
                      >
                        Email
                      </Button>
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Mission Statement */}
      <Box sx={{ 
        textAlign: 'center', 
        p: 4, 
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
        borderRadius: 3,
        border: '1px solid rgba(102, 126, 234, 0.2)'
      }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
          Our Mission
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto' }}>
          To democratize professional resume creation by providing AI-powered tools that help job seekers 
          create compelling, ATS-optimized resumes that showcase their true potential and accelerate their career growth.
        </Typography>
      </Box>
    </Container>
  );
};

export default AboutUsSection; 