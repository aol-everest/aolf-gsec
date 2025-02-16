import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
const drawerWidth = 260;

const Home: React.FC = () => {
  const { userInfo } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box
          component="main"
          sx={{
            // flexGrow: 1,
            // p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            // mt: 8,
            py: 4,
          }}
        >
          <Paper sx={{ p: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
              Welcome, {userInfo?.first_name}!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              You can manage appointment requests with Gurudev Sri Sri Ravi Shankar.
              Use the navigation menu to create new appointments, view existing requests, or manage your profile.
            </Typography>
            <img src={'/desktop-bg-1.png'} alt="logo" style={{ width: '100%', height: 'auto', borderRadius: '13px', border: '1px solid #eee' }} />
          </Paper>
        </Box>
      </Container>
    </Layout>
  );
};

export default Home; 