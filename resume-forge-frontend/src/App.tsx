import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import theme from './theme/theme';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import ProfileSection from './components/ProfileSection';
import CreateResumeSection from './components/CreateResumeSection';
import AboutUsSection from './components/AboutUsSection';
import { AuthProvider } from './contexts/AuthContext';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
            },
          }}
        />
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<LandingPage />} />
              <Route path="profile" element={<ProfileSection />} />
              <Route path="create-resume" element={<CreateResumeSection />} />
              <Route path="about" element={<AboutUsSection />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
