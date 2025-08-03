import { 
  Box, 
  Container, 
  Typography,
  Paper,
  Stack
} from '@mui/material';
import { 
  Construction as ConstructionIcon
} from '@mui/icons-material';

const CreateResumeSection = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Paper 
        sx={{ 
          p: 8, 
          textAlign: 'center',
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 3
        }}
      >
        <Stack spacing={3} alignItems="center">
          <ConstructionIcon 
            sx={{ 
              fontSize: 80, 
              color: 'primary.main',
              opacity: 0.7 
            }} 
          />
          
          <Typography 
            variant="h3" 
            fontWeight={700}
            sx={{
              background: 'linear-gradient(45deg, #6366f1 30%, #06b6d4 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Create Resume
          </Typography>
          
          <Typography 
            variant="h5" 
            color="text.secondary"
            sx={{ maxWidth: 600 }}
          >
            Coming Soon
          </Typography>
          
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ maxWidth: 500, lineHeight: 1.6 }}
          >
            We're working hard to bring you an amazing resume creation experience. 
            This feature will allow you to build professional resumes from scratch 
            with AI-powered suggestions and industry-specific templates.
          </Typography>
          
          <Box 
            sx={{ 
              mt: 4, 
              p: 2, 
              bgcolor: 'action.hover', 
              borderRadius: 2,
              maxWidth: 400
            }}
          >
            <Typography variant="body2" color="text.secondary">
              💡 For now, use the <strong>Profile</strong> section to edit your existing resume
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
};

export default CreateResumeSection;